# Quick Commerce — poora project context

Yeh file Gemini (ya kisi bhi AI) ko deni hai taaki woh is repo ko sahi samjhe.
Source of truth **current code** hai (October 2026). Purani docs stale ho sakti hain:

- `README.md` almost khali hai
- `web-frontend/WEB_BUILD_PHASES.md` purana plan hai. Usme likha hai ke kuch admin APIs nahi hain — **ab woh routes code mein maujood hain**
- `ai-service/AI_SERVICE_DOCS.md` purana hai. Ab zyada AI files hain, lekin unme se kai **server par mount nahi** hain

Product idea: Blinkit / Zepto jaisa quick commerce. Dark stores, 10–15 minute delivery, customer + admin + rider.

---

## 1. Services aur ports

| Folder | Tech | Port | Kaam |
|---|---|---|---|
| `backend-core` | Node.js 20+, Express, Mongoose | **4000** | Main REST API |
| `socket-service` | Node.js, Socket.io, Redis adapter | **5000** | Live order / rider updates |
| `ai-service` | Python 3.10, FastAPI, Uvicorn | **8000** | ETA, recommend, chat (baaki AI routes code mein hain, app par register nahi) |
| `web-frontend` | Next.js 14, React 18, Tailwind | **3000** | Customer site + admin + rider web |
| `mobile-app` | React Native, Expo 51 | Expo | Customer + rider mobile |
| MongoDB | `mongo:latest` (Docker) | **27017** | Database `quick-commerce` (Docker) ya `quick_commerce` (local `.env.example`) |
| Redis | `redis:alpine` | **6379** | Pub/sub channel `qc:events` |

Docker Compose (`docker-compose.yml`) sirf yeh chalata hai: mongodb, redis, backend-core, socket-service, ai-service.
**Web frontend aur mobile Docker Compose mein nahi hain.** Woh alag se chalte hain.

Kubernetes (`k8s/`) sirf ek backend Deployment + NodePort Service hai. Port **3000** likha hai, jabki backend **4000** par chalta hai. Mongo, Redis, socket, AI, frontend ke manifests nahi hain. Production deploy ready nahi.

---

## 2. Folder tree (kaam ke hisaab se)

```
quick-commerce-backend/
├── docker-compose.yml
├── PROJECT_CONTEXT.md          ← yeh file
├── AI_BUILD_PLAYBOOK.md
├── .github/workflows/ci-cd.yml ← npm ci + web build + pip install. Unit tests nahi
├── k8s/
│   ├── backend-deployment.yaml ← image quick-commerce-backend:latest, PORT 3000 (galat)
│   └── backend-service.yaml    ← NodePort 30007 → targetPort 3000
│
├── backend-core/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json            ← npm run dev | start | seed
│   └── src/
│       ├── server.js           ← Mongo connect, app listen
│       ├── app.js              ← /api aur /api/ai
│       ├── seed.js             ← demo stores, products, users (purana data wipe karta hai)
│       ├── config/             ← env.js, db.js
│       ├── routes/             ← HTTP paths
│       ├── controllers/
│       ├── services/           ← business logic
│       ├── models/             ← Mongoose
│       ├── validators/         ← Joi
│       ├── middleware/         ← auth, error, validate, rateLimit
│       └── utils/              ← apiResponse, geo, tokens, redis publisher, image urls
│
├── socket-service/
│   ├── .env.example
│   └── src/
│       ├── index.js            ← Socket.io + Redis subscribe qc:events
│       ├── sockets/index.js    ← JWT handshake, rooms
│       ├── redis.js
│       └── config.js
│
├── ai-service/
│   ├── Dockerfile              ← python:3.10-slim, uvicorn app.main:app :8000
│   ├── requirements.txt        ← fastapi, openai, langchain, langgraph (koi API key env nahi)
│   └── app/
│       ├── main.py             ← SIRF health, eta, recommend, chat mount hote hain
│       ├── config.py
│       ├── schemas.py
│       ├── routers/            ← baaki routers files hain, main.py mein include nahi
│       └── services/
│
├── web-frontend/
│   ├── WEB_BUILD_PHASES.md     ← purana phase plan, APIs ab code se match nahi karte
│   ├── FRONTEND_PHASES.md
│   └── src/
│       ├── app/                ← Next.js App Router pages
│       ├── components/
│       ├── context/SocketContext.js
│       └── utils/              ← api.js, auth.js, format.js, guestCart, geocode, imagekit
│
└── mobile-app/
    ├── .env.example
    └── src/
        ├── screens/
        ├── navigation/index.js
        └── services/           ← api.js, auth.js, socket.js
```

