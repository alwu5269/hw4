"""Read-only catalogue tools the chat agent uses to look up facts in campus_customs.db."""

import json
import sqlite3

from pydantic_ai import RunContext

import search
from db import get_connection
from models import (
    ChatDeps,
    CurrentPage,
    CustomerProfile,
    ProductNotFound,
    ProductCard,
    ProductDescription,
    ProductPrice,
    SizeAvailability,
    StockLevels,
)

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
SIZE_ALIASES = {
    "EXTRA SMALL": "XS", "SMALL": "S", "MEDIUM": "M", "MED": "M", "LARGE": "L",
    "EXTRA LARGE": "XL", "XXL": "XXL", "2XL": "XXL", "XX-LARGE": "XXL", "EXTRA EXTRA LARGE": "XXL",
}

PRODUCT_WITH_STOCK = """
    SELECT c.*, COALESCE(SUM(i.quantity), 0) AS total_stock
    FROM catalogue c LEFT JOIN inventory i ON i.product_id = c.product_id
"""


def _card(row: sqlite3.Row) -> ProductCard:
    return ProductCard(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        price=row["price"],
        image_url=f"/images/{row['image_file_path']}",
        total_stock=row["total_stock"],
    )


def _find_product(conn: sqlite3.Connection, product: str) -> sqlite3.Row | ProductNotFound:
    """Resolve a product_id or product name to exactly one catalogue row."""
    key = product.strip()
    row = conn.execute(PRODUCT_WITH_STOCK + " WHERE c.product_id = ? GROUP BY c.product_id", (key,)).fetchone()
    if row is None:
        row = conn.execute(PRODUCT_WITH_STOCK + " WHERE lower(c.name) = lower(?) GROUP BY c.product_id", (key,)).fetchone()
    if row is not None:
        return row
    matches = conn.execute(
        PRODUCT_WITH_STOCK + " WHERE lower(c.name) LIKE ? OR c.product_id LIKE ? GROUP BY c.product_id ORDER BY c.name LIMIT 5",
        (f"%{key.lower()}%", f"%{key.lower().replace(' ', '-')}%"),
    ).fetchall()
    if len(matches) == 1:
        return matches[0]
    return ProductNotFound(
        error=f"No single product matches '{product}'. Use search_products, or pick one of the suggestions.",
        suggestions=[_card(m) for m in matches],
    )


def _normalize_size(size: str) -> str:
    key = size.strip().upper()
    return SIZE_ALIASES.get(key, key)


def search_products(
    query: str = "",
    max_price: float | None = None,
    in_stock_only: bool = False,
    limit: int = 6,
) -> list[ProductCard]:
    """Search the Campus Customs catalogue to find products and their product_ids. Results are ranked best first.

    Matching understands plurals, synonyms (hoodie/hooded, tee/t-shirt, crewneck/sweatshirt, navy/blue...)
    and small typos, and weighs matches in the product name and type above the description.

    Args:
        query: What the customer is looking for, e.g. "navy hoodie", "baseball", "Berkeley college",
            "gift for a dad". Empty returns all products.
        max_price: Only include products at or below this price in US dollars.
        in_stock_only: Only include products with at least one unit in stock.
        limit: Maximum number of products to return (1-12).
    """
    with get_connection() as conn:
        rows = conn.execute(PRODUCT_WITH_STOCK + " GROUP BY c.product_id ORDER BY c.name").fetchall()
    if max_price is not None:
        rows = [r for r in rows if r["price"] <= max_price]
    if in_stock_only:
        rows = [r for r in rows if r["total_stock"] > 0]
    ranked = search.rank(rows, query)
    # In-stock products first among equally good matches.
    ranked.sort(key=lambda pair: (-pair[0], pair[1]["total_stock"] == 0))
    return [_card(row) for _, row in ranked[: max(1, min(limit, 12))]]


def get_product_description(product: str) -> ProductDescription | ProductNotFound:
    """Look up a product's description, garment type and colors.

    Args:
        product: The product_id (preferred, from search_products) or the exact product name.
    """
    with get_connection() as conn:
        row = _find_product(conn, product)
    if isinstance(row, ProductNotFound):
        return row
    return ProductDescription(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=row["description"],
        colors=json.loads(row["colors"]),
    )


