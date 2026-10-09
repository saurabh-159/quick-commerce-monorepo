# Quick Commerce — AI Build Playbook

Is file ko **ChatGPT / Claude / Cursor** ko do. Isse woh **step-by-step working code** dega, **har file ka kaam** batayega, aur **syntax line-by-line** samjhayega.

Yeh repo abhi sirf **empty folders + placeholders** hai. Goal: Blinkit/Zepto jaisa **working MVP**.

---

## 0) Tum kaise use karoge (pehli cheez padho)

### Rule

1. **Ek naya chat** kholo (ya same chat mein next phase).
2. Pehle **BLOCK A (System Prompt)** paste karo.
3. Phir **sirf 1 phase** ka **BLOCK B** paste karo (Phase 1, phir 2, phir 3…).
4. AI se bolo: code + explanation dono do.
5. Files repo mein **exact paths** pe save karo.
6. Phase complete hone ke baad uske **Verify** commands chalao.
7. Tabhi agla phase do.

**Kabhi 2 phases ek saath mat do.** Context overflow hoga, code tootega.

### Har phase ke baad AI se yeh 3 cheezein maango

```text
1) Is phase ki saari files ka full working code (copy-paste ready).
2) Har file ke neeche:
   - File ka kaam (1 paragraph)
   - Import/export ka matlab
   - Har important function/block kya karta hai
   - Yeh file kis file ko call karti hai / kisko call karti hai
3) Common syntax cheatsheet is phase ki (app.use, router, async/await, mongoose schema, jwt, etc.)
```

Explanation **Hindi + simple English mix** mein chahiye, jaise school teacher samjhaye. Fancy words kam, working meaning zyada.

---

## BLOCK A — System Prompt (har naye chat mein pehle yeh paste karo)

```text
You are a senior full-stack engineer AND a patient teacher.

Your job: build a WORKING quick-commerce MVP (Blinkit/Zepto style) inside an EXISTING monorepo, AND teach me every file.

LOCKED RULES:
1. Do not invent a new folder structure. Use the existing service folders:
   - backend-core/          Node.js + Express REST API
   - ai-service/            Python + FastAPI
   - socket-service/        Node.js + Socket.io + Redis
   - web-frontend/          Next.js App Router
   - mobile-app/            React Native (Expo)
   - docker-compose.yml
   - .github/workflows/ci-cd.yml
2. You MAY add new files INSIDE those folders (middleware, utils, validators, lib, etc.).
3. You may DELETE only .gitkeep files when a real file exists in that folder.
4. No placeholders like "add later", "TODO implement", empty functions, fake comments instead of code.
5. Full working code for every file in the current phase. Production-simple, not over-engineered.
6. After EVERY file, explain in Hindi+English:
   - what this file is responsible for
   - what each import means
   - what each exported function/class does
   - how request/data flows through this file
   - important syntax (why this keyword/API exists)
7. Stack LOCK:
   Backend-core: Node 20, Express 4, Mongoose 8, MongoDB, JWT, bcryptjs, Joi, cors, helmet, morgan, dotenv
   Socket: Node 20, socket.io, ioredis, @socket.io/redis-adapter
   AI: Python 3.11, FastAPI, uvicorn, pydantic, httpx
   Web: Next.js 14 App Router, React 18, Tailwind CSS
   Mobile: Expo SDK 51, React Native, React Navigation, axios, socket.io-client
   Infra: Docker Compose with mongo, redis, backend-core, ai-service, socket-service, web-frontend
8. Auth: JWT access token (15m) + refresh token (7d). Roles: customer, delivery_partner, admin.
9. Money in paise/integer INR * 100 to avoid float bugs. Display as rupees in UI.
10. Timezone: Asia/Kolkata. Language of explanations: Hindi mixed with English.
11. If a previous phase file must change, show the FULL updated file, not a tiny patch that I cannot apply.
12. At the end of the phase: list exact files created/updated, npm/pip commands, .env keys, and how to test with curl/Postman.
13. Never skip error handling. Use a central error middleware. Return JSON:
    { "success": true/false, "message": "...", "data": {} }
14. Do not add extra features outside the current phase.
```