---

## 3. Kaise chalao

### Docker (API stack)

Repo root:

```text
docker compose up --build
```

Backend container ko `./backend-core/.env` chahiye (`env_file`). Compose in values ko override karta hai:

- `MONGO_URI=mongodb://mongodb:27017/quick-commerce`
- `REDIS_URL=redis://redis:6379`
- `AI_SERVICE_URL=http://ai-service:8000`
- `CLIENT_ORIGIN=http://localhost:3000`
- ports 4000, 5000, 8000

Socket ko `./socket-service/.env` chahiye. AI ko `./ai-service/.env` chahiye (file na ho to compose fail ho sakta hai).

### Local (bina Docker, alag terminals)

```text
Mongo + Redis up
backend-core:    npm run dev     → :4000
socket-service:  npm run dev     → :5000
ai-service:      uvicorn app.main:app --host 0.0.0.0 --port 8000
web-frontend:    npm run dev     → :3000
mobile-app:      npx expo start
```

`backend-core` required env (nahi to process exit): `PORT`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

### Web env

`web-frontend/.env.local`:

```text
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Mobile env (`mobile-app/.env.example`)

```text
EXPO_PUBLIC_API_URL=http://localhost:4000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
```

Android emulator par `localhost` ki jagah `http://10.0.2.2:4000/api` aur socket `http://10.0.2.2:5000`.

### Seed

`backend-core` se:

```text
npm run seed
```

Seed **saare** products, stores, users, carts, orders, payments delete karke dubara daalta hai.
Docker Mongo ko seed karte waqt `127.0.0.1` alag Windows Mongo ho sakta hai. Script pehle machine ke non-loopback IP par port 27017 try karti hai (published Docker port). Override: `SEED_MONGO_URI`.

Docker DB name: `quick-commerce`. Local `.env.example` name: `quick_commerce`. Dono alag databases hain.

---

## 4. Seed logins

Public register hamesha role `customer` banata hai. Admin aur rider seed se aate hain.

| Role | Name | Phone | Password |
|---|---|---|---|
| admin | (seed admin) | `9999999999` | `Admin@123` |
| delivery_partner | Rahul | `9876543210` | `Rider@123` |
| delivery_partner | (seed rider) | `8888888888` | `Rider@123` |
| delivery_partner | Aman | `9876500003` | `Rider@123` |
| delivery_partner | Neha | `9876500004` | `Rider@123` |
| delivery_partner | Karan | `9876500005` | `Rider@123` |
| customer | Saurabh | `9123456789` | `Cust@123` |
| customer | (seed customer) | `7777777777` | `Cust@123` |

Role strings exactly: `customer` | `admin` | `delivery_partner`.
Kabhi `rider` mat likho. Rider screens `delivery_partner` use karti hain.

Seed stores (Delhi / Noida, radius 5 km): Connaught Place, Noida Sector 18, Paschim Vihar Pocket 3, Paschim Vihar B-Block, Janakpuri.
Categories: Dairy & Breakfast, Fruits & Vegetables, Snacks & Munchies.

---

## 5. Roles aur screens

