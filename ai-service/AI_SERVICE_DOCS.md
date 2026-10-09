# Quick Commerce — AI Service Documentation

> Use this file as context when asking ChatGPT / Cursor to add Gen AI features.
> Last updated: Sep 2026 | Status: MVP scaffold (logic only, no LLM yet)

---

## 1. Project context

This is a **quick-commerce** (Blinkit / Zepto style) monorepo.

| Service | Tech | Port | Role |
|---------|------|------|------|
| `backend-core` | Node.js | 4000 | Main API, orders, catalog, auth |
| `ai-service` | Python FastAPI | 8000 | ETA + recommendations (this folder) |
| `socket-service` | Node.js | 5000 | Real-time order updates |
| `web-frontend` | Next.js | — | Admin / web UI |
| `mobile-app` | React Native / Expo | — | Customer app |
| MongoDB | — | 27017 | Primary DB |
| Redis | — | 6379 | Cache / pub-sub |

Docker Compose wires `AI_SERVICE_URL=http://ai-service:8000` into `backend-core`.
Local `.env`: `AI_SERVICE_URL=http://127.0.0.1:8000`.

**Important:** backend has the URL config (`backend-core/src/config/env.js` → `aiServiceUrl`) but **does not call ai-service yet**. No `ai.client.js`. Orders still hardcode ETA in places.

---

## 2. What is already implemented in `ai-service`

### Honest summary

| Feature | Implemented? | Is it Gen AI / ML? |
|---------|--------------|--------------------|
| FastAPI app + CORS | Yes | No — scaffolding |
| `GET /health` | Yes | No |
| `POST /eta` | Yes | No — Haversine math + fixed speed |
| `POST /recommend` | Yes | No — returns first 6 candidate IDs |
| LLM / OpenAI / Gemini | No | — |
| Embeddings / vector DB | No | — |
| RAG / chatbot | No | — |
| LangChain / LlamaIndex | No | — |
| Dockerfile (real build) | No — empty placeholder | — |
| Backend HTTP client | No | — |
| Tests | No | — |

So: **service shape + 2 useful endpoints exist**. Real Gen AI is the next layer.

---

## 3. Folder structure (current)

```
ai-service/
├── AI_SERVICE_DOCS.md          ← this file
├── Dockerfile                  ← EMPTY stub (needs real image steps)
├── requirements.txt            ← fastapi, uvicorn, pydantic, httpx
└── app/
    ├── main.py                 ← FastAPI entry, mounts routers
    ├── config.py               ← Settings (APP_NAME, PORT) via pydantic-settings
    ├── schemas.py              ← Pydantic request/response models
    ├── routers/
    │   ├── health.py           ← GET /health
    │   ├── eta.py              ← POST /eta
    │   └── recommend.py        ← POST /recommend
    └── services/
        ├── eta_service.py      ← Haversine ETA logic
        └── recommend_service.py← Stub ranking (slice first 6)
```

### Conventions to keep when adding features

1. **Router** (`app/routers/xyz.py`) → thin HTTP layer only  
2. **Service** (`app/services/xyz_service.py`) → business / AI logic  
3. **Schema** (`app/schemas.py` or `app/schemas/`) → request/response models  
4. Register router in `app/main.py`  
5. Add new packages to `requirements.txt`

---

## 4. API contracts (what exists today)

Base URL: `http://127.0.0.1:8000`

### `GET /health`

```json
{
  "success": true,
  "message": "ai-service is up",
  "data": { "service": "ai-service" }
}
```

### `POST /eta`

**Request**

```json
{
  "storeLat": 28.6139,
  "storeLng": 77.2090,
  "userLat": 28.7041,
  "userLng": 77.1025
}
```

**Response**

```json
{
  "etaMinutes": 18,
  "distanceKm": 12.4
}
```

**Logic today (`eta_service.py`)**

- Haversine distance (Earth radius 6371 km)
- Travel speed assumed: **20 km/h**
- Prep time: **+8 minutes**
- Clamp ETA between **8 and 45** minutes

### `POST /recommend`

**Request**

```json
{
  "storeId": "store_123",
  "productId": "prod_seed_optional",
  "candidateProductIds": ["p1", "p2", "p3", "p4", "p5", "p6", "p7"]
}
```

**Response**

```json
{
  "recommendedProductIds": ["p1", "p2", "p3", "p4", "p5", "p6"]
}
```

**Logic today (`recommend_service.py`)**

- Drop seed `productId` if present
- Return up to **6** remaining IDs **in input order**
- `storeId` is accepted but **unused**
- No category, popularity, embeddings, or user history

---

## 5. Dependencies (`requirements.txt`)

```
fastapi==0.110.0
uvicorn==0.29.0
pydantic==2.6.4
httpx==0.27.0
```

**Gap:** `config.py` imports `pydantic_settings` but it is **not** listed in `requirements.txt` — add `pydantic-settings` when fixing deps.