---

## Product kya banana hai (MVP scope)

Customer app/web se:

- Register / login
- Apni location ke nearest **dark store**
- Categories + products + stock
- Cart
- Address
- Place order (COD + fake online payment success)
- Live order status

Delivery partner:

- Login
- Assigned orders dekhe
- Status update: accepted → picked_up → on_the_way → delivered
- Live location bheje (socket)

Admin web:

- Login
- Stores / categories / products / inventory
- Orders list + status
- Riders list

AI service (simple, no real ML model needed in MVP):

- Product recommendations (popular + same category)
- ETA in minutes from store coords + user coords (Haversine + avg speed)

Out of MVP (mat banana abhi):

- Real Razorpay/Stripe settlement
- Warehouse robotics
- Multi-warehouse transfer
- Chat
- Referral
- Complex surge pricing

---

## Architecture (yaad rakhna)

```text
Customer / Rider / Admin
        |
        |  REST (JSON + JWT)
        v
  backend-core :4000
        |
        |-- MongoDB :27017   (users, products, orders...)
        |-- HTTP --> ai-service :8000   (recommend, eta)
        |-- Redis publish --> socket-service :5000
        |
        v
  socket-service :5000  (Socket.io, Redis adapter)
        |
        v
  mobile-app / web-frontend live updates
```

Ports:

| Service | Port |
|---|---|
| backend-core | 4000 |
| socket-service | 5000 |
| ai-service | 8000 |
| web-frontend | 3000 |
| mongo | 27017 |
| redis | 6379 |

---

## Coding conventions (har phase follow kare)

- File names: kebab-case for JS/TS files if new, but keep existing `server.js`, `index.js`, `main.py`, `App.js`.
- Controllers thin, business logic in `services/` if logic > 30 lines.
- Validate every body/query with Joi (backend) or Pydantic (AI) or Zod (Next).
- Never trust client price. Always recalculate from DB.
- Populate store from lat/lng: nearest store within 5 km, else 400 "Not serviceable".
- Order number: `QC-YYYYMMDD-XXXX`.
- Status machine:

```text
pending → confirmed → assigned → accepted → packed → picked_up → on_the_way → delivered
any non-terminal → cancelled (customer before packed; admin anytime before out)
```

---

## Complete file map (final tree)

AI ko yeh tree todna nahi hai. Phase-wise files isi tree se belong karti hain.