| Kaun | Login | Web | Mobile |
|---|---|---|---|
| Guest | nahi | `/` home, `/cart` guest cart, store/product pages. Checkout par login | app login-first hai |
| customer | haan | `/` store, cart, checkout, orders, live track | Home, Product, Cart, Checkout, Orders, Track |
| admin | haan | `/admin` stores, categories, products, inventory, orders, riders | admin mobile nahi |
| delivery_partner | haan | `/rider` dashboard, assignments, order status | Rider dashboard + order |

Web login ek hi page: `/login`. Redirect:

- admin → `/admin`
- delivery_partner → `/rider`
- customer → `?next=` agar same-site path ho, warna `/`

Token browser: `localStorage.token` (access), `localStorage.refreshToken`, `localStorage.role`, `localStorage.user`.
`web-frontend/src/utils/api.js` Bearer lagata hai. 401 par refresh try karta hai.

`(customer)` route group URL mein nahi dikhta. File `src/app/(customer)/cart/page.js` ka URL `/cart` hai.

---

## 6. API rules (backend-core)

Base: `http://localhost:4000`

Almost saari business APIs yeh shape deti hain:

```json
{ "success": true, "message": "...", "data": {} }
```

Fail: `success: false`, `data` null, HTTP 4xx/5xx. UI ko `message` dikhana hai.

**Exception:** `/api/ai/*` is shape ko follow nahi karta. Woh raw JSON ya `{ "error": "..." }` bhejta hai, aur un routes par JWT nahi hai.

Auth header:

```text
Authorization: Bearer <accessToken>
```

JWT payload: `{ sub: userId, role }`. `req.user.sub` user id hai. `req.user._id` mat maano.

Access token default 15 minute. Refresh 7 din. `POST /api/auth/refresh` body `{ refreshToken }` → `{ accessToken }`.

Paise **integer paise** hain. 99 rupee = `9900`. UI `formatRupees` use kare. Browser se selling price order/cart ko mat bhejo; server inventory snapshot leta hai.

GeoJSON coordinates hamesha `[longitude, latitude]`.
Query/body mein alag fields: `lat` aur `lng`.

IDs Mongo ObjectId hex, 24 chars.

---

## 7. Saari backend APIs

### 7.1 Health

| Method | Path | Auth | Data |
|---|---|---|---|
| GET | `/api/health` | nahi | `{ service: "backend-core", mongo: "up" }` |

### 7.2 Auth — `/api/auth`

