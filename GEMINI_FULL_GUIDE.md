# Quick Commerce — Poora Project Guide (Gemini / Beginner)

> **Kaise use karein:** Is file ko Gemini / ChatGPT mein attach / paste karo, phir poocho:  
> *“Is guide ke hisaab se mujhe X samjhao / Y fix karo / Z API add karo.”*  
> Source of truth = **current code** (Oct 2026). Purani docs (`PROJECT_CONTEXT.md` ke kuch parts, `WEB_BUILD_PHASES.md`) stale ho sakti hain — **yeh file latest code se match karti hai**.

**Product:** Blinkit / Zepto jaisa quick commerce — dark stores, 10–15 min delivery, **customer + admin + rider**.

---

## 0. Gemini ko pehle yeh rules do

```text
1) Role string hamesha: customer | admin | delivery_partner (kabhi "rider" mat likho)
2) Paise INTEGER PAISE mein: ₹99 = 9900
3) GeoJSON coordinates: [longitude, latitude]  →  [lng, lat]
4) Query/body alag fields: lat aur lng
5) JWT payload: { sub: userId, role }  →  req.user.sub (req.user._id mat)
6) Normal API response: { success, message, data }
7) /api/ai/* response shape alag ho sakti hai (raw / error)
8) Ek kaam ek prompt mein maango — poora platform ek saath mat
9) Nayi path invent mat karo jab tak is file mein na ho
10) Client se selling price order/cart ko mat bhejo — server inventory se leta hai
```

---

## 1. Architecture (simple picture)

```text
Browser (web-frontend :3000)
    │
    ├── REST  →  backend-core :4000  (/api/...)
    │                │
    │                ├── MongoDB :27017
    │                ├── Redis :6379  (publish "qc:events")
    │                └── AI proxy → ai-service :8000
    │
    └── Socket.io → socket-service :5000
                         ↑
                    Redis subscribe "qc:events"
```

| Folder | Tech | Port | Kaam |
|--------|------|------|------|
| `backend-core` | Node 20+, Express, Mongoose | **4000** | Main REST API |
| `socket-service` | Node, Socket.io, Redis adapter | **5000** | Live order / rider updates |
| `ai-service` | Python 3.10+, FastAPI, Uvicorn | **8000** | Search, recommend, chat, agents |
| `web-frontend` | Next.js 14, React 18, Tailwind | **3000** | Customer + Admin + Rider web |
| MongoDB | Docker `mongo:latest` | **27017** | DB |
| Redis | `redis:alpine` | **6379** | Pub/sub channel `qc:events` |

Docker Compose chalata hai: mongodb, redis, backend-core, socket-service, ai-service.  
**Web frontend Docker Compose mein nahi** — alag `npm run dev`.

---

## 2. Kaise chalao (local)

### Terminal 1–5 (bina Docker services ke liye Mongo+Redis pehle chalu)

```bash
# Mongo + Redis up hone chahiye

# backend-core
cd backend-core
npm install
npm run dev          # → http://localhost:4000

# socket-service
cd socket-service
npm install
npm run dev          # → http://localhost:5000

# ai-service
cd ai-service
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload   # → :8000

# web-frontend
cd web-frontend
npm install
npm run dev          # → http://localhost:3000
```

### Docker (API stack)

```bash
# repo root
docker compose up --build
```

Ports: 4000, 5000, 8000 (+ Mongo 27017, Redis 6379).

### Seed data (demo users / stores)

```bash
cd backend-core
npm run seed
```

⚠️ Seed **saara** products/stores/users/carts/orders **delete** karke dubara daalta hai.

### Seed logins

| Role | Phone | Password |
|------|-------|----------|
| admin | `9999999999` | `Admin@123` |
| delivery_partner | `9876543210` | `Rider@123` |
| delivery_partner | `8888888888` | `Rider@123` |
| customer | `9123456789` | `Cust@123` |
| customer | `7777777777` | `Cust@123` |

---

