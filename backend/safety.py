"""Keep secrets out of the chatbot: redact them from what customers type (before the model, the
database, or the audit trail sees it) and catch replies that contain or ask for secrets."""

import re

REDACTED = "[redacted]"

# Card numbers: 13-19 digits, optionally grouped with spaces or dashes; confirmed with the Luhn check
# so prices, quantities, and years are never touched.
CARD = re.compile(r"(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)")
SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
CVV = re.compile(r"\b(cvv|cvc|cvv2|security code)\b\s*(?:is|:|=)?\s*\d{3,4}\b", re.IGNORECASE)
PASSWORD = re.compile(r"\b(password|passcode|passwd|pin)\b\s*(?:is|:|=)\s*\S+", re.IGNORECASE)
API_KEY = re.compile(
    r"\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}\b"  # sk-..., pk-... style keys
    r"|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)?"  # JWT / signed tokens
    r"|\b[Bb]earer\s+[A-Za-z0-9._-]{20,}"
)

# A reply asking the customer for a secret, e.g. "what's your password" or "send me your card number",
# but not a warning like "please don't share your card number".
ASKS_FOR_SECRET = re.compile(
    r"\b(?:what(?:'s| is)|send|share|enter|provide|give|tell|type|confirm)\b[^.?!]{0,20}?\byour\s+"
    r"(?:password|passcode|pin|card number|credit card(?: number)?|debit card(?: number)?|cvv|cvc|"
    r"security code|social security(?: number)?|ssn|bank account(?: number)?|api key)",
    re.IGNORECASE,
)
NEGATED = re.compile(r"\b(?:don'?t|do not|never|no need to|not)\b[^.?!]*$", re.IGNORECASE)


def _luhn_ok(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        n = int(ch)
        if i % 2 == 1:
            n = n * 2 - 9 if n > 4 else n * 2
        total += n
    return total % 10 == 0


def _redact_card(match: re.Match) -> str:
    digits = re.sub(r"\D", "", match.group(0))
    return REDACTED if 13 <= len(digits) <= 19 and _luhn_ok(digits) else match.group(0)


def redact(text: str) -> str:
    """Replace card numbers, SSNs, CVVs, passwords, and API keys/tokens with [redacted]."""
    text = CARD.sub(_redact_card, text)
    text = SSN.sub(REDACTED, text)
    text = CVV.sub(lambda m: f"{m.group(1)} {REDACTED}", text)
    text = PASSWORD.sub(lambda m: f"{m.group(1)} {REDACTED}", text)
    return API_KEY.sub(REDACTED, text)


def contains_secret(text: str) -> bool:
    return redact(text) != text


def asks_for_secret(text: str) -> bool:
    for match in ASKS_FOR_SECRET.finditer(text):
        sentence_start = max(text.rfind(".", 0, match.start()), text.rfind("!", 0, match.start()), text.rfind("?", 0, match.start()))
        if not NEGATED.search(text[sentence_start + 1 : match.start() + len(match.group(0).split()[0])]):
            return True
    return False