| Method | Path | Auth | Body | `data` |
|---|---|---|---|---|
| POST | `/auth/register` | nahi | `{ name, phone, password, email? }` | `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | nahi | `{ phone, password }` | same |
| POST | `/auth/refresh` | nahi | `{ refreshToken }` | `{ accessToken }` |
| GET | `/auth/me` | Bearer | — | user bina passwordHash |

`phone` exactly 10 digits. `password` min 8. Register role force `customer`.

`user` login/register par: `{ id, name, phone, role }`.

### 7.3 Home — public

| Method | Path | Query | Notes |
|---|---|---|---|
| GET | `/api/home` | `lat` default 28.6139, `lng` default 77.209, `category` slug ya id, `q` search | rate limit 80/min |

`data` shape (serviceable):

- `serviceable`, `message`
- `hero`: title, subtitle, searchPlaceholder
- `location`: lat, lng, label, address
- `store`: id, name, addressText, description, image, isOpen, distanceKm, etaMinutes
- `banners[]`, `categories[]`, `sections[]` (products)
- `nearbyStores`, `stores`

Bahar area: `serviceable: false`, `store: null`, phir bhi directory stores aa sakte hain.

Product in sections: `id`, `name`, `slug`, `description`, `brand`, `unit`, `image`, `category`, `mrpPaise`, `sellingPricePaise`, `stock`, `discountPercent`.

### 7.4 Stores — public

| Method | Path | Query | `data` |
|---|---|---|---|
| GET | `/api/stores/nearby` | `lat`, `lng` required | `{ store, distanceKm }` nearest open store jo radius ke andar ho |
| GET | `/api/stores/:id/catalog` | optional `lat`, `lng`, `category` | store page catalog. Rate limit 80/min |
| GET | `/api/stores/:id/products/:productId` | optional `lat`, `lng`, `category` | ek product us store ki inventory ke saath |

`:id` valid ObjectId hona chahiye.

### 7.5 Catalog — public

| Method | Path | Query | `data` |
|---|---|---|---|
| GET | `/api/catalog/categories` | — | active categories |
| GET | `/api/catalog/products` | **`storeId` required**, optional `categoryId`, `q` | products with stock + selling price |

Bina `storeId`: 400 `storeId query parameter is required`.

Public product keys: `id` (string). Cart ko `productId` isi `id` se bhejo.

### 7.6 Cart — login required (koi bhi logged-in user; practically customer)

| Method | Path | Body | `data` |
|---|---|---|---|
| GET | `/api/cart` | — | `{ store, items, itemTotalPaise, itemTotalRupees }` |
| POST | `/api/cart/items` | `{ productId, storeId, qty }` qty min 1 | same cart |
| PATCH | `/api/cart/items/:productId` | `{ qty }` qty `0` = line hatao | same cart |
| DELETE | `/api/cart` | — | empty cart |

Ek user ka ek cart. Do stores mix nahi hote. Price server inventory se snapshot (`pricePaiseSnapshot`).

Item keys UI ke liye: `productId`, `name`, `unit`, `images`, `qty`, `pricePaise`, `totalPaise`.

Guest web cart `localStorage` mein hai (`web-frontend/src/utils/guestCart.js`). Server cart tab banta hai jab user login karke add kare.

### 7.7 Addresses — login

| Method | Path | Body |
|---|---|---|
| GET | `/api/addresses` | — |
| POST | `/api/addresses` | `{ label?, line1, line2?, city, state, pincode (6), lat, lng, isDefault? }` |
| DELETE | `/api/addresses/:id` | — |

Client `lat`/`lng` bhejta hai. Backend `[lng, lat]` GeoJSON banata hai.

### 7.8 Orders — login

| Method | Path | Kaun | Body / notes |
|---|---|---|---|
| POST | `/api/orders` | owner | `{ addressId, paymentMethod }` = `cod` ya `online` |
| GET | `/api/orders` | customer = apni list; **admin = saari** orders (user, store, rider populate) | rider ki list yeh nahi hai |
| GET | `/api/orders/:id` | owner, admin, ya assigned rider | detail |
| POST | `/api/orders/:id/cancel` | owner | sirf status `pending` ya `confirmed`. Stock wapas |

Order create:

1. Cart khali ho to error
2. Address user ki honi chahiye
3. Address store `serviceRadiusKm` se bahar → `Address is outside store service radius`
4. Stock check, phir stock minus
5. Cart delete
6. Delivery fee: item total `< 19900` paise → fee `2900`, warna `0`. Discount abhi `0`
7. COD → status `confirmed`, paymentStatus `pending`
8. Online → status `pending` jab tak mock pay na ho
9. `etaMinutes` abhi hardcoded `12` (AI ETA order flow se juda nahi)

Order status enum:

```text
pending → confirmed → assigned → accepted → packed → picked_up → on_the_way → delivered
cancelled (customer, sirf pending/confirmed se)
```

### 7.9 Payments — login

| Method | Path | Body | `data` |
|---|---|---|---|
| POST | `/api/payments/online/mock-success` | `{ orderId }` | `{ order, payment }` |

Sirf `paymentMethod: online`. Paid mark, status `confirmed`, providerRef `MOCK_TXN_<time>`.
Phir **nearest online rider auto-assign** (store se **7 km** ke andar, `rider.isOnline: true`, account active).
COD par auto-assign nahi. COD admin assign karta hai.
Real Razorpay/Stripe **nahi** hai.

### 7.10 Rider app — login + role `delivery_partner`

Customer/admin token → 403.

| Method | Path | Body | `data` |
|---|---|---|---|
| PATCH | `/api/rider/online` | `{ isOnline: boolean }` | user |
| PATCH | `/api/rider/location` | `{ lat, lng }` | user. DB mein coordinates `[lng, lat]` |
| GET | `/api/rider/assignments` | — | orders jinka rider yeh user hai aur status assigned / accepted / packed / picked_up / on_the_way |
| POST | `/api/rider/orders/:id/status` | `{ status }` | order |

Status sirf next step:

```text
assigned → accepted → packed → picked_up → on_the_way → delivered
```

Skip karoge to: `Invalid status transition from X to Y`.
Order is rider ki nahi: `Unauthorized for this order`.
`on_the_way` par server rider movement simulation start karta hai (`rider:location` events).

Rider order detail: `GET /api/orders/:id` (assigned rider allowed).

### 7.11 Admin — login + role `admin`

Sab `/api/admin` par `protect` + `allowRoles('admin')`.

Image upload:

| GET | `/api/admin/imagekit-auth` | ImageKit signature. Keys missing → 503 |

Stores:

| POST | `/api/admin/stores` | body neeche |
| GET | `/api/admin/stores` | |
| GET | `/api/admin/stores/:id` | |
| PUT | `/api/admin/stores/:id` | |
| DELETE | `/api/admin/stores/:id` | |

Store body:

```json
{
  "name": "Store",
  "phone": "9810000001",
  "addressText": "Full address",
  "description": "",
  "images": ["https://..."],
  "location": { "type": "Point", "coordinates": [77.209, 28.6139] },
  "serviceRadiusKm": 5,
  "isOpen": true,
  "openingMinutes": 0,
  "closingMinutes": 1440
}
```

`coordinates` = `[longitude, latitude]`. `openingMinutes` / `closingMinutes` din ke minute (0–1440).

Categories:

| POST/GET | `/api/admin/categories` |
| GET/PUT/DELETE | `/api/admin/categories/:id` |

Category body: `name`, `slug`, optional `description`, `imageUrl`, `images[]`, `isActive`.
Delete tab fail jab products is category ko use kar rahe hon.

Products:

| POST/GET | `/api/admin/products` |
| GET/PUT/DELETE | `/api/admin/products/:id` |

Product body: `name`, `slug`, `category` (category `_id`), `unit`, `mrpPaise`, optional `description`, `brand`, `images[]`, `highlights[]`.
Selling price product par nahi. Woh inventory par hai, store-wise.
Product delete uski inventory aur cart lines bhi hataata hai.

Inventory:

| GET | `/api/admin/inventory` | saari rows |
| PUT | `/api/admin/inventory` | upsert by store+product. Body: `{ storeId, productId, stock, sellingPricePaise, description?, images? }` |
| GET/PUT/DELETE | `/api/admin/inventory/:id` | PUT body `{ stock, sellingPricePaise }` |

Unique index: ek store + ek product = ek inventory row.

Riders (admin CRUD, role `delivery_partner` users):

| GET | `/api/admin/riders` |
| POST | `/api/admin/riders` | `{ name, phone, email?, password, vehicleType }` vehicleType `bike` \| `cycle` \| `ev` |
| GET | `/api/admin/riders/:id` |
| PUT | `/api/admin/riders/:id` | `{ name, phone, email?, password?, vehicleType, isActive, isOnline? }` |
| GET | `/api/admin/riders/:id/orders` |

Assign:

| POST | `/api/admin/orders/:id/assign` | body `{ riderId }` |

Dev helper (riders ko stores ke paas map par rakhne ke liye):

| POST | `/api/admin/stores/:id/place-rider` |
| POST | `/api/admin/stores/place-riders` |

### 7.12 AI proxy — `/api/ai` (JWT nahi, response shape alag)

Yeh Node routes `AI_SERVICE_URL` (default `http://127.0.0.1:8000`) par axios se forward karti hain.
FastAPI **abhi** sirf `/health`, `/eta`, `/recommend`, `/chat` serve karta hai.
Neeche jin paths par “AI app par mount nahi” likha hai, Node route exist karti hai lekin Python 404 dega jab tak `ai-service/app/main.py` mein router include na ho.

