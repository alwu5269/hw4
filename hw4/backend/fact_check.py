"""Double-check the numbers in the agent's reply against what its tools actually returned."""

import re
from typing import Any

from pydantic import BaseModel
from pydantic_ai.messages import ModelMessage, ModelRequest, ToolReturnPart, UserPromptPart

# "$68", "$68.00", "$1,200"
MONEY = re.compile(r"\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)")
# Plain numbers that aren't part of a word or code: skips "2XL", "1/4", "U2", "100%".
PLAIN_NUMBER = re.compile(r"(?<![\w$./,])(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(?![\w/%])")
NUMBER_IN_TEXT = re.compile(r"\d+(?:\.\d+)?")


def _collect(value: Any, found: set[float]) -> None:
    """Every number in a tool result: numeric fields, list lengths, and numbers inside text (e.g. names)."""
    if isinstance(value, BaseModel):
        value = value.model_dump()
    if isinstance(value, bool):
        return
    if isinstance(value, (int, float)):
        found.add(float(value))
    elif isinstance(value, str):
        found.update(float(n) for n in NUMBER_IN_TEXT.findall(value.replace(",", "")))
    elif isinstance(value, dict):
        for item in value.values():
            _collect(item, found)
    elif isinstance(value, (list, tuple)):
        found.add(float(len(value)))
        for item in value:
            _collect(item, found)


def known_numbers(messages: list[ModelMessage], products_shown: int) -> set[float]:
    """Numbers the reply may use: anything returned by a tool in this conversation, anything the
    customer typed (e.g. "under $50"), and how many product cards are being shown."""
    found: set[float] = {float(products_shown)}
    for message in messages:
        if not isinstance(message, ModelRequest):
            continue
        for part in message.parts:
            if isinstance(part, ToolReturnPart):
                _collect(part.content, found)
            elif isinstance(part, UserPromptPart) and isinstance(part.content, str):
                _collect(part.content, found)
    return found


def numbers_in_reply(text: str) -> list[tuple[str, float]]:
    """(as written, value) for each price and count in the reply. Years like 1975 are skipped."""
    found = [(m.group(0), float(m.group(1).replace(",", ""))) for m in MONEY.finditer(text)]
    without_money = MONEY.sub(" ", text)
    for m in PLAIN_NUMBER.finditer(without_money):
        value = float(m.group(1).replace(",", "") + (f".{m.group(2)}" if m.group(2) else ""))
        if value.is_integer() and 1900 <= value <= 2100:
            continue  # years ("since 1975", "2025 Harvard-Yale")
        found.append((m.group(0), value))
    return found


def unverified_numbers(text: str, known: set[float]) -> list[str]:
    return [written for written, value in numbers_in_reply(text) if not any(abs(value - k) < 0.005 for k in known)]


# ---------- Out-of-stock sizes must be stated clearly ----------

OUT_OF_STOCK_WORDS = re.compile(
    r"out of stock|sold out|not (?:currently )?in stock|isn'?t in stock|none (?:left|available)|"
    r"(?:no|zero) (?:\w+ )?(?:left|available|in stock)|unavailable|not available",
    re.IGNORECASE,
)
NOT_OFFERED_WORDS = re.compile(
    r"(?:does ?n[o']t|doesn'?t|does not) come in|not (?:offered|made|available) in|isn'?t (?:offered|made|available) in|"
    r"only comes in|only available in|not (?:a size|offered)|no \w+ size",
    re.IGNORECASE,
)


def _stock_results(messages: list[ModelMessage]) -> list[dict]:
    """get_stock results from this conversation that answered a specific size question."""
    found = []
    for message in messages:
        if not isinstance(message, ModelRequest):
            continue
        for part in message.parts:
            if isinstance(part, ToolReturnPart) and part.tool_name == "get_stock":
                content = part.content.model_dump() if isinstance(part.content, BaseModel) else part.content
                if isinstance(content, dict) and content.get("requested_size_status") in ("out of stock", "not offered"):
                    found.append(content)
    return found


def missing_stock_warnings(text: str, messages: list[ModelMessage]) -> list[str]:
    """Out-of-stock / not-offered sizes the tools reported that the reply doesn't clearly state."""
    text = text.replace("\u2019", "'").replace("\u2018", "'")  # models often write curly apostrophes (doesn’t)
    problems = []
    for stock in _stock_results(messages):
        size, name = stock.get("requested_size"), stock.get("name")
        if stock["requested_size_status"] == "out of stock" and not OUT_OF_STOCK_WORDS.search(text):
            problems.append(f"get_stock says {name} is OUT OF STOCK in size {size}")
        elif stock["requested_size_status"] == "not offered" and not (NOT_OFFERED_WORDS.search(text) or OUT_OF_STOCK_WORDS.search(text)):
            problems.append(f"get_stock says {name} does NOT COME IN size {size}")
    return problems