## 3. Environment variables (dependencies / secrets)

### backend-core `.env` (required: PORT, MONGO_URI, JWT_*)

```env
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/quick_commerce
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
REDIS_URL=redis://127.0.0.1:6379
AI_SERVICE_URL=http://127.0.0.1:8000
CLIENT_ORIGIN=http://localhost:3000
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
```

**Note:** Docker DB name `quick-commerce`, local example `quick_commerce` — **alag DBs** ho sakte hain. Mix mat karo.

### socket-service `.env`

```env
PORT=5000
REDIS_URL=redis://127.0.0.1:6379
JWT_ACCESS_SECRET=change_me_access
CLIENT_ORIGIN=http://localhost:3000
```

`JWT_ACCESS_SECRET` **backend aur socket same** hona chahiye.

### ai-service `.env`

```env
PORT=8000
OPENAI_API_KEY=sk-...
MONGO_URI=mongodb://localhost:27017/quick-commerce
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
AI_API_KEY=
RATE_LIMIT_PER_MINUTE=60
```

`AI_API_KEY` empty = local auth off. Production mein set karo.

### web-frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## 4. Dependencies (packages)

### backend-core (`package.json`)

| Package | Kaam |
|---------|------|
| express | HTTP server |
| mongoose | Mongo ODM |
| joi | Request validation |
| jsonwebtoken + bcryptjs | Auth |
| ioredis | Redis publish events |
| axios | AI service proxy |
| helmet, cors, morgan, dotenv | Security / logging / env |
| imagekit | Admin image upload auth |
| nodemon (dev) | Hot reload |

Scripts: `npm run dev` | `start` | `seed`

### socket-service

| Package | Kaam |
|---------|------|
| socket.io | WebSocket server |
| @socket.io/redis-adapter | Multi-instance rooms |
| ioredis | Subscribe `qc:events` |
| jsonwebtoken | Handshake auth |
| express | `/health` |
| dotenv, nodemon | env + dev |

### ai-service (`requirements.txt`)

| Package | Kaam |
|---------|------|
| fastapi, uvicorn | HTTP API |
| pydantic, pydantic-settings | Schemas + settings |
| openai | GPT + embeddings |
| langchain-openai, langchain-core, langgraph | Agents / graphs |
| chromadb | Vector DB (RAG) |
| redis | Embedding cache |
| motor, pymongo | Mongo async/sync |
| python-dotenv, httpx | Env + HTTP |

### web-frontend

| Package | Kaam |
|---------|------|
| next 14, react 18 | App |
| tailwindcss, postcss, autoprefixer | CSS |
| leaflet | Maps |
| socket.io-client | Live tracking |

Scripts: `npm run dev` (-p 3000) | `build` | `start`

---

# PART A — backend-core

## A1. Folder map

```text
backend-core/
├── package.json, Dockerfile, .env.example
└── src/
    ├── server.js          ← Mongo connect + listen PORT
    ├── app.js             ← Express app: /api + /api/ai
    ├── seed.js            ← demo data
    ├── config/            ← env.js, db.js
    ├── routes/            ← HTTP paths
    ├── controllers/       ← req/res handlers
    ├── services/          ← business logic
    ├── models/            ← Mongoose schemas
    ├── validators/        ← Joi schemas
    ├── middleware/        ← auth, error, validate, rateLimit
    └── utils/             ← apiResponse, tokens, geo, redis publisher
```

**Request flow (yaad rakho):**

```text
Route → validate (Joi) → protect/allowRoles → Controller → Service → Model → Response
```

## A2. Important syntaxes (Node / Express)

### Response helper

```js
// utils/apiResponse.js pattern
{ success: true, message: "ok", data: { ... } }
```

### Auth middleware

```js
// Authorization: Bearer <accessToken>
// decoded → req.user = { sub: userId, role }
protect(req, res, next)
allowRoles('admin')           // ya 'delivery_partner', 'customer'
```

### Async route style

