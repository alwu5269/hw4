# Campus Customs Shop + Chatbot (Homework 4)

A Campus Customs storefront for Yale apparel, merch, and souvenirs:

- **Frontend:** React + Vite + TypeScript (`frontend/`): Home, Products (with search and pages), single-product pages, About Us, Log in, Create account, and a floating "Ask Dan" chat.
- **Backend:** FastAPI (`backend/main.py`) serving products, product images, accounts, and the chat route.
- **Agent:** a PydanticAI agent ("Dan") in four files under `backend/`: `prompts/prompt.md`, `agent.py`, `tools.py`, `models.py`. It looks up real prices and stock in the database, shows search results on the page, remembers logged-in shoppers, and logs every run to `output/audit_trail.json`.

Write-ups are in `output/`: `harness.md` (how the system works), `usability.md`, `design.md`, `app_check.html` (screenshots of the running app), and `audit_trail.json`. `AI_prompts.md` logs the prompts used to build it.

## Requirements

- Python 3.12+ and Node.js 20+ (with npm)
- A Portkey API key (for the chat agent)
- The **data pack** (not in git): `campus_customs.db` and the `products/` image folder

## 1. Place the data pack

The database and product images are not in the repository. Put them in a `data/` folder inside `hw4/`:

```
hw4/
└── data/
    ├── campus_customs.db
    └── products/          # images referenced by the catalogue
```

## 2. Add your API key

```bash
cd hw4
cp .env.example .env
```

Then edit `.env` and set `PORTKEY_API_KEY` (and optionally `AUTH_SECRET`). The backend reads `hw4/.env` first, or the nearest `.env` in a parent folder.

## 3. Run the backend (FastAPI on port 8000)

From the `hw4` folder, set up Python once:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Then start the API **from inside `backend/`**:

```bash
cd backend
source ../.venv/bin/activate
uvicorn main:app --reload --port 8000
```

You should see `Uvicorn running on http://127.0.0.1:8000`. Quick check: http://127.0.0.1:8000/api/health returns `{"status":"ok"}`.

## 4. Run the frontend (Vite on port 5173)

In a second terminal, from the `hw4` folder:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` and `/images` requests to the backend on port 8000, so both must be running.

## Try it

- Browse **Products**, open a product, pick a size, and press **Add to Cart**.
- Open the **Ask Dan** chat (bottom right) and try "What hoodies do you have?" or, on a product page, "Is this in stock in medium?"
- Log in with the seeded test account (`test@campuscustoms.yale.edu` / `password`) or create an account; logged-in chat history is saved and reloaded.
- Test the agent without the website: `cd backend && python agent.py "Do you have navy hoodies?"`
