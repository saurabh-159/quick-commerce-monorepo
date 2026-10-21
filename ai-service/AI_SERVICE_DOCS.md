# Quick Commerce AI Service — Beginner Gen AI Learning Guide

> **Is file ka purpose:** Beginner ko Python + Generative AI sikhana, aur saath mein yeh batana ki `ai-service` folder mein har concept **real code** mein kahan hai.
>
> **AWS deploy ke liye:** Section **26** mein poora monorepo (backend-core, socket-service, web-frontend, ai-service + Mongo/Redis) ke **ports, env vars, Docker, CI/CD** hain. Gemini / ChatGPT ko bolo: *"Section 26 follow karke mujhe AWS pe beginner step-by-step deploy karwao."*
>
> Aap yeh MD file Gemini / ChatGPT / kisi mentor ko de sakte ho: *"Is document ke hisaab se mujhe Gen AI teach karo, step by step."*
>
> Last updated: 21 Oct 2026 (assistant = LangGraph `catalog_graph`) · Repo: `quick-commerce-backend`

---

## Table of Contents

0. [Frontend mein jo AI APIs live hain (start yahan se)](#0-frontend-mein-jo-ai-apis-live-hain-start-yahan-se)
1. [Kaise padhein (Learning Path)](#1-kaise-padhein-learning-path)
2. [Python Basics — Gen AI ke liye](#2-python-basics--gen-ai-ke-liye)
3. [Gen AI Roadmap — Beginner se Production](#3-gen-ai-roadmap--beginner-se-production)
4. [Project Architecture](#4-project-architecture)
5. [LLM Chat (Foundation)](#5-llm-chat-foundation)
6. [Embeddings & Semantic Search](#6-embeddings--semantic-search)
7. [Vector Database (Chroma)](#7-vector-database-chroma)
8. [RAG Pipeline](#8-rag-pipeline)
9. [Prompt Engineering & Templates](#9-prompt-engineering--templates)
10. [Tool / Function Calling](#10-tool--function-calling)
11. [AI Agents](#11-ai-agents)
12. [LangChain & LangGraph](#12-langchain--langgraph)
13. [Conversation Memory](#13-conversation-memory)
14. [Redis Caching (Deep Dive + Syntax)](#14-redis-caching-deep-dive--syntax)
15. [Multimodal AI (Images)](#15-multimodal-ai-images)
16. [Security Guardrails](#16-security-guardrails)
17. [Structured JSON Output](#17-structured-json-output)
18. [MongoDB Tools for AI](#18-mongodb-tools-for-ai)
19. [Fine-tuning Basics](#19-fine-tuning-basics)
20. [Production Hardening](#20-production-hardening)
21. [File Map (har file kya karti hai)](#21-file-map-har-file-kya-karti-hai)
22. [API Routes Cheatsheet](#22-api-routes-cheatsheet)
23. [Local Setup](#23-local-setup)
24. [Practice Exercises](#24-practice-exercises)
25. [Glossary](#25-glossary)
26. [Full Stack Ports + Env + AWS Deploy (Gemini ko do)](#26-full-stack-ports--env--aws-deploy-gemini-ko-do)

---

## 0. Frontend mein jo AI APIs live hain (start yahan se)

Yeh section sirf **woh 5 APIs** cover karta hai jo abhi website pe use ho rahi hain. Baaki AI routes code mein hain, lekin UI se call nahi hoti.

**Flow har API ka same hai:**

```
Browser page
  → web-frontend/src/utils/ai.js
  → Node  POST http://localhost:4000/api/ai/...
       routes: backend-core/src/routes/aiRoutes.js
       controller: backend-core/src/controllers/aiController.js
       service: backend-core/src/services/aiService.js
  → Python ai-service (port 8000)
```

Node teen files **sirf proxy** hain. Asal AI logic Python files mein hai.

### 0.1 Search — semantic product search

| | |
|--|--|
| **API** | `POST /api/ai/search` |
| **Page** | Home `/` |
| **UI files** | `web-frontend/src/components/home/HomePage.js`, `AiSearchResults.js` |
| **Helper** | `aiSearch()` in `utils/ai.js` |
| **Python router** | `ai-service/app/routers/search.py` → `POST /search` |
| **Logic** | `search_service.py` → function `semantic_search` |
| **Helper logic** | `embedding_service.py` → `generate_embedding`, `get_cached_product_embedding` |
| **Data** | `db_tools.py` → `list_active_products_sync` (Mongo products) |
| **Technique** | **Embedding** (`text-embedding-3-small`) + **cosine similarity** + **Redis cache** |

**Simple flow:** user query → text ko vector (numbers) → har product name ka vector → cosine se closest products → top results UI pe.

**RAG nahi hai.** Chroma yahan use nahi hota.

### 0.2 Recommendations — similar products

| | |
|--|--|
| **API** | `POST /api/ai/recommendations` |
| **Page** | Product page `/store/[id]/product/[productId]` |
| **UI files** | `store/[id]/product/[productId]/page.js`, `components/AiRecommendations.js` |
| **Helper** | `aiRecommendations()` |
| **Python router** | `routers/recommend.py` → `POST /recommend` |
| **Logic** | `recommend_service.py` → `get_recommendations` |
| **Helper logic** | `embedding_service.py` (same embeddings) |
| **Technique** | **Embedding** + **cosine similarity** + cache |

**Simple flow:** current product ka vector vs baaki products → sabse similar names UI pe “you may also like”.

### 0.3 Assistant — stores, categories, products chat

| | |
|--|--|
| **API** | `POST /api/ai/assistant` |
| **Page** | Help `/help` |
| **UI** | `components/AiSupportChat.js` (`mode="assistant"`) |
| **Helper** | `aiAssistant(query, { lat, lng })` |
| **Python router** | `routers/assistant.py` → `POST /assistant` |
| **Main logic (LIVE)** | `catalog_graph.py` → `run_catalog_graph` (LangGraph) |
| **Helpers** | `catalog_agent.py` → `detect_intent`, `cards_from_tool` |
| **Tools** | `catalog_tools.py` → `execute_catalog_tool` |
| **DB** | `db_tools.py` → `get_nearby_stores_sync`, `get_store_categories_sync`, `get_category_products_sync`, `resolve_category_sync` |
| **Technique** | **LangGraph** + **keyword intent routing** + **forced Mongo tool** + **LLM short answer** + **UI cards** |

**Simple flow (abhi production path):**

```text
POST /assistant
  → intent_node (detect_intent keywords)
  → agar intent nearby/categories/products → tool_node (forced Mongo tool)
  → answer_node (tool JSON se short GPT answer; warna fallback help text)
  → response: answer + cards + tools_used
```

1. User sawal + lat/lng.
2. `detect_intent(query)` → `nearby` | `categories` | `products` | `general`.
3. Intent match ho to **forced** tool:
   - `nearby` → `get_nearby_stores`
   - `categories` → `get_store_categories`
   - `products` → `get_category_products`
4. Python Mongo se real data → `cards_from_tool` se UI cards.
5. `answer_node` tool JSON se short text banata hai (GPT). Agar tool nahi chala / empty → fallback:
   `"Ask about nearby stores, a store's categories, or products in a category."`

**Important — kyun kabhi empty answer aata hai:**

- Sirf `"store"` likhne se intent **`general`** ho jata hai (nearby phrases list mein nahi).
- Nearby detect hone ke liye query mein phrases chahiye jaise: `near me`, `nearby`, `stores near`, `kitne store`, `mere location`, …
- `general` pe **koi tool nahi chalta** → `tools_used: []`, `cards: []`, upar wala help text.
- Lat/lng bhejne se farak nahi padta jab tak intent tool-worthy na ho — location tabhi use hoti hai jab tool node chale.

**History save nahi hoti.** Har message naya request hai. **Chroma RAG is route pe nahi** chalta.

**Category match:** user “fruit” / “vegetable” likhe to `intent_node` products treat karta hai; `resolve_category_sync` loose name/slug match karta hai (`Fruits & Vegetables`).

**Legacy (code mein hai, router use nahi karta):** `catalog_agent.run_catalog_assistant` — purana OpenAI multi-round tool-calling loop. Seekhne ke liye useful; live API ab LangGraph use karti hai.

### 0.4 Order support — logged-in order help

| | |
|--|--|
| **API** | `POST /api/ai/order-support` (login required) |
| **Page** | Orders `/orders` |
| **UI** | `AiSupportChat.js` (`mode="order"`) |
| **Helper** | `aiOrderSupport()` |
| **Python router** | `routers/support_router.py` → `POST /support/query` |
| **Logic** | `support_service.py` → `handle_order_support`, `get_live_order_status` |
| **DB** | `db_tools.py` → `get_latest_order_for_user_sync` |
| **Technique** | **Tool calling** + **live Mongo order** + LLM final answer |

**Simple flow:** JWT se `user_id` → tool `get_live_order_status` → latest order → GPT us status se jawab.

### 0.5 Admin generate content

| | |
|--|--|
| **API** | `POST /api/ai/admin/generate-content` (admin login) |
| **Page** | `/admin/products/new` aur `/admin/products/[id]/edit` |
| **UI** | `components/ProductForm.js` |
| **Helper** | `aiGenerateProductContent()` |
| **Python router** | `routers/admin_router.py` → `POST /admin/generate-product-content` |
| **Logic** | `admin_ai_service.py` → `generate_admin_product_content` |
| **Technique** | **Plain LLM chat** (no tools, no embeddings). Output: title, description, tags |

### 0.6 Technique cheat sheet (sirf live APIs)

| Technique | Kahan use |
|-----------|-----------|
| Embedding | search, recommendations |
| Cosine similarity | search, recommendations |
| Redis cache | product embeddings |
| LangGraph (intent → tool → answer) | **assistant** (`catalog_graph.py`) |
| Tool / function calling | order-support; also legacy `run_catalog_assistant` |
| Live Mongo | assistant, order-support, search product list |
| Intent routing (keywords) | assistant (`detect_intent` in `catalog_agent.py`) |
| UI cards | assistant response `cards` |
| LLM text only | admin generate-content; assistant answer_node (after tool) |
| RAG / Chroma | **in 5 APIs mein nahi** (code `rag_service.py` mein alag pada hai) |

### 0.7 Gemini ko kaise do

Is section ko copy karke bolo:

> “Section 0 ke hisaab se mujhe har API ka flow, technique, aur file line-by-line samjhao. Pehle search (embedding + cosine), phir assistant (`catalog_graph` LangGraph: intent → forced tool → answer).”

---

## 1. Kaise padhein (Learning Path)

| Week | Topic | Is repo mein file |
|------|--------|-------------------|
| 1 | Python basics + FastAPI hello world | `main.py`, `schemas.py` |
| 2 | LLM chat + prompts | `llm_service.py`, `prompts/templates.py` |
| 3 | Embeddings + cosine similarity | `embedding_service.py`, `search_service.py` |
| 4 | Vector DB + RAG | `vector_db.py`, `rag_service.py`, `routers/rag.py` |
| 5 | Tool calling + agents | `tool_service.py`, `agent_service.py`, `agent_tools.py`, `catalog_tools.py` |
| 6 | Redis cache + session memory | `utils/cache.py`, `session_memory.py` |
| 7 | LangChain / LangGraph | `langchain_service.py`, `graph_service.py` (demo), **`catalog_graph.py` (live assistant)** |
| 8 | Multimodal + security + rate limit | `multimodal.py`, `security_*`, middleware |
| 9 | Fine-tune idea + production checklist | `training/*`, section 20 |

**Rule:** Pehle concept padho → phir “Repo mein kahan” section → phir code khud open karke run karo.

---

## 2. Python Basics — Gen AI ke liye

Gen AI code mein yeh Python pieces baar-baar aate hain. Pehle yeh solid karo.

### 2.1 Variables, types, f-strings

```python
name = "milk"                    # str
limit = 3                        # int
score = 0.87                     # float
products = ["milk", "bread"]     # list
item = {"name": "milk", "stock": 10}  # dict

# f-string = modern string formatting
print(f"Product: {name} | Score: {score}")
```

### 2.2 Functions (args, return, type hints)

```python
def generate_embedding(text: str) -> list[float]:
    """text ko numbers (vector) mein convert karta hai."""
    # ... API call ...
    return [0.12, -0.45, 0.88]  # example

# Type hints (`text: str`, `-> list[float]`) beginner + IDE ke liye helpful hain.
# Runtime pe Python unhe enforce nahi karta; Pydantic / FastAPI alag se validate karte hain.
```

### 2.3 Lists, dicts, loops (embeddings / search ke liye)

```python
products = [
    {"product_id": "p1", "name": "Milk"},
    {"product_id": "p2", "name": "Shoes"},
]

for product in products:
    print(product["name"])

# List comprehension
names = [p["name"] for p in products]

# Sort by score (descending)
recommendations = [{"name": "a", "score": 0.9}, {"name": "b", "score": 0.5}]
recommendations.sort(key=lambda x: x["score"], reverse=True)
```

### 2.4 `try / except` (API fail ho sakti hai)

```python
try:
    answer = client.chat.completions.create(...)
except Exception as e:
    print(f"Error: {e}")
    return "Sorry, high traffic right now."
```

LLM / Redis / Mongo — sab network pe hain. Production code **hamesha** fail-safe rakhta hai.

### 2.5 Environment variables (`.env`)

```python
import os
from dotenv import load_dotenv

load_dotenv()  # .env file load
api_key = os.environ.get("OPENAI_API_KEY")  # dict-like access
```

**Kabhi bhi** API key code mein hardcode mat karo. `.env` + `os.environ` / `pydantic-settings` use karo.

Is project mein: `app/config.py` → `Settings` class.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    MONGO_URI: str = "mongodb://localhost:27017/quick-commerce"

    class Config:
        env_file = ".env"

settings = Settings()
```

### 2.6 JSON (LLM structured output + Redis)

```python
import json

# Python dict → JSON string
payload = {"role": "user", "content": "Where is my order?"}
raw = json.dumps(payload)

# JSON string → Python dict
data = json.loads(raw)
```

### 2.7 FastAPI — API banana (2 minute mental model)

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class AskRequest(BaseModel):
    query: str

@router.post("/ask-rag")
def ask(payload: AskRequest):
    return {"answer": f"You asked: {payload.query}"}
```

- `BaseModel` = request body validation
- `@router.post` = HTTP POST endpoint
- `main.py` mein `app.include_router(...)` se mount hota hai

### 2.8 Async vs Sync (thoda advanced, but useful)

```python
# Sync (normal function) — tool calling / Mongo sync client
def get_order_by_number_sync(order_number: str):
    return sync_db.orders.find_one({"orderNumber": order_number})

# Async — FastAPI + Motor (async Mongo)
async def get_live_product_stock_from_db(product_name: str) -> str:
    product = await async_db.products.find_one(...)
```

Is repo mein dono hain: `db_tools.py`.

---

## 3. Gen AI Roadmap — Beginner se Production

| Level | Topic | Meaning (simple) | Status in this repo |
|-------|--------|------------------|---------------------|
| L0 | Prompting | Model ko clear instructions dena | ✅ `prompts/templates.py` |
| L1 | Chat Completions | User ↔ Assistant messages | ✅ `llm_service.py` |
| L2 | Embeddings | Text → number vector | ✅ `embedding_service.py` |
| L3 | Similarity Search | “Closest meaning” products | ✅ `search_service.py`, `recommend_service.py` |
| L4 | Vector DB | Vectors store + query | ✅ Chroma `vector_db.py` |
| L5 | RAG | Retrieve docs → inject context → generate | ✅ `rag_service.py` |
| L6 | Tool / Function Calling | LLM / graph Python function call kare | ✅ `tool_service`, `agent_service`, `catalog_tools` |
| L7 | Agents | Multi-step decide → act → reply | ✅ `agent_*`, `catalog_graph` (live), `graph_service` (demo) |
| L8 | Memory | Purani chat yaad rakhna | ✅ `memory_service`, `session_memory` |
| L9 | Caching | Same prompt pe dubara LLM na chalao | ✅ Redis `utils/cache.py` |
| L10 | Multimodal | Image + text | ✅ `routers/multimodal.py` |
| L11 | Guardrails | Prompt injection block | ✅ `security_filters.py` |
| L12 | Structured Output | JSON filters / catalog copy | ✅ `parse.py`, `admin_ai_service` |
| L13 | Frameworks | LangChain LCEL, LangGraph | ✅ `langchain_service`, `catalog_graph` (prod), `graph_service` (demo) |
| L14 | Fine-tuning | Model pe apna data train | 🟡 scripts only (`training/`) |
| L15 | Production | Auth, rate limit, logs, CORS | ✅ middleware + config |

**Abhi cover nahi / weak areas (seekhne ke baad add karna):**

- Eval datasets / automated quality tests
- Second model provider (Gemini / Claude) abstraction
- Full QLoRA `Trainer.train()` loop
- Streaming responses (SSE / WebSocket)

---

## 4. Project Architecture

```text
Browser / Web Frontend
        │
        ▼
backend-core (Node, port 4000)  ── /api/ai/* proxy
        │
        ▼
ai-service (Python FastAPI, port 8000)
        │
        ├── OpenAI API   (chat, embeddings, vision)
        ├── Redis        (cache, rate limit, session memory)
        ├── Chroma DB    (./chroma_db vector store)
        └── MongoDB      (products, inventory, orders via db_tools)
```

### Folder layout

```text
ai-service/
├── app/
│   ├── main.py              # FastAPI app + routers mount
│   ├── config.py            # Settings from .env
│   ├── schemas.py           # Shared Pydantic models
│   ├── core/
│   │   ├── llm_clients.py   # Shared OpenAI wrapper
│   │   └── vector_db.py     # Chroma client
│   ├── prompts/
│   │   └── templates.py     # Reusable prompt strings
│   ├── routers/             # HTTP endpoints
│   ├── services/            # Business / Gen AI logic
│   ├── utils/               # cache, security, logger
│   └── training/            # Fine-tune scripts (not HTTP)
├── requirements.txt
└── AI_SERVICE_DOCS.md       # Yeh file
```

**Mental model:** Router = door (HTTP). Service = kitchen (logic). Utils/core = fridge / tools.

---

## 5. LLM Chat (Foundation)

### Concept

**LLM (Large Language Model)** text padhta hai aur text likhta hai. Hum **messages** bhejte hain:

| Role | Kaam |
|------|------|
| `system` | Rules / personality (“You are a support bot…”) |
| `user` | User ka sawal |
| `assistant` | Model ka jawab |
| `tool` | Function calling ka result |

### Repo mein kahan

| File | Role |
|------|------|
| `app/services/llm_service.py` | Cached chat completion |
| `app/core/llm_clients.py` | Reusable `OpenAIClient` |
| `app/services/chat_service.py` | Class-based chat helper |

### Syntax (OpenAI Python SDK)

```python
from openai import OpenAI
import os

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "You are a helpful Quick Commerce assistant."},
        {"role": "user", "content": "Refund policy kya hai?"},
    ],
    timeout=10.0,
)

answer = response.choices[0].message.content.strip()
```

### Is project ka real flow (`llm_service.py`)

1. Redis se cache check (`get_cached_ai_response`)
2. Hit → turant return (LLM call skip)
3. Miss → OpenAI call → answer Redis mein save (`setex` 1 hour)
4. Latency log (`log_ai_execution`)

**Beginner tip:** Pehle bina cache ke LLM call samjho, phir Redis layer add karo.

---

## 6. Embeddings & Semantic Search

### Concept

Embedding = text ko **numbers ki list (vector)** mein badalna.

- `"Fresh Organic Cow Milk 1L"` → `[0.02, -0.11, 0.87, ...]` (1536 dims approx for `text-embedding-3-small`)
- Similar meaning → vectors close
- Different meaning → vectors far

Isliye hum **keyword match** nahi, **meaning match** kar sakte hain.

### Cosine similarity (math jo search use karti hai)

```python
import math

def cosine_similarity(v1, v2):
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if not mag1 or not mag2:
        return 0.0
    return dot / (mag1 * mag2)  # -1 se 1, usually 0..1 for embeddings
```

### Repo mein kahan

| File | Role |
|------|------|
| `embedding_service.py` | `generate_embedding`, Redis-cached product embeddings |
| `search_service.py` | Query embed → products score → top-N |
| `recommend_service.py` | Seed product se similar products |
| `routers/search.py` | `POST /embed`, `POST /search` |
| `routers/recommend.py` | `POST /recommend` |

### Embedding API syntax

```python
response = client.embeddings.create(
    input=["Fresh Milk 1L"],
    model="text-embedding-3-small",
)
vector = response.data[0].embedding  # list[float]
```

### Semantic search flow (simple)

```text
User query: "dairy drink for kids"
        │
        ▼
embed(query) ────────────────┐
                             │ cosine vs
embed(each product name) ◄───┘
        │
        ▼
sort by score → return top products
```

Products Mongo se aate hain (`list_active_products_sync`). Agar Mongo fail → `FALLBACK_PRODUCTS` mock list.

### Embedding cache (Redis) — important for cost

```python
# embedding_service.py (idea)
key = f"ai:embed:{product_id}"
cached = redis_client.get(key)
if cached:
    return json.loads(cached)

vector = generate_embedding(name)
redis_client.setex(key, 86400, json.dumps(vector))  # 24 hours
return vector
```

Har request pe har product ko dubara embed mat karo — **paise + latency** dono bachenge.

---

## 7. Vector Database (Chroma)

### Concept

Normal DB rows store karti hai. **Vector DB** embeddings store karti hai aur “is vector ke nearest neighbors” query karti hai.

Is project: **Chroma** → local folder `./chroma_db` (SQLite backed).

### Repo mein kahan

`app/core/vector_db.py`

```python
import chromadb

chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="quick_commerce_docs")

def get_vector_collection():
    return collection
```

### Basic Chroma operations

```python
# Add
collection.add(
    ids=["doc1"],
    embeddings=[[0.1, 0.2, ...]],  # ya Chroma khud embed kare (yahan hum OpenAI se dete hain)
    documents=["Refund policy: 2-3 business days..."],
)

# Query (semantic search)
results = collection.query(
    query_embeddings=[[0.11, 0.19, ...]],
    n_results=2,
)
docs = results["documents"][0]  # list of matching text chunks
```

**Beginner note:** Collection ≈ table. Document ≈ row text. Embedding ≈ searchable fingerprint.

---

## 8. RAG Pipeline

### Concept (sabse important Gen AI pattern)

**RAG = Retrieval-Augmented Generation**

```text
1. INDEX TIME
   Document → Embedding → Vector DB save

2. QUERY TIME
   User question → Embedding → Vector DB se top docs nikaalo (Retrieve)
                → Docs ko prompt mein daalo (Augment)
                → LLM jawab likhe (Generate)
```

Kyun? Model ko company-specific policy / catalog **train kiye bina** bata sakte ho. Hallucination kam hoti hai jab context milta hai.

### Repo mein kahan

| Step | File / function |
|------|-----------------|
| Vector store | `core/vector_db.py` |
| Add doc | `rag_service.add_document_to_db` |
| Search | `rag_service.search_similar_documents` |
| Full RAG answer | `rag_service.get_rag_answer` |
| HTTP | `POST /api/v1/rag/add-doc`, `POST /api/v1/rag/ask-rag` |
| Prompt template | `RAG_CONTEXT_PROMPT` in `prompts/templates.py` |

### End-to-end code shape

```python
# 1) Ingest
add_document_to_db("policy_refund", "Refunds take 2-3 business days...")

# 2) Retrieve
docs = search_similar_documents("refund kab aayega?", n_results=2)
context = "\n".join(docs)

# 3) Augment + Generate
system_prompt = f"Use this context:\n{context}"
answer = get_llm_response_with_cache(user_query, system_prompt)
```

### Practice curl

```bash
# Document add
curl -X POST http://127.0.0.1:8000/api/v1/rag/add-doc \
  -H "Content-Type: application/json" \
  -d "{\"doc_id\":\"refund1\",\"text\":\"Refunds are processed in 2-3 business days.\"}"

# Ask
curl -X POST http://127.0.0.1:8000/api/v1/rag/ask-rag \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"refund kitne din mein aata hai?\"}"
```

---

## 9. Prompt Engineering & Templates

### Concept

Prompt = model ko diya gaya instruction. Achha prompt = better output.

**Good practices:**

1. Role clearly batao (“You are a Quick Commerce support AI”)
2. Constraints do (“answers short, crisp”)
3. Context alag block mein do
4. Output format batao jab JSON chahiye
5. Templates mein `{variables}` rakho — code mein string concatenate kam karo

### Repo

`app/prompts/templates.py`

```python
QUICK_COMMERCE_SYSTEM_PROMPT = """
You are an expert, polite, and fast customer support AI for our Quick Commerce app...
Always keep your answers short, crisp, and helpful.
"""

RAG_CONTEXT_PROMPT = """
You are a helpful assistant for Quick Commerce. Use the retrieved context below...

Context:
{context}

User Question:
{query}
"""

# Use:
system_prompt = RAG_CONTEXT_PROMPT.format(context=context, query=query)
```

---

## 10. Tool / Function Calling

### Concept

LLM akela sirf text jaanta hai. Real stock / order status ke liye **Python function** chahiye.

Flow:

```text
User: "Milk available hai?"
   │
   ▼
LLM decides → call check_product_stock(product_name="milk")
   │
   ▼
Hamara Python function Mongo / mock se data laata hai
   │
   ▼
Result wapas LLM ko → natural language reply
```

### Tool schema syntax (OpenAI)

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "check_product_stock",
            "description": "Check real-time stock of a product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "e.g. milk, shoes",
                    }
                },
                "required": ["product_name"],
            },
        },
    }
]

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": user_message}],
    tools=tools,
    tool_choice="auto",  # model decide kare
)
```

### Repo mein kahan

| File | Tool | Route |
|------|------|-------|
| `tool_service.py` | `check_product_stock` | `POST /tool-chat` |
| `agent_tools.py` + `agent_service.py` | `check_order_status` | `POST /api/v1/agent/run-agent` |
| `support_service.py` | `get_live_order_status` | `POST /support/query` |
| `catalog_tools.py` + `catalog_graph.py` | `get_nearby_stores`, `get_store_categories`, `get_category_products` | `POST /assistant` (**live**) |
| `catalog_agent.py` → `run_catalog_assistant` | same catalog tools (OpenAI chooses) | **not mounted** — learning / legacy |

**Live assistant note:** `catalog_graph` LLM se tool choose **nahi** karwata. Intent keywords se tool **force** hota hai; LLM sirf final short `answer` likhta hai.

**Key learning:** Tool definition (JSON schema) LLM ke liye hai. Actual execution **tumhara Python** karta hai. LLM kabhi bhi directly DB touch nahi karta.

---

## 11. AI Agents

### Concept

**Agent** = LLM jo plan karta hai, tools use karta hai, maybe multiple steps leta hai, phir final answer deta hai.

Is project ka simple agent (`agent_service.run_agent_with_tools`):

1. User message + tools list → OpenAI
2. Agar `tool_calls` aaye → Python tool run
3. Tool result + history → second completion
4. Final natural language return

```python
if response_message.tool_calls:
    tool_call = response_message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    tool_result = check_order_status(order_id=args["order_id"])

    second = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": user_message},
            response_message,
            {"role": "tool", "content": tool_result, "tool_call_id": tool_call.id},
        ],
    )
    return second.choices[0].message.content
```

`run_shopping_agent(query)` thin wrapper hai isi loop pe.

**Live shopping assistant alag path hai:** OpenAI tool-loop nahi — LangGraph (`catalog_graph.py`) intent → forced Mongo tool → short answer. Detail Section **0.3** aur **12**.

---

## 12. LangChain & LangGraph

### LangChain (LCEL pipes)

LangChain prompts / models / parsers ko **pipeline** banata hai.

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert grocery assistant."),
    ("user", "Suggest the best {category} for {item}."),
])
chain = prompt | llm | StrOutputParser()  # LCEL
print(chain.invoke({"category": "dairy", "item": "protein"}))
```

**Repo:** `langchain_service.py` → `POST /langchain-suggest`

### LangGraph (state machine agent)

LangGraph = nodes + edges. Har node state update karta hai.

#### A) Live shopping assistant (`catalog_graph.py`) — **yeh padho pehle**

Mounted: `POST /assistant` → `run_catalog_graph`.

```text
START
  → intent_node          # detect_intent(query) → nearby | categories | products | general
  → (conditional)
       ├── intent in FORCED_TOOL → tool_node → answer_node → END
       └── else (general)        → answer_node → END
```

| Node | Kaam |
|------|------|
| `intent_node` | Keyword intent + fruit/veggie → products override |
| `tool_node` | Intent se tool name force (`get_nearby_stores` / …), lat/lng inject, Mongo JSON + cards |
| `answer_node` | Agar `tool_result` empty → help text; warna GPT short answer from JSON only |

State fields: `query`, `lat`, `lng`, `intent`, `tool_name`, `tool_result`, `cards`, `answer`.

Response shape:

```json
{
  "query": "...",
  "answer": "...",
  "cards": [],
  "tools_used": ["get_nearby_stores"],
  "context_used": ["get_nearby_stores"]
}
```

Gemini tip: `"store"` alone → `general` → empty tool → fallback answer. `"nearby stores"` + lat/lng → tool runs → real cards.

#### B) Demo graph (`graph_service.py`) — learning only

```text
analyzer_node
     │
     ├── "order" in text → order_node → END
     └── else            → chat_node  → END
```

**Repo:** `graph_service.py` — `run_workflow(user_message)` (HTTP pe directly assistant nahi; agent learning demo).

Beginner exercise: `catalog_graph` mein naya intent add karo (e.g. `"hours"` → store hours tool), ya analyzer mein LLM call.

---

## 13. Conversation Memory

Do tarike:

### A) Client-side memory

Client poori history bhejta hai:

```json
{
  "messages": [
    {"role": "user", "content": "Hi"},
    {"role": "assistant", "content": "Hello!"},
    {"role": "user", "content": "Mera last order?"}
  ]
}
```

**Repo:** `memory_service.chat_with_memory` + `POST /chat-memory`

### B) Server-side session memory (Redis lists)

```python
# session_memory.py
redis_client.rpush(f"session:{session_id}", json.dumps({"role": role, "content": content}))
redis_client.expire(f"session:{session_id}", 86400)  # 24h TTL

history = redis_client.lrange(f"session:{session_id}", 0, -1)
messages = [json.loads(m) for m in history]
```

**Kyun Redis?** Fast, TTL built-in, multi-instance shared memory.

---

## 14. Redis Caching (Deep Dive + Syntax)

Yeh section beginner ke liye **complete Redis crash course** hai — kyunki production Gen AI mein cache almost mandatory hai (cost + speed).

### 14.1 Redis kya hai?

Redis = in-memory key-value store.

```text
KEY                  VALUE
ai:cache:abc123      "Refunds take 2-3 days..."
ai:embed:p1          "[0.12, -0.4, ...]"
ai:rate:1.2.3.4:99   "7"
session:user42       list of chat JSON strings
```

### 14.2 Install + connect (Python)

```bash
pip install redis==5.0.2
# Redis server locally: docker run -p 6379:6379 redis:7
```

```python
import redis

# Method 1: host/port
r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

# Method 2: URL (is project mein yahi)
r = redis.Redis.from_url("redis://localhost:6379", decode_responses=True)

# decode_responses=True → bytes ki jagah str milti hai
```

**Repo:** `app/utils/cache.py` → `redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)`

### 14.3 Core commands (syntax jo yaad rakho)

```python
r.set("hello", "world")           # set key
r.get("hello")                    # -> "world"
r.delete("hello")

r.setex("otp", 60, "123456")      # set + expire 60 seconds
r.expire("hello", 3600)           # existing key pe TTL
r.ttl("otp")                      # remaining seconds

r.exists("hello")                 # 1 or 0

# Counters (rate limit)
r.incr("ai:rate:ip:bucket")       # atomic +1
r.expire("ai:rate:ip:bucket", 60)

# Lists (chat history)
r.rpush("session:1", '{"role":"user","content":"hi"}')
r.lrange("session:1", 0, -1)      # all items

# Hash (optional pattern)
r.hset("user:1", mapping={"name": "Asha", "city": "Delhi"})
r.hget("user:1", "name")
```

### 14.4 LLM response cache — is project ka pattern

**Problem:** Same question 100 baar → 100 baar OpenAI bill.

**Solution:** `system_prompt + message` ka hash banao → Redis key.

```python
import hashlib

def _make_cache_key(message: str, system_prompt: str = "") -> str:
    raw = f"{system_prompt}||{message}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"ai:cache:{digest}"

def get_cached_ai_response(message: str, system_prompt: str = ""):
    try:
        return redis_client.get(_make_cache_key(message, system_prompt))
    except Exception as e:
        print(f"Redis connection error: {e}")
        return None  # fail-open: cache down toh LLM call allow

def set_cached_ai_response(message, response, expire_seconds=3600, system_prompt=""):
    try:
        redis_client.setex(
            _make_cache_key(message, system_prompt),
            expire_seconds,
            response,
        )
    except Exception as e:
        print(f"Redis save error: {e}")
```

**Kyun hash?** Raw prompt key mein mat daalo — special chars / length / privacy issues.

**Kyun system_prompt bhi?** Same user text + alag system prompt = alag answer hona chahiye.

### 14.5 Embedding cache pattern

```python
key = f"ai:embed:{product_id}"
cached = redis_client.get(key)
if cached:
    return json.loads(cached)          # string → list[float]

vector = generate_embedding(name)
redis_client.setex(key, 86400, json.dumps(vector))  # list → string
```

### 14.6 Rate limiting with Redis

```python
import time

client_ip = "1.2.3.4"
minute_bucket = int(time.time() // 60)
rate_key = f"ai:rate:{client_ip}:{minute_bucket}"

count = redis_client.incr(rate_key)
if count == 1:
    redis_client.expire(rate_key, 60)

if count > 60:
    # HTTP 429 Too Many Requests
    ...
```

**Repo:** `app/utils/security_middleware.py`

### 14.7 Redis keys used in this project

| Key pattern | Purpose | TTL |
|-------------|---------|-----|
| `ai:cache:<sha256>` | LLM answer cache | 3600s (1h) |
| `ai:embed:<product_id>` | Product embedding | 86400s (24h) |
| `ai:rate:<ip>:<minute>` | Rate limit counter | 60s |
| `session:<session_id>` | Chat message list | 86400s |

### 14.8 Mini practice (Redis CLI + Python)

```bash
redis-cli
> SET demo "hello"
> GET demo
> SETEX temp 10 "bye"
> TTL temp
> INCR counter
> RPUSH mylist "a"
> LRANGE mylist 0 -1
```

```python
# practice_cache.py
import redis, hashlib, time

r = redis.Redis.from_url("redis://localhost:6379", decode_responses=True)

def cached_llm(prompt: str, call_llm):
    key = "practice:" + hashlib.sha256(prompt.encode()).hexdigest()
    hit = r.get(key)
    if hit:
        print("CACHE HIT")
        return hit
    print("CACHE MISS — calling fake LLM")
    answer = call_llm(prompt)
    r.setex(key, 30, answer)
    return answer

print(cached_llm("hi", lambda p: f"echo:{p}"))
print(cached_llm("hi", lambda p: f"echo:{p}"))  # second = HIT
```

---

## 15. Multimodal AI (Images)

### Concept

Multimodal model text **aur** image dono samajhta hai. Yahan `gpt-4o`.

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Is product damaged?"},
            {"type": "image_url", "image_url": {"url": image_url}},
        ],
    }],
    max_tokens=300,
)
```

**Repo:** `POST /api/v1/multimodal/analyze-image` · `routers/multimodal.py`

Use cases: damaged delivery photo, product quality check, receipt OCR-like help.

---

## 16. Security Guardrails

### A) Prompt injection filter (keyword)

```python
# security_filters.py
blacklisted = [
    "ignore previous instructions",
    "forget all rules",
    "system prompt",
    "reveal your secret",
    "hack database",
]

def check_prompt_injection(user_message: str) -> bool:
    msg = user_message.lower()
    return any(p in msg for p in blacklisted)
```

**Repo route:** `POST /api/v1/security/secure-chat`

Beginner note: Keyword list = first defense. Production mein classifiers, allow-lists, output filters bhi aate hain.

### B) API key + rate limit middleware

```python
# Agar AI_API_KEY set hai:
incoming = request.headers.get("X-AI-API-Key")
if incoming != settings.AI_API_KEY:
    return 401

# Rate limit Redis pe (upar section 14.6)
```

Public paths: `/`, `/health`, `/docs`, etc.

---

## 17. Structured JSON Output

Kabhi LLM se free text nahi, **machine-readable JSON** chahiye.

```python
response = client.chat.completions.create(
    model="gpt-3.5-turbo-1106",
    response_format={"type": "json_object"},
    messages=[{"role": "user", "content": "Return JSON with keys category, maxPrice, tags. Query: cheap milk"}],
    temperature=0,  # deterministic-ish
)
data = json.loads(response.choices[0].message.content)
```

**Repo:**

| Use case | File | Route |
|----------|------|-------|
| NL → filters | `routers/parse.py` | `POST /parse-query` |
| Admin product copy | `admin_ai_service.py` | `POST /admin/generate-product-content` |

---

## 18. MongoDB Tools for AI

Agents ko **live data** chahiye — mock dict se aage.

**Repo:** `app/services/db_tools.py`

| Function | Kaam |
|----------|------|
| `get_live_product_stock_sync` | Product + inventory stock/price |
| `list_active_products_sync` | Catalog for search/recommend |
| `get_order_by_number_sync` | Order status for agent tool |
| `get_latest_order_for_user_sync` | Support bot live order |
| `get_nearby_stores_sync` | Lat/lng se nearest stores (assistant) |
| `resolve_store_id_sync` | store_id / name / nearest from lat-lng |
| `get_store_categories_sync` | Store categories + product counts |
| `resolve_category_sync` | Loose category name/slug match |
| `get_category_products_sync` | Products in a category for a store |

Wrappers for OpenAI/LangGraph tools: `catalog_tools.py` (`execute_catalog_tool`).

Libraries: `pymongo` (sync) + `motor` (async).

```python
from pymongo import MongoClient
from app.config import settings

sync_client = MongoClient(settings.MONGO_URI)
sync_db = sync_client.get_default_database()

product = sync_db.products.find_one({"name": {"$regex": "milk", "$options": "i"}})
inventory = sync_db.inventories.find_one({"product": product["_id"]})
```

---

## 19. Fine-tuning Basics

### Kab fine-tune? Kab RAG?

| Approach | Best for |
|----------|----------|
| **RAG** | Facts change (policies, catalog) |
| **Fine-tune** | Tone, format, domain style consistently |
| **Both** | Production apps often mix |

### Dataset (JSONL)

Har line ek JSON:

```json
{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}
```

**Repo:** `training/dataset_prep.py` → `quick_commerce_train_data.jsonl`

### QLoRA idea (open-source models)

```python
# training/lora_finetune.py (stub — Trainer loop abhi incomplete)
from peft import LoraConfig, get_peft_model

peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    task_type="CAUSAL_LM",
)
```

**QLoRA** = 4-bit quantized model + small LoRA adapters → consumer GPU pe fine-tune possible.

Learning next step: Hugging Face `Trainer` + your JSONL dataset.

---

## 20. Production Hardening

Is project mein already:

| Concern | Implementation |
|---------|----------------|
| Config | `config.py` + `.env` |
| CORS | `CORS_ORIGINS` allowlist |
| Auth | Optional `X-AI-API-Key` |
| Rate limit | Redis per-IP per-minute |
| Cache | LLM + embeddings |
| Latency logs | `utils/logger.py` + middleware `X-Process-Time` |
| Fail-open Redis | Cache/rate errors print, request continue |
| Fallbacks | LLM / Mongo errors pe safe strings |

Aur add karna seekho (advanced homework):

1. Streaming tokens (UX)
2. Eval set (golden Q&A)
3. Tracing (LangSmith / OpenTelemetry)
4. Multi-provider LLM client (OpenAI + Gemini)
5. Auth every AI route via backend-core only (private network)
6. Input size limits + PII redaction
7. Unit tests for cosine / cache key / injection filter

---

## 21. File Map (har file kya karti hai)

### Core / config

| File | Topic |
|------|--------|
| `app/main.py` | FastAPI app, middleware, all routers |
| `app/config.py` | Settings: OpenAI, Mongo, Redis, CORS, rate limit |
| `app/schemas.py` | Shared request/response models |
| `app/core/llm_clients.py` | Shared OpenAI wrapper |
| `app/core/vector_db.py` | Chroma persistent collection |
| `app/prompts/templates.py` | System + RAG prompts |

### Services (Gen AI logic)

| File | Topic |
|------|--------|
| `llm_service.py` | Chat + Redis cache + logging |
| `chat_service.py` | Async-style chat helper class |
| `embedding_service.py` | Embeddings + Redis embed cache |
| `search_service.py` | Semantic product search |
| `recommend_service.py` | Similar product recommendations |
| `rag_service.py` | Ingest + retrieve + `get_rag_answer` |
| `tool_service.py` | Stock tool calling |
| `agent_tools.py` | Order status tool (Mongo) |
| `agent_service.py` | Agent loop + `run_shopping_agent` |
| `support_service.py` | FAQ + live order tool |
| `memory_service.py` | Chat with optional Redis session |
| `session_memory.py` | Redis list history helpers |
| `langchain_service.py` | LCEL shopping suggest |
| `graph_service.py` | LangGraph **demo** workflow (order vs chat) |
| `catalog_graph.py` | LangGraph **live** assistant (`run_catalog_graph`) |
| `catalog_agent.py` | `detect_intent`, `cards_from_tool`; legacy `run_catalog_assistant` |
| `catalog_tools.py` | Catalog tool schemas + `execute_catalog_tool` |
| `admin_ai_service.py` | JSON product content |
| `db_tools.py` | Mongo helpers for AI tools (incl. nearby/categories/products) |
| `eta_service.py` | Haversine ETA (not Gen AI) |

### Routers (HTTP)

| File | Paths |
|------|--------|
| `health.py` | `GET /health` |
| `eta.py` | `POST /eta` |
| `recommend.py` | `POST /recommend` |
| `search.py` | `POST /embed`, `POST /search` |
| `rag.py` | `/api/v1/rag/add-doc`, `/ask-rag` |
| `agent.py` | `/api/v1/agent/run-agent` |
| `agent_router.py` | `POST /agent-support` |
| `tools.py` | `POST /tool-chat` |
| `support_router.py` | `POST /support/query` |
| `assistant.py` | `POST /assistant` → `run_catalog_graph` |
| `memory.py` | `POST /chat-memory` |
| `langchain_router.py` | `POST /langchain-suggest` |
| `multimodal.py` | `/api/v1/multimodal/analyze-image` |
| `security.py` | `/api/v1/security/secure-chat` |
| `admin_router.py` | `POST /admin/generate-product-content` |
| `parse.py` | `POST /parse-query` |

### Utils / training

| File | Topic |
|------|--------|
| `utils/cache.py` | Redis LLM cache |
| `utils/security_filters.py` | Prompt injection keywords |
| `utils/security_middleware.py` | API key + rate limit |
| `utils/logger.py` | AI latency metrics |
| `training/dataset_prep.py` | JSONL dataset |
| `training/lora_finetune.py` | QLoRA stub |

---

## 22. API Routes Cheatsheet

Mounted in `main.py` (prefix where noted):

```text
GET  /                                      root
GET  /health
POST /eta
POST /recommend
POST /embed
POST /search
POST /assistant                 # → catalog_graph.run_catalog_graph
POST /chat-memory
POST /tool-chat
POST /agent-support
POST /support/query
POST /langchain-suggest
POST /admin/generate-product-content
POST /parse-query
POST /api/v1/rag/add-doc
POST /api/v1/rag/ask-rag
POST /api/v1/agent/run-agent
POST /api/v1/multimodal/analyze-image
POST /api/v1/security/secure-chat
```

Swagger UI: `http://127.0.0.1:8000/docs`

Node proxy (`backend-core`): `/api/ai/*` → yeh service.

---

## 23. Local Setup

```bash
cd ai-service
python -m venv .venv

# Windows PowerShell
.venv\Scripts\activate

pip install -r requirements.txt

# .env example
# OPENAI_API_KEY=sk-...
# REDIS_URL=redis://localhost:6379
# MONGO_URI=mongodb://localhost:27017/quick-commerce
# CORS_ORIGINS=http://localhost:3000
# AI_API_KEY=          # empty = auth off locally
# RATE_LIMIT_PER_MINUTE=60

# Redis (Docker)
docker run -d --name redis -p 6379:6379 redis:7

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Key dependencies (`requirements.txt`)

```text
fastapi, uvicorn, pydantic, pydantic-settings
openai
langchain-openai, langchain-core, langgraph
chromadb
redis
motor, pymongo
python-dotenv
```

---

## 24. Practice Exercises

Beginner → advanced homework (Gemini se discuss kar sakte ho):

1. **Python:** `cosine_similarity` khud likho aur 2 sample vectors pe test karo.
2. **LLM:** Bina FastAPI ke ek script mein OpenAI chat call karo.
3. **Cache:** Section 14.8 wala `practice_cache.py` chalao; TTL expire hone do, miss dekho.
4. **RAG:** 3 FAQs Chroma mein daalo, 5 questions poocho, context + answer print karo.
5. **Tools:** Naya tool `cancel_order(order_id)` mock dict se banao, agent mein wire karo.
6. **LangGraph assistant:** `detect_intent` mein `"store"` / `"dukaan"` ko `nearby` treat karo; `POST /assistant` se verify karo ki cards aate hain.
7. **Memory:** Same `session_id` se 3 messages bhejo, Redis `LRANGE` se verify karo.
8. **Security:** Naya blacklist phrase add karo + unit test socho.
9. **Production:** Gemini provider ke liye `llm_clients.py` mein second client design karo (interface same).
10. **Eval:** 10 Q&A CSV banao; script se RAG answers compare karo (manual score).
11. **Fine-tune:** `dataset_prep.py` mein 20 aur examples add karo.

---

## 25. Glossary

| Term | Simple meaning |
|------|----------------|
| **LLM** | Large Language Model — text generate karta hai |
| **Token** | Text ka chhota tukda; billing tokens pe hoti hai |
| **Prompt** | Model ko diya instruction / question |
| **Temperature** | 0 = focused, 1 = creative/random |
| **Embedding** | Text → vector (numbers) |
| **Vector DB** | Nearest-neighbor search for embeddings |
| **RAG** | Retrieve docs → prompt mein daalo → generate |
| **Hallucination** | Model galat confidant jawab |
| **Tool / Function calling** | LLM Python function invoke karne ko kahe |
| **Agent** | Multi-step LLM + tools loop |
| **LCEL** | LangChain Expression Language (`prompt \| llm \| parser`) |
| **LangGraph** | Graph/state-machine for agents; live shopping path = `catalog_graph.py` |
| **Intent routing** | Keywords se decide kaunsa tool chalega (`detect_intent`) |
| **Forced tool** | Intent ke hisaab se tool name fix; LLM choose nahi karta |
| **TTL** | Time To Live — key kab expire hogi |
| **Cache hit/miss** | Answer Redis mein mila / nahi mila |
| **Rate limit** | Per time window max requests |
| **Guardrail** | Unsafe prompts / outputs rokna |
| **Fine-tune** | Model weights pe apna data train |
| **LoRA / QLoRA** | Efficient fine-tune methods |
| **Multimodal** | Text + image (or audio/video) |
| **Semantic search** | Meaning-based search, not exact keywords |

---

## 26. Full Stack Ports + Env + AWS Deploy (Gemini ko do)

> **Is section ka purpose:** Poora monorepo AWS pe deploy karne ke liye ek hi jagah pe **ports, env vars, Docker, dependencies, CI/CD, aur beginner AWS plan**.
>
> Gemini / ChatGPT ko yeh prompt do (neeche bhi copy hai):
>
> *"Read Section 26 of `ai-service/AI_SERVICE_DOCS.md`. I am a beginner. Deploy this Quick Commerce monorepo on AWS step by step. Ask me one question at a time (budget, domain, EC2 vs ECS). Never skip security groups, env secrets, or CORS/CLIENT_ORIGIN updates."*

### 26.1 Monorepo folders (kya kya deploy hota hai)

| Folder | Tech | Role | Dockerfile |
|--------|------|------|------------|
| `backend-core/` | Node.js + Express | Main REST API (`/api/...`), auth, orders, catalog, AI proxy | `backend-core/Dockerfile` |
| `socket-service/` | Node.js + Socket.IO | Real-time order tracking / live updates | `socket-service/Dockerfile` |
| `web-frontend/` | Next.js 14 | Customer + admin + rider UI | `web-frontend/Dockerfile` |
| `ai-service/` | Python 3.10 + FastAPI | Gen AI (search, RAG, chat, agents) | `ai-service/Dockerfile` |
| (infra) MongoDB | `mongo:latest` | Database | `docker-compose.yml` |
| (infra) Redis | `redis:alpine` | Cache, pub/sub, socket adapter, AI memory | `docker-compose.yml` |

Root compose file: `docker-compose.yml` (local / single-server Docker pe sab services).

Optional K8s stubs (incomplete): `k8s/backend-deployment.yaml`, `k8s/backend-service.yaml` — abhi sirf ek sample container port 3000; production ke liye 4 services + Mongo + Redis alag chahiye.

`mobile-app/` Expo app hai — AWS web deploy ke scope se bahar (alag Play Store / Expo build).

### 26.2 Port map (yaad rakhna — AWS Security Group mein yeh open karo)

| Service | Host port | Container port | Protocol | Public internet? |
|---------|-----------|----------------|----------|------------------|
| **web-frontend** | **3000** | 3000 | HTTP | Haan (ya ALB → 3000) |
| **backend-core** | **4000** | 4000 | HTTP | Haan (ya ALB → 4000) |
| **socket-service** | **5000** | 5000 | HTTP + WebSocket | Haan (ya ALB → 5000, WS support) |
| **ai-service** | **8000** | 8000 | HTTP | **Nahi** (sirf VPC / private). Browser isko directly call nahi karta |
| **MongoDB** | **27017** | 27017 | TCP | **Kabhi nahi public** |
| **Redis** | **6379** | 6379 | TCP | **Kabhi nahi public** |

**Browser → services flow (production):**

```
User browser
  ├─► web-frontend :3000          (Next.js pages)
  ├─► backend-core :4000/api/...  (REST + JWT)
  └─► socket-service :5000        (Socket.IO realtime)

backend-core (private network)
  └─► ai-service :8000            (AI proxy; X-AI-API-Key)
  └─► MongoDB :27017
  └─► Redis :6379

socket-service
  └─► Redis :6379                 (adapter / pub-sub)

ai-service
  └─► MongoDB :27017
  └─► Redis :6379
  └─► OpenAI API (outbound HTTPS)
```

Local defaults code se:

| Env / code | Default URL |
|------------|-------------|
| Frontend API | `NEXT_PUBLIC_API_URL=http://localhost:4000/api` |
| Frontend socket | `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000` |
| Backend → AI | `AI_SERVICE_URL=http://127.0.0.1:8000` |
| AI Swagger (local) | `http://127.0.0.1:8000/docs` |

### 26.3 Runtime versions (Docker / CI ke hisaab se)

| Piece | Version |
|-------|---------|
| Node.js (Dockerfiles) | **18** Alpine (`node:18-alpine`) |
| Node.js (CI workflow) | **18** |
| Node.js (`backend-core/package.json` engines) | `>=20` — deploy pe **Node 18 ya 20** choose karo; Dockerfiles abhi 18 use karte hain |
| Python (ai-service) | **3.10** (`python:3.10-slim`) |
| Next.js | **14.x** |
| MongoDB image | `mongo:latest` |
| Redis image | `redis:alpine` |

Start commands:

| Service | Start |
|---------|--------|
| backend-core | `npm start` → `node src/server.js` |
| socket-service | `npm start` → `node src/index.js` |
| web-frontend | `npm start` → `next start -p 3000` (Docker: `node server.js` after build) |
| ai-service | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |

### 26.4 Environment variables (har service — AWS pe Secrets / .env)

#### A) `backend-core` — file: `backend-core/.env.example`

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `PORT` | yes | `4000` |
| `NODE_ENV` | yes | `production` |
| `MONGO_URI` | yes | `mongodb://USER:PASS@host:27017/quick-commerce` (Atlas ya EC2 Mongo) |
| `JWT_ACCESS_SECRET` | yes | long random string (same concept socket se share) |
| `JWT_REFRESH_SECRET` | yes | long random string |
| `JWT_ACCESS_EXPIRES` | no | default `15m` |
| `JWT_REFRESH_EXPIRES` | no | default `7d` |
| `REDIS_URL` | yes | `redis://host:6379` (ElastiCache / Docker Redis) |
| `AI_SERVICE_URL` | yes | private URL e.g. `http://ai-service:8000` or internal IP |
| `AI_API_KEY` | prod recommended | same value as ai-service `AI_API_KEY` (header `X-AI-API-Key`) |
| `CLIENT_ORIGIN` | yes | frontend public URL e.g. `https://app.yourdomain.com` |
| `IMAGEKIT_PUBLIC_KEY` | if uploads | ImageKit dashboard |
| `IMAGEKIT_PRIVATE_KEY` | if uploads | secret |
| `IMAGEKIT_URL_ENDPOINT` | if uploads | `https://ik.imagekit.io/xxx` |

#### B) `socket-service` — file: `socket-service/.env.example`

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `PORT` | yes | `5000` |
| `REDIS_URL` | yes | same Redis as backend |
| `JWT_ACCESS_SECRET` | yes | **same** as backend-core `JWT_ACCESS_SECRET` |
| `CLIENT_ORIGIN` | yes | same frontend origin (CORS / Socket.IO) |

#### C) `ai-service` — from `ai-service/app/config.py`

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `PORT` | yes | `8000` |
| `OPENAI_API_KEY` | yes (AI features) | OpenAI key |
| `MONGO_URI` | yes | same DB as backend |
| `REDIS_URL` | yes | same Redis |
| `CORS_ORIGINS` | yes | comma-separated frontend URLs |
| `AI_API_KEY` | prod recommended | empty = auth off (local only); prod mein set karo |
| `RATE_LIMIT_PER_MINUTE` | no | default `60` |

#### D) `web-frontend` — build-time / runtime (Next.js)

Repo mein `.env.example` nahi hai; code defaults:

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `NEXT_PUBLIC_API_URL` | yes (prod) | `https://api.yourdomain.com/api` **ya** `http://EC2_PUBLIC_IP:4000/api` |
| `NEXT_PUBLIC_SOCKET_URL` | yes (prod) | `https://socket.yourdomain.com` **ya** `http://EC2_PUBLIC_IP:5000` |
| `PORT` | Docker | `3000` |
| `HOSTNAME` | Docker | `0.0.0.0` |
| `NODE_ENV` | Docker | `production` |

**Important:** `NEXT_PUBLIC_*` values **build time** pe bake hote hain. Domain / IP change → frontend **rebuild** + redeploy.

Image uploads: browser ImageKit ko call karta hai; auth endpoint backend se aata hai (`/admin/imagekit-auth`). Frontend pe ImageKit keys mat daalo.

### 26.5 `docker-compose.yml` local map (reference)

```text
mongodb        27017
redis          6379
backend-core   4000  → MONGO_URI=mongodb://mongodb:27017/quick-commerce
                     → REDIS_URL=redis://redis:6379
                     → AI_SERVICE_URL=http://ai-service:8000
                     → CLIENT_ORIGIN=http://localhost:3000
socket-service 5000  → REDIS_URL=redis://redis:6379
                     → CLIENT_ORIGIN=http://localhost:3000
ai-service     8000  → MONGO + REDIS
```

Compose mein **web-frontend service abhi define nahi** — frontend alag `npm run dev` / alag container / Amplify pe chalega. AWS pe frontend bhi Dockerfile se add kar sakte ho.

### 26.6 Docker image notes / gotchas

1. Har service ka apna `Dockerfile` hai (dekh table 26.1).
2. `web-frontend/Dockerfile` **standalone** Next output expect karta hai (`COPY .next/standalone`), lekin `web-frontend/next.config.js` mein abhi `output: 'standalone'` **set nahi**. Deploy se pehle add karo:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};
module.exports = nextConfig;
```

3. `ai-service` Chroma data folder local disk pe ho sakta hai — EC2 pe volume mount socho, warna container restart pe RAG docs gayab.
4. Secrets `.env` files ko Git mein mat push karo; AWS pe **Secrets Manager / SSM Parameter Store / EC2 env** use karo.
5. Production mein `CLIENT_ORIGIN` aur `CORS_ORIGINS` ko real frontend HTTPS URL se replace karo — warna browser CORS / socket block karega.

### 26.7 CI/CD (already in repo)

File: `.github/workflows/ci-cd.yml`

- Trigger: push / PR to `main` or `master`
- Jobs abhi: **install + build test only** (deploy step nahi)
  - Node 18: `backend-core`, `socket-service`, `mobile-app`, `web-frontend` (`npm ci`; frontend `npm run build`)
  - Python 3.10: `ai-service` (`pip install -r requirements.txt`)
- AWS deploy ke liye baad mein add karo: build Docker images → push **ECR** → deploy **ECS / EC2 / Elastic Beanstalk**

GitHub Secrets jo baad mein chahiye ho sakte hain: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ECR_*`, OpenAI key (agar CI mein AI test ho).

### 26.8 External services (AWS ke bahar / managed)

| Need | Options |
|------|---------|
| MongoDB | **MongoDB Atlas** (easiest beginner) ya EC2 pe Docker Mongo |
| Redis | **AWS ElastiCache Redis** ya EC2 pe Docker Redis |
| Images | **ImageKit** (keys backend pe) |
| LLM | **OpenAI** API key (`OPENAI_API_KEY`) |
| Domain + HTTPS | Route 53 + ACM + ALB (ya Cloudflare) |
| Object storage (optional later) | S3 |

### 26.9 AWS beginner deploy paths (Gemini isme se choose karwaye)

**Path A — Single EC2 + Docker Compose (sabse easy beginner)**

1. Ubuntu EC2 (t3.medium+ recommended; AI + Next build RAM khati hai).
2. Security Group inbound:
   - `22` SSH (apna IP only)
   - `3000` frontend
   - `4000` API
   - `5000` sockets
   - **27017 / 6379 / 8000 public mat kholo**
3. Install Docker + Docker Compose.
4. Clone repo, har service ka `.env` bharo (public IP / domain se `CLIENT_ORIGIN`, `NEXT_PUBLIC_*`).
5. Compose se Mongo + Redis + backend + socket + AI up.
6. Frontend: either add to compose, or `docker build` web-frontend, run port 3000.
7. Seed DB: `cd backend-core && npm run seed` (Mongo URI set karke).
8. Test: browser → `:3000`, API health → `:4000`, socket → `:5000`.

**Path B — Managed DB + EC2 apps (thoda better)**

- Mongo → Atlas  
- Redis → ElastiCache (same VPC)  
- Apps → EC2 / ECS  

**Path C — Production-ish**

- Images in **ECR**
- Services on **ECS Fargate** (4 task defs) + ALB (HTTP + WebSocket sticky for sockets)
- Secrets Manager for env
- CI: GitHub Actions build/push/deploy

**Path D — Frontend alag**

- `web-frontend` → **AWS Amplify** / Vercel / S3+CloudFront  
- APIs → EC2/ECS  
- Set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` to API hosts before build

### 26.10 Minimum checklist (deploy se pehle)

- [ ] 4 app images / processes ready: frontend 3000, API 4000, socket 5000, AI 8000  
- [ ] Mongo + Redis reachable privately  
- [ ] Same `JWT_ACCESS_SECRET` on backend-core **and** socket-service  
- [ ] Same `AI_API_KEY` on backend-core **and** ai-service (prod)  
- [ ] `CLIENT_ORIGIN` / `CORS_ORIGINS` = real frontend URL  
- [ ] `NEXT_PUBLIC_API_URL` ends with `/api`  
- [ ] `NEXT_PUBLIC_SOCKET_URL` points to socket host  
- [ ] `OPENAI_API_KEY` set on ai-service  
- [ ] ImageKit keys if admin image upload chahiye  
- [ ] Security groups: DB/Redis/AI not public  
- [ ] HTTPS plan (ALB/Cloudflare) — production ke liye  
- [ ] Next `output: 'standalone'` if using current frontend Dockerfile  

### 26.11 Copy-paste: Gemini AWS mentor prompt

```text
You are my AWS deployment mentor for a beginner.
Use ONLY Section 26 of ai-service/AI_SERVICE_DOCS.md as the source of truth for ports, env vars, Docker, and architecture of this Quick Commerce monorepo (backend-core, socket-service, web-frontend, ai-service, MongoDB, Redis).

Rules:
1. Teach in simple Hindi-English mix.
2. One step at a time. After each step, wait for my confirmation / screenshot / error.
3. First ask: budget, AWS account ready?, domain?, prefer single EC2 (Path A) or managed (Path B/C)?
4. Always remind me which ports to open and which must stay private (27017, 6379, 8000).
5. Always set CLIENT_ORIGIN, CORS_ORIGINS, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL correctly.
6. Do not invent services that are not in the doc. If something is missing (e.g. Next standalone), tell me to fix the file first.
7. At the end give a smoke-test checklist (home page, login, socket connect, one AI search call).
```

### 26.12 Quick smoke tests after deploy

```bash
# API up?
curl http://YOUR_HOST:4000/api/health   # agar health route hai; warna /api/... known route

# AI via backend proxy (not public AI port)
# Frontend se search, ya:
curl -X POST http://YOUR_HOST:4000/api/ai/search -H "Content-Type: application/json" -d "{\"query\":\"milk\"}"

# Socket: browser console / Network → WS to :5000
# Frontend: open http://YOUR_HOST:3000
```

---

## Mentor prompt (Gemini / ChatGPT ko do)

### Gen AI seekhne ke liye

Copy-paste:

> You are my Gen AI mentor. Teach me using only the curriculum and code references in `AI_SERVICE_DOCS.md` from the Quick Commerce `ai-service` project.  
> Start from Python basics if needed, then LLM → embeddings → RAG → tools → agents → Redis caching → production.  
> Each lesson: (1) concept in simple language, (2) tiny code snippet, (3) where it lives in this repo, (4) one practice task.  
> Ask me questions to check understanding before moving to the next topic. Prefer Hindi-English mix if I reply in Hinglish.

### AWS pe deploy karne ke liye

Section **26.11** wala prompt copy karo — Gemini Step 26 ports/env follow karke beginner deploy karwayega.

---

## One-line summary

Yeh `ai-service` ek **mini Gen AI university** hai: chat, embeddings, Chroma RAG, tool-calling agents, LangChain/LangGraph (`catalog_graph` = live `/assistant`), Redis cache/memory/rate-limit, multimodal, guardrails, structured JSON, Mongo tools, aur fine-tune stubs — beginner se production-ready learning path ke saath. Section **0** live frontend APIs; Section **26** mein full monorepo **ports + env + AWS deploy** cheat sheet.

**Gemini start prompt (code seekhne ke liye):**

> “Read `ai-service/AI_SERVICE_DOCS.md`. Section 0 se start karo. Assistant ke liye `catalog_graph.py` + `detect_intent` samjhao. Purana `run_catalog_assistant` legacy hai — live router LangGraph use karta hai. Phir mujhe step-by-step code changes karwao.”
