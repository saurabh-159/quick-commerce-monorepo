# Web App — Build Phases (Gemini ko ek phase do)

Yeh file **agla kaam** hai. Purani `FRONTEND_PHASES.md` ab is scope ke liye mat use karo. Wahan likha tha “web par rider mat banao” aur “bina login home mat kholo”. **Yeh file usko badalti hai.**

Tum **khud code nahi** karoge is chat mein. Gemini ko **ek time par sirf 1 phase** do. Poora app ek message mein mat mangwana.

Repo: `quick-commerce-backend`  
Code sirf `web-frontend/` mein, **jab tak Phase 7 na aaye**. Phase 7 sirf `backend-core` ki 3 jagah chhuti hai. `mobile-app`, `ai-service`, `socket-service` mat chhedo.

---

## Gemini ko pehle yeh system prompt do

```text
You are a careful Next.js developer. Follow WEB_BUILD_PHASES.md exactly.

LOCKED RULES:
1. Implement ONLY the phase number I name. Do not start the next phase.
2. Do not invent API paths. Use only the APIs written in that phase.
3. Do not create a second login page. There is one page: /login.
4. Role strings are exactly: customer | admin | delivery_partner.
   Never save role as "rider". Rider screens use role delivery_partner.
5. Every API response is { success, message, data }.
   utils/api.js already returns data only. Pages use that data directly.
6. Money is integer paise. UI uses formatRupees from src/utils/format.js.
   Never send price from the browser to cart or order APIs.
7. Protected calls need Authorization: Bearer <localStorage token>.
   api() already adds this when token exists.
8. Browser code that uses localStorage, useState, useEffect, or onClick
   MUST start with 'use client'.
9. Do not rewrite files that this phase does not list.
10. After each file, explain in Hindi + English:
    - file ka kaam
    - API method, path, body
    - response ki kaunsi key UI mein gayi
    - click se screen tak data ka rasta
11. Give full file contents for files you change, not tiny unexplained patches.
12. Give browser test steps.
```

Phir bolo: `Implement PHASE N only. Follow web-frontend/WEB_BUILD_PHASES.md.`

---

## Teen log, ek website, ek login

| Kaun | Login? | Kahan jaata hai | Kya kar sakta hai |
|---|---|---|---|
| Guest (koi login nahi) | nahi | `/` `/cart` | Store aur products dekhe, guest cart. Checkout par login maango |
| customer | haan | `/` | Server cart, address, order, live track |
| admin | haan | `/admin` | Stores, products, inventory, orders, rider assign |
| delivery_partner (rider) | haan | `/rider` | Online, location, assigned orders, status update |

Public register **hamesha** `customer` banata hai. Admin aur rider seed se aate hain. Web par rider/admin register **mat banao**.

### Seed logins

| Role | Phone | Password | Login ke baad |
|---|---|---|---|
| admin | 9999999999 | Admin@123 | `/admin` |
| delivery_partner | 8888888888 | Rider@123 | `/rider` |
| customer | 7777777777 | Cust@123 | `/` |

### Chalana

```text
backend-core   npm run dev    port 4000
socket-service npm run dev    port 5000
web-frontend   npm run dev    port 3000
```

Mongo + Redis up hone chahiye.

Env file `web-frontend/.env.local` (already):

```text
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Data ka rasta

```text
Page ('use client')
  → src/utils/api.js
  → http://localhost:4000/api/<path>
  → { success, message, data }
  → api() returns data
  → useState → screen
```

Live updates:

```text
Backend publishEvent → Redis channel qc:events
  → socket-service port 5000
  → browser SocketContext
```

Socket tabhi connect hota hai jab `localStorage.token` ho. Login ke baad **full page reload** chahiye (Phase 2), warna socket purane page par atka rehta hai.

---

## API contract (yaad rakho, nayi API mat banao jab tak Phase 7 na kahe)

Base: `http://localhost:4000/api`  
Fail: `success: false`, UI ko `message` dikhao.