```text
quick-commerce-backend/
├── AI_BUILD_PLAYBOOK.md          ← yeh file
├── docker-compose.yml
├── .gitignore
├── .github/workflows/ci-cd.yml
│
├── backend-core/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js                 # listen + graceful shutdown
│       ├── app.js                    # express app, middleware, routes mount
│       ├── config/
│       │   ├── env.js                # process.env validate
│       │   ├── db.js                 # mongoose connect
│       │   └── redis.js              # ioredis client (publish events)
│       ├── middleware/
│       │   ├── auth.js               # JWT verify + role guard
│       │   ├── error.js              # notFound + errorHandler
│       │   └── validate.js           # Joi wrapper
│       ├── utils/
│       │   ├── apiResponse.js
│       │   ├── asyncHandler.js
│       │   ├── geo.js                # haversine
│       │   ├── tokens.js             # sign/verify jwt
│       │   └── orderNumber.js
│       ├── models/
│       │   ├── User.js
│       │   ├── Address.js
│       │   ├── Store.js
│       │   ├── Category.js
│       │   ├── Product.js
│       │   ├── Inventory.js
│       │   ├── Cart.js
│       │   ├── Order.js
│       │   └── Payment.js
│       ├── validators/
│       │   ├── auth.validator.js
│       │   ├── store.validator.js
│       │   ├── product.validator.js
│       │   ├── cart.validator.js
│       │   ├── address.validator.js
│       │   └── order.validator.js
│       ├── services/
│       │   ├── auth.service.js
│       │   ├── store.service.js
│       │   ├── catalog.service.js
│       │   ├── cart.service.js
│       │   ├── order.service.js
│       │   ├── payment.service.js
│       │   ├── rider.service.js
│       │   ├── ai.client.js          # HTTP to FastAPI
│       │   └── realtime.publisher.js # Redis publish
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── store.controller.js
│       │   ├── catalog.controller.js
│       │   ├── cart.controller.js
│       │   ├── address.controller.js
│       │   ├── order.controller.js
│       │   ├── payment.controller.js
│       │   ├── rider.controller.js
│       │   └── admin.controller.js
│       └── routes/
│           ├── index.js              # mounts all routers
│           ├── auth.routes.js
│           ├── store.routes.js
│           ├── catalog.routes.js
│           ├── cart.routes.js
│           ├── address.routes.js
│           ├── order.routes.js
│           ├── payment.routes.js
│           ├── rider.routes.js
│           └── admin.routes.js
│
├── socket-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── config.js
│       ├── redis.js
│       └── sockets/
│           ├── index.js              # connection + auth handshake
│           ├── order.socket.js
│           └── rider.socket.js
│
├── ai-service/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── schemas.py
│       ├── routers/
│       │   ├── health.py
│       │   ├── recommend.py
│       │   └── eta.py
│       └── services/
│           ├── recommend_service.py
│           └── eta_service.py
│
├── web-frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── src/
│       ├── app/
│       │   ├── layout.js
│       │   ├── page.js                      # customer home
│       │   ├── login/page.js
│       │   ├── cart/page.js
│       │   ├── checkout/page.js
│       │   ├── orders/page.js
│       │   ├── orders/[id]/page.js
│       │   └── admin/
│       │       ├── layout.js
│       │       ├── page.js                  # dashboard
│       │       ├── products/page.js
│       │       ├── inventory/page.js
│       │       └── orders/page.js
│       ├── components/
│       │   ├── Navbar.js
│       │   ├── ProductCard.js
│       │   ├── CartItem.js
│       │   └── StatusBadge.js
│       └── utils/
│           ├── api.js
│           ├── auth.js
│           └── format.js
│
└── mobile-app/
    ├── package.json
    ├── app.json
    ├── App.js
    ├── .env.example
    └── src/
        ├── navigation/
        │   └── index.js
        ├── screens/
        │   ├── LoginScreen.js
        │   ├── HomeScreen.js
        │   ├── ProductScreen.js
        │   ├── CartScreen.js
        │   ├── CheckoutScreen.js
        │   ├── OrdersScreen.js
        │   ├── OrderTrackScreen.js
        │   ├── RiderHomeScreen.js
        │   └── RiderOrderScreen.js
        └── services/
            ├── api.js
            ├── auth.js
            └── socket.js
```

---

## Data models (AI ko yeh schemas follow karne hain)

### User

```text
name: String required
phone: String unique required  (10 digit India)
email: String unique sparse
passwordHash: String required
role: enum ['customer','delivery_partner','admin'] default customer
isActive: Boolean default true
rider: {
  isOnline: Boolean
  currentLocation: { type: Point, coordinates: [lng, lat] }
  vehicleType: enum ['bike','cycle','ev']
}
timestamps
```

### Address

```text
user: ObjectId ref User
label: String  (Home/Work)
line1, line2, city, state, pincode
location: GeoJSON Point [lng, lat]
isDefault: Boolean
```

### Store

```text
name, phone, addressText
location: GeoJSON Point
serviceRadiusKm: Number default 5
isOpen: Boolean
openingMinutes, closingMinutes  (0-1440)
```

### Category

```text
name unique, slug unique, imageUrl, isActive
```

### Product

```text
name, slug, description
category: ObjectId
brand, unit (e.g. "500g", "1L")
images: [String]
mrpPaise: Number
isActive: Boolean
```

### Inventory

```text
store + product unique compound
sellingPricePaise: Number
stock: Number min 0
reserved: Number min 0   (cart/order hold, optional simple: just decrement on order)
```

### Cart

```text
user unique
store: ObjectId   (one store per cart)
items: [{ product, qty, pricePaiseSnapshot }]
```

