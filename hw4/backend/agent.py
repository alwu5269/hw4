"""Campus Customs shop chatbot: a PydanticAI agent using the catalogue tools.

Run a quick test from the backend folder:  python agent.py "Do you have navy hoodies?"
"""

import os
import sys
import time
import uuid
from pathlib import Path

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")  # hide PydanticAI's startup banner

from pydantic_ai import Agent, ModelRetry, RunContext, capture_run_messages  # noqa: E402
from pydantic_ai.exceptions import UnexpectedModelBehavior, UsageLimitExceeded  # noqa: E402
from pydantic_ai.usage import UsageLimits  # noqa: E402
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, TextPart, UserPromptPart  # noqa: E402
from pydantic_ai.models.openai import OpenAIChatModel  # noqa: E402
from pydantic_ai.providers.openai import OpenAIProvider  # noqa: E402

import audit  # noqa: E402
import fact_check  # noqa: E402
import safety  # noqa: E402
from models import ChatDeps, ChatReply, ChatTurn  # noqa: E402
from tools import (  # noqa: E402
    cards_for,
    get_current_page,
    get_customer,
    get_price,
    get_product_description,
    get_stock,
    search_products,
)

BACKEND_DIR = Path(__file__).resolve().parent
HW_DIR = BACKEND_DIR.parent  # the hw4 folder
PROMPT_PATH = BACKEND_DIR / "prompts" / "prompt.md"
MODEL_NAME = "gpt-5.6-luna"
PORTKEY_BASE_URL = "https://api.portkey.ai/v1"

# Loop limits for one customer message: model requests (each tool round-trip is one) and tool calls.
# Validator retries (fact check, secrets) are capped separately by `retries` on the agent.
LOOP_LIMITS = UsageLimits(request_limit=8, tool_calls_limit=12)
OUTPUT_RETRIES = 2


def find_env() -> Path | None:
    """The .env to use: hw4/.env first (copied from .env.example), else the nearest one in a parent folder."""
    for folder in (HW_DIR, *HW_DIR.parents):
        candidate = folder / ".env"
        if candidate.is_file():
            return candidate
    return None


def load_env() -> None:
    """Load variables from .env (see find_env) without overriding ones already set. Values are never printed."""
    env_file = find_env()
    if env_file is None:
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.lstrip().startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def build_agent() -> Agent[ChatDeps, ChatReply]:
    load_env()
    model = OpenAIChatModel(
        MODEL_NAME,
        provider=OpenAIProvider(base_url=PORTKEY_BASE_URL, api_key=os.environ["PORTKEY_API_KEY"]),
    )
    shop_agent = Agent(
        model,
        deps_type=ChatDeps,
        output_type=ChatReply,
        instructions=PROMPT_PATH.read_text(encoding="utf-8"),
        tools=[search_products, get_product_description, get_price, get_stock, get_customer, get_current_page],
        retries=OUTPUT_RETRIES,
    )

    @shop_agent.instructions
    def session_context(ctx: RunContext[ChatDeps]) -> str:
        """Per-request facts added after prompt.md: who is chatting and which page they're on."""
        lines = ["## This conversation"]
        customer = ctx.deps.customer
        if customer:
            lines.append(
                f"- Customer: logged in as {customer.first_name} {customer.last_name} ({customer.email}) "
                f"(member since {customer.member_since}). Their chat history is saved and shown above."
            )
        else:
            lines.append("- Customer: a guest (not logged in). History is not saved.")
        page = ctx.deps.page
        if page and page.product_id:
            lines.append(
                f"- Page: the customer is viewing the product page for product_id '{page.product_id}'. "
                "\"This\", \"it\", or \"this one\" means that product."
            )
        elif page:
            lines.append(f"- Page: the customer is on '{page.path}'.")
        return "\n".join(lines)

    @shop_agent.output_validator
    def check_reply(ctx: RunContext[ChatDeps], reply: ChatReply) -> ChatReply:
        """Rules enforced in code: no secrets in or requested by the reply, no prices or quantities that
        no tool returned, and an out-of-stock (or not offered) size the customer asked about must be
        stated clearly. A failing reply goes back to the model to fix."""
        if safety.contains_secret(reply.message) or safety.asks_for_secret(reply.message):
            raise ModelRetry(
                "Your message contains or asks for secret information (passwords, card numbers, CVV, "
                "SSN, account numbers, API keys). Never ask for or repeat these. Rewrite the message without it."
            )
        known = fact_check.known_numbers(ctx.messages, len(reply.products))
        wrong = fact_check.unverified_numbers(reply.message, known)
        if wrong:
            raise ModelRetry(
                f"Your message contains numbers that don't match any tool result: {', '.join(wrong)}. "
                "Every price, quantity, and count must come from a tool call. Call the tools again if needed "
                "and rewrite the message using only those numbers (or leave the number out)."
            )
        missing = fact_check.missing_stock_warnings(reply.message, ctx.messages)
        if missing:
            raise ModelRetry(
                "Your message doesn't clearly tell the customer about the size they asked for: "
                + "; ".join(missing)
                + ". Say it plainly and first (e.g. \"Sorry, it's out of stock in XL\"), then suggest sizes that are in stock."
            )
        return reply

    return shop_agent


