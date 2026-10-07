"""Saving and loading logged-in shoppers' chat history in the chat_messages table."""

import json
import sqlite3

from db import get_connection
from models import ChatReply, ChatTurn, CustomerProfile, SavedChatMessage
from tools import cards_for

HISTORY_FOR_AGENT = 20  # most recent saved messages sent to the agent as context
HISTORY_FOR_PAGE = 50  # most recent saved messages shown when the chat widget loads


def _product_ids(products_json: str | None) -> list[str]:
    """products_json holds the reply's product cards as a JSON list; we only trust the ids."""
    if not products_json:
        return []
    try:
        return [p["product_id"] for p in json.loads(products_json) if isinstance(p, dict) and "product_id" in p]
    except (json.JSONDecodeError, TypeError):
        return []


def _recent(conn: sqlite3.Connection, user_id: int, limit: int) -> list[sqlite3.Row]:
    rows = conn.execute(
        "SELECT * FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit)
    ).fetchall()
    return list(reversed(rows))


def load_for_page(user_id: int) -> list[SavedChatMessage]:
    """Recent messages for the chat widget, with product cards rebuilt from current stock."""
    with get_connection() as conn:
        rows = _recent(conn, user_id, HISTORY_FOR_PAGE)
    return [
        SavedChatMessage(
            id=row["id"],
            role=row["role"],
            content=row["content"],
            products=cards_for(_product_ids(row["products_json"])),
            created_at=row["created_at"],
        )
        for row in rows
        if row["role"] in ("user", "assistant")
    ]


def load_for_agent(user_id: int) -> list[ChatTurn]:
    """Recent messages as plain turns for the agent's message history."""
    with get_connection() as conn:
        rows = _recent(conn, user_id, HISTORY_FOR_AGENT)
    return [ChatTurn(role=row["role"], content=row["content"]) for row in rows if row["role"] in ("user", "assistant")]


def save_exchange(user_id: int, message: str, reply: ChatReply) -> None:
    """Save the shopper's message and the agent's reply (with its product cards) together."""
    products_json = json.dumps([p.model_dump() for p in reply.products])
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'user', ?, NULL)",
            (user_id, message),
        )
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'assistant', ?, ?)",
            (user_id, reply.message, products_json),
        )


def clear(user_id: int) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,))


def customer_profile(user: sqlite3.Row) -> CustomerProfile:
    """The customer fields the agent is allowed to see (no password hash or internal id)."""
    with get_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM chat_messages WHERE user_id = ?", (user["id"],)).fetchone()[0]
    first = user["first_name"] or (user["name"] or "").split(" ")[0]
    last = user["last_name"] or " ".join((user["name"] or "").split(" ")[1:])
    return CustomerProfile(
        first_name=first,
        last_name=last,
        email=user["email"],
        member_since=(user["created_at"] or "")[:10],
        previous_messages=count,
    )