### Order

```text
orderNumber unique
user, store, address snapshot {line1, city, pincode, location}
items: [{ product, name, unit, qty, pricePaise }]
pricing: { itemTotal, deliveryFee, discount, grandTotal } all paise
paymentMethod: enum ['cod','online']
paymentStatus: enum ['pending','paid','failed']
status: enum listed above
rider: ObjectId
statusHistory: [{ status, at, note }]
etaMinutes: Number
```

### Payment

```text
order, user
amountPaise
method
status
providerRef  (mock id)
```

Indexes:

- `Store.location` 2dsphere
- `Address.location` 2dsphere
- `User.rider.currentLocation` 2dsphere
- `Inventory { store:1, product:1 }` unique

---

## REST API contract

Base: `http://localhost:4000/api`

Auth header: `Authorization: Bearer <accessToken>`

### Auth

- `POST /auth/register` body: name, phone, password, role? (role customer default; admin seed only)
- `POST /auth/login` body: phone, password
- `POST /auth/refresh` body: refreshToken
- `GET /auth/me`

### Stores / catalog

- `GET /stores/nearby?lat&lng`
- `GET /catalog/categories`
- `GET /catalog/products?storeId&categoryId&q`
- `GET /catalog/products/:id?storeId`

### Cart / address

- `GET /cart`
- `POST /cart/items` { productId, qty, storeId }
- `PATCH /cart/items/:productId` { qty }  (0 removes)
- `DELETE /cart`
- `GET /addresses`
- `POST /addresses`
- `PATCH /addresses/:id`
- `DELETE /addresses/:id`

### Orders / payments

- `POST /orders` { addressId, paymentMethod }
- `GET /orders`
- `GET /orders/:id`
- `POST /orders/:id/cancel`
- `POST /payments/online/mock-success` { orderId }  (MVP fake payment)

### Rider

- `PATCH /rider/online` { isOnline }
- `PATCH /rider/location` { lat, lng }
- `GET /rider/assignments`
- `POST /rider/orders/:id/status` { status }

### Admin

- CRUD `/admin/stores`
- CRUD `/admin/categories`
- CRUD `/admin/products`
- `PUT /admin/inventory` { storeId, productId, stock, sellingPricePaise }
- `GET /admin/orders`
- `POST /admin/orders/:id/assign` { riderId }  (also auto-assign nearest online rider on confirm)

### AI (FastAPI :8000)

- `GET /health`
- `POST /recommend` { storeId, productId?, userId? } → product ids
- `POST /eta` { storeLat, storeLng, userLat, userLng } → minutes

### Socket events

Client sends:

- `join:order` { orderId }
- `rider:location` { lat, lng, orderId? }

Server sends:

- `order:status` { orderId, status, etaMinutes }
- `order:assigned` { orderId, rider }
- `rider:location` { orderId, lat, lng }

Handshake: `socket.io({ auth: { token } })`

---

## Seed data (Phase 2 ke baad)

AI must create `backend-core/src/seed.js`:

- Admin: phone `9999999999` password `Admin@123`
- Rider: phone `8888888888` password `Rider@123`
- Customer: phone `7777777777` password `Cust@123`
- 1 store in Delhi (Connaught Place coords)
- 4 categories: Fruits, Dairy, Snacks, Beverages
- 12 products + inventory stock 50 each

---

# PHASES — ek ek karke paste karo

Har phase ke andar **COPY PROMPT** box hai. Usko BLOCK A ke baad paste karo.

---

## Phase 1 — backend-core foundation (server, env, db, errors)

**Is phase ka result:** `GET /api/health` 200 de, Mongo connect ho.

### Files

- `backend-core/package.json` (scripts: `dev`, `start`, `seed`)
- `backend-core/.env.example`
- `backend-core/src/config/env.js`
- `backend-core/src/config/db.js`
- `backend-core/src/utils/apiResponse.js`
- `backend-core/src/utils/asyncHandler.js`
- `backend-core/src/middleware/error.js`
- `backend-core/src/app.js`
- `backend-core/src/server.js`
- `backend-core/src/routes/index.js` (sirf health)