| Method | Node path | Body | Python path | Mounted? |
|---|---|---|---|---|
| POST | `/api/ai/search` | `{ query, limit? }` | `POST /search` | **nahi** (file `routers/search.py`) |
| POST | `/api/ai/recommendations` | `{ product_id, limit? }` | `POST /recommend` | haan |
| POST | `/api/ai/assistant` | `{ query }` | `POST /assistant` | **nahi** |
| POST | `/api/ai/chat-memory` | `{ messages: [{ role, content }] }` | `POST /chat-memory` | **nahi** |
| POST | `/api/ai/parse-query` | `{ user_query }` | `POST /parse-query` | **koi router file bhi nahi** |
| POST | `/api/ai/tool-chat` | `{ message }` | `POST /tool-chat` | **nahi** |
| POST | `/api/ai/langchain-suggest` | `{ category, item }` | `POST /langchain-suggest` | **nahi** |
| POST | `/api/ai/agent-support` | `{ query }` | `POST /agent-support` | **nahi** |
| POST | `/api/ai/order-support` | `{ query, user_id? }` | `POST /support/query` | **nahi**. Controller `req.user._id` dhundhta hai; JWT `req.user.sub` hota hai, aur is route par `protect` hai hi nahi |
| POST | `/api/ai/admin/generate-content` | `{ product_name, category }` | `POST /admin/generate-product-content` | **nahi**. Admin role check bhi nahi |