`httpx` is installed but unused (good for future calls to backend-core / OpenAI).

---

## 6. How other services should call this

Intended flow (not fully wired yet):

```
mobile / web
    → backend-core :4000
        → HTTP → ai-service :8000  (/eta, /recommend, future /assistant)
```

Suggested backend file (not created yet):

- `backend-core/src/clients/ai.client.js` (or `services/ai.client.js`)
  - `getEta({ storeLat, storeLng, userLat, userLng })`
  - `getRecommendations({ storeId, productId, candidateProductIds })`

Env:

```
AI_SERVICE_URL=http://127.0.0.1:8000
```

---

## 7. Known gaps / tech debt

1. `Dockerfile` is empty — Docker Compose build for `ai-service` will fail until filled.
2. Missing `pydantic-settings` in requirements.
3. No `__init__.py` under `app/`, `routers/`, `services/` (may break imports depending on how uvicorn is started).
4. `uvicorn.run("main:app", ...)` in `main.py` may need `app.main:app` when run as a package.
5. Recommend is a stub; ETA is pure math — fine for MVP, not “Gen AI”.
6. Backend never calls these endpoints yet.
7. No auth on ai-service (OK for internal Docker network; lock down later).
8. No logging, metrics, or rate limits.

---

## 8. Gen AI roadmap — what you can add next

Use this as a backlog when prompting ChatGPT. Prefer **new router + service** files; do not break existing `/eta` and `/recommend` contracts unless you version them.

### Phase A — Make current endpoints real (before LLM)

| Task | Where | Notes |
|------|-------|-------|
| Category-aware recommend | `recommend_service.py` | Rank same-category candidates first |
| Use `storeId` | recommend | Filter by store stock (fetch from backend or accept enriched payload) |
| Wire `ai.client.js` | `backend-core` | Call `/eta` on order create; `/recommend` on product page |
| Fix Dockerfile + deps | root of ai-service | Python 3.11, uvicorn `app.main:app` |

### Phase B — Gen AI core (resume-worthy)

| Feature | Suggested path | Stack idea |
|---------|----------------|------------|
| Semantic product search | `POST /search` | embeddings (OpenAI / Gemini / sentence-transformers) + cosine similarity |
| Embedding recommendations | upgrade `recommend_service.py` | embed seed + candidates, rank by similarity |
| RAG shopping assistant | `POST /assistant` | LangChain/LlamaIndex + Chroma/FAISS + product catalog chunks |
| NL → filters | `POST /parse-query` | LLM structured output → `{ category, maxPrice, tags }` |
| Product description generator | `POST /generate-description` | Admin tool; LLM from name + category |
| Order support Q&A | extend `/assistant` | RAG over policies + order status via backend API |

### Phase C — Production polish

- Prompt templates in `app/prompts/`
- `.env` for `OPENAI_API_KEY` / `GEMINI_API_KEY`
- Cost + latency logging
- Simple eval set (20–50 queries in `evals/`)
- Rate limiting + timeout on LLM calls
- Fallback when LLM is down (return rule-based recommend)

### Suggested new folders (when you start Gen AI)

```
ai-service/app/
├── prompts/              # system + user prompt templates
├── llm/                  # provider clients (openai.py, gemini.py)
├── embeddings/           # embed + similarity helpers
├── vectorstore/          # chroma / faiss wrappers
├── routers/
│   ├── search.py
│   └── assistant.py
└── services/
    ├── search_service.py
    └── assistant_service.py
```

---

## 9. How to run locally (once Dockerfile / deps are fixed)

```bash
cd ai-service
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
pip install pydantic-settings
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI: http://127.0.0.1:8000/docs

---

## 10. Copy-paste prompt for ChatGPT

Use this when you want to add a new Gen AI feature:

```
You are helping me extend a Quick Commerce Python FastAPI microservice.

Read and respect this project doc (paste AI_SERVICE_DOCS.md content).

Rules:
- Keep existing /health, /eta, /recommend working unless I ask to change them.
- Put HTTP in app/routers/, logic in app/services/, models in schemas.
- Register new routers in app/main.py.
- Update requirements.txt with any new packages.
- Prefer OpenAI or Gemini via env keys; no hardcoded secrets.
- For RAG/search, keep a clear fallback if the LLM/embeddings fail.

Current task:
[DESCRIBE FEATURE HERE — e.g. "Add POST /assistant RAG chatbot that answers from product catalog JSON"]

Also tell me:
1. Exact files to create/edit
2. Request/response JSON examples
3. How backend-core should call the new endpoint
```

---

## 11. One-line status for resume / README

> Built a FastAPI AI microservice for quick-commerce with ETA estimation and product recommendation APIs; designed for Gen AI extensions (embeddings, RAG assistant, semantic search) and wired into Docker Compose alongside Node backend.

*(Update this line after you ship real LLM features.)*
