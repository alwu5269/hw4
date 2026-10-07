"""Pydantic models shared by the chat agent and the FastAPI chat route."""

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema


class ProductCard(BaseModel):
    """A product shown as a clickable card in the chat widget."""

    product_id: str = Field(description="Catalogue product_id; the card links to /products/<product_id>.")
    name: str
    garment_type: str
    price: float = Field(description="Price in US dollars.")
    image_url: str = Field(description="URL of the product photo served by the API.")
    total_stock: int = Field(description="Units in stock across all sizes.")
    # Filled from the catalogue when cards are rebuilt from the database (tools.cards_for) so the
    # website can show a short description. Hidden from the model's schema: it never writes this.
    description: SkipJsonSchema[str | None] = None


# ---------- Tool return types (database look ups) ----------


class ProductDescription(BaseModel):
    """Result of get_product_description."""

    product_id: str
    name: str
    garment_type: str = Field(description="e.g. 'pullover hoodie', 'short-sleeve T-shirt'.")
    description: str = Field(description="Catalogue description of the design and garment.")
    colors: list[str] = Field(description="Colors used on the product.")


class ProductPrice(BaseModel):
    """Result of get_price."""

    product_id: str
    name: str
    price: float = Field(description="Exact catalogue price.")
    currency: Literal["USD"] = "USD"


class SizeAvailability(BaseModel):
    """Stock for one size of a product."""

    size: str = Field(description="XS, S, M, L, XL or XXL.")
    quantity: int = Field(description="Units in stock for this size.")
    in_stock: bool = Field(description="False when quantity is 0. Always tell the customer when a size is out of stock.")


class StockLevels(BaseModel):
    """Result of get_stock."""

    product_id: str
    name: str
    sizes: list[SizeAvailability] = Field(description="Every size the product is made in, smallest to largest.")
    total_stock: int = Field(description="Units in stock across all sizes.")
    in_stock_sizes: list[str] = Field(description="Sizes with at least one unit.")
    out_of_stock_sizes: list[str] = Field(description="Sizes with zero units.")
    requested_size: str | None = Field(default=None, description="The size asked about, if any.")
    requested_size_status: Literal["in stock", "out of stock", "not offered"] | None = Field(
        default=None, description="Availability of requested_size. 'not offered' means the product isn't made in that size."
    )


class ProductNotFound(BaseModel):
    """Returned by a look up tool when the product can't be found, so the agent never guesses."""

    error: str
    suggestions: list[ProductCard] = Field(default_factory=list, description="Close matches the customer may mean.")


class ChatReply(BaseModel):
    """The agent's structured answer: a short message, products to show as cards, and whether
    the reply is a catalogue search whose results should be shown on the website's Products page."""

    message: str = Field(description="Short, friendly reply in the Campus Customs voice.")
    products: list[ProductCard] = Field(
        default_factory=list,
        max_length=12,
        description="Products to show as cards, best match first. Only products returned by tools.",
    )
    search_query: str | None = Field(
        default=None,
        description=(
            "Set ONLY when the customer is browsing or searching the catalogue (e.g. 'what hoodies do you have?'): "
            "a short label for the search, like 'hoodies' or 'navy gifts under $40'. The website then shows "
            "`products` as a results grid on the Products page. Leave null for questions about one specific product, "
            "small talk, or when no products matched."
        ),
    )


class ChatTurn(BaseModel):
    """One earlier message in the conversation, sent by the website."""

    role: Literal["user", "assistant"]
    content: str


class PageContext(BaseModel):
    """Where the shopper is on the website when they send a message."""

    path: str = Field(default="/", max_length=200, description="The page URL path, e.g. '/products/basic-hoodie-big-yale'.")
    product_id: str | None = Field(
        default=None, max_length=200, description="The product_id when the shopper is on a single-product page."
    )


class ChatRequest(BaseModel):
    """Body of POST /api/chat."""

    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatTurn] = Field(
        default_factory=list,
        max_length=20,
        description="Guests only: the signed conversation window returned by the last reply. Ignored when logged in.",
    )
    history_token: str | None = Field(default=None, description="Signature for `history`; history without a valid one is dropped.")
    page: PageContext | None = None


class ChatResponse(ChatReply):
    """What POST /api/chat returns: the agent's reply plus, for guests, the signed conversation window
    to send back with the next message."""

    history: list[ChatTurn] | None = None
    history_token: str | None = None


class CustomerProfile(BaseModel):
    """The logged-in shopper, as the agent sees them. Deliberately excludes the password hash and internal id."""

    first_name: str
    last_name: str
    email: str = Field(description="The email the customer logs in with (their own account email).")
    member_since: str = Field(description="Date the account was created (YYYY-MM-DD).")
    previous_messages: int = Field(description="How many earlier chat messages are saved for this customer.")


class CurrentPage(BaseModel):
    """Result of get_current_page: what the shopper is looking at right now."""

    path: str
    page_name: str = Field(description="e.g. 'Products', 'Product page', 'Home', 'About Us'.")
    product: ProductCard | None = Field(
        default=None, description="The product on screen when on a single-product page ('this', 'it', 'this one')."
    )


@dataclass
class ChatDeps:
    """Per-request dependencies passed to the agent (PydanticAI deps)."""

    user_id: int | None
    customer: CustomerProfile | None
    page: PageContext | None


class SavedChatMessage(BaseModel):
    """One saved message returned by GET /api/chat/history."""

    id: int
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductCard] = Field(default_factory=list)
    created_at: str