Direct FastAPI (jo abhi chalega), base `http://localhost:8000`:

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/health` | — | `{ success, message, data: { service: "ai-service" } }` |
| POST | `/eta` | `{ storeLat, storeLng, userLat, userLng }` | Haversine. `{ etaMinutes, distanceKm }`. Order create isko call nahi karta |
| POST | `/recommend` | `{ product_id, limit? }` | Stub ranking. Agar result empty ho to `HTTPException` raise hota hai **bina import ke** — crash ho sakta hai |
| POST | `/chat` | `{ message, system_prompt? }` | OpenAI `gpt-3.5-turbo`. Key `OPENAI_API_KEY`. Key/fail par fallback English sentence |

`ai-service/app/main.py` imports: health, eta, recommend, chat only.
Extra router files (mount pending): `search.py` (`/embed`, `/search`), `assistant.py`, `memory.py`, `tools.py`, `langchain_router.py`, `agent_router.py`, `admin_router.py`, `support_router.py`.

`python-dotenv` `main.py` mein import hai; `requirements.txt` mein listed nahi (transitive ho sakta hai).

---

## 8. Realtime

Flow:

```text
backend-core publishEvent()
  → Redis channel "qc:events" (JSON)
  → socket-service subscriber
  → Socket.io emit event.type
```

Rooms:

- `user:<userId>` — connect par automatic
- `rider:<userId>` — sirf role `delivery_partner`
- `order:<orderId>` — client event `join:order` body `{ orderId }`

Socket handshake: `auth: { token: <access JWT> }`. Same `JWT_ACCESS_SECRET` backend aur socket dono par.

Events jo backend publish karta hai:

| `type` | Kab | Fields |
|---|---|---|
| `order:assigned` | auto-assign (online pay) ya admin assign | orderId, userId, riderId, status |
| `order:status` | rider status change | orderId, userId, riderId, status |
| `rider:location` | movement simulation / location updates | order tracking map isko sunta hai |

Socket health: `GET http://localhost:5000/health`.