Controllers usually `asyncHandler` wrap use karte hain. Errors → `errorHandler` middleware.

### Money

```js
const rupees = paise / 100;   // 9900 → 99
const paise = Math.round(rupees * 100);
```

### Geo

```js
// Mongo GeoJSON
location: { type: 'Point', coordinates: [lng, lat] }

// Client query
?lat=28.6139&lng=77.209
```

## A3. Models (Mongo collections)

| Model file | Important fields |
|------------|------------------|
| `User.js` | name, phone (10 digit unique), passwordHash, role, rider: { isOnline, currentLocation, vehicleType } |
| `Store.js` | name, location, serviceRadiusKm (default 5), isOpen, images |
| `Category.js` | name, slug, images, isActive |
| `Product.js` | name, slug, category, unit, mrpPaise, images — **selling price yahan nahi** |
| `Inventory.js` | store + product unique, stock, sellingPricePaise |
| `Address.js` | user, line1, city, pincode, location, isDefault |
| `Cart.js` | user unique, store, items[{ product, qty, pricePaiseSnapshot }] |
| `Order.js` | orderNumber, items, pricing, paymentMethod, status, rider, etaMinutes |
| `Payment.js` | order, amountPaise, method, status, providerRef |

## A4. Saari REST APIs (base `http://localhost:4000`)

Auth header jahan Auth = Bearer:

```text
Authorization: Bearer <accessToken>
```

### Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | no |

