"""Ranked catalogue search: word stems, synonyms, typo tolerance and field weights,
instead of a plain substring check."""

import difflib
import json
import re
import sqlite3

STOPWORDS = {
    "a", "an", "and", "any", "anything", "are", "do", "for", "have", "i", "in", "is", "me", "my", "of",
    "on", "or", "please", "show", "some", "something", "that", "the", "to", "what", "with", "you", "your",
    "got", "sell", "carry", "looking", "want", "need", "find", "item", "items", "product", "products", "yale",
}

# Groups of words that mean the same thing to a shopper. Each word maps to its group's key.
SYNONYM_GROUPS = [
    {"hoodie", "hoody", "hooded", "hood"},
    {"tshirt", "tee"},
    {"crewneck", "crew", "sweatshirt", "sweater", "jumper", "pullover"},
    {"quarterzip", "quarter", "14zip", "halfzip"},
    {"jacket", "coat", "fleece", "bomber"},
    {"navy", "blue"},
    {"grey", "gray", "heather"},
    {"kid", "child", "youth", "toddler"},
    {"gift", "present", "souvenir"},
    {"cheap", "affordable", "budget", "inexpensive"},
    {"football", "game", "harvard"},
]
SYNONYMS = {word: min(group) for group in SYNONYM_GROUPS for word in group}

# Where a match counts more: a word in the name matters more than one in the description.
FIELD_WEIGHTS = {"name": 3.0, "garment_type": 2.5, "search_tags": 2.0, "colors": 2.0, "description": 1.0}
FUZZY_CUTOFF = 0.82  # how close a misspelling must be ("hoddie" -> "hoodie")


def _stem(word: str) -> str:
    for suffix in ("ies", "es", "s"):
        if len(word) > 4 and word.endswith(suffix):
            return word[: -len(suffix)] + ("y" if suffix == "ies" else "")
    return word


def _words(text: str) -> list[str]:
    """Lowercase, join common compound words, split into words, and stem (no synonym mapping)."""
    text = text.lower()
    text = re.sub(r"\bt[\s-]?shirts?\b", " tshirt ", text)
    text = re.sub(r"(1/4|quarter)[\s-]?zip", " quarterzip ", text)
    text = re.sub(r"\bcrew[\s-]?necks?\b", " crewneck ", text)
    return [_stem(w) for w in re.findall(r"[a-z0-9]+", text)]


def _canonical(word: str) -> str:
    return SYNONYMS.get(word, word)


def normalize(text: str) -> list[str]:
    """Words of the text with synonyms mapped to one shared word."""
    return [_canonical(w) for w in _words(text)]


def _product_terms(row: sqlite3.Row) -> dict[str, set[str]]:
    colors = " ".join(json.loads(row["colors"] or "[]"))
    tags = " ".join(json.loads(row["search_tags"] or "[]"))
    fields = {"name": row["name"], "garment_type": row["garment_type"], "search_tags": tags,
              "colors": colors, "description": row["description"]}
    return {field: set(normalize(text)) for field, text in fields.items()}


def query_words(query: str) -> list[str]:
    return [w for w in dict.fromkeys(_words(query)) if w not in STOPWORDS and _canonical(w) not in STOPWORDS]


def rank(rows: list[sqlite3.Row], query: str) -> list[tuple[float, sqlite3.Row]]:
    """Score every product against the query; best first.

    Every query word must match the product (exactly, as a synonym/stem, or as a close misspelling).
    If that finds nothing, fall back to products matching the most words.
    """
    words = query_words(query)
    if not words:
        return [(0.0, row) for row in rows]

    indexed = [(row, _product_terms(row)) for row in rows]
    catalogue_terms = {t for _, fields in indexed for ts in fields.values() for t in ts}
    # Real words a typo can be corrected to: every catalogue word in its original form, plus all synonyms.
    real_words = sorted({w for row, _ in indexed for w in _words(" ".join(str(row[k]) for k in ("name", "garment_type", "description", "colors", "search_tags")))} | set(SYNONYMS))
    # Resolve each query word once: exact (or synonym) match, else the closest real word (typo), else nothing.
    resolved: dict[str, tuple[str | None, float]] = {}
    for word in words:
        term = _canonical(word)
        if term in catalogue_terms:
            resolved[word] = (term, 1.0)
        else:
            close = difflib.get_close_matches(word, real_words, n=1, cutoff=FUZZY_CUTOFF)
            resolved[word] = (_canonical(close[0]), 0.7) if close else (None, 0.0)

    scored = []
    for row, fields in indexed:
        score, matched = 0.0, 0
        for term in words:
            word, confidence = resolved[term]
            if word is None:
                continue
            best = max((FIELD_WEIGHTS[f] for f, words in fields.items() if word in words), default=0.0)
            if best:
                matched += 1
                score += best * confidence
        scored.append((matched, score, row))

    full = [(s, r) for m, s, r in scored if m == len(words)]
    if full:
        return sorted(full, key=lambda x: -x[0])
    partial = [(m, s, r) for m, s, r in scored if m > 0]
    return [(s, r) for m, s, r in sorted(partial, key=lambda x: (-x[0], -x[1]))]
