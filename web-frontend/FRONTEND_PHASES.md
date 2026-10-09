# Web Frontend — Phase Guide (khud code karne ke liye)

Is file ko **Gemini / Cursor** ko do. Tum **khud code** karoge. AI se **ek time par sirf 1 phase** ka code maango, aur har file ke baad poochho: data kahan se aaya, kaunsi key use hui, error kab aata hai.

Repo: `quick-commerce-backend`  
Sirf **`web-frontend/`** implement karna hai. Backend, mobile, socket, AI service ka logic mat badlo, jab tak Phase 14 na aaye.

---

## Gemini ko pehle yeh system prompt do

```text
You are a patient teacher and a careful Next.js developer.

LOCKED RULES:
1. Implement ONLY the phase I name. Do not jump ahead.
2. Do not invent new folders. Use the file map in FRONTEND_PHASES.md.
3. Do not rewrite files from later phases.
4. Stack: Next.js 14 App Router, React 18, Tailwind, fetch (no axios), socket.io-client already installed.
5. Every API response is: { success, message, data }.
6. Money is integer paise. UI shows rupees using formatRupees.
7. Protected APIs need header: Authorization: Bearer <localStorage token>.
8. Browser code that uses localStorage, useState, useEffect, or onClick MUST start with 'use client'.
9. After each file, explain in simple Hindi + English:
   - file ka kaam
   - kaunsi API call hoti hai
   - request body / query
   - response ki kaunsi key UI mein jaati hai
   - data ka rasta: click → fetch → backend route → Mongo → state → screen
10. Full file do, chhote patch mat do.
11. Test steps batao (browser + Network tab).
```

Phir bolo: `Implement PHASE N only. Follow FRONTEND_PHASES.md.`

---

## Pehle yeh samajh lo (code se pehle)

### Teen apps, teen roles

| Role | Kahan | Kya karta hai |
|---|---|---|
| customer | Web `/` aur Mobile | Store, cart, order, track |
| admin | Sirf Web `/admin` | Store, product, inventory, orders |
| delivery_partner (rider) | Sirf Mobile | Online, location, status update |

Web par rider screens **mat banao**.

### Data ka rasta (har phase yahi hai)

```text
Browser page ('use client')
  → utils/api.js  fetch
  → http://localhost:4000/api/<route>
  → backend route → controller → service → MongoDB
  → JSON { success, message, data }
  → React useState
  → screen par dikhta hai
```

Live status alag raste se aata hai:

```text
Rider mobile status badalta hai
  → backend Redis channel qc:events
  → socket-service :5000
  → browser SocketContext
  → order page bina refresh update
```

### Env (already set)

File: `web-frontend/.env.local`

```text
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

`NEXT_PUBLIC_` ke bina browser ko env nahi dikhti.

### Seed logins (backend seed ke baad)

| Role | Phone | Password |
|---|---|---|
| admin | 9999999999 | Admin@123 |
| rider | 8888888888 | Rider@123 |
| customer | 7777777777 | Cust@123 |

### Chalana

```text
backend-core  → npm run dev     port 4000
socket-service → npm run dev    port 5000
web-frontend   → npm run dev    port 3000
```

Mongo + Redis bhi up hone chahiye. Customer home ke liye kam az kam **ek open store + inventory** seed/admin se honi chahiye. Store ke `serviceRadiusKm` (default 5) ke andar hi products milenge.

---

## API contract (yaad rakho)

Base: `http://localhost:4000/api`

Har response:

```json
{ "success": true, "message": "...", "data": {} }
```

Fail par `success: false` aur `message` error text hota hai. UI ko `message` dikhana hai.

Token login ke `data.accessToken` se aata hai. Abhi login page use `localStorage` mein `token` key par save karta hai. Role `role` key par save hota hai.

**Bug jo Phase 9 mein theek karna hai:** `admin/layout.js` `userRole` padhta hai, login `role` save karta hai. Dono ko `role` par lao.

### Customer / public routes