### Auth `/api/auth`

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/api/auth/register` | no | `{ name, phone, password, email? }` → role always `customer` |
| POST | `/api/auth/login` | no | `{ phone, password }` |
| POST | `/api/auth/refresh` | no | `{ refreshToken }` → `{ accessToken }` |
| GET | `/api/auth/me` | Bearer | user without password |

Phone = exactly 10 digits. Password min 8.

### Home (public)

| Method | Path | Query |
|--------|------|------|
| GET | `/api/home` | `lat`, `lng`, `category?`, `q?` (rate limit 80/min) |

Returns: serviceable, hero, store, banners, categories, sections, nearbyStores…

### Stores (public)

| Method | Path | Query |
|--------|------|------|
| GET | `/api/stores/nearby` | `lat`, `lng` required |
| GET | `/api/stores/:id/catalog` | `lat?`, `lng?`, `category?` |
| GET | `/api/stores/:id/products/:productId` | same |

### Catalog (public)

| Method | Path | Query |
|--------|------|------|
| GET | `/api/catalog/categories` | — |
| GET | `/api/catalog/products` | **`storeId` required**, `categoryId?`, `q?` |

### Cart (login)

| Method | Path | Body |
|--------|------|------|
| GET | `/api/cart` | — |
| POST | `/api/cart/items` | `{ productId, storeId, qty }` |
| PATCH | `/api/cart/items/:productId` | `{ qty }` (0 = remove) |
| DELETE | `/api/cart` | clear |

Ek user = ek cart. Do stores mix nahi.

### Addresses (login)

| Method | Path | Body |
|--------|------|------|
| GET | `/api/addresses` | — |
| POST | `/api/addresses` | `{ label?, line1, line2?, city, state, pincode, lat, lng, isDefault? }` |
| DELETE | `/api/addresses/:id` | — |

### Orders (login)

| Method | Path | Notes |
|--------|------|------|
| POST | `/api/orders` | `{ addressId, paymentMethod: "cod"\|"online" }` |
| GET | `/api/orders` | customer = own; **admin = all** |
| GET | `/api/orders/:id` | owner / admin / assigned rider |
| POST | `/api/orders/:id/cancel` | only `pending` or `confirmed` |

Delivery fee: item total `< 19900` paise → fee `2900`, else `0`.  
`etaMinutes` order pe abhi ~`12` hardcode.

**Order status flow:**

```text
pending → confirmed → assigned → accepted → packed → picked_up → on_the_way → delivered
cancelled (sirf pending/confirmed se)
```

### Payments (login)

| Method | Path | Body |
|--------|------|------|
| POST | `/api/payments/online/mock-success` | `{ orderId }` |

Mock pay → confirmed → nearest **online** rider within **7 km** auto-assign.  
COD pe auto-assign nahi — admin assign karta hai. Real Razorpay **nahi**.

### Rider `/api/rider` (role `delivery_partner`)

| Method | Path | Body |
|--------|------|------|
| PATCH | `/api/rider/online` | `{ isOnline }` |
| PATCH | `/api/rider/location` | `{ lat, lng }` |
| GET | `/api/rider/assignments` | active orders |
| POST | `/api/rider/orders/:id/status` | `{ status }` next step only |

### Admin `/api/admin` (role `admin`)

| Area | Methods |
|------|---------|
| ImageKit | `GET /imagekit-auth` |
| Stores | CRUD `POST/GET/GET/:id/PUT/DELETE /stores` |
| Categories | CRUD `/categories` |
| Products | CRUD `/products` |
| Inventory | `GET /inventory`, `PUT /inventory` (upsert), CRUD `/:id` |
| Riders | CRUD `/riders`, `GET /riders/:id/orders` |
| Assign | `POST /orders/:id/assign` `{ riderId }` |
| Dev map helpers | `POST /stores/:id/place-rider`, `POST /stores/place-riders` |

Store body example:

```json
{
  "name": "Store",
  "phone": "9810000001",
  "addressText": "Full address",
  "images": ["https://..."],
  "location": { "type": "Point", "coordinates": [77.209, 28.6139] },
  "serviceRadiusKm": 5,
  "isOpen": true
}
```

Inventory upsert:

```json
{ "storeId": "...", "productId": "...", "stock": 50, "sellingPricePaise": 4500 }
```

### AI proxy `/api/ai` (Node → Python)

Node files: `routes/aiRoutes.js` → `controllers/aiController.js` → `services/aiService.js` (axios to `AI_SERVICE_URL`).

| Node path | Auth | Python path |
|-----------|------|-------------|
| POST `/api/ai/search` | no | POST `/search` |
| POST `/api/ai/recommendations` | no | POST `/recommend` |
| POST `/api/ai/assistant` | no | POST `/assistant` |
| POST `/api/ai/parse-query` | no | POST `/parse-query` |
| POST `/api/ai/tool-chat` | no | POST `/tool-chat` |
| POST `/api/ai/langchain-suggest` | no | POST `/langchain-suggest` |
| POST `/api/ai/agent-support` | no | POST `/agent-support` |
| POST `/api/ai/chat-memory` | Bearer | POST `/chat-memory` |
| POST `/api/ai/order-support` | Bearer | POST `/support/query` |
| POST `/api/ai/admin/generate-content` | admin | POST `/admin/generate-product-content` |

## A5. Realtime publish (backend → Redis)

File: `utils/realtime.publisher.js`

```text
publishEvent({ type, orderId, userId, riderId, ... })
  → Redis channel "qc:events"
```

Events: `order:assigned`, `order:status`, `rider:location`.

---

# PART B — socket-service

## B1. Folder map

```text
socket-service/
├── package.json, Dockerfile, .env.example
└── src/
    ├── index.js         ← HTTP + Socket.io + Redis subscribe
    ├── config.js
    ├── redis.js         ← pub/sub clients
    └── sockets/index.js ← JWT handshake + rooms