_agent: Agent[ChatDeps, ChatReply] | None = None


def get_agent() -> Agent[ChatDeps, ChatReply]:
    """Build the agent once, on first use, and reuse it for every request."""
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent


def to_message_history(history: list[ChatTurn]) -> list[ModelMessage]:
    """Convert the website's earlier chat turns into PydanticAI message history."""
    messages: list[ModelMessage] = []
    for turn in history:
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        else:
            messages.append(ModelResponse(parts=[TextPart(content=turn.content)]))
    return messages


FALLBACKS = {
    "fact_check_failed": "Sorry, I couldn't double-check those details just now. Could you ask me again?",
    "loop_limit": "Sorry, that took me too many steps to look up. Could you ask about one product or category at a time?",
}


async def chat(message: str, history: list[ChatTurn] | None = None, deps: ChatDeps | None = None) -> ChatReply:
    """Run the agent for one customer message and record the loop in the audit trail.

    `message` and `history` should already be redacted (see safety.redact); main.py does this.
    """
    deps = deps or ChatDeps(user_id=None, customer=None, page=None)
    run_id = uuid.uuid4().hex[:12]
    started, started_at = time.monotonic(), audit.now()
    reply: ChatReply | None = None
    stop_reason, detail, usage = "error", None, None
    with capture_run_messages() as messages:
        try:
            result = await get_agent().run(
                message,
                message_history=to_message_history(history or []),
                deps=deps,
                usage_limits=LOOP_LIMITS,
            )
            reply = result.output
            usage = result.usage
            last = next((m for m in reversed(result.new_messages()) if isinstance(m, ModelResponse)), None)
            stop_reason = "final_answer"
            detail = f"model finish_reason: {getattr(last, 'finish_reason', None)}"
        except UnexpectedModelBehavior as exc:
            # The model kept giving replies that failed the checks (unbacked numbers or secrets).
            stop_reason, detail = "fact_check_failed", str(exc)
            reply = ChatReply(message=FALLBACKS[stop_reason], products=[])
        except UsageLimitExceeded as exc:
            stop_reason, detail = "loop_limit", str(exc)
            reply = ChatReply(message=FALLBACKS[stop_reason], products=[])
        except Exception as exc:
            stop_reason, detail = "error", type(exc).__name__
            raise
        finally:
            new = messages[len(history or []):]  # this run's messages (skip the history we passed in)
            entries = [{
                "time": started_at,
                "run_id": run_id,
                "event": "run_start",
                "user": f"user {deps.user_id}" if deps.user_id else "guest",
                "page": deps.page.path if deps.page else None,
                "message_chars": len(message),
            }]
            entries += audit.tool_events(run_id, new)
            entries.append({
                "time": audit.now(),
                "run_id": run_id,
                "event": "run_end",
                "stop_reason": stop_reason,
                "detail": audit.short(detail) if detail else None,
                "model_requests": usage.requests if usage else sum(isinstance(m, ModelResponse) for m in new),
                "tool_calls": sum(1 for e in entries if e.get("event") == "tool_call"),
                "products_returned": len(reply.products) if reply else 0,
                "seconds": round(time.monotonic() - started, 2),
            })
            try:
                audit.append(entries)
            except Exception as exc:  # never let audit logging break the chat
                print(f"Audit trail write failed: {exc!r}")

    # Replace the model's product cards with fresh database rows (and drop any unknown ids).
    reply.products = cards_for([p.product_id for p in reply.products])
    if not reply.products:
        reply.search_query = None
    return reply


if __name__ == "__main__":
    import asyncio

    question = " ".join(sys.argv[1:]) or "What hoodies do you have under $70?"
    print(asyncio.run(chat(question)).model_dump_json(indent=2))