### COPY PROMPT — Phase 1

```text
Implement PHASE 1 only of the Quick Commerce monorepo using BLOCK A rules.

Goal: Express foundation that boots, loads env, connects MongoDB, and serves:

GET /api/health
Response: { success: true, message: "ok", data: { service: "backend-core", mongo: "up" } }

Create ALL files listed in Phase 1 of AI_BUILD_PLAYBOOK.md.
Use:
- express, mongoose, dotenv, cors, helmet, morgan
- nodemon as devDependency
- scripts: "dev": "nodemon src/server.js", "start": "node src/server.js"

.env.example:
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/quick_commerce
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
REDIS_URL=redis://127.0.0.1:6379
AI_SERVICE_URL=http://127.0.0.1:8000
CLIENT_ORIGIN=http://localhost:3000

env.js must FAIL FAST if required vars missing.
server.js must connect DB then listen. On SIGINT/SIGTERM close mongoose.

For EVERY file: full code, then Hindi+English explanation of each important line/syntax
(require, module.exports, middleware, next(err), app.use, async/await).

End with: npm install commands and curl test.
Do not implement auth yet.
```

### Verify

```bash
cd backend-core
npm install
# MongoDB local chalni chahiye
copy .env.example .env
npm run dev
curl http://localhost:4000/api/health
```

---

## Phase 2 — Users + Auth + seed

**Result:** register/login/me/refresh kaam kare. Seed admin/rider/customer.

### Files

- models/User.js
- utils/tokens.js
- middleware/auth.js
- validators/auth.validator.js
- services/auth.service.js
- controllers/auth.controller.js
- routes/auth.routes.js
- middleware/validate.js
- src/seed.js
- update app.js + routes/index.js

### COPY PROMPT — Phase 2

```text
Implement PHASE 2 only. Keep Phase 1 files. If a Phase 1 file must change, paste the FULL new file.

Auth:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/me   (Bearer access token)

Rules:
- phone 10 digits, password min 8
- bcryptjs cost 10
- access JWT 15m, refresh 7d, different secrets
- register role always "customer" from public API (ignore client role)
- auth middleware: protect + allowRoles('admin'), allowRoles('delivery_partner')
- seed.js creates admin/rider/customer + nothing else yet (stores in next phase)
- never send passwordHash in JSON

User model as specified in the playbook.

Explain JWT, bcrypt, middleware, mongoose Schema, pre-save if used, Bearer header.

Give Postman/curl examples for register, login, me.
```

### Verify

```bash
node src/seed.js
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"phone\":\"9999999999\",\"password\":\"Admin@123\"}"
```

---

## Phase 3 — Store, Category, Product, Inventory + nearby

**Result:** nearest store + catalog listing.

### Files

- models: Store, Category, Product, Inventory
- utils/geo.js
- validators store/product
- services store.service.js catalog.service.js
- controllers + routes: store, catalog, admin (stores/categories/products/inventory)
- seed.js UPDATE: 1 Delhi store, 4 categories, 12 products, inventory
- admin.routes.js protect + admin role

### COPY PROMPT — Phase 3

```text
Implement PHASE 3 only of the quick-commerce backend.

Features:
1. Store GeoJSON Point [lng,lat], 2dsphere index, serviceRadiusKm default 5.
2. GET /api/stores/nearby?lat&lng  → nearest open store within radius, else 400 Not serviceable.
3. Public catalog:
   GET /api/catalog/categories
   GET /api/catalog/products?storeId&categoryId&q
   Product JSON must include sellingPricePaise + stock from Inventory of that store.
4. Admin CRUD (Bearer admin):
   /api/admin/stores
   /api/admin/categories
   /api/admin/products
   PUT /api/admin/inventory { storeId, productId, stock, sellingPricePaise }
5. Update seed.js with 1 store near Connaught Place, 4 categories, 12 products, stock 50.

Do not implement cart yet.

Full working files + Hindi syntax teaching for GeoJSON, populate, compound unique index, mongoose $near.
```