| Method | Path | Token | Body / query | `data` kya hai |
|---|---|---|---|---|
| POST | `/auth/register` | nahi | `{ name, phone, password, email? }` | `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | nahi | `{ phone, password }` | `{ user, accessToken, refreshToken }` |
| GET | `/auth/me` | haan | — | user profile |
| GET | `/stores/nearby` | nahi | query `lat`, `lng` | `{ store, distanceKm }` |
| GET | `/catalog/categories` | nahi | — | category array |
| GET | `/catalog/products` | nahi | query `storeId` required, optional `categoryId`, `q` | product array |
| GET | `/cart` | haan | — | `{ store, items, itemTotalPaise, itemTotalRupees }` |
| POST | `/cart/items` | haan | `{ productId, storeId, qty }` | same cart shape |
| PATCH | `/cart/items/:productId` | haan | `{ qty }` qty `0` = remove | same cart shape |
| DELETE | `/cart` | haan | — | clear |
| GET | `/addresses` | haan | — | address array |
| POST | `/addresses` | haan | `{ label?, line1, line2?, city, state, pincode, lat, lng, isDefault? }` | address doc |
| DELETE | `/addresses/:id` | haan | — | deleted address |
| POST | `/orders` | haan | `{ addressId, paymentMethod }` `cod` ya `online` | order doc |
| GET | `/orders` | haan | — | customer: apni orders. admin: saari orders |
| GET | `/orders/:id` | haan | — | ek order |
| POST | `/orders/:id/cancel` | haan | — | sirf `pending` / `confirmed` |
| POST | `/payments/online/mock-success` | haan | `{ orderId }` | `{ order, payment }` |

### Admin routes (token + role admin)

| Method | Path | Body | `data` |
|---|---|---|---|
| GET | `/admin/stores` | — | stores array |
| POST | `/admin/stores` | `{ name, phone, addressText, location: { type: "Point", coordinates: [lng, lat] }, serviceRadiusKm? }` | store |
| POST | `/admin/categories` | `{ name, slug }` | category |
| POST | `/admin/products` | `{ name, slug, description?, category, brand?, unit, images?, mrpPaise }` | product |
| PUT | `/admin/inventory` | `{ storeId, productId, stock, sellingPricePaise }` | inventory |

`coordinates` hamesha **`[longitude, latitude]`**. Ulta bhejoge to nearby store galat niklega.

### Jo backend par abhi NAHI hai

`GET /api/admin/orders` aur `POST /api/admin/orders/:id/assign` **mounted nahi**.  
`adminAssignRider` function `rider.controller.js` mein hai, route par nahi.  
Phase 14 mein pehle backend route, phir frontend.

Admin order list ke liye **`GET /orders`** use karo. Admin token par yeh saari orders return karta hai (`order.service.js` → `getOrdersByUser`).

### Product object (catalog)

```text
id, name, slug, description, category, brand, unit, images,
mrpPaise, sellingPricePaise, stock
```

Sirf woh products aate hain jin ki **is store ki inventory** hai.

### Cart item object

```text
productId, name, unit, images, qty, pricePaise, totalPaise
```

Price client nahi bhejta. Backend inventory ki `sellingPricePaise` snapshot karta hai.

### Order object (important keys)

```text
_id, orderNumber, status, paymentMethod, paymentStatus,
pricing.itemTotal, pricing.deliveryFee, pricing.grandTotal,
items[].name, items[].qty, items[].pricePaise,
addressSnapshot.line1, addressSnapshot.city, addressSnapshot.pincode,
etaMinutes, store, rider, user
```

Delivery fee rule: item total `< 19900` paise ho to fee `2900` paise, warna `0`.

Status machine:

```text
pending → confirmed → assigned → accepted → packed → picked_up → on_the_way → delivered
```

- COD order create hote hi status `confirmed`.
- Online order pehle `pending`, mock payment ke baad `confirmed` + `paymentStatus: paid`.
- Rider auto-assign **sirf online mock payment** ke baad hota hai (`payment.service.js` → `assignNearestRiderToOrder`). Rider online ho aur store ke 7 km ke andar ho.
- COD par auto-assign nahi. Assign tabhi jab Phase 14 ka admin route lag jaaye, ya backend baad mein COD par bhi assign kare.

Socket events (server emit karta hai, client sunta hai):

| Event | Kab | Payload keys |
|---|---|---|
| `order:assigned` | rider assign | `type, orderId, userId, riderId, status` |
| `order:status` | rider status badle | `type, orderId, userId, riderId, status` |

Client pehle `join:order` emit karta hai: `{ orderId }`.

---

## Current files (mat mitao, bhro)

Already real (thoda) code:

- `src/app/layout.js` — `SocketProvider` wrap karta hai
- `src/app/login/page.js` — login hai, register nahi
- `src/app/(customer)/page.js` — sirf heading
- `src/app/(customer)/cart/page.js` — sirf heading
- `src/app/(customer)/order/[id]/page.js` — socket skeleton, order API se load nahi
- `src/app/admin/layout.js` — guard, lekin galat key `userRole`
- `src/app/admin/page.js` — sirf heading
- `src/app/admin/orders/page.js` — galat URL `/api/admin/orders` call karta hai
- `src/context/SocketContext.js` — kaam karta hai
- `src/components/AdminGuard.js` — extra, sidebar ke baad zaroori nahi

Empty shells (Phase 1–14 inko bharega):

- `src/utils/api.js` `auth.js` `format.js`
- `src/components/Navbar.js` `AdminSidebar.js` `ProductCard.js` `CartItem.js` `StatusBadge.js` `AddressForm.js`
- `src/app/(customer)/layout.js`
- `src/app/(customer)/checkout/page.js`
- `src/app/(customer)/orders/page.js`
- `src/app/admin/stores/page.js` `products/page.js` `inventory/page.js`

---

## Phase 1 — Shared utils

**Goal:** Baaki saari pages seedha `fetch` na likhein. Ek wrapper ho.

**Files:** `src/utils/api.js`, `src/utils/auth.js`, `src/utils/format.js`  
**Pages mat chhedo.**

### api.js kya kare

- Base URL: `process.env.NEXT_PUBLIC_API_URL`
- Function jaise `api(path, { method, body })`
- Header `Content-Type: application/json`
- Agar `localStorage.getItem('token')` hai to `Authorization: Bearer <token>`
- `res.json()` padho
- `success === false` ya `!res.ok` ho to `throw new Error(body.message)`
- Return **`body.data`**, poora body nahi. Isse baad ki pages seedha `data.store` use karengi, `data.data.store` nahi.

### auth.js kya kare

- `getToken()` → `localStorage.getItem('token')`
- `getRole()` → `localStorage.getItem('role')`
- `getUser()` → `JSON.parse(localStorage.getItem('user'))`
- `saveSession({ accessToken, user })` → `token`, `role`, `user` set kare
- `logout()` → yeh teen keys hata de

`localStorage` sirf browser mein. Is file ko server component se import mat karo.

### format.js kya kare

- `formatRupees(paise)` → `₹` + `(paise / 100).toFixed(2)`
- `statusLabel(status)` → underscore ko space (`picked_up` → `picked up`)

**Test:** Abhi UI nahi. Console ya temporary button se `api('/health')` call karke dekho `data.service === 'backend-core'`. `/health` token nahi maangta.

**Sawal jo tum Gemini se poochh sakte ho**

- `body.data` return kyun, poora JSON kyun nahi?
- Token header na lage to 401 kyun aata hai?
- `formatRupees(19900)` kya dikhayega?

---

## Phase 2 — Login + register

**Goal:** Customer aur admin dono login. Naya customer register.

**File:** `src/app/login/page.js` only.  
`'use client'` already hai. Phase 1 ke `api` aur `saveSession` use karo. Seedha `fetch` hata sakte ho.

### UI

- Toggle: Login / Register
- Login fields: phone (10 digit), password
- Register extra: name (min 2), password min 8. Email optional.
- Error text screen par (`message` from API)
- Submit loading disable

### Calls

- Login: `POST /auth/login` `{ phone, password }`
- Register: `POST /auth/register` `{ name, phone, password }`

`data.user.role === 'admin'` → `router.replace('/admin')`  
warna → `router.replace('/')`

Public register hamesha role `customer` banata hai. Admin seed se hi aata hai.

**Test**

1. `7777777777` / `Cust@123` → `/`
2. `9999999999` / `Admin@123` → `/admin`
3. Galat password → error message, redirect nahi
4. Network tab: request URL `/api/auth/login`, response `data.accessToken`

**Sawal**

- `accessToken` aur `refreshToken` mein farq?
- Register ke baad alag login kyun zaroori nahi (token response mein aa jata hai)?

---

## Phase 3 — Customer shell

**Goal:** Bina login customer pages na khulein. Navbar ho.

**Files:** `src/app/(customer)/layout.js`, `src/components/Navbar.js`  
Home/cart ka andar ka data **abhi mat** likho.

### layout.js

Yeh client component hona chahiye kyunki `localStorage` padhega.

- `getToken()` khali → `/login`
- `getRole() === 'admin'` → `/admin`
- warna `<Navbar />` + `{children}`

`(customer)` folder URL mein nahi dikhta. `/cart` hi rehta hai, `/(customer)/cart` nahi.

### Navbar.js

Links: `/` Home, `/cart` Cart, `/orders` Orders.  
Logout: `logout()` phir `/login`.

**Test:** Incognito mein `/` → login. Customer login → navbar dikhe. Admin login se `/` kholo → `/admin` chala jaye.

**Sawal**

- `layout.js` aur `page.js` mein farq?
- Route group `(customer)` URL kyun nahi badalta?

---

## Phase 4 — Home: nearby store + products

**Goal:** Location se store, phir us store ke products.

**Files:** `src/app/(customer)/page.js`, `src/components/ProductCard.js`  
Add to cart **Phase 5** hai. Is phase mein card sirf name, unit, price, stock dikhaye.

### Order of calls (zaroori)

1. `navigator.geolocation.getCurrentPosition`
2. Permission na mile to fallback Delhi: `lat 28.6139`, `lng 77.2090` (sirf dev). UI par likh do ki fallback use ho raha hai.
3. `GET /stores/nearby?lat=...&lng=...`  
   Result: `data.store` (mongoose doc, id = `store._id`), `data.distanceKm`
4. `GET /catalog/products?storeId=<store._id>`  
   `storeId` query **zaroori**. Bina iske 400: `storeId query parameter is required`.

Token in calls par zaroori nahi, phir bhi `api()` token laga dega to koi nuksan nahi.

### UI states

- loading
- error (`Not serviceable at this location` ya `No active stores`)
- store name + distance
- products grid using `ProductCard`
- price: `formatRupees(product.sellingPricePaise)`

**Test:** Network tab mein do requests: `stores/nearby` phir `catalog/products?storeId=`. Products tabhi aayenge jab us store ki inventory ho.

**Sawal**

- `store._id` aur product `id` alag kyun hain?
- Nearby 400 vs empty product list mein farq?
- GeoJSON `[lng, lat]` frontend query mein `lat` aur `lng` alag kyun hain? (query alag fields hain; Mongo ke andar array ulta hai)

---

## Phase 5 — Add to cart

**Goal:** Product card se cart mein item.

**Files:** `ProductCard.js` (props: `product`, `storeId`), home page se dono props pass karo.

### Call

`POST /cart/items`

```json
{ "productId": "<product.id>", "storeId": "<store._id>", "qty": 1 }
```

- Token zaroori. Bina token 401.
- Price **mat** bhejo.
- Stock se zyada qty → error message dikhao.
- Do stores mix nahi hote. Error: cart ek hi store ka ho sakta hai.
- Success par chhota message: "Added". Cart page Phase 6 mein khulegi.

`productId` catalog ke `id` se aata hai, `_id` se nahi.

**Test:** Network `POST /api/cart/items` 200. Response `data.items` mein woh product. Dubara Add → qty badhe (backend existing line update karta hai).

**Sawal**

- `pricePaiseSnapshot` kya hai aur UI price kyun trust nahi karti?
- 401 aaye to login page kyun bhejna chahiye?

---

## Phase 6 — Cart page

**Goal:** Items dikhao, qty badhao/ghatao, checkout button.

**Files:** `src/app/(customer)/cart/page.js`, `src/components/CartItem.js`

### Calls

- Page load: `GET /cart`
- Plus: `PATCH /cart/items/<productId>` `{ qty: current + 1 }`
- Minus: same, `{ qty: current - 1 }`. `0` item delete karta hai.

Empty cart shape: `{ items: [], itemTotalPaise: 0, store: null }`

Har item: `name`, `qty`, `pricePaise`, `totalPaise`, `productId`.

Footer: `formatRupees(itemTotalPaise)`.  
Button `/checkout` sirf jab `items.length > 0`.

**Test:** Home se add karo, `/cart` par wahi item. Minus se 0 → item gayab. Refresh ke baad bhi cart rahe (Mongo mein user se juda hai, browser state nahi).

**Sawal**

- Cart `localStorage` mein kyun nahi?
- `productId` PATCH URL mein kaise jaata hai?

---

## Phase 7 — Checkout

**Goal:** Address choose ya banao, order place, online ho to mock pay.

**Files:** `src/app/(customer)/checkout/page.js`, `src/components/AddressForm.js`

### Calls, isi order mein

1. `GET /addresses` → list. Pehla ya `isDefault` select karo.
2. Naya address form:
   `POST /addresses`  
   `{ label, line1, city, state, pincode (6 digit), lat, lng }`  
   `lat`/`lng` geolocation se lo, warna wahi Delhi fallback.  
   Backend khud `location.coordinates = [lng, lat]` banata hai. Tum coordinates array mat bhejo.
3. Payment radio: `cod` ya `online`. **Capital COD mat bhejo.** Joi sirf `cod` | `online` leta hai.
4. `POST /orders` `{ addressId, paymentMethod }`
5. Agar `online`: turant `POST /payments/online/mock-success` `{ orderId: order._id }`
6. `router.push('/order/' + order._id)`

Address store ke `serviceRadiusKm` se bahar ho to order fail: `Address is outside store service radius`.

Order banate hi cart delete ho jata hai aur stock kam hota hai.

**Test**

- COD: order `confirmed`, payment `pending`, cart empty.
- Online: payment `paid`, status `confirmed`. Agar rider online + nazdeek hai to status `assigned` bhi ho sakta hai.
- Network mein order create ke baad mock-success sirf online par.

**Sawal**

- `addressId` kahan se aata hai (`_id` of address doc)?
- COD par mock-success kyun nahi call karte?
- Delivery fee 2900 paise kab lagti hai?

---

## Phase 8 — Orders list + live track

**Goal:** Meri orders, aur ek order ka live status.

**Files:** `src/app/(customer)/orders/page.js`, `src/app/(customer)/order/[id]/page.js`, `src/components/StatusBadge.js`

`order/[id]/page.js` mein socket code pehle se hai. Use toda, API se initial order load karo. Status sirf `'confirmed'` hardcoded mat chhodo.

### Calls

- List: `GET /orders`  
  Row: `orderNumber`, `StatusBadge(status)`, `formatRupees(pricing.grandTotal)`, link `/order/${_id}`
- Detail: `GET /orders/:id`  
  Dikhao: orderNumber, status, paymentMethod, paymentStatus, items, addressSnapshot, grandTotal, etaMinutes

### Socket (detail page)

`useSocket()` from `@/context/SocketContext`.

Jab socket connected:

- `socket.emit('join:order', { orderId })`  
  `orderId` string honi chahiye, `useParams().id` se.
- `socket.on('order:status', ...)` → payload `orderId` match ho to `setStatus(payload.status)`
- `socket.on('order:assigned', ...)` → status `assigned`
- cleanup: `socket.off(...)`

Socket tabhi connect hota hai jab `localStorage.token` ho. Socket server JWT verify karta hai. Backend aur socket ka JWT secret same hona chahiye.

**Test**

- `/orders` par apni orders.
- Dusre user ki order id URL mein daalo → `Access denied`.
- Live test: online order + rider mobile se status change, ya Postman se rider status API. Page refresh ke bina badge badle. Socket-service terminal mein `joined order room` dikhe.

**Sawal**

- Pehle API se status kyun, socket ke baad kyun? (socket purana status nahi bhejta, sirf naya event)
- `join:order` na bhejo to event miss kyun ho sakta hai? (order room). User room par bhi `userId` event jaata hai, phir bhi join sahi habit hai.

---

## Phase 9 — Admin shell

**Goal:** Sirf admin `/admin` khole. Sidebar ho.

**Files:** `src/app/admin/layout.js`, `src/components/AdminSidebar.js`

### Theek karo

Guard `localStorage.getItem('role')` padhe, **`userRole` nahi**.  
Token missing ya role `!== 'admin'` → `/login`.

### Sidebar links

- `/admin` Dashboard
- `/admin/stores` Stores
- `/admin/products` Products
- `/admin/inventory` Inventory
- `/admin/orders` Orders
- Logout → `/login`

Layout: sidebar + `{children}`.

**Test:** Customer se `/admin/stores` → login. Admin se sidebar dikhe.  
`9999999999` / `Admin@123`.

**Sawal**

- Client-side guard secure kyun nahi hai? (asal check backend `allowRoles('admin')` karta hai; UI sirf shortcut hai)

---

## Phase 10 — Admin stores

**Goal:** Stores list + naya store.

**File:** `src/app/admin/stores/page.js`

### Calls

- Load: `GET /admin/stores`
- Create: `POST /admin/stores`

Body example (fields, code tum likhoge):

```text
name, phone, addressText
location.type = "Point"
location.coordinates = [lng, lat]    // longitude PEHLE
serviceRadiusKm number, default 5
isOpen true
```

Form mein lat/lng alag inputs rakho, submit par array `[Number(lng), Number(lat)]` banao.

List: name, phone, addressText, radius, open/closed.

**Test:** Admin token ke bina 401. Customer token se 403. Naya store list mein dikhe. Customer home us lat/lng ke 5 km mein ho to yeh store nearby ban sakta hai.

**Sawal**

- `[lat, lng]` bhej diya to kya bigadta hai?

---

## Phase 11 — Categories + products

**Goal:** Category banao, us category ka product banao.

**File:** `src/app/admin/products/page.js`  
Do forms ek page par theek hain.

### Calls

- `POST /admin/categories` `{ name, slug }`  
  slug lowercase, unique. Example name `Snacks`, slug `snacks`.
- Categories list ke liye public `GET /catalog/categories` use kar sakte ho (admin list route nahi hai).
- `POST /admin/products`  
  `{ name, slug, category, unit, mrpPaise, description?, brand? }`  
  `category` = category `_id` (dropdown).  
  `mrpPaise` integer. 99 rupee = `9900`.  
  `unit` jaise `500g` ya `1L`.

Product abhi customer ko **nahi** dikhega jab tak Phase 12 inventory na ho.

**Test:** Category create 201. Product create 201. Customer home par abhi nahi dikhega. Yeh expected hai.

**Sawal**

- `mrpPaise` aur `sellingPricePaise` alag kyun? (MRP product par, selling price inventory par, store-wise)

---

## Phase 12 — Inventory

**Goal:** Store + product par stock aur selling price.

**File:** `src/app/admin/inventory/page.js`

### Call

`PUT /admin/inventory`

```text
storeId            store _id  (GET /admin/stores se dropdown)
productId          product _id (GET /catalog/products ke bina store ke list nahi aati)
stock              number >= 0
sellingPricePaise  number >= 0
```

Product dropdown ke liye: pehle koi ek store choose karo jisme stock hai, **ya** category products directly DB se nahi aate bina inventory.  
Practical UI: product id manually paste karne do (Phase 11 ke response `_id`), plus store dropdown. Baad mein list polish kar sakte ho.

Customer catalog **sirf inventory wali** products dikhata hai.

**Test:** Inventory save. Customer home us `storeId` + uski location par product dikhe, stock aur selling price sahi.

**Sawal**

- Inventory ke bina product home par gayab kyun?

---

## Phase 13 — Admin dashboard

**Goal:** Simple counts. Naya stats API mat maango.

**File:** `src/app/admin/page.js`

- `GET /admin/stores` → `array.length`
- `GET /orders` with admin token → saari orders → `length`  
  Status `delivered` / `confirmed` alag count `filter` se nikal sakte ho.

Cards: Stores, Orders. Links sidebar jaise pages par.

**Test:** Store aur order banao, refresh par count badhe.

---

## Phase 14 — Admin orders + rider assign

**Goal:** Saari orders table. Rider assign.

**File:** `src/app/admin/orders/page.js`  
**Aur backend sirf is phase mein:** `backend-core/src/routes/admin.routes.js` (route add). Controller `adminAssignRider` pehle se hai.

### List (frontend, route pehle se hai)

`GET /orders` admin token.  
Table columns: `orderNumber`, customer name (`user.name` populated), `status`, `paymentMethod`, `paymentStatus`, `pricing.grandTotal`, rider name ya "none".

**Mat** call karo `GET /api/admin/orders`. Woh route exist nahi karti. Current `admin/orders/page.js` yahi galat URL use karti hai. Use hatao.

### Assign (pehle backend route)

`rider.controller.js` ka `adminAssignRider` expect karta hai:

- `POST` with `req.params.id` = order id
- body `{ riderId }`
- order milne par `order.rider = riderId`, `status = 'assigned'`

Suggested route (admin router par, `protect` + `allowRoles('admin')` already `router.use` par hai):

```text
POST /api/admin/orders/:id/assign
body { riderId }
```

Controller ko admin routes se import karke is path par lagana hai. Gemini se **poori updated `admin.routes.js`** maango.

Frontend: rider id input + Assign button.  
Rider id seed user `8888888888` ka Mongo `_id` hai. UI mein hardcoded fake id (`65f9876...`) mat chhodo. Input se lo.

Assign ke baad list refresh.

**Test**

- Admin orders table mein customer ka order dikhe.
- Galat rider id → error.
- Sahi rider id → status `assigned`. Rider mobile app assignments mein dikhe (rider online ho).
- Customer track page par socket se `assigned` aaye (socket-service up ho). Note: `adminAssignRider` abhi Redis event publish **nahi** karta. Live badge tabhi badlega jab backend assign ke baad `publishEvent({ type: 'order:assigned', ... })` bhi kare. Phase 14 mein yeh ek line backend mein add karne ko bolo, warna customer ko refresh karna padega.

**Sawal**

- Admin `GET /orders` aur customer `GET /orders` same URL, alag data kyun? (backend role dekhta hai)
- Assign ke baad socket event kyun optional hai?

---

## Phase order (skip mat karo)

```text
1 utils
2 login + register
3 customer layout + navbar
4 home store + products
5 add to cart
6 cart page
7 checkout
8 orders + track
9 admin layout + sidebar
10 stores
11 categories + products
12 inventory
13 dashboard
14 orders + assign route
```

Har phase ke baad browser Network tab mein request URL, status code, aur `data` ki keys dekho. Agle phase se pehle yeh 4 sawal khud jawab do:

1. Is page ki API kaunsi hai?
2. Token chahiye ya nahi?
3. UI ne `data` ki kaunsi key padhi?
4. Fail hone par `message` kahan dikhega?

---

## Gemini se ek phase maangne ka message (copy)

```text
FRONTEND_PHASES.md padho.
Sirf PHASE <number> implement karo.
Us phase ki saari files ka full code do.
Har file ke baad Hindi+English mein batao:
- API URL, method, body
- response data ki keys
- click se screen tak data ka rasta
- 3 galat faisle jo is phase mein log karte hain
Agla phase mat likho.
```
