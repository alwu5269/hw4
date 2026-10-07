# Harness

## Database: `data/campus_customs.db`

### Table: `catalogue`

| Field | Type | Importance |
|---|---|---|
| `product_id` | TEXT (primary key) | Distinguishing id that identifies the product, used for product page links and to connect stock to the right item. |
| `name` | TEXT | The product name the shop shows and the chatbot uses when it recommends or talks about an item. |
| `garment_type` | TEXT | The type of clothing (e.g. short-sleeve T-shirt), so shoppers and the chatbot can find products by category like "hoodies". |
| `description` | TEXT | A sentence describing the product, so the chatbot can answer "what does it look like?" from real catalogue text instead of guessing. |
| `colors` | TEXT | Colors used on the product, so the chatbot can answer color questions like "do you have this in pink?" |
| `search_tags` | TEXT | Associated tags/words/phrases that categorize or identify the product, helping search match what shoppers type. |
| `image_file_path` | TEXT | The file path to the product image, so the site and the chat's product cards can show the photo. |
| `price` | REAL | Shown on the site and quoted by the chatbot, which must use this exact value and never make one up. |

### Table: `inventory`

| Field | Type | Importance |
|---|---|---|
| `id` | INTEGER (primary key) | Numerical id for this product–size stock entry, so each row can be referenced on its own. |
| `product_id` | TEXT (foreign key → `catalogue.product_id`) | Links each stock row to its product, allowing easy cross-reference between the inventory and catalogue tables. |
| `size` | TEXT | The clothing size (XS–XXL), so shoppers and the chatbot can check availability in the size they need. |
| `quantity` | INTEGER | Number of items in this size, so the site and chatbot can say whether a size is in stock, low, or sold out. |

Each (`product_id`, `size`) pair is unique.

### Table: `users`

| Field | Type | Importance |
|---|---|---|
| `id` | INTEGER (primary key) | Numerical id for the user, used to keep them logged in and to link their saved chat history. |
| `name` | TEXT | The user's full name, kept for display and account records. |
| `email` | TEXT (unique) | The user's login; unique so each email has only one account. |
| `password_hash` | TEXT | Salted hash of the password, so users can log in without the real password ever being stored. |
| `created_at` | TEXT | When the account was made, useful for account records and for the chatbot to know how long they've been a customer. |
| `first_name` | TEXT | Lets the site and chatbot greet a logged-in shopper by name. |
| `last_name` | TEXT | Completes the user's name for account records and personalization. |

### Table: `chat_messages`