---

## Phase 4 — Addresses + Cart

**Result:** user cart one-store-only, address CRUD.

### COPY PROMPT — Phase 4

```text
Implement PHASE 4 only.

Address CRUD for logged-in user. GeoJSON Point required.
Cart:
- one cart per user
- all items must belong to same storeId
- if product from another store added → 400 "Clear cart or keep same store"
- qty 0 removes item
- never trust client price; read Inventory.sellingPricePaise
- reject qty > stock
- GET /api/cart returns populated products + totals in paise and rupees

Files: Address.js, Cart.js, address/cart validators, services, controllers, routes.
Protect all with customer or any logged-in user.

Teach: mongoose subdocuments, findOneAndUpdate, $pull, atomic stock checks.
```

---

## Phase 5 — Orders + stock decrement + cancel

**Result:** place order from cart, list, get, cancel.

### COPY PROMPT — Phase 5

```text
Implement PHASE 5 only.

POST /api/orders { addressId, paymentMethod: 'cod'|'online' }
- must have cart items
- address must belong to user
- store must still service the address location (haversine <= serviceRadiusKm)
- recalculate totals
- deliveryFeePaise = 2900 if itemTotal < 19900 else 0
- decrement inventory.stock atomically; if any product lacks stock → 409 and abort whole order (transaction if replica set, else careful ordered updates + compensating increment on failure)
- clear cart
- COD: paymentStatus pending, order status confirmed
- online: paymentStatus pending, order status pending until Phase 6 mock pay
- orderNumber QC-YYYYMMDD-XXXX
- GET /api/orders and GET /api/orders/:id (own orders; admin all)
- POST /api/orders/:id/cancel if status is pending or confirmed

Add Order model, orderNumber util, order service with statusHistory.

Call AI eta later in Phase 8; for now etaMinutes = 12 constant is OK.

Teach: Mongo transactions vs compensating updates, status machines, snapshots vs refs.
```

---

## Phase 6 — Mock payment + rider assignment + rider APIs

### COPY PROMPT — Phase 6

```text
Implement PHASE 6 only.

Payment model + POST /api/payments/online/mock-success { orderId }
- only order owner
- if method online and pending → paid + status confirmed

Auto-assign:
- when order becomes confirmed, find nearest online delivery_partner within 7km of store using 2dsphere
- set rider, status assigned
- if none, leave confirmed (admin can assign)

Admin: POST /api/admin/orders/:id/assign { riderId }
GET /api/admin/orders

Rider APIs (role delivery_partner):
PATCH /api/rider/online { isOnline }
PATCH /api/rider/location { lat, lng }
GET /api/rider/assignments  (assigned/accepted/packed/picked_up/on_the_way)
POST /api/rider/orders/:id/status { status } following allowed transitions:
assigned→accepted→packed→picked_up→on_the_way→delivered

Publish Redis events from realtime.publisher.js:
channel "qc:events" payload JSON { type, orderId, userId, riderId, status, lat, lng }

Socket service will consume this in next phase. Implement publisher now. If Redis down, log error do not crash order.

Teach: role guards, geo queries, event-driven decoupling.
```

---

## Phase 7 — socket-service working

### COPY PROMPT — Phase 7

```text
Implement PHASE 7: socket-service as a REAL working Socket.io server. Not placeholders.

package.json, Dockerfile later ok but Node files now.
.env.example PORT=5000 REDIS_URL JWT_ACCESS_SECRET (same as backend)

index.js:
- HTTP server + socket.io cors CLIENT_ORIGIN
- Redis adapter for scale
- subscribe Redis channel qc:events
- on event, emit to room order:<orderId> and user:<userId> and rider:<riderId>

sockets/index.js:
- handshake JWT from socket.handshake.auth.token using same JWT_ACCESS_SECRET
- join rooms user:<id> automatically
- join:order only if user owns order OR rider assigned OR admin
  (for MVP: join if authenticated; mention security TODO but still verify token)

Events as playbook.

Give a tiny Node test snippet or HTML snippet to connect as client.

Hindi explanation of Socket.io rooms, adapter, Redis pub/sub vs adapter difference.
```

