"""Campus Customs API: products, images, accounts, and the shop chatbot.

Run from the backend folder:  uvicorn main:app --reload --port 8000
"""

import json
import sqlite3

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import agent

# Load .env (PORTKEY_API_KEY, optional AUTH_SECRET; see agent.find_env) before auth reads AUTH_SECRET at import.
agent.load_env()

import chat_history  # noqa: E402
import safety  # noqa: E402
from auth import current_user, history_is_authentic, sign_history  # noqa: E402
from auth import router as auth_router  # noqa: E402
from db import DATA_DIR, get_connection  # noqa: E402
from models import ChatDeps, ChatRequest, ChatResponse, ChatTurn, SavedChatMessage  # noqa: E402

GUEST_HISTORY_TURNS = 10  # guest conversation window kept (and signed) between messages

app = FastAPI(title="Campus Customs API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
# Product photos live in data/products; image_file_path is stored as "products/<file>.jpg".
app.mount("/images/products", StaticFiles(directory=DATA_DIR / "products"), name="product-images")


def to_product(row: sqlite3.Row) -> dict:
    product = dict(row)
    product["colors"] = json.loads(product["colors"])
    product["search_tags"] = json.loads(product["search_tags"])
    product["image_url"] = f"/images/{product.pop('image_file_path')}"
    return product


@app.get("/api/products")
def list_products() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT c.*, COALESCE(SUM(i.quantity), 0) AS total_stock
            FROM catalogue c LEFT JOIN inventory i ON i.product_id = c.product_id
            GROUP BY c.product_id
            ORDER BY c.name
            """
        ).fetchall()
    return [to_product(row) for row in rows]


SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]


@app.get("/api/products/{product_id}")
def get_product(product_id: str) -> dict:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (product_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Product not found")
        sizes = conn.execute(
            "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
        ).fetchall()
    product = to_product(row)
    product["inventory"] = sorted(
        (dict(s) for s in sizes),
        key=lambda s: SIZE_ORDER.index(s["size"]) if s["size"] in SIZE_ORDER else len(SIZE_ORDER),
    )
    product["total_stock"] = sum(s["quantity"] for s in product["inventory"])
    return product


@app.post("/api/chat")
async def chat(body: ChatRequest, authorization: str = Header(default="")) -> ChatResponse:
    # Safety: secrets the customer types (card numbers, passwords, ...) are redacted before the
    # message reaches the model, the database, or the audit trail.
    message = safety.redact(body.message)
    user = current_user(authorization)
    if user:
        # Logged in: history comes only from the database (written by the server), never the browser.
        history = chat_history.load_for_agent(user["id"])
        deps = ChatDeps(user_id=user["id"], customer=chat_history.customer_profile(user), page=body.page)
    else:
        # Guest: the browser holds the conversation, but it must carry the server's signature.
        # Edited, added, or reordered turns (user's or Dan's) fail the check and are discarded.
        turns = [t.model_dump() for t in body.history]
        history = body.history if history_is_authentic(turns, body.history_token) else []
        history = [ChatTurn(role=t.role, content=safety.redact(t.content)) for t in history]
        deps = ChatDeps(user_id=None, customer=None, page=body.page)
    try:
        reply = await agent.chat(message, history, deps)
    except Exception as exc:  # model/network errors: keep the website working
        print(f"Chat agent error: {exc!r}")
        raise HTTPException(status_code=502, detail="Dan is having trouble answering right now. Please try again.")

    response = ChatResponse(**reply.model_dump())
    if user:
        chat_history.save_exchange(user["id"], message, reply)
    else:
        window = [*history, ChatTurn(role="user", content=message), ChatTurn(role="assistant", content=reply.message)]
        window = window[-GUEST_HISTORY_TURNS:]
        response.history = window
        response.history_token = sign_history([t.model_dump() for t in window])
    return response


@app.get("/api/chat/history")
def get_chat_history(authorization: str = Header(default="")) -> list[SavedChatMessage]:
    user = current_user(authorization)
    if user is None:
        raise HTTPException(status_code=401, detail="Log in to see your saved chat.")
    return chat_history.load_for_page(user["id"])


@app.delete("/api/chat/history", status_code=204)
def clear_chat_history(authorization: str = Header(default="")) -> None:
    user = current_user(authorization)
    if user is None:
        raise HTTPException(status_code=401, detail="Log in to clear your saved chat.")
    chat_history.clear(user["id"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