```

## B2. Kaise kaam karta hai

1. Client connect: `io(SOCKET_URL, { auth: { token: accessJWT } })`
2. JWT verify → `socket.user = { sub, role }`
3. Auto join: `user:<userId>`
4. Agar role `delivery_partner` → join `rider:<userId>`
5. Client event: `join:order` `{ orderId }` → room `order:<orderId>`
6. Redis message on `qc:events` → `io.to(room).emit(type, event)`

## B3. Health

```text
GET http://localhost:5000/health
```

## B4. Web client hook

`web-frontend/src/context/SocketContext.js` — login token se connect, `qc-auth` event pe reconnect.

```js
const socket = useSocket();
socket?.emit('join:order', { orderId });
socket?.on('order:status', handler);
socket?.on('rider:location', handler);
```

---

# PART C — ai-service

## C1. Folder map

```text
ai-service/
├── requirements.txt, Dockerfile
└── app/
    ├── main.py              ← FastAPI app + ALL routers mounted
    ├── config.py            ← Settings (env)
    ├── schemas.py           ← Pydantic request/response
    ├── routers/             ← HTTP endpoints
    ├── services/            ← Business / AI logic
    ├── core/                ← llm_clients, vector_db
    ├── prompts/             ← templates
    ├── utils/               ← cache, security, logger
    └── training/            ← LoRA / dataset (learning)
```

## C2. `main.py` — mounted routers (LIVE)

Ab **saare important routers mount hain** (`include_router`):

| Router file | Paths |
|-------------|-------|
| `health.py` | `GET /health` |
| `eta.py` | `POST /eta` |
| `recommend.py` | `POST /recommend` |
| `search.py` | `POST /embed`, `POST /search` |
| `assistant.py` | `POST /assistant` |
| `memory.py` | `POST /chat-memory` |
| `tools.py` | `POST /tool-chat` |
| `langchain_router.py` | `POST /langchain-suggest` |
| `agent_router.py` | `POST /agent-support` |
| `support_router.py` | `POST /support/query` |
| `admin_router.py` | `POST /admin/generate-product-content` |
| `parse.py` | `POST /parse-query` |
| `rag.py` | prefix `/api/v1/rag` → `/add-doc`, `/ask-rag` |
| `agent.py` | prefix `/api/v1/agent` → `/run-agent` |
| `multimodal.py` | prefix `/api/v1/multimodal` → `/analyze-image` |
| `security.py` | prefix `/api/v1/security` → `/secure-chat` |

Root: `GET /` → service live message.

Docs UI: `http://localhost:8000/docs` (Swagger).

## C3. Frontend pe LIVE AI (5 APIs)

Flow har jagah same:

```text
UI → web-frontend/src/utils/ai.js
  → POST localhost:4000/api/ai/...
  → backend aiService (axios)
  → Python :8000
```

| Feature | Node API | Python | Main service file | Technique |
|---------|----------|--------|-------------------|-----------|
| Search | `/api/ai/search` | `/search` | `search_service.py` + `embedding_service.py` | Embedding + cosine + Redis cache |
| Recommend | `/api/ai/recommendations` | `/recommend` | `recommend_service.py` | Embedding + cosine |
| Assistant | `/api/ai/assistant` | `/assistant` | **`catalog_graph.py`** (LangGraph) | Intent → forced Mongo tool → LLM answer + cards |
| Order support | `/api/ai/order-support` | `/support/query` | `support_service.py` | Tool + live order + LLM |
| Admin content | `/api/ai/admin/generate-content` | `/admin/generate-product-content` | `admin_ai_service.py` | Plain LLM JSON |

### Assistant LangGraph (important)

File: `services/catalog_graph.py` → `run_catalog_graph`

```text
POST /assistant
  → intent_node (detect_intent keywords)
  → tool_node (nearby / categories / products Mongo tools)
  → answer_node (short GPT answer + UI cards)
```

Helpers: `catalog_agent.py`, `catalog_tools.py`, `db_tools.py`.

Nearby intent ke liye query mein phrases: `near me`, `nearby`, `stores near`, etc. Sirf `"store"` → `general` → empty tools.

## C4. Python syntax cheats (beginner)

### FastAPI route

```python
from fastapi import APIRouter
router = APIRouter()

@router.post("/search")
async def search(body: SearchRequest):
    return await semantic_search(body.query, body.limit)
```

### Settings

```python
from app.config import settings
settings.OPENAI_API_KEY
settings.MONGO_URI
```

### Run locally

```bash
uvicorn app.main:app --reload --port 8000
```

### Direct Python test bodies