---

## Phase 8 — ai-service + backend ai.client.js + ETA on order

### COPY PROMPT — Phase 8

```text
Implement PHASE 8: Python FastAPI ai-service + wire backend-core.

ai-service:
- app/main.py FastAPI title QuickCommerce AI
- routers health, recommend, eta
- recommend_service: if productId given, return 6 other productIds from a static in-memory catalog map OR accept productIds in request from backend
BETTER: backend calls AI with { candidateProductIds, seedProductId } and AI ranks: seed category first then rest. If no ML library, use deterministic scoring. MUST return real ids from input, not hallucinated.
- eta_service: haversine km / 20 kmph * 60 + 8 min prep, clamp 8..45

backend-core:
- services/ai.client.js axios/fetch timeout 1500ms
- catalog GET products can include recommended[] optional query recommend=1
- order place: set etaMinutes from AI, fallback 12 if AI down

requirements.txt: fastapi uvicorn pydantic httpx
Run: uvicorn app.main:app --reload --port 8000

Teach FastAPI router, Pydantic, uvicorn, httpx vs requests.
```

---

## Phase 9 — Docker Compose really runs

### COPY PROMPT — Phase 9

```text
Implement PHASE 9: real Dockerfiles + docker-compose.yml. No placeholders.

Services:
- mongo: mongo:7
- redis: redis:7
- backend-core
- ai-service
- socket-service
- web-frontend (can wait if frontend not built; if Phase 11 not done, omit web-frontend service or keep build stub that will work after Phase 11)

Each Node Dockerfile: node:20-alpine, WORKDIR, npm ci or npm install, CMD npm start
Python: python:3.11-slim, pip install -r, CMD uvicorn app.main:app --host 0.0.0.0 --port 8000

compose env MONGO_URI=mongodb://mongo:27017/quick_commerce
REDIS_URL=redis://redis:6379
depends_on healthchecks

Update .env.example files.
Update GitHub workflow: on push to main, npm test placeholder → at least job "lint-placeholder" that echoes OK OR run node -c. Keep simple: install backend-core and start-timeout health is optional.

Give commands:
docker compose up --build
```

---

## Phase 10 — web-frontend customer store (Next.js)

### COPY PROMPT — Phase 10

```text
Implement PHASE 10 only: Next.js 14 App Router customer UI. Working, not mock JSON.

Use Tailwind.
.env.example NEXT_PUBLIC_API_URL=http://localhost:4000/api NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

utils/api.js fetch wrapper with token from localStorage.
Pages:
- / login + register (phone/password)
- / home: ask browser geolocation (fallback Delhi 28.63,77.22), call nearby store, list categories + products
- /cart add/update
- /checkout select address or create, place COD order
- /orders list
- /orders/[id] status + socket live status

Components: Navbar, ProductCard, CartItem, StatusBadge
Look: clean grocery (white, green accent), mobile responsive.

Explain Next.js app directory, "use client", env NEXT_PUBLIC_, fetch from client vs server.
If a file is client component, mark it.

Do not build admin yet.
```

---

## Phase 11 — web-frontend admin

### COPY PROMPT — Phase 11

```text
Implement PHASE 11: admin section under src/app/admin.

Protect client-side: if role !== admin redirect /login.
Pages: dashboard counts (simple: orders length), products CRUD forms, inventory stock update, orders table with assign rider id input.

Reuse api.js.
Keep UI simple table + forms. No extra libraries except Tailwind.
```

---

## Phase 12 — mobile-app customer + rider (Expo)

### COPY PROMPT — Phase 12

```text
Implement PHASE 12: Expo React Native app using existing folders.

app.json Expo name QuickCommerce
App.js wraps NavigationContainer from src/navigation/index.js

Auth flow: Login → if customer MainTabs (Home, Cart, Orders) → if rider Rider stack.

Screens as file map. Use axios instance in services/api.js. socket.io-client on OrderTrackScreen and RiderOrderScreen.

Expo location for nearby and rider updates every 8s when online.

Keep UI using React Native core + StyleSheet. No NativeWind required.

Explain AppRegistry/App.js, navigation stacks, AsyncStorage token, why Expo.

Commands: npx expo start
Note Android emulator localhost → 10.0.2.2 for API.
```

