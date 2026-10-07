"""Append-only audit trail of agent-loop activity, stored as a JSON array in output/audit_trail.json.

Entries are only ever added: each write inserts new entries before the closing "]" of the existing
file (under a file lock), so earlier entries are never rewritten, reordered, or deleted, and the file
stays valid JSON between runs and server restarts.
"""

import fcntl
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from pydantic_ai.messages import ModelMessage, ModelResponse, RetryPromptPart, ToolCallPart, ToolReturnPart

import safety

AUDIT_PATH = Path(__file__).resolve().parent.parent / "output" / "audit_trail.json"
SHORT = 160  # max characters kept for args / results
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")  # masked in the log: customer emails aren't needed there
PRIVATE_TOOLS = {"get_customer"}  # results contain the customer's name and email: log only that it was called


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def short(value: Any) -> str:
    """A brief, redacted, one-line summary of tool args or results."""
    if isinstance(value, BaseModel):
        value = value.model_dump()
    if isinstance(value, list):
        ids = [v.get("product_id") if isinstance(v, dict) else getattr(v, "product_id", None) for v in value]
        ids = [i for i in ids if i]
        if ids:
            more = f" (+{len(ids) - 3} more)" if len(ids) > 3 else ""
            return f"{len(value)} products: {', '.join(ids[:3])}{more}"
        value = [v.model_dump() if isinstance(v, BaseModel) else v for v in value]
    if isinstance(value, dict) and isinstance(value.get("sizes"), list):
        sizes = ", ".join(f"{z['size']} {z['quantity']}" for z in value["sizes"])
        asked = f"; asked {value['requested_size']}: {value['requested_size_status']}" if value.get("requested_size") else ""
        return f"{value.get('product_id')}: {sizes}{asked}"
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, default=str)
    text = EMAIL.sub("[email]", safety.redact(" ".join(text.split())))
    return text if len(text) <= SHORT else text[: SHORT - 1] + "…"


def tool_events(run_id: str, messages: list[ModelMessage]) -> list[dict]:
    """One entry per tool call (name, args, result) and per validator retry, from a run's new messages."""
    calls: dict[str, dict] = {}
    entries: list[dict] = []
    for message in messages:
        for part in message.parts:
            if isinstance(part, ToolCallPart):
                is_reply = part.tool_name.startswith("final_result")  # PydanticAI's structured-output step
                args = part.args_as_dict()
                entry = {
                    "time": part_time(message),
                    "run_id": run_id,
                    "event": "final_reply" if is_reply else "tool_call",
                    "tool": None if is_reply else part.tool_name,
                    "args": short(args.get("message", args)) if is_reply else short(args),
                    "result": None,
                }
                calls[part.tool_call_id] = entry
                entries.append(entry)
            elif isinstance(part, ToolReturnPart) and part.tool_call_id in calls:
                if calls[part.tool_call_id]["event"] == "final_reply":
                    calls[part.tool_call_id]["result"] = None
                    continue
                result = "customer profile returned (details not logged)" if part.tool_name in PRIVATE_TOOLS else short(part.content)
                calls[part.tool_call_id]["result"] = result
            elif isinstance(part, RetryPromptPart) and (part.tool_name is None or part.tool_name.startswith("final_result")):
                # a reply rejected by the output checks (PydanticAI tags it with the output step's name)
                entries.append({
                    "time": part.timestamp.isoformat(timespec="milliseconds"),
                    "run_id": run_id,
                    "event": "output_retry",
                    "tool": None,
                    "args": None,
                    "result": short(part.content if isinstance(part.content, str) else str(part.content)),
                })
    return entries


def part_time(message: ModelMessage) -> str:
    return message.timestamp.isoformat(timespec="milliseconds") if isinstance(message, ModelResponse) else now()


def append(entries: list[dict]) -> None:
    """Add entries to the audit trail without rewriting what's already there."""
    if not entries:
        return
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    body = ",\n".join(json.dumps(e, ensure_ascii=False) for e in entries)
    fd = os.open(AUDIT_PATH, os.O_RDWR | os.O_CREAT, 0o644)
    with os.fdopen(fd, "r+b") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            if size == 0:
                f.write(f"[\n{body}\n]\n".encode())
                return
            # Find the final "]" and write the new entries in front of it.
            pos = size - 1
            while pos >= 0:
                f.seek(pos)
                ch = f.read(1)
                if ch == b"]":
                    break
                if not ch.isspace():
                    raise ValueError(f"{AUDIT_PATH} does not end with ']'; refusing to modify it")
                pos -= 1
            empty = _array_is_empty(f, pos)
            while pos > 0:  # step back over whitespace so ",\n" follows the last entry directly
                f.seek(pos - 1)
                if not f.read(1).isspace():
                    break
                pos -= 1
            f.seek(pos)
            f.write(f"{'' if empty else ','}\n{body}\n]\n".encode())
            f.truncate()  # only drops the old closing bracket/whitespace we just re-wrote
            f.flush()
            os.fsync(f.fileno())
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _array_is_empty(f, closing: int) -> bool:
    """True if only whitespace sits between the opening "[" and the closing bracket."""
    pos = closing - 1
    while pos >= 0:
        f.seek(pos)
        ch = f.read(1)
        if not ch.isspace():
            return ch == b"["
        pos -= 1
    return False