```json
// POST /eta
{ "storeLat": 28.61, "storeLng": 77.20, "userLat": 28.62, "userLng": 77.21 }

// POST /recommend
{ "product_id": "<mongoId>", "limit": 3 }

// POST /search
{ "query": "milk", "limit": 5 }

// POST /assistant
{ "query": "stores near me", "lat": 28.6139, "lng": 77.209 }
```

## C5. Key service files (function map)

| File | Important functions / role |
|------|----------------------------|
| `llm_service.py` / `core/llm_clients.py` | OpenAI chat helpers |
| `embedding_service.py` | `generate_embedding`, cache helpers |
| `search_service.py` | `semantic_search` |
| `recommend_service.py` | `get_recommendations` |
| `catalog_graph.py` | LangGraph assistant pipeline |
| `catalog_agent.py` | `detect_intent`, `cards_from_tool` |
| `catalog_tools.py` | `execute_catalog_tool` |
| `db_tools.py` | Mongo: products, stores, categories, orders |
| `support_service.py` | order support |
| `admin_ai_service.py` | product title/desc/tags |
| `rag_service.py` | Chroma RAG (separate learning routes) |
| `eta_service.py` | Haversine ETA |
| `utils/cache.py` | Redis cache |

---

# PART D — web-frontend

## D1. Folder map

```text
web-frontend/
├── package.json, next.config.js, jsconfig.json
└── src/
    ├── app/
    │   ├── layout.js, globals.css
    │   ├── login/page.js
    │   ├── (customer)/          ← URL group (URL mein nahi dikhta)
    │   │   ├── page.js          → /
    │   │   ├── cart, checkout, orders, help
    │   │   ├── order/[id]
    │   │   └── store/[id]/...
    │   ├── admin/               → /admin/...
    │   └── rider/               → /rider/...
    ├── components/              ← UI pieces
    ├── context/SocketContext.js
    └── utils/                   ← api.js, ai.js, auth.js, format.js, guestCart.js...
```

## D2. Pages (URLs)

### Customer

| URL | File idea |
|-----|-----------|
| `/` | Home + AI search |
| `/cart` | Cart (guest = localStorage) |
| `/checkout` | Checkout (login needed) |
| `/orders` | List + order-support AI |
| `/order/[id]` | Track + map + sockets |
| `/store/[id]` | Store catalog |
| `/store/[id]/product/[productId]` | Product + AI recommend |
| `/help` | AI assistant chat |
| `/login` | Login / register |

### Admin (`AdminGuard` — role admin)

`/admin`, `/admin/stores`, `/admin/categories`, `/admin/products`, `/admin/inventory`, `/admin/orders`, `/admin/riders` (+ new/edit pages).

### Rider

`/rider`, `/rider/assignments`, `/rider/orders/[id]`

### Login redirect

- admin → `/admin`
- delivery_partner → `/rider`
- customer → `?next=` or `/`

## D3. Frontend utils (syntax)

### API call

```js
// utils/api.js
import { api } from '@/utils/api';
const data = await api('/cart');                    // GET
const data = await api('/cart/items', {
  method: 'POST',
  body: JSON.stringify({ productId, storeId, qty: 1 }),
});
// Auto Bearer + 401 refresh
```

### AI helpers

```js
import { aiSearch, aiRecommendations, aiAssistant, aiOrderSupport, aiGenerateProductContent } from '@/utils/ai';
```

### Auth storage

```text
localStorage.token
localStorage.refreshToken
localStorage.role
localStorage.user
```

### Money format

```js
import { formatRupees } from '@/utils/format';
formatRupees(9900); // "₹99"
```

### Guest cart

`utils/guestCart.js` — login se pehle cart browser mein; login ke baad server cart.

### Client components

Jo `localStorage` / click / hooks use karein unke top par:

```js
'use client';
```

## D4. Important components

