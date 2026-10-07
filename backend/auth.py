"""Account creation and log in: salted PBKDF2 password hashing and signed session tokens."""

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from db import get_connection

router = APIRouter(prefix="/api/auth", tags=["auth"])

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 600_000  # OWASP 2023 recommendation for PBKDF2-HMAC-SHA256
# Seeded accounts use the older "pbkdf2_sha256$<salt>$<hash>" format, which has no iteration count;
# they were made with 120,000 iterations (confirmed against test@campuscustoms.yale.edu).
LEGACY_ITERATIONS = 120_000
SALT_BYTES = 16

PASSWORD_MIN, PASSWORD_MAX = 6, 16
SPECIAL_CHAR = re.compile(r"[^A-Za-z0-9]")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
# AUTH_SECRET (optional, from .env) signs session tokens. Without it a random secret is
# generated at startup, so everyone is logged out whenever the server restarts.
AUTH_SECRET = os.environ.get("AUTH_SECRET") or secrets.token_hex(32)


# ---------- Password hashing ----------

def hash_password(password: str) -> str:
    salt = secrets.token_hex(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS).hex()
    return f"{ALGORITHM}${ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    parts = stored.split("$")
    if len(parts) == 4:
        algorithm, iterations, salt, expected = parts[0], int(parts[1]), parts[2], parts[3]
    elif len(parts) == 3:
        algorithm, iterations, salt, expected = parts[0], LEGACY_ITERATIONS, parts[1], parts[2]
    else:
        return False
    if algorithm != ALGORITHM:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations).hex()
    return hmac.compare_digest(digest, expected)


# Used when an email is not found so a failed log in takes the same time either way,
# which stops attackers from discovering which emails have accounts.
DUMMY_HASH = hash_password(secrets.token_hex(8))


def password_problems(password: str) -> list[str]:
    problems = []
    if not PASSWORD_MIN <= len(password) <= PASSWORD_MAX:
        problems.append(f"Password must be {PASSWORD_MIN}-{PASSWORD_MAX} characters long.")
    if not SPECIAL_CHAR.search(password):
        problems.append("Password must include at least one special character (e.g. ! @ # $).")
    return problems


# ---------- Session tokens ----------

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _sign(payload: str) -> str:
    return _b64(hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).digest())


def create_token(user_id: int) -> str:
    payload = _b64(json.dumps({"uid": user_id, "exp": int(time.time()) + TOKEN_TTL_SECONDS}).encode())
    return f"{payload}.{_sign(payload)}"


def read_token(token: str) -> int | None:
    try:
        payload, signature = token.split(".")
        if not hmac.compare_digest(signature, _sign(payload)):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        return int(data["uid"]) if data["exp"] > time.time() else None
    except (ValueError, KeyError, json.JSONDecodeError):
        return None


def sign_history(turns: list[dict]) -> str:
    """Signature over a guest's conversation, so the browser can hold it but not change it."""
    canonical = json.dumps(turns, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    return _sign("history:" + canonical)


def history_is_authentic(turns: list[dict], token: str | None) -> bool:
    return bool(token) and hmac.compare_digest(token, sign_history(turns))


# ---------- Routes ----------

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def public_user(row: sqlite3.Row) -> dict:
    # Never return password_hash to the browser.
    return {
        "id": row["id"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "email": row["email"],
        "created_at": row["created_at"],
    }


def auth_response(row: sqlite3.Row) -> dict:
    return {"token": create_token(row["id"]), "user": public_user(row)}


@router.post("/signup", status_code=201)
def signup(body: SignupRequest) -> dict:
    first, last = body.first_name.strip(), body.last_name.strip()
    email = body.email.strip().lower()
    problems = []
    if not first or not last:
        problems.append("First and last name are required.")
    if not EMAIL_PATTERN.match(email):
        problems.append("Enter a valid email address.")
    problems += password_problems(body.password)
    if body.password != body.confirm_password:
        problems.append("Passwords do not match.")
    if problems:
        raise HTTPException(status_code=422, detail=" ".join(problems))

    with get_connection() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO users (name, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
                (f"{first} {last}", email, hash_password(body.password), first, last),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return auth_response(row)


@router.post("/login")
def login(body: LoginRequest) -> dict:
    email = body.email.strip().lower()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()
    stored = row["password_hash"] if row else DUMMY_HASH
    if not verify_password(body.password, stored) or row is None:
        # Same message whether the email or the password was wrong.
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return auth_response(row)


def current_user(authorization: str) -> sqlite3.Row | None:
    """Return the logged-in user's row for an "Authorization: Bearer <token>" header, or None."""
    user_id = read_token(authorization.removeprefix("Bearer ").strip())
    if user_id is None:
        return None
    with get_connection() as conn:
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


@router.get("/me")
def me(authorization: str = Header(default="")) -> dict:
    row = current_user(authorization)
    if row is None:
        raise HTTPException(status_code=401, detail="Not logged in.")
    return public_user(row)