Token: login `data.accessToken` → `localStorage.token`  
Role: `data.user.role` → `localStorage.role`  
User: `data.user` → `localStorage.user`

### Auth (public)

| Method | Path | Body | `data` |
|---|---|---|---|
| POST | `/auth/register` | `{ name, phone, password, email? }` | `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | `{ phone, password }` | `{ user, accessToken, refreshToken }` |
| GET | `/auth/me` | token | user profile |

`user.role` in `customer` | `admin` | `delivery_partner`.

### Public store (token nahi chahiye)

| Method | Path | Query | `data` |
|---|---|---|---|
| GET | `/stores/nearby` | `lat`, `lng` | `{ store, distanceKm }` |
| GET | `/catalog/categories` | — | category array (`_id`, `name`, `slug`) |
| GET | `/catalog/products` | `storeId` required, optional `categoryId`, `q` | product array |

Product keys: `id`, `name`, `slug`, `description`, `category`, `brand`, `unit`, `images`, `mrpPaise`, `sellingPricePaise`, `stock`.

`store._id` nearby se aata hai. Product `id` cart ke `productId` ke liye use karo, `_id` assume mat karo (catalog `id` bhejta hai).

Bina `storeId` ke products **400**: `storeId query parameter is required`.  
Location service area se bahar: error message UI par dikhao.  
Permission na mile to dev fallback Delhi: lat `28.6139`, lng `77.2090`, aur screen par likho ki fallback chal raha hai.

GeoJSON store create par coordinates **`[longitude, latitude]`**. Nearby query alag fields hain: `lat` aur `lng`.

### Customer only (token + role customer)

| Method | Path | Body | `data` |
|---|---|---|---|
| GET | `/cart` | — | `{ store, items, itemTotalPaise, itemTotalRupees }` |
| POST | `/cart/items` | `{ productId, storeId, qty }` | same cart |
| PATCH | `/cart/items/:productId` | `{ qty }` qty `0` = remove | same cart |
| DELETE | `/cart` | — | empty cart |
| GET | `/addresses` | — | address array |
| POST | `/addresses` | `{ label?, line1, line2?, city, state, pincode, lat, lng, isDefault? }` | address |
| DELETE | `/addresses/:id` | — | deleted |
| POST | `/orders` | `{ addressId, paymentMethod }` `cod` ya `online` | order |
| GET | `/orders` | — | **customer:** apni orders. **admin:** saari orders |
| GET | `/orders/:id` | — | ek order (owner, admin, ya assigned rider) |
| POST | `/orders/:id/cancel` | — | sirf status `pending` ya `confirmed` |
| POST | `/payments/online/mock-success` | `{ orderId }` | `{ order, payment }` |

Cart item: `productId`, `name`, `unit`, `images`, `qty`, `pricePaise`, `totalPaise`.  
Do stores ek cart mein mix nahi hote.

Delivery fee: item total `< 19900` paise ho to fee `2900` paise, warna `0`.  
COD order create hote hi status `confirmed`. Online pehle `pending`, mock pay ke baad `confirmed` + `paymentStatus: paid`.  
Order banate hi server cart delete hota hai aur stock kam hota hai.

Address `lat`/`lng` bhejo. Coordinates array mat bhejo. Backend khud `[lng, lat]` banata hai.  
Address store ke `serviceRadiusKm` se bahar ho to: `Address is outside store service radius`.

### Rider only (token + role delivery_partner)

Mounted at `/api/rider`. Customer token se **403**.

| Method | Path | Body | `data` |
|---|---|---|---|
| PATCH | `/rider/online` | `{ isOnline: true/false }` | updated user |
| PATCH | `/rider/location` | `{ lat, lng }` | updated user |
| GET | `/rider/assignments` | — | orders jinka rider yeh user hai aur status `assigned`, `accepted`, `packed`, `picked_up`, `on_the_way` |
| POST | `/rider/orders/:id/status` | `{ status }` | updated order |

Status sirf **agli** value:

```text
assigned → accepted → packed → picked_up → on_the_way → delivered
```

Beech ki value skip karoge to error: `Invalid status transition from X to Y`.  
Order is rider ki nahi hai to: `Unauthorized for this order`.

Rider order detail ke liye `GET /orders/:id` use karo. Yeh assigned rider ko allow karta hai. `GET /orders` rider ki list **nahi** deta (woh customer/admin list hai). List ke liye `GET /rider/assignments`.

Auto-assign sirf **online mock payment** ke baad hota hai, aur tabhi jab rider `isOnline: true` ho aur store se **7 km** ke andar location ho. COD par auto-assign nahi. COD ke liye admin assign karega (Phase 7–8).

Seed rider online hai lekin location `[0, 0]` hai. Web par location store ke paas set kiye bina auto-assign nahi hoga.

### Admin only (token + role admin)

| Method | Path | Body | `data` |
|---|---|---|---|
| GET | `/admin/stores` | — | stores |
| POST | `/admin/stores` | neeche | store |
| POST | `/admin/categories` | `{ name, slug }` | category |
| POST | `/admin/products` | neeche | product |
| PUT | `/admin/inventory` | `{ storeId, productId, stock, sellingPricePaise }` | inventory |

Store body:

```text
name, phone, addressText
location.type = "Point"
location.coordinates = [lng, lat]
serviceRadiusKm number, default 5
isOpen true
```

Product body: `{ name, slug, category, unit, mrpPaise, description?, brand? }`  
`category` = category `_id`. `mrpPaise` integer. 99 rupee = `9900`.  
Selling price product par nahi, inventory par, store-wise.

`GET /orders` admin token par **saari** orders, populate `user`, `store`, `rider`.

### Jo abhi backend par NAHI hai (sirf Phase 7 banayega)

- `GET /api/admin/riders`
- `GET /api/admin/products` (saare products, inventory ke bina)
- `POST /api/admin/orders/:id/assign`

Inhe Phase 7 se pehle frontend se call **mat** karo. `adminAssignRider` controller mein hai, route par nahi, aur Redis event bhi nahi bhejta.

### Socket events (server emit, client sunta hai)

| Event | Kab | Payload |
|---|---|---|
| `order:assigned` | rider assign (auto ya, Phase 7 ke baad, admin) | `type, orderId, userId, riderId, status` |
| `order:status` | rider status badle | `type, orderId, userId, riderId, status` |

Client `join:order` emit kare: `{ orderId: string }`.  
Rider connect hote hi socket-service usse room `rider:<userId>` mein daal deta hai. Assign event us room par bhi jaata hai.

---

## Jo pehle se bana hai (mitao mat, phase ke hisaab se edit karo)

Working pages:

- `src/app/login/page.js` — login + register, lekin redirect sirf admin vs baaki. Rider alag nahi jaata.
- `src/app/(customer)/layout.js` — **bina token `/login` bhej deta hai.** Phase 3 isko guest ke liye kholega. Admin ko `/admin` bhejta hai.
- `src/app/(customer)/page.js` — nearby store + products
- `src/app/(customer)/cart/page.js` — server cart (`GET /cart`). Guest cart nahi.
- `src/app/(customer)/checkout/page.js` — address + cod/online
- `src/app/(customer)/orders/page.js` — customer orders
- `src/app/(customer)/order/[id]/page.js` — detail + socket
- `src/app/admin/layout.js` — admin guard (`role` key sahi hai)
- `src/app/admin/page.js` — store count + order count
- `src/app/admin/stores/page.js` — create + list
- `src/app/admin/products/page.js` — category + product create. List nahi.
- `src/app/admin/inventory/page.js` — product id **paste**. Dropdown nahi.
- `src/app/admin/orders/page.js` — list `GET /orders`. Assign button `POST /admin/orders/:id/assign` call karta hai jo **abhi 404** hai.
- `src/context/SocketContext.js` — token sirf pehli load par padhta hai
- `src/utils/api.js` `auth.js` `format.js`
- `src/components/Navbar.js` `ProductCard.js` `CartItem.js` `AddressForm.js` `StatusBadge.js` `AdminSidebar.js`

`(customer)` folder URL mein nahi dikhta. `/cart` hi rehta hai.

Tailwind classes har page par hain, **package install nahi**. `package.json` mein tailwind nahi. `globals.css` sirf Arial + gray background hai. Isliye UI plain dikhti hai. Phase 1 yeh theek karega.

---

## Phase 1 — Tailwind chalu karo

**Goal:** Jo classes pehle se JSX mein hain, woh asal mein apply hon. Naya page mat likho.

**Sirf setup.** Pages ka logic mat badlo.

### Karo

`web-frontend` mein Tailwind CSS v3 (Next.js 14 ke saath) install karo:

- dependencies: `tailwindcss`, `postcss`, `autoprefixer`
- `tailwind.config.js` content: `./src/**/*.{js,jsx}`
- `postcss.config.js`
- `src/app/globals.css` ke top par:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Purana `body { font-family: Arial; background: #f7f7f7; }` hata sakte ho, kyunki utilities layout sambhalengi. `layout.js` mein `globals.css` import pehle se hai. Doosri CSS file mat banao.

**Test:** `npm run dev`. Login page par white card, green button, center layout dikhe. Pehle yeh plain text tha.

**Is phase mein mat karo:** login redirect, guest cart, rider pages, backend.

---

## Phase 2 — Ek login, teen ghar, socket reconnect

**Goal:** Same `/login` form. Role decide kare kahan jana hai. Login ke baad socket connect ho.

**Files:** `src/app/login/page.js`, `src/utils/auth.js`, `src/context/SocketContext.js`  
Naye pages mat banao.

### Redirect

`saveSession` ke baad:

| `data.user.role` | Jao |
|---|---|
| `admin` | `/admin` |
| `delivery_partner` | `/rider` |
| `customer` | query `next` ho to wahi path, warna `/` |

`next` sirf apni site ka path ho (`/` se start). `http` wala URL ignore karke `/` use karo.

Register ke baad role hamesha `customer` hai, isliye customer wale rule par jao.

**Important:** `router.replace` mat use karo login success par. `window.location.assign(path)` use karo taaki poora app reload ho aur socket naya token dekhe.

### auth.js

`saveSession` ke end mein dispatch:

```text
window.dispatchEvent(new Event('qc-auth'))
```

`logout` ke baad bhi yahi event.

### SocketContext.js

- Pehli baar token ho to connect (jaise ab hai).
- `qc-auth` event suno: token hai to naya socket, nahi hai to disconnect.
- Purana socket `disconnect` karke naya banao, double connection mat chhodo.

`/rider` abhi 404 rahega. Phase 9 banayega. Is phase ka test admin aur customer redirect hai. Rider login ke baad URL `/rider` hona chahiye, page baad mein aayega.

**Test**

1. Galat password → error, redirect nahi.
2. `9999999999` / `Admin@123` → `/admin`
3. `7777777777` / `Cust@123` → `/`
4. `8888888888` / `Rider@123` → URL `/rider` (404 abhi theek hai)
5. Login ke baad console: `Connected to socket server`

---

## Phase 3 — Bina login store (normal ecommerce home)

**Goal:** Guest `/` khol sake. Products, category, search dikhein. Add to cart abhi server wala hi rahe (Phase 4 guest cart karega).

**Files:** `src/app/(customer)/layout.js`, `src/components/Navbar.js`, `src/app/(customer)/page.js`  
Checkout, cart API, admin mat chhedo.

### layout.js

Token **missing** ho to `/login` mat bhejo. Children dikhao + Navbar.

Agar token hai:

| role | action |
|---|---|
| `admin` | `router.replace('/admin')` |
| `delivery_partner` | `router.replace('/rider')` |
| `customer` | store dikhao |

### Navbar.js

Links: Home `/`, Cart `/cart`.  
Orders `/orders` sirf jab `getToken()` ho aur role `customer` ho.  
Login nahi: button `/login`.  
Login hai: Logout (`logout()` phir `window.location.assign('/')`).

### Home page (pehle se store + products hain)

Add karo, flow mat todo:

1. Geolocation, warna Delhi fallback + yellow note (pehle se hai).
2. `GET /stores/nearby?lat=&lng=`
3. Store name, `addressText`, `distanceKm`, `serviceRadiusKm`
4. `GET /catalog/categories`
5. Category chips + search box. Search `q`, category `categoryId`. Dono optional.
6. `GET /catalog/products?storeId=<store._id>&categoryId=&q=`
7. Empty list alag message: "No products" (store mili lekin inventory nahi). Store error alag message (API `message`).

ProductCard abhi `POST /cart/items` karti hai. Guest par yeh 401 degi. Phase 3 mein ProductCard **mat** badlo. Phase 4 guest add karegi. Home par guest ko short note: "Login to save cart" tab tak theek hai, ya Add button Phase 4 tak rehne do.

**Test:** Incognito mein `/` login ke bina store + products. Category click par nayi `catalog/products` request. Admin login karke `/` kholo → `/admin`.

---

## Phase 4 — Guest cart + customer cart, ek cart page

**Goal:** Bina login item cart mein jaye (browser mein). Login customer ka cart server par rahe.

**Files:** naya `src/utils/guestCart.js`, `src/components/ProductCard.js`, `src/components/Navbar.js`, `src/app/(customer)/cart/page.js`  
Checkout mat chhedo.

### guestCart.js

`localStorage` key: `guestCart`

Shape:

```json
{
  "storeId": "<store _id>",
  "storeName": "<store name>",
  "items": [
    {
      "productId": "<product.id>",
      "name": "",
      "unit": "",
      "qty": 1,
      "pricePaise": 0,
      "stock": 0
    }
  ]
}
```

Functions:

- `getGuestCart()`
- `addGuestItem({ storeId, storeName, product })` qty +1. Stock se zyada par error throw. Doosri `storeId` ho to error: `Cart is for one store only. Clear cart first.`
- `setGuestQty(productId, qty)` qty `0` par item hatao. Items khali hon to key hata do.
- `clearGuestCart()`
- `guestItemCount()`

`pricePaise` = `product.sellingPricePaise`. Yeh sirf guest UI ke liye hai. Server ko price mat bhejna (Phase 5).

### ProductCard

- Token nahi: `addGuestItem`. Success text `Added`.
- Token hai aur role `customer`: pehle jaisa `POST /cart/items` `{ productId, storeId, qty: 1 }`.
- Role `admin` ya `delivery_partner` is page par aayenge hi nahi (layout redirect).

### Cart page

- Token + customer: pehle wala `GET /cart`, PATCH qty. Empty ho to home link.
- Token nahi: `getGuestCart()`. Plus/minus `setGuestQty`. Total = items ke `pricePaise * qty` ka sum, `formatRupees`.
- Checkout button:
  - customer token + items > 0 → `/checkout`
  - guest + items > 0 → `/login?next=/checkout`
- Navbar par count: guest ho to `guestItemCount()`, customer ho to optional (cart page par dikhega; navbar ke liye customer count `GET /cart` se `items.length` ek baar).

**Test**

1. Incognito, Add, `/cart` par item, refresh ke baad bhi rahe.
2. Qty 0 → item gayab.
3. Checkout → `/login?next=/checkout`
4. Customer login (Phase 2 reload) ke baad Add → Network `POST /api/cart/items` 200. Guest key alag hai; server cart alag hai. Merge Phase 5 karega.

---

## Phase 5 — Checkout sirf customer, guest cart server par sync

**Goal:** Order tabhi jab customer login ho. Guest items login ke baad server cart ban jayein.

**Files:** `src/app/(customer)/checkout/page.js`, `src/app/login/page.js` (sirf itna: customer login ke baad, `next` se pehle sync)  
Naya backend mat likho.

### Sync (login success, role customer, `guestCart` items hon)

Har item ke liye:

```text
POST /cart/items
{ productId, storeId, qty }
```

`storeId` guest cart ka. Price mat bhejo.  
Ek item fail ho (stock) to error dikhao, baaki try karte raho, phir `clearGuestCart()` sirf jo sync ho gaye unke liye. Simple rule: **saari lines success** hon to clear, warna guest cart rehne do aur `message` dikhao, `next` par mat jao.

Phir `window.location.assign(next || '/')`.

### Checkout page

- `getToken()` khali ya role `customer` nahi → `window.location.assign('/login?next=/checkout')`
- Pehle wala flow rakho:
  1. `GET /addresses`, pehli ya `isDefault` select
  2. `AddressForm` se `POST /addresses` `{ label, line1, city, state, pincode, lat, lng }`
  3. Payment `cod` ya `online` (capital COD mat)
  4. `POST /orders` `{ addressId, paymentMethod }`
  5. online ho to `POST /payments/online/mock-success` `{ orderId: order._id }`
  6. `window.location.assign('/order/' + order._id)`
- Screen par cart summary dikhao: `GET /cart` se items, `itemTotalPaise`, delivery fee rule (19900 se kam par 2900), grand total. Yeh UI math hai; order ki asli total server `pricing.grandTotal` hai.

**Test**

1. Guest 1 item add → login `7777777777` → `/checkout` par wahi item server cart mein.
2. COD → order `confirmed`, cart empty.
3. Online → mock-success ke baad `paymentStatus: paid`.
4. Bina address checkout disable.

---

## Phase 6 — Customer orders: cancel, fee, ETA

**Goal:** Maujood order pages par missing cheezein. Nayi API nahi.

**Files:** `src/app/(customer)/orders/page.js`, `src/app/(customer)/order/[id]/page.js`  
`src/app/(customer)/layout.js`: `/orders` aur `/order/` bina customer token ke `/login?next=<current path>`.

### List `GET /orders`

Row: `orderNumber`, `StatusBadge`, `formatRupees(pricing.grandTotal)`, link `/order/${_id}`.

### Detail `GET /orders/:id`

Dikhao: status, `paymentMethod`, `paymentStatus`, items, `addressSnapshot`, `pricing.itemTotal`, `pricing.deliveryFee`, `pricing.grandTotal`, `etaMinutes`.

Socket pehle se hai: `join:order`, `order:status`, `order:assigned`. Hardcoded status mat likho. Initial status API se.

### Cancel

Button sirf jab status `pending` ya `confirmed`.  
`POST /orders/:id/cancel`  
Success par status `cancelled`. Baad ke status par button chhupao. Error `message` dikhao (`Order cannot be cancelled at this stage`).

**Test:** Nayi COD order cancel → status cancelled, button gayab. Delivered/assigned par button nahi. Dusre user ki id → `Access denied`.

---

## Phase 7 — Backend: admin riders, products, assign

**Goal:** Jo routes frontend ko chahiye, woh mount hon. Frontend is phase mein mat likho.

**Files only:**

- `backend-core/src/routes/admin.routes.js`
- `backend-core/src/controllers/rider.controller.js` (`adminAssignRider` ke andar event)
- naya chhota controller ya existing catalog/store controller mein 2 handlers — kam files. Prefer:
  - riders list: `rider.controller.js` mein `listRiders`
  - products list: `catalog.controller.js` + `catalog.service.js` mein `listAllProducts`

`router.use(protect, allowRoles('admin'))` pehle se admin router par hai. Naye routes usi router par.

### 1. GET `/api/admin/riders`

`User.find({ role: 'delivery_partner' }).select('name phone rider.isOnline')`  
`data`: array of `{ _id, name, phone, rider: { isOnline } }`  
Password hash response mein mat aane do (`select`).

### 2. GET `/api/admin/products`

Saare products, inventory filter **nahi**.  
`data`: array `{ _id, name, slug, unit, mrpPaise, category }`  
Category populate `name`. Customer wala `GET /catalog/products` mat badlo (woh storeId maangta hai).

### 3. POST `/api/admin/orders/:id/assign`

Body `{ riderId }`.  
Existing `adminAssignRider` use karo:

- order na mile → error
- `order.rider = riderId`
- `order.status = 'assigned'`
- statusHistory note: `Manually assigned by admin`
- save

**Add** save ke baad, wahi `publishEvent` jo `rider.service.js` auto-assign mein karta hai:

```text
publishEvent({
  type: 'order:assigned',
  orderId: order._id,
  userId: order.user,
  riderId,
  status: 'assigned'
})
```

Route:

```text
POST /admin/orders/:id/assign
```

**Test (Postman ya curl, admin token):**

1. Customer token se `GET /admin/riders` → 403
2. Admin token → rider `8888888888` ka `_id` list mein
3. `GET /admin/products` → products bina inventory ke bhi
4. Kisi confirmed order par assign → status `assigned`
5. socket-service log mein event. Customer track page (login reload ke baad) bina refresh `assigned` dikhaye

---

## Phase 8 — Admin orders: asli rider assign

**Goal:** Assign button 404 na de. Rider id paste ki jagah dropdown.

**File:** `src/app/admin/orders/page.js` only.

### Calls

- List: `GET /orders` (admin token). **`GET /admin/orders` mat likho**, woh route nahi hai.
- Riders: `GET /admin/riders`
- Assign: `POST /admin/orders/${order._id}/assign` body `{ riderId }`

Table columns: `orderNumber`, `user.name`, `StatusBadge`, `paymentMethod`, `paymentStatus`, `formatRupees(pricing.grandTotal)`, rider `rider.name` ya `none`, dropdown + Assign.

Dropdown: rider `name` + phone. Value = `_id`. Khali submit par alert. Success par list dubara `GET /orders`.

**Test:** Admin `9999999999`. Customer order dikhe. Seed rider choose → status `assigned`, rider name column mein aaye. Customer `/order/:id` par socket se status badle (socket-service up).

---

## Phase 9 — Admin products list + inventory dropdown

**Goal:** Product id copy-paste khatam.

**Files:** `src/app/admin/products/page.js`, `src/app/admin/inventory/page.js`  
Create forms jo pehle se hain, unhe mat todo.

### Products page

Upar ke 2 forms rehne do (category `POST /admin/categories`, product `POST /admin/products`).  
Neeche list: `GET /admin/products`.  
Columns: name, slug, unit, `formatRupees(mrpPaise)`, category name, aur `_id` chhota text (copy ke liye). Create ke baad list refresh.

`mrpPaise` form se: rupee input × 100, `Math.round`.

### Inventory page

- Stores: `GET /admin/stores` dropdown (pehle se hai)
- Products: `GET /admin/products` dropdown, label `name + unit`, value `_id`
- `PUT /admin/inventory` `{ storeId, productId, stock, sellingPricePaise }`
- Selling price rupee input × 100

Customer home par product **tabhi** dikhega jab is store ki inventory save ho.

**Test:** Category + product create → list mein `_id`. Inventory us product par stock 10, price 18 rupee. Customer home (us store ki location) par product ₹18.00 aur stock.

---

## Phase 10 — Admin dashboard

**Goal:** Counts clickable hon. Nayi stats API mat banao.

**File:** `src/app/admin/page.js`

Parallel:

- `GET /admin/stores` → length
- `GET /admin/products` → length
- `GET /admin/riders` → length, aur `rider.isOnline === true` count
- `GET /orders` → length, `status === 'confirmed'`, `status === 'assigned'`, `status === 'delivered'` filter

Cards: Stores, Products, Riders (online/total), Orders. Links: `/admin/stores`, `/admin/products`, `/admin/orders`.

**Test:** Store ya order banao, refresh par count badhe.

---

## Phase 11 — Rider web shell

**Goal:** Rider login ke baad khali 404 nahi. Online aur location.

**Naye files:**

- `src/components/RiderSidebar.js`
- `src/app/rider/layout.js`
- `src/app/rider/page.js`

Customer aur admin files mat likho.

### layout.js

`'use client'`. `getToken()` khali ya `getRole() !== 'delivery_partner'` → `/login`.  
Sidebar + children.

### RiderSidebar links

- `/rider` Home
- `/rider/assignments` Assignments (page Phase 12)
- Logout → `logout()` + `window.location.assign('/login')`

### Home page

`GET /auth/me` se naam aur `rider.isOnline` dikhao (profile mein rider object hai).

1. Toggle: `PATCH /rider/online` `{ isOnline: boolean }`
2. Location button: `navigator.geolocation`. Na mile to error, Delhi fallback **mat** chupke bhejo. Rider ko pata ho galat location assign bigadegi.
3. `PATCH /rider/location` `{ lat, lng }`
4. Last lat/lng screen par dikhao.

**Test**

1. Customer se `/rider` → `/login`
2. `8888888888` / `Rider@123` → rider home, navbar customer wala nahi
3. Network: `PATCH /api/rider/online`, phir `PATCH /api/rider/location`
4. Admin `/admin/riders` (Phase 7) mein `isOnline` badle

---

## Phase 12 — Rider assignments + status

**Goal:** Rider apni orders dekhe aur agli status lagaye. Customer track page live update ho.

**Naye files:**

- `src/app/rider/assignments/page.js`
- `src/app/rider/orders/[id]/page.js`

### List

`GET /rider/assignments`  
Card: `orderNumber`, `StatusBadge`, address `addressSnapshot.line1` + city, `formatRupees(pricing.grandTotal)`, link `/rider/orders/${_id}`

Socket: `useSocket()`. `order:assigned` aaye aur `payload.riderId` current user id se match ho to list dubara fetch. User id `getUser().id`.

### Detail

`GET /orders/:id`  
Items, address, payment, grand total, status.

Ek button, **sirf next status**:

| Abhi | Button bheje |
|---|---|
| assigned | `accepted` |
| accepted | `packed` |
| packed | `picked_up` |
| picked_up | `on_the_way` |
| on_the_way | `delivered` |
| delivered | koi button nahi |

`POST /rider/orders/${id}/status` `{ status }`  
Success par local order status update. Error `message` dikhao.

Socket `order:status`: `payload.orderId === id` ho to status update (customer page jaisa). `join:order` bhi emit karo.

**Test**

1. Admin Phase 8 se is rider ko order assign kare. Rider assignments mein dikhe, refresh ke bina (socket).
2. Accepted → packed → picked_up → on_the_way → delivered, isi order mein. Beech se skip → error.
3. Customer `/order/:id` par badge bina refresh badle.
4. Delivered order assignments list se hat jaye (API delivered nahi bhejti).

---

## Phase order (skip mat karo)

```text
1  Tailwind
2  Login redirect + socket reload
3  Guest home + navbar
4  Guest cart
5  Checkout sync
6  Order cancel + fee + ETA
7  Backend admin riders, products, assign
8  Admin assign UI
9  Admin product list + inventory dropdown
10 Admin dashboard counts
11 Rider shell online + location
12 Rider assignments + status
```

Har phase ke baad khud 4 jawab likho:

1. Is phase ki API kaunsi hai?
2. Token aur role kya chahiye?
3. UI ne `data` ki kaunsi key padhi?
4. Fail par `message` kahan dikhega?

---

## Gemini se ek phase mangne ka message

```text
web-frontend/WEB_BUILD_PHASES.md padho.
Sirf PHASE <number> implement karo.
Us phase ki listed files ka full code do.
Jo file list mein nahi, use mat chhedo.
Agla phase mat likho.
Har file ke baad Hindi+English mein batao:
- API URL, method, body
- response data ki keys
- click se screen tak data ka rasta
- 3 galat faisle jo is phase mein log karte hain
```