def get_price(product: str) -> ProductPrice | ProductNotFound:
    """Look up the exact price of a product. Use this for every price you tell the customer.

    Args:
        product: The product_id (preferred, from search_products) or the exact product name.
    """
    with get_connection() as conn:
        row = _find_product(conn, product)
    if isinstance(row, ProductNotFound):
        return row
    return ProductPrice(product_id=row["product_id"], name=row["name"], price=row["price"])


def get_stock(product: str, size: str | None = None) -> StockLevels | ProductNotFound:
    """Look up how many units are in stock for each size of a product.

    Args:
        product: The product_id (preferred, from search_products) or the exact product name.
        size: Optional size the customer asked about (XS, S, M, L, XL, XXL, or words like "medium").
    """
    with get_connection() as conn:
        row = _find_product(conn, product)
        if isinstance(row, ProductNotFound):
            return row
        rows = conn.execute("SELECT size, quantity FROM inventory WHERE product_id = ?", (row["product_id"],)).fetchall()
    rows = sorted(rows, key=lambda r: SIZE_ORDER.index(r["size"]) if r["size"] in SIZE_ORDER else len(SIZE_ORDER))
    sizes = [SizeAvailability(size=r["size"], quantity=r["quantity"], in_stock=r["quantity"] > 0) for r in rows]

    requested = _normalize_size(size) if size else None
    status = None
    if requested:
        match = next((s for s in sizes if s.size == requested), None)
        status = "not offered" if match is None else ("in stock" if match.in_stock else "out of stock")

    return StockLevels(
        product_id=row["product_id"],
        name=row["name"],
        sizes=sizes,
        total_stock=sum(s.quantity for s in sizes),
        in_stock_sizes=[s.size for s in sizes if s.in_stock],
        out_of_stock_sizes=[s.size for s in sizes if not s.in_stock],
        requested_size=requested,
        requested_size_status=status,
    )


def cards_for(product_ids: list[str]) -> list[ProductCard]:
    """Rebuild product cards straight from the database, in the given order, dropping unknown ids.

    Used on the agent's final reply so the cards shown on the website always carry real names,
    prices, images and stock, never values the model typed itself.
    """
    unique = list(dict.fromkeys(product_ids))
    if not unique:
        return []
    placeholders = ", ".join("?" for _ in unique)
    with get_connection() as conn:
        rows = conn.execute(
            PRODUCT_WITH_STOCK + f" WHERE c.product_id IN ({placeholders}) GROUP BY c.product_id", unique
        ).fetchall()
    by_id = {row["product_id"]: _card(row).model_copy(update={"description": row["description"]}) for row in rows}
    return [by_id[pid] for pid in unique if pid in by_id]


# ---------- Tools that read the per-request deps (who is chatting, which page they're on) ----------

PAGE_NAMES = {"/": "Home", "/products": "Products", "/about": "About Us", "/login": "Log In", "/create-account": "Create Account"}


def get_customer(ctx: RunContext[ChatDeps]) -> CustomerProfile | str:
    """Get the logged-in customer's profile (first name, last name, email, member since, saved message count).

    Use it to greet them by name or when they ask what you know about them.
    """
    if ctx.deps.customer is None:
        return "The shopper is not logged in (guest). Chat history is not saved for guests."
    return ctx.deps.customer


def get_current_page(ctx: RunContext[ChatDeps]) -> CurrentPage:
    """Get the page the shopper is looking at right now, including the product when they are on a product page.

    Use it whenever they say "this", "it", "this one", or ask about an item without naming it.
    """
    page = ctx.deps.page
    if page is None:
        return CurrentPage(path="unknown", page_name="Unknown")
    cards = cards_for([page.product_id]) if page.product_id else []
    product = cards[0] if cards else None
    name = "Product page" if page.path.startswith("/products/") else PAGE_NAMES.get(page.path, "Other")
    return CurrentPage(path=page.path, page_name=name, product=product)