| Field | Type | Importance |
|---|---|---|
| `id` | INTEGER (primary key) | Numerical id for the message, which also keeps messages in the order they were sent. |
| `user_id` | INTEGER (foreign key → `users.id`) | The user whose conversation this message belongs to (both their messages and the chatbot's replies), so history only loads for that user. |
| `role` | TEXT | Whether this message is from the user or the chatbot, so the conversation can be shown and replayed correctly. |
| `content` | TEXT | The message text, so the chat can be reloaded and the chatbot remembers what was said. |
| `products_json` | TEXT | The products the chatbot showed with its reply, so product cards reappear when the chat is reloaded. |
| `created_at` | TEXT | When the message was sent, for ordering and record keeping. |

## Authentication (Create account and log in)

Code: `backend/auth.py` (API), `frontend/src/auth.tsx` (log-in state), `frontend/src/pages/CreateAccount.tsx` and `Login.tsx` (forms).

### Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/signup` | Validates the form, saves a new row in `users`, and logs the new user in. |
| `POST /api/auth/login` | Checks an email and password and returns a session token. |
| `GET /api/auth/me` | Returns the logged-in user for a valid token (used to restore the session on page load). |

### What is stored for a user

A new account adds one row to the `users` table:

| Field | What is saved |
|---|---|
| `id` | Assigned automatically by SQLite. |
| `first_name`, `last_name` | As entered, with surrounding spaces removed. |
| `name` | `first_name` + `last_name`, since the existing column is required. |
| `email` | Lowercased, so `Ada@Yale.edu` and `ada@yale.edu` are the same account. The column is `UNIQUE`, so one account per email. |
| `password_hash` | A salted hash of the password. **The password itself is never stored.** |
| `created_at` | Filled in automatically by the database. |

The API never sends `password_hash` back to the browser; responses only include `id`, names, email, and `created_at`.

### Account rules

Checked in the browser for instant feedback and checked again on the server, so they can't be bypassed:
- First name, last name, email, password, and confirm password are all required.
- The email must look like `name@domain.tld` and must not already have an account.
- The password must be **6–16 characters** and include **at least one special character** (anything other than a letter or number).
- Password and confirm password must match.

These rules apply when an account is **created**; logging in doesn't re-check them. That's why the seeded test user's password, `password`, still works even though it has no special character and couldn't be chosen through the Create Account form today.

### How passwords are protected

- **Salt:** every account gets its own random 16-byte salt from Python's `secrets` module. Two people with the same password get completely different hashes, so precomputed "rainbow tables" are useless and a cracked hash reveals nothing about other accounts.
- **Slow hashing:** the password and salt are run through **PBKDF2-HMAC-SHA256 with 600,000 iterations** (OWASP's recommendation). This makes each guess expensive, so brute-forcing a stolen database is very slow.
- **Storage format:** `pbkdf2_sha256$<iterations>$<salt>$<hash>`. Storing the iteration count lets it be raised later without breaking old accounts. The three seeded accounts use an older `pbkdf2_sha256$<salt>$<hash>` format with no iteration count; these were made with 120,000 iterations, which the server uses for that format (`LEGACY_ITERATIONS` in `backend/auth.py`). New accounts use the stronger 600,000.
- **Checking a log in:** the entered password is hashed with the stored salt and iterations and compared using a constant-time comparison (`hmac.compare_digest`), so timing can't leak how close a guess was.
- **No account hints:** a wrong email and a wrong password give the same message ("Incorrect email or password."). When the email doesn't exist, the server still hashes against a dummy value so both cases take the same time, which stops attackers from discovering which emails have accounts.

### Staying logged in

- After a successful sign up or log in, the server returns a **session token** containing the user's id and an expiry time (7 days), signed with HMAC-SHA256. Any change to the token breaks the signature and it is rejected.
- The browser keeps the token in `localStorage` and sends it as `Authorization: Bearer <token>`. Logging out deletes it.
- The signing secret comes from the optional `AUTH_SECRET` environment variable in `.env` (see `.env.example`). If it isn't set, a random secret is made when the server starts, which logs everyone out on each restart.

### Checked

Run against the live backend (`POST /api/auth/...`); the test account was deleted afterwards so the database is back to its original 3 users.

| Test | Result |
|---|---|
| Log in as the seeded test user `test@campuscustoms.yale.edu` / `password` | ✅ Logged in as Test User (id 1). |
| Same user, wrong password | ✅ Rejected with "Incorrect email or password." (401). |
| Create a brand-new account (first name, last name, email, password, confirm password) | ✅ Account created (201) and saved as a new `users` row with `name`, `email`, `first_name`, `last_name`, and `created_at`. |
| Log in with the new account | ✅ Logged in, and its session token was accepted by `GET /api/auth/me`. |
| Password storage for the new account | ✅ `password_hash` starts with `pbkdf2_sha256$600000$…`; the plaintext password appears nowhere in the row. |

## Shop chatbot (PydanticAI agent behind FastAPI)

### Files

| File | Role |
|---|---|
| `backend/main.py` | The FastAPI app: product, image, auth, and chat routes. |
| `backend/agent.py` | Builds the PydanticAI agent and exposes `chat(message, history)`. |
| `backend/tools.py` | Read-only catalogue tools the agent can call. |
| `backend/models.py` | Pydantic models for chat requests, replies, product cards, and agent deps. |
| `backend/chat_history.py` | Saves and loads logged-in shoppers' chat in `chat_messages`. |
| `backend/search.py` | Ranked catalogue search (stems, synonyms, typos). |
| `backend/fact_check.py` | Checks every price/count in a reply against tool results. |
| `backend/safety.py` | Redacts secrets from messages; detects replies that contain or ask for secrets. |
| `backend/audit.py` | Appends agent-loop activity to `output/audit_trail.json`. |
| `backend/prompts/prompt.md` | The system prompt: Campus Customs voice and safety basics. |
| `frontend/src/components/ChatWidget.tsx` | The floating chat widget on the website. |

Run the backend from the `backend` folder (with the `hw4/.venv` activated):

```
uvicorn main:app --reload --port 8000
```

The backend modules import each other by plain name (`from db import ...`), so the command must be run from inside `backend/`.

### How the frontend talks to FastAPI

1. The React app runs on the Vite dev server (`http://localhost:5173`). `frontend/vite.config.ts` proxies every `/api/...` and `/images/...` request to FastAPI on `http://127.0.0.1:8000`, so the browser only ever talks to one origin. FastAPI also allows `localhost:5173` through CORS.
2. Pages call FastAPI with `fetch` (helpers in `frontend/src/api.ts` and `frontend/src/auth.tsx`):

| Route | Used by |
|---|---|
| `GET /api/products` | Home (featured products) and the Products page. |
| `GET /api/products/{product_id}` | The single-product page (description, price, stock by size). |
| `GET /images/products/<file>.jpg` | Product photos, served straight from `data/products`. |
| `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me` | Create account, log in, restore a session. |
| `POST /api/chat` | The chat widget. |
| `GET /api/chat/history`, `DELETE /api/chat/history` | Reload or clear a logged-in shopper's saved chat. |

3. **Chat flow:** when a customer sends a message, the widget POSTs

   ```json
   { "message": "Any navy hoodies in medium?", "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }] }
   ```

   `history` (guests only) is the signed conversation window the server returned with the previous reply, plus its `history_token`; the server drops it if anything was changed (see `output/usability.md`); for logged-in shoppers the server ignores it and loads saved history from the database instead (see "Customer memory" below). The request also includes `page` and, when logged in, an `Authorization` header. FastAPI validates the body as `ChatRequest` (message 1–1000 characters, at most 20 history turns), runs the agent, and returns a `ChatResponse` (a `ChatReply` plus, for guests, the next signed `history` and `history_token`):

   ```json
   { "message": "Here are 12 hoodies we carry...", "products": [{ "product_id": "...", "name": "...", "garment_type": "...", "price": 68.0, "image_url": "/images/products/...jpg", "total_stock": 60 }], "search_query": "hoodies" }
   ```

   (`search_query` is explained in "Chat search that updates the page" below.)

   The widget shows `message` as Dan's chat bubble and each item in `products` as a small card (photo, name, price, stock) that links to that product's page. While waiting it shows a typing indicator; if the agent fails, FastAPI returns a 502 with a friendly message that appears in the chat instead of crashing the page.

### How the agent is loaded

- `main.py` imports `agent` and calls `agent.load_env()` first, which reads `hw4/.env` (or, if missing, the nearest `.env` in a parent folder) for `PORTKEY_API_KEY` and optional `AUTH_SECRET` into environment variables without printing them.
- The agent is **built once, lazily**, the first time `/api/chat` is called (`get_agent()`), then reused for every request. This keeps server start-up fast and means the API key is only needed when chat is used.
- `build_agent()` creates:
  - **Model:** `OpenAIChatModel("gpt-5.6-luna")` with an `OpenAIProvider` pointed at Portkey (`https://api.portkey.ai/v1`) using `PORTKEY_API_KEY`.
  - **Instructions:** the contents of `backend/prompts/prompt.md`, read from disk, so the voice and rules can be edited without touching code. (With `--reload`, saving a `.py` file restarts the server; after editing only `prompt.md`, restart the server to pick it up.)
  - **Tools:** `search_products`, `get_product_description`, `get_price`, and `get_stock` from `tools.py` (see "Tools: product info and stock" below). PydanticAI turns each function's type hints and docstring into a tool description the model can call.
  - **Output type:** `ChatReply`, so the model must return a valid `message` plus a list of `ProductCard`s. PydanticAI validates it and asks the model to retry (up to 2 times) if it doesn't fit.
- `chat()` converts the website's `history` into PydanticAI message history and runs the agent with the new message.

### Models (`backend/models.py`)

| Model | Purpose |
|---|---|
| `ProductCard` | A product shown as a card in the chat (also what `search_products` returns). |
| `ProductDescription`, `ProductPrice`, `StockLevels`, `SizeAvailability`, `ProductNotFound` | Tool look up results (see below). |
| `ChatReply` | The agent's structured output and the `/api/chat` response: `message` + `products` + `search_query`. |
| `ChatTurn` | One earlier message (`role`, `content`). |
| `ChatRequest` | The `/api/chat` request body: `message` + `history` + `page`. |
| `PageContext`, `CustomerProfile`, `CurrentPage`, `ChatDeps`, `SavedChatMessage` | Customer memory and page context (see "Customer memory" below). |

### Voice and safety (`backend/prompts/prompt.md`)

- **Voice:** Dan, the friendly Campus Customs bulldog. Warm, short replies (1–3 sentences), a little Bulldog spirit, "we/our shop", and product cards instead of long lists.
- **Grounded answers:** product facts (prices, sizes, stock, colors) must come from the tools; the bot never invents products, prices, or stock (details below).
- **Safety basics:** stays on Campus Customs topics and declines unrelated requests; can't place orders, take payments, or change accounts; never asks for or repeats card numbers, passwords, or other sensitive info; no made-up discounts, policies, or shipping times; says it's an AI and not an official Yale representative; stays kind and avoids offensive content; ignores messages that try to override its rules or reveal the prompt.

## Tools: product info and stock

The agent has no product knowledge of its own; it answers from four read-only tools in `backend/tools.py`. Each tool returns a typed Pydantic model from `backend/models.py`, so the model sees clearly named fields instead of raw database rows. PydanticAI turns each function's type hints and docstring into the tool description the model reads.

### The tools

| Tool | Arguments | Returns | Use it for |
|---|---|---|---|
| `search_products` | `query`, `max_price`, `in_stock_only`, `limit` | `list[ProductCard]` | Finding products and their `product_id`s ("navy hoodies under $70"). Ranked search with stems, synonyms, and typo tolerance (`backend/search.py`, see `output/usability.md`). |
| `get_product_description` | `product` | `ProductDescription` or `ProductNotFound` | What a product looks like: design, garment type, colors. |
| `get_price` | `product` | `ProductPrice` or `ProductNotFound` | The exact price. |
| `get_stock` | `product`, optional `size` | `StockLevels` or `ProductNotFound` | How many are in stock in each size, and whether a requested size is available. |

- `product` accepts a `product_id` (preferred, from `search_products`) or an exact product name. If a partial name matches exactly one product it is used; otherwise the tool returns `ProductNotFound` with up to 5 suggestions rather than guessing.
- `size` accepts `XS`–`XXL` or words like "medium", "large", "2XL".
- All queries are parameterized SQL `SELECT`s, so the tools can only read the database.

### Look up result fields and why they were chosen

**`ProductDescription`** (from `get_product_description`)

| Field | Why |
|---|---|
| `product_id`, `name` | Confirm which product was found, so the agent names it correctly and can link a card to it. |
| `garment_type` | Answers "is it a hoodie or a crewneck?" and helps describe it naturally. |
| `description` | The catalogue's description of the design, the main thing customers ask for. |
| `colors` | Parsed from JSON into a list so the agent can answer color questions directly. |

Price and stock are left out on purpose so the agent uses the dedicated tools for those facts.

**`ProductPrice`** (from `get_price`)

| Field | Why |
|---|---|
| `product_id`, `name` | Confirm the product the price belongs to. |
| `price` | The exact catalogue value; the prompt tells the agent to quote it exactly (e.g. "$68.00"). |
| `currency` | Always `"USD"`, so the agent never has to assume a currency. |

**`StockLevels`** (from `get_stock`)

| Field | Why |
|---|---|
| `product_id`, `name` | Confirm the product. |
| `sizes` (list of `SizeAvailability`) | Every size the product is made in, ordered XS→XXL, each with its exact `quantity` and an `in_stock` flag. |
| `total_stock` | Answers "do you have any?" and lets the agent say a product is sold out. |
| `in_stock_sizes`, `out_of_stock_sizes` | Pre-computed lists so the agent can say "available in S, M, L" or "out of stock in XS" without filtering the numbers itself, which reduces mistakes. |
| `requested_size` | The size the customer asked about, normalized ("medium" → "M"). |
| `requested_size_status` | `"in stock"`, `"out of stock"`, or `"not offered"`. An explicit status makes "out of stock" hard to miss; the prompt requires the agent to say it clearly first and then suggest in-stock sizes. |

**`SizeAvailability`**: `size`, `quantity`, and `in_stock` (`quantity > 0`). The boolean repeats what `quantity` says on purpose: it gives the model a clear yes/no, and its field description reminds it to tell the customer when a size is out of stock.

**`ProductNotFound`**: `error` (a message telling the agent not to guess) and `suggestions` (close matches as `ProductCard`s). Returning a typed "not found" result instead of an empty value or an exception makes the agent say it couldn't find the product, or ask which suggestion was meant, instead of inventing one.

### How the prompt enforces this

`backend/prompts/prompt.md` has a **Tools** section mapping each kind of question to its tool, and **Stock rules**:
- every product, price, description, and quantity must come from a tool call in the current turn (stock and prices can change), and nothing may be invented, estimated, or rounded;
- an out-of-stock size must be stated clearly first ("Sorry, the Basic Hoodie Big Yale is out of stock in Medium."), followed by the sizes that are in stock or a similar product;
- "not offered" sizes, low stock (5 or fewer), and fully sold-out products each have a set way to answer;
- replies are plain text (no markdown), because the chat widget shows text as-is.

**Enforced in code, not just the prompt:** the agent's output validator (`check_reply` in `agent.py`, using `fact_check.missing_stock_warnings`) looks at every `get_stock` result in the conversation. If the customer asked about a size whose `requested_size_status` is `"out of stock"`, the reply must say so ("out of stock", "sold out", "none left", "not available", ...); if it's `"not offered"`, the reply must say the product doesn't come in that size. Otherwise the reply is rejected and sent back to the model with the exact problem (e.g. "get_stock says Baseball Left Chest Crewneck is OUT OF STOCK in size XL"), up to 2 retries. Curly apostrophes ("doesn’t") are normalized first so correct replies aren't rejected. Rejections are recorded as `output_retry` entries in the audit trail.

Live check: "Do you have the Baseball Left Chest Crewneck in XXXL?" → "The Baseball Left Chest Crewneck doesn't come in XXXL. It's available in S, M, L, and XXL; M has only 5 left." (accepted on the first try).

### Checked examples (live agent)

| Question | Reply (summary) |
|---|---|
| "Do you have the Baseball Left Chest Crewneck in size XS?" | Said it is out of stock in XS first, offered S, M, L, XXL, and noted only 5 left in M. Matches the database. |
| "How much is the Basic Hoodie Big Yale and how many mediums are left?" | $68.00, 5 left in Medium. Matches the database. |
| "How much is the unicorn onesie?" | Said it couldn't find that product and couldn't confirm a price; offered to search for something similar. |
| "Describe the Boola Boola t-shirt" | Described it from the catalogue description. |

## Chat search that updates the page

When a customer asks the chatbot to find or browse products ("What hoodies do you have?"), the matching products appear as full product cards on the website, not just in the chat.

### How search results reach the page

1. **Customer asks in the chat widget.** `ChatWidget.tsx` POSTs the message (plus recent history) to `POST /api/chat`.
2. **The agent searches.** Following `prompts/prompt.md` ("Search results on the page"), the agent calls `search_products` (up to 12 results) and returns a `ChatReply` with:
   - `message`: a short reply that points to the page ("Here are 12 hoodies we carry; I've put them on the page for you!");
   - `products`: every match, best first;
   - `search_query`: a short label of the search, e.g. `"hoodies"`. This is the signal that the reply is a catalogue search. It stays `null` for questions about one product, small talk, or no matches.
3. **The backend rebuilds the cards from the database.** In `agent.chat()`, `tools.cards_for()` replaces the model's `products` with fresh rows from `catalogue` + `inventory`, in the same order, dropping any `product_id` that doesn't exist. So names, prices, images, and stock on the page always come from the database, never from text the model wrote. If nothing valid is left, `search_query` is cleared.
4. **The widget hands the results to the page.** If the reply has a `search_query` and products, the widget:
   - saves `{ query, products }` in the shared `ChatResultsProvider` (`frontend/src/chatResults.tsx`, a React context wrapped around the whole app in `main.tsx`);
   - navigates to `/products` and scrolls to the top.
   The chat panel lives outside the routes, so it stays open with the conversation intact.
5. **The Products page shows them.** `Products.tsx` reads the context and, when results exist, shows a highlighted **"From your chat with Dan: 12 results for 'hoodies'"** section above the normal catalogue, using the same `ProductCard` component as the rest of the site (image, garment type, name, a short description, price, stock, and Sold Out / Almost Gone badges). The short description is the product's catalogue `description`, cut to two lines with "…"; `cards_for()` adds it when rebuilding the cards, in a `ProductCard.description` field that is hidden from the model's output schema, so the model never writes it. A **Clear** button removes it. The regular catalogue, search box, and pagination still appear below under "Browse everything".
6. **In the chat**, a search reply shows the first 3 matches as small cards plus a **"See all 12 on the page →"** button that shows the full results on the page again (useful after clearing them or leaving the page). Non-search replies (e.g. one product's price) show their product cards in the chat and **don't** change the page, so a customer reading a product page isn't taken away from it.

### Single-item pages still work

- Every card links to `/products/<product_id>`: the chat's small cards (`<Link>` in `ChatWidget.tsx`), the chat-results grid, and the normal catalogue grid all use the same route.
- That route is the existing `ProductDetail` page (large image on one side; description, price, colors, size buttons, and stock by size on the other), which loads fresh data from `GET /api/products/{product_id}`.
- Because chat results are kept in React state (not the URL), going **Back** from a product page returns to the Products page with the chat results still shown.

### Prompt changes (`backend/prompts/prompt.md`)

A new **"Search results on the page"** section tells the agent:
- for browsing/searching, call `search_products` with `limit` 12, put all matches in `products`, set `search_query`, and keep `message` short (don't list every product in text);
- for a question about one specific product, leave `search_query` null and include just that product, so the page doesn't change;
- for small talk, store questions, or no matches, leave both empty;
- when the customer narrows a search ("only the navy ones"), search again and set a new `search_query`.

The "How to answer" section also now describes the three reply parts (`message`, `products`, `search_query`) and says to always use the exact `product_id`s from tool results.

### Checked in the browser

| Step | Result |
|---|---|
| On the About page, asked "What hoodies do you have?" | Site moved to `/products` and showed "12 results for 'hoodies'" with 12 cards; chat showed 3 cards and "See all 12 on the page". |
| Clicked a hoodie card in the chat | Opened `/products/basic-hoodie-big-yale` with the full single-item layout and 6 sizes; chat stayed open. |
| Pressed Back, then clicked a card in the results grid | Results were still there; opened that product's page. |
| On a product page, asked "How many of these are left in large?" | Answered with Large stock for the hoodies (spot-checked against the database) and the page did **not** change. |
| Re-check after adding short descriptions to cards | Asked "What hoodies do you have?" from About: 12 result cards, each with image, name, price, and short info (e.g. Champion Full Zip Hood, $88.00, "Charcoal gray Champion full-zip hoodie with drawst…"). Clicking a results card opened `/products/champion-full-zip-hood` (large image, description, 6 sizes); Back kept the results; clicking a chat card opened `/products/basic-hoodie-big-yale`. |

## Customer memory

When a shopper is logged in, their chat is saved to `chat_messages` and reloaded when they come back, and the agent knows who they are. Guests get the same chatbot, but nothing is saved. Every message also carries the page the shopper is on, so "do you have this in pink?" works on a product page.

### How user chat history is stored

**Table:** `chat_messages` (existing schema, no changes)

| Column | What is saved |
|---|---|
| `id` | Auto-increment; also gives the message order. |
| `user_id` | The logged-in shopper (`users.id`). Only logged-in shoppers' messages are ever saved. |
| `role` | `"user"` for the shopper's message, `"assistant"` for Dan's reply. |
| `content` | The message text. |
| `products_json` | For assistant replies: a JSON list of the product cards shown with the reply (`product_id`, `name`, `garment_type`, `price`, `image_url`, `total_stock`). `NULL` for the shopper's messages. Same format as the rows already in the table. |
| `created_at` | Filled in by the database. |

**Flow** (`backend/chat_history.py`, used by `backend/main.py`):

1. **Who is chatting:** `POST /api/chat` reads the `Authorization: Bearer <token>` header (the same signed session token as log in). `auth.current_user()` verifies it and loads the `users` row. No valid token → guest.
2. **History for the agent:** for a logged-in shopper the server loads their **last 20 saved messages** from the database (`load_for_agent`) and gives them to the agent as message history. The `history` sent by the browser is ignored, so a shopper can't inject fake earlier messages. For guests, the browser sends back the server-signed window of the last 10 turns (edited history is rejected), and nothing is stored.
3. **Saving:** after the agent replies successfully, the shopper's message and Dan's reply are inserted together (`save_exchange`). If the agent fails, nothing is saved.
4. **Reloading when they return:** when the site loads with a logged-in shopper, the chat widget calls `GET /api/chat/history`, which returns their **last 50 messages** (`load_for_page`). Product cards are rebuilt from the database by `product_id`, so prices and stock shown in old replies are current. The widget shows them under a "Welcome back, Tess!" greeting.
5. **Logging in/out:** `App.tsx` renders the widget with `key={user.id}` (or `"guest"`), so logging in loads that shopper's history and logging out clears the widget back to a guest chat. The note under the chat header says "Your chat is saved to your account." or "Log in to save your chat for next time."
6. **Start over:** logged-in shoppers can press **Start over** in the chat header, which calls `DELETE /api/chat/history` and removes their saved messages.

History endpoints return `401` without a valid token, and every query is filtered by the token's `user_id`, so shoppers can only read or clear their own chat.

### What customer fields the agent sees

The agent gets the customer through **PydanticAI deps**: each run is passed a `ChatDeps` (`backend/models.py`):

| `ChatDeps` field | Contents |
|---|---|
| `user_id` | The logged-in user's id, or `None` for guests. Used by the server; not shown to the model. |
| `customer` | A `CustomerProfile`, or `None` for guests. |
| `page` | The `PageContext` sent by the website (below). |

`CustomerProfile` holds the **only** customer fields the model can see:

| Field | Why |
|---|---|
| `first_name` | To greet the shopper by name. |
| `last_name` | To answer "what's my name?" fully. |
| `email` | So the agent knows exactly who is chatting (the assignment asks for name and email) and can answer "which email is my account under?". It's the customer's own email, shown only to them. |
| `member_since` | Account creation date (`YYYY-MM-DD`), for light personalization ("thanks for being with us since..."). |
| `previous_messages` | How many messages are saved, so the agent knows whether it has history with this shopper. |

**Not shared with the agent:** the password hash and the raw user id. The model doesn't need them, and leaving them out means a prompt-injection attempt can't make the bot reveal them. The email is only ever available inside that customer's own logged-in conversation, the prompt tells the agent to mention it only when asked, and it is never written to the audit trail (the `get_customer` result is logged only as "customer profile returned").

The customer reaches the model in two ways:
- **Dynamic instructions:** an `@agent.instructions` function (`session_context` in `agent.py`) adds a short "This conversation" section after `prompt.md` on every run, e.g. "Customer: logged in as Tess Quinn (tess@example.com) (member since 2026-10-04)" or "Customer: a guest".
- **Tool:** `get_customer(ctx)` returns the `CustomerProfile` from `ctx.deps` (or says the shopper is a guest), for when they ask what Dan knows about them.

`prompt.md` ("Who you're talking to...") tells the agent to greet logged-in shoppers by first name once, use their saved history naturally, never claim to know anything beyond these fields (no orders, address, or payment details), and to suggest logging in if a guest asks to be remembered.

### How page context is passed

1. **Browser:** before each message, `ChatWidget.tsx` builds a `PageContext` from the current URL using React Router's `matchPath('/products/:productId', ...)`:

   ```json
   { "path": "/products/baseball-left-chest-crewneck", "product_id": "baseball-left-chest-crewneck" }
   ```

   On other pages `product_id` is `null` (e.g. `{ "path": "/about", "product_id": null }`). It is sent as `page` in the `POST /api/chat` body.
2. **Server:** FastAPI validates it as `PageContext` (both fields length-limited) and puts it in `ChatDeps.page`.
3. **Agent:** the dynamic "This conversation" instructions say which product page the shopper is viewing and that "this", "it", and "this one" mean that product. The `get_current_page(ctx)` tool returns a `CurrentPage` (`path`, `page_name`, and the on-screen `product` as a `ProductCard` rebuilt from the database, or `null` if the id isn't a real product).
4. **Prompt:** "Who you're talking to and what they're looking at" tells the agent to call `get_current_page` when the shopper refers to an item without naming it, then use `get_product_description` (colors) and `get_stock` (sizes) to answer, and to ask which product they mean if they aren't on a product page.

Only the URL path and product id are sent, never page content, so the agent still looks up every fact itself and can't be fed false product details through page context.

### Checked

| Test | Result |
|---|---|
| Logged in, on the Baseball Left Chest Crewneck page, asked "do you have this in pink?" | "Sorry, this crewneck doesn't come in pink; it's available in navy and white." (matches the catalogue colors) |
| Then asked "What's my name, and what did I just ask you about?" (API test) | Answered "Tess Quinn" and recalled the pink crewneck question. |
| Reloaded the site (returning visit) | Chat showed "Welcome back, Tess!" plus the saved question, reply, and its product card. |
| Logged out | Chat reset to the guest greeting with "Log in to save your chat for next time." |
| Guest asked "What's my name?" | Said it doesn't know because they're a guest; nothing saved; `GET /api/chat/history` returned 401. |
| Start over (`DELETE /api/chat/history`) | Removed the saved messages. |

Test accounts and messages were removed afterwards, so the database is back to its original 3 users and 22 messages.

## Audit trail (`output/audit_trail.json`)

Every chatbot run (one customer message) is recorded in `output/audit_trail.json` by `backend/audit.py`, called from `agent.chat()`.

### Append-only

- The file is a JSON array that **only grows**. Each write opens the file, takes an exclusive lock (`fcntl.flock`, so simultaneous requests can't interleave), finds the closing `]`, and writes the new entries in front of it. Earlier entries are never rewritten, reordered, or deleted, and the file is never truncated or recreated, so it survives server restarts and `--reload`.
- If the file is missing it is created; if it doesn't end in `]` (corrupted by hand), the logger refuses to touch it instead of overwriting it.
- A logging failure is printed but never breaks the chat.

### What is recorded

Each run has a `run_id` and produces:

| Event | Fields | Meaning |
|---|---|---|
| `run_start` | `time`, `user` (`"guest"` or `"user <id>"`), `page` (URL path), `message_chars` | A customer message started an agent run. Only the message **length** is logged, not its text. |
| `tool_call` | `time`, `tool`, `args`, `result` | One tool the agent called, with short (≤160 character) summaries of its arguments and result, e.g. `get_stock` → `"basic-hoodie-big-yale: XS 15, S 5, M 5, L 8, XL 2, XXL 25; asked XL: in stock"`; search results list the count and first 3 product ids. |
| `output_retry` | `time`, `result` | A reply was rejected by the safety/fact check and sent back to the model to fix (the reason is in `result`). |
| `final_reply` | `time`, `args` | The reply text Dan sent (short summary). |
| `run_end` | `time`, `stop_reason`, `detail`, `model_requests`, `tool_calls`, `products_returned`, `seconds` | How the loop ended. |

**Stop reasons:** `final_answer` (normal reply; `detail` holds the model's own finish reason), `fact_check_failed` (replies kept failing the number/secret checks after the retries, so a safe fallback message was sent), `loop_limit` (hit the request or tool-call limit; fallback message sent), `error` (anything else, e.g. a network failure; the website shows a friendly error).

**Privacy:** all summaries go through `safety.redact()` and email addresses are masked as `[email]`, the customer's message text isn't logged, and the `get_customer` result is logged only as "customer profile returned (details not logged)". Entries from early test runs remain in the file because it is append-only, including two `error` runs caused by a bug fixed during development, and one `final_reply` from before email masking was added that contains the seeded test account's email (`test@campuscustoms.yale.edu`, the shared test login from the assignment).

Example (abridged):

```json
{"time": "2026-10-05T04:43:39.440+00:00", "run_id": "8a275527007c", "event": "run_start", "user": "guest", "page": null, "message_chars": 63},
{"time": "...", "run_id": "8a275527007c", "event": "tool_call", "tool": "get_stock", "args": "{\"product\": \"basic-hoodie-big-yale\", \"size\": \"XL\"}", "result": "basic-hoodie-big-yale: XS 15, S 5, M 5, L 8, XL 2, XXL 25; asked XL: in stock"},
{"time": "...", "run_id": "8a275527007c", "event": "final_reply", "tool": null, "args": "Yes—the Basic Hoodie Big Yale is in stock in XL, with only 2 left. It's $68.00. Boola boola!", "result": null},
{"time": "...", "run_id": "8a275527007c", "event": "run_end", "stop_reason": "final_answer", "model_requests": 3, "tool_calls": 3, "products_returned": 1, "seconds": 1.58}
```

## How the system works (summary)

### Model fields (`backend/models.py`) and why they were chosen

All are Pydantic models (validated automatically), except `ChatDeps`, a plain dataclass passed to the agent as PydanticAI deps.

**Product data**

| Model | Fields | Why |
|---|---|---|
| `ProductCard` | `product_id`, `name`, `garment_type`, `price`, `image_url`, `total_stock`, plus a hidden `description` | Everything a card needs (photo, type, name, price, stock) and nothing more. The hidden `description` is the catalogue text shown (shortened to two lines) on the cards; it is filled from the database when cards are rebuilt (`tools.cards_for`) and is left out of the model's output schema (`SkipJsonSchema`), so the model never writes it. `product_id` builds the link to the product page and is the key the backend uses to rebuild cards from the database, so the website never shows values typed by the model. |
| `ProductDescription` | `product_id`, `name`, `garment_type`, `description`, `colors` | Answers "what does it look like?" Price and stock are left out so the agent must use the dedicated tools for those facts. `colors` is a list so color questions ("in pink?") are answered directly. |
| `ProductPrice` | `product_id`, `name`, `price`, `currency` (`"USD"`) | The exact price plus its currency, so nothing is assumed or converted. |
| `SizeAvailability` | `size`, `quantity`, `in_stock` | Exact count per size, plus a yes/no flag whose description reminds the model to say when a size is out of stock. |
| `StockLevels` | `product_id`, `name`, `sizes`, `total_stock`, `in_stock_sizes`, `out_of_stock_sizes`, `requested_size`, `requested_size_status` | Pre-computed lists and an explicit `"in stock"` / `"out of stock"` / `"not offered"` status, so the model doesn't have to do the filtering (fewer mistakes) and "out of stock" is impossible to miss. |
| `ProductNotFound` | `error`, `suggestions` | A typed "not found" (with up to 5 close matches) instead of an empty result, so the agent says it couldn't find something instead of inventing it. |

**Chat**

| Model | Fields | Why |
|---|---|---|
| `ChatReply` (agent output) | `message`, `products` (≤12), `search_query` | The model must return this exact shape; PydanticAI validates it. `products` drives the cards; `search_query` is the explicit signal for "show these as search results on the Products page", which keeps single-product answers from moving the page. |
| `ChatTurn` | `role` (`user`/`assistant`), `content` | One earlier message; the role is restricted to the two real speakers. |
| `PageContext` | `path`, `product_id` (both length-limited) | Just enough for "this" to mean the product on screen, without sending any page content the model could be misled by. |
| `ChatRequest` | `message` (1–1000 chars), `history` (≤20), `history_token`, `page` | Size limits stop huge requests; `history_token` makes guest history tamper-proof. |
| `ChatResponse` | `ChatReply` fields + `history`, `history_token` | Returns the signed conversation window to guests. |
| `SavedChatMessage` | `id`, `role`, `content`, `products`, `created_at` | A saved message reloaded into the widget, with product cards rebuilt from current stock. |

**Customer and run context**

| Model | Fields | Why |
|---|---|---|
| `CustomerProfile` | `first_name`, `last_name`, `email`, `member_since`, `previous_messages` | The only customer facts the agent can see: who is chatting (name and email), enough to greet by name, and whether there's history. The password hash and internal id are deliberately excluded. |
| `CurrentPage` | `path`, `page_name`, `product` | What the shopper is looking at, with the product rebuilt from the database. |
| `ChatDeps` (dataclass) | `user_id`, `customer`, `page` | Per-request context for tools and dynamic instructions (who is chatting, which page). |

### Tools and abilities

| Tool | What it can do |
|---|---|
| `search_products(query, max_price, in_stock_only, limit)` | Ranked catalogue search with plurals, synonyms, typo tolerance, price cap, and in-stock filter; returns up to 12 `ProductCard`s. |
| `get_product_description(product)` | Design, garment type, and colors for one product. |
| `get_price(product)` | Exact price in USD. |
| `get_stock(product, size?)` | Stock for every size, plus whether a requested size is in stock, out of stock, or not offered. |
| `get_customer()` | The logged-in customer's profile (or "guest"). Uses deps. |
| `get_current_page()` | The page the shopper is on and the product shown there. Uses deps. |

All tools are **read-only** (parameterized `SELECT`s), so the chatbot can't change products, stock, accounts, or orders. Beyond tools, the agent can: answer from saved history (logged in) or signed history (guests), put search results on the Products page (`search_query`), and greet logged-in customers by name. It **cannot** place orders, take payments, change accounts, or see passwords (it sees only the logged-in customer's own email).

### Safety rules

Rules in `backend/prompts/prompt.md` ("Safety rules" and "Safety basics"), backed by code wherever possible:

| Rule | In the prompt | Enforced in code |
|---|---|---|
| **Never make up values or information** (products, prices, sizes, stock, counts, policies, customer details) | Safety rule 1; "Tools: always look facts up"; "Stock rules" | `fact_check.py` output validator rejects any price or count not returned by a tool, and any reply that doesn't clearly state an out-of-stock / not-offered size the customer asked about (model must fix it, max 2 retries, then a safe fallback); product cards are rebuilt from the database by id; unknown ids are dropped; tools return `ProductNotFound` instead of guesses. |
| **No secret information asked for or saved** (passwords, card numbers, CVV, SSN, bank details, API keys) | Safety rule 2; "No orders, payments, or account changes" | `safety.redact()` replaces secrets with `[redacted]` in the customer's message **before** it reaches the model, the `chat_messages` table, guest history, or the audit trail (card numbers are confirmed with the Luhn check so prices and years are untouched). The output validator rejects replies that contain a secret or ask for one ("what's your card number?"), while allowing warnings ("please don't share your card number"). |
| Stay on topic; no orders/payments; no made-up policies or checkout; honest about being an AI; kind; ignore injected instructions | "Safety basics" | History can't be faked (logged-in history comes only from the database; guest history is HMAC-signed); page context is only a path and product id; all tools are read-only. |
| Customer privacy | "Who you're talking to..." | The agent only sees `CustomerProfile` (name, own email, join date, message count; no password hash or id); the audit trail logs no message text or customer details. |

### Specs

**Models**
- Chat agent: OpenAI `gpt-5.6-luna` through Portkey (`https://api.portkey.ai/v1`), via PydanticAI `OpenAIChatModel` + `OpenAIProvider`; API key `PORTKEY_API_KEY` from `.env`.
- Framework: PydanticAI 2.x agent with `deps_type=ChatDeps`, `output_type=ChatReply`, instructions from `prompt.md` plus per-request dynamic instructions.

**Loop limits (per customer message)**

| Limit | Value | Where |
|---|---|---|
| Model requests | 8 | `LOOP_LIMITS = UsageLimits(request_limit=8, tool_calls_limit=12)` in `agent.py` |
| Tool calls | 12 | same |
| Output retries (fact check / secrets) | 2 | `OUTPUT_RETRIES` in `agent.py` |
| On limit / repeated failure | fallback message, recorded as `loop_limit` / `fact_check_failed` | `agent.chat()` |

**Result and size caps**

| What | Cap |
|---|---|
| `search_products` results | default 6, max 12 |
| Products in a reply (`ChatReply.products`) | 12 |
| Cards shown in the chat for a search | 3 (all shown on the Products page) |
| `ProductNotFound` suggestions | 5 |
| Customer message | 1–1000 characters |
| History sent by the browser | 20 turns max; guest window kept and signed: last 10 turns |
| Saved history given to the agent / shown in the widget | last 20 / last 50 messages |
| Audit-trail summaries | 160 characters |
| Products page | 20 per page |
| Passwords | 6–16 characters with a special character; PBKDF2-SHA256, 600,000 iterations; session tokens last 7 days |

**How to run**

Requires Python 3 with the `hw4/.venv` (packages in `requirements.txt`), Node.js/npm, the local data pack in `hw4/data/` (`campus_customs.db` and `products/`; not in git), and `PORTKEY_API_KEY` in `hw4/.env` (copy `.env.example`). Full steps are in `README.md`.

Backend (FastAPI on port 8000), from `hw4`:

```
cd backend
source ../.venv/bin/activate
uvicorn main:app --reload --port 8000
```

(First time: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` from `hw4`. The command must be run from inside `backend/` because the modules import each other by plain name.)

Frontend (React + Vite on port 5173), from `hw4` in a second terminal:

```
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. Vite proxies `/api` and `/images` to the backend on port 8000. Quick agent test without the website: `python agent.py "Do you have navy hoodies?"` from `backend/`.