Web: `src/context/SocketContext.js`. Token `localStorage` se. Login ke baad full reload / `qc-auth` event se naya socket.

---

## 9. Data models (Mongo)

Money fields paise. Geo `type: Point`, `coordinates: [lng, lat]`, 2dsphere index jahan location hai.

**User** — name, phone unique 10 digit, email unique sparse, passwordHash, role `customer|delivery_partner|admin`, isActive.
Rider subdoc: `rider.isOnline`, `rider.currentLocation`, `rider.vehicleType` `bike|cycle|ev`.

**Store** — name, phone, addressText, description, images[], location, serviceRadiusKm default 5, isOpen, openingMinutes, closingMinutes.

**Category** — name unique, slug unique, description, imageUrl, images[], isActive.

**Product** — name, slug, description, category ref, brand, highlights[], unit (jaise `500 ml`), images[], mrpPaise, isActive.

**Inventory** — store + product unique, sellingPricePaise, stock >= 0, description, images[].

**Address** — user, label, line1, line2, city, state, pincode, location, isDefault.

**Cart** — user unique, store, items[] `{ product, qty, pricePaiseSnapshot }`.

**Order** — orderNumber unique, user, store, addressSnapshot, items[] `{ product, name, unit, qty, pricePaise }`, pricing `{ itemTotal, deliveryFee, discount, grandTotal }`, paymentMethod `cod|online`, paymentStatus `pending|paid|failed`, status (section 7.8), rider ref, statusHistory[], etaMinutes default 12.

**Payment** — order, user, amountPaise, method, status, providerRef (mock txn id).

---

## 10. Web pages (Next.js)

Customer:

| URL | File |
|---|---|
| `/` | `src/app/(customer)/page.js` — home |
| `/cart` | cart |
| `/checkout` | checkout |
| `/orders` | order list |
| `/order/[id]` | track + map |
| `/store/[id]` | store catalog |
| `/store/[id]/product/[productId]` | product |
| `/login` | login + register |

Admin (`/admin`, layout role guard):

- `/admin` dashboard
- stores: list, `new`, `[id]/edit`
- categories: list, `new`, `[id]/edit`
- products: list, `new`, `[id]/edit`
- inventory: list, `new`, `[id]/edit`, `store/[storeId]`
- orders
- riders: list, `new`, `[id]`, `[id]/edit`

Rider:

- `/rider`
- `/rider/assignments`
- `/rider/orders/[id]`

Important components: `Navbar`, `PortalShell`, `ProductCard`, `CartItem`, `AddressForm`, `LocationPicker`, `ImagePicker`, `OrderTrackMap`, `home/*`, `store/StorePage`, forms for store/product/category/rider/inventory.

Map: Leaflet (`OrderTrackMap`, `LocationPicker`).

---

## 11. Mobile screens

`mobile-app/src/screens/`: Login, CustomerHome, Product, Cart, Checkout, Orders, OrderTrack, RiderDashboard, RiderOrder.
Navigation role se customer tabs ya rider stack.
Storage: AsyncStorage. API axios. Socket `src/services/socket.js`.

---

## 12. Order lifecycle (end to end)

1. Location se nearest store: `GET /api/stores/nearby` ya home `GET /api/home`
2. Products: `GET /api/catalog/products?storeId=` ya store catalog
3. Cart: guest local, ya `POST /api/cart/items`
4. Address save: `POST /api/addresses` with lat/lng inside radius
5. `POST /api/orders` with addressId + cod/online
6. Online: `POST /api/payments/online/mock-success` → confirmed → nearest rider within 7 km if online
7. COD: confirmed, admin `POST /api/admin/orders/:id/assign` `{ riderId }`
8. Redis `order:assigned` → socket → customer + rider
9. Rider `POST /api/rider/orders/:id/status` step by step
10. Har step `order:status`. `on_the_way` par location events
11. Customer `/order/[id]` map par sunta hai
12. Cancel sirf pending/confirmed, stock restore