---

## Phase 13 — README + final glue + bugfix pass

### COPY PROMPT — Phase 13

```text
Implement PHASE 13: project README.md in repo root (Hindi + English).

Include:
- what this project is
- architecture diagram in mermaid
- every folder meaning (the tree)
- env setup
- run locally without docker
- run with docker compose
- seed users
- test accounts
- API list summary
- how sockets work
- known MVP limits

Then do a glue review: list any missing imports, wrong ports, CORS, and output FULL fixed files for anything broken.

Finally output a "teach-back": 20 most important syntax pieces in this repo (express.Router, mongoose.model, jwt.sign, io.to(room).emit, FastAPI APIRouter, Next client components, RN navigation).
```

---

## Teacher mode — extra line har phase ke end mein add karo

Agar AI short explanation de, yeh extra bhej dena:

```text
Ab code mat badlo. Mujhe isi phase ki files ka classroom lecture do:
- har file 1 student ki tarah introduce karo
- request ka raasta: route → middleware → controller → service → model → response
- 8 syntax items jo is phase mein naye the, unka mini example
```

---

## Local run order (jab kai phases ho chuke hon)

Terminal 1 — MongoDB + Redis (Docker se sirf infra):

```bash
docker run -d --name qc-mongo -p 27017:27017 mongo:7
docker run -d --name qc-redis -p 6379:6379 redis:7
```

Ya baad mein pura `docker compose up`.

```bash
# backend
cd backend-core
npm install
copy .env.example .env
node src/seed.js
npm run dev

# ai
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# sockets
cd socket-service
npm install
copy .env.example .env
npm run dev

# web
cd web-frontend
npm install
copy .env.example .env.local
npm run dev

# mobile
cd mobile-app
npm install
npx expo start
```

---

## Common pitfalls (AI ko bhi dikhana)

1. GeoJSON **[longitude, latitude]** hota hai, reverse nahi.
2. JWT secret socket-service aur backend-core **same** hona chahiye.
3. CORS: web `localhost:3000`, Expo alag origin.
4. Windows pe `copy` not `cp`. Playbook user Windows pe hai.
5. Order stock race: two users last item — inventory decrement `stock: { $gte: qty }` condition use karo.
6. Next.js mein browser `localStorage` sirf client component.
7. Android emulator API host `10.0.2.2` not `localhost`.
8. Money float mat use karo.

---

## Progress checklist

Phase complete hone pe tick karo:

- [ ] Phase 1 health + mongo
- [ ] Phase 2 auth + seed users
- [ ] Phase 3 catalog + nearby store
- [ ] Phase 4 cart + addresses
- [ ] Phase 5 orders
- [ ] Phase 6 payment mock + rider
- [ ] Phase 7 sockets live
- [ ] Phase 8 AI recommend/ETA
- [ ] Phase 9 docker compose
- [ ] Phase 10 Next customer
- [ ] Phase 11 Next admin
- [ ] Phase 12 Expo app
- [ ] Phase 13 README + glue

---

## Short memory card (agar naya chat ho)

Naye chat mein BLOCK A + yeh 8 lines bhi chipka do:

```text
Repo: quick-commerce-backend Windows monorepo.
Existing services: backend-core, ai-service, socket-service, web-frontend, mobile-app.
I will paste one PHASE at a time from AI_BUILD_PLAYBOOK.md.
Always full files + Hindi/English syntax teaching per file.
MongoDB + Redis local. Ports 4000 / 5000 / 8000 / 3000.
Roles: customer, delivery_partner, admin.
Response envelope: { success, message, data }.
No placeholders.
```

---

Yeh playbook khatam. **Ab Phase 1 ka COPY PROMPT** nikal ke ChatGPT/Claude ko do, BLOCK A ke baad.