| Component | Kaam |
|-----------|------|
| `Navbar.js` | Top nav |
| `home/HomePage.js` | Home + search |
| `home/AiSearchResults.js` | AI search UI |
| `AiSupportChat.js` | Help + order support chat |
| `AiRecommendations.js` | Similar products |
| `ProductForm.js` | Admin + generate-content AI |
| `OrderTrackMap.js` | Leaflet + rider location |
| `SocketContext` | Live socket |
| Forms: Store/Category/Product/Rider/Address | Admin CRUD |

---

# PART E — End-to-end order flow

```text
1. Location → GET /api/home ya /api/stores/nearby
2. Products → catalog / store catalog
3. Add cart → guest local OR POST /api/cart/items
4. Address → POST /api/addresses (lat/lng store radius ke andar)
5. Order → POST /api/orders { addressId, paymentMethod }
6. Online → POST /api/payments/online/mock-success → auto rider assign
   COD → admin POST /api/admin/orders/:id/assign
7. Redis event order:assigned → socket → customer + rider UI
8. Rider step status → order:status events
9. on_the_way → rider:location → map update
10. Cancel only pending/confirmed → stock restore
```

---

# PART F — Common bugs / rules (Gemini fix karte waqt)

1. Role `rider` mat banao — `delivery_partner` hi hai.
2. Paise integer; float rupees DB mein mat.
3. Coordinates `[lng, lat]` Mongo mein; query `lat`+`lng`.
4. `/api` → `{ success, message, data }`; `/api/ai` alag ho sakta hai.
5. JWT = `req.user.sub`, not `_id`.
6. Docker vs local Mongo DB **names** alag ho sakte hain.
7. Seed destructive hai — carefully.
8. ImageKit keys missing → admin upload 503; URL manually daal sakte ho.
9. Payments mock only.
10. Order ETA AI se linked nahi (hardcoded ~12); home ETA alag formula.
11. AI ke liye `OPENAI_API_KEY` chahiye warna fallback / fail.
12. Web pages interactive → `'use client'`.

---

# PART G — Gemini prompt templates

### Samajhna

```text
GEMINI_FULL_GUIDE.md padho. Mujhe backend-core ka cart flow
route → controller → service → model line-by-line samjhao.
Naya code mat likho.
```

### Fix

```text
GEMINI_FULL_GUIDE.md follow karo. Sirf ai-service/app/services/catalog_graph.py
mein empty answer fix karo jab user "stores near me" likhe.
Baaki files mat chhedo.
```

### Nayi chhoti feature

```text
Is guide ke rules follow karo. Sirf ek endpoint add karo:
GET /api/stores/:id/eta?lat=&lng= jo ai-service /eta call kare.
Paise/geo/role rules todna mat.
```

### Dependency change

```text
web-frontend mein leaflet map crash ho raha hai.
package.json dependencies dekh ke minimal fix do.
Naya UI redesign mat karo.
```

---

# PART H — Quick cheatsheet

| Cheez | Value |
|-------|-------|
| API base | `http://localhost:4000/api` |
| Socket | `http://localhost:5000` |
| AI direct | `http://localhost:8000` (+ `/docs`) |
| Redis channel | `qc:events` |
| Access token TTL | 15m (default) |
| Refresh TTL | 7d |
| Free delivery | item total ≥ ₹199 (19900 paise) |
| Delivery fee else | ₹29 (2900 paise) |
| Store radius default | 5 km |
| Online pay rider search | 7 km, `isOnline: true` |

---

## Related docs (extra depth)

| File | Kab padho |
|------|-----------|
| `PROJECT_CONTEXT.md` | Short API context (kuch AI mount notes purane ho sakte hain) |
| `ai-service/AI_SERVICE_DOCS.md` | GenAI learning deep dive |
| `AI_BUILD_PLAYBOOK.md` | Build playbook |
| `web-frontend/FRONTEND_PHASES.md` | Frontend phases |

---

**Last updated:** current repo code (Oct 2026) · Folders covered: `backend-core`, `socket-service`, `ai-service`, `web-frontend`.
)