---

## 13. Jo setup abhi pending / adhoora hai

Is list ko Gemini se “fix karo” bolte waqt ek cheez ek time par maango. Poora platform ek prompt mein mat banana.

1. **AI routers mount nahi.** `ai-service/app/main.py` mein search, assistant, memory, tools, langchain, agent, admin content, support include nahi. Node `/api/ai/*` unko call karta hai aur fail hoga. `POST /parse-query` ka Python router exist hi nahi karta.
2. **OpenAI key.** `POST /chat` aur LLM helpers `OPENAI_API_KEY` maangte hain. `.env.example` AI service ka repo mein clearly set nahi. Key ke bina fallback text aata hai. Real RAG / vector DB production-ready nahi.
3. **Recommend bug.** `ai-service/app/routers/recommend.py` `HTTPException` use karta hai bina `fastapi` se import kiye. Empty recommendations par crash.
4. **ImageKit.** Admin upload `GET /api/admin/imagekit-auth`. Keys `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` khali hon to 503. Bina keys ke image URL manually daal sakte ho.
5. **Payments mock.** Razorpay/Stripe/webhook nahi. Sirf `mock-success`.
6. **ETA AI order se juda nahi.** Order `etaMinutes: 12` hardcode. Home ETA alag formula hai (`distance * 3 + 8`, clamp 8–25). `POST /eta` alag service hai.
7. **Kubernetes adhoora aur port galat.** Deployment `PORT=3000`, Service targetPort 3000. App 4000 sunti hai. Baaki services ke YAML nahi.
8. **CI tests nahi chalata.** Workflow Node 18 setup karti hai; `backend-core` engines `>=20`. Steps: `npm ci` (web par `npm run build`) aur `pip install`. Mongo integration tests nahi.
9. **Docker Compose mein web/mobile nahi.** Frontend alag `npm run dev`. AI/socket `env_file` files honi chahiye.
10. **Do Mongo names.** Docker `quick-commerce`, example env `quick_commerce`. Seed galat DB mein jaa sakta hai agar URI mix ho.
11. **Seed destructive hai.** Har run users/orders wipe.
12. **Purani markdown docs code se peeche hain.** `WEB_BUILD_PHASES.md` kehti hai admin rider list, product list, assign route nahi hain — **ab `admin.routes.js` mein hain**. `AI_SERVICE_DOCS.md` kehti hai backend AI call nahi karta — **ab `aiRoutes.js` + `aiService.js` karta hai**, lekin Python side incomplete mount hai.
13. **AI order-support auth bug.** Route public hai. Code `req.user._id` padhta hai; tokens `sub` rakhte hain.
14. **Security basics pending production ke liye.** AI routes open hain. CORS AI par `*`. JWT secrets example mein `change_me_*`. Rate limit sirf home + store catalog par (80/min). Helmet backend par hai.
15. **Koi automated test suite nahi** (Jest/Pytest project tests).

---

## 14. Gemini ko kaise poochho

Is file ko context mein do, phir **ek** kaam likho. Example:

```text
PROJECT_CONTEXT.md follow karo. Sirf ai-service/app/main.py mein jo routers
pehle se files mein hain unhe mount karo. Naye features mat banana.
Parse-query ka router mat invent karna jab tak main na kahun.
```

Rules jo code todte hain:

- Role `rider` mat banana. `delivery_partner` hi hai.
- Paise integer paise.
- Store coordinates `[lng, lat]`. Nearby/home query `lat` + `lng`.
- Nayi API path mat sochna jab tak yeh file mein na ho.
- Cart/order ko client se price mat lene dena.
- `/api` responses `{ success, message, data }`. `/api/ai` alag hai.
- Web pages jo `localStorage` / click use karein unke top par `'use client'`.
