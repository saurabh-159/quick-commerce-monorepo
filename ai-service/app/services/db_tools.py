import json
import math
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from app.config import settings

async_client = AsyncIOMotorClient(settings.MONGO_URI)
async_db = async_client.get_default_database()

sync_client = MongoClient(settings.MONGO_URI)
sync_db = sync_client.get_default_database()

FALLBACK_PRODUCTS = [
    {"product_id": "p1", "name": "Nike Sports Running Shoes for Gym", "category": "Footwear"},
    {"product_id": "p2", "name": "Fresh Organic Cow Milk 1L", "category": "Dairy"},
    {"product_id": "p3", "name": "Chocolate Ice Cream Family Pack", "category": "Desserts"},
    {"product_id": "p4", "name": "Comfortable Walking Sneakers", "category": "Footwear"},
]

async def get_live_product_stock_from_db(product_name: str) -> str:
    try:
        product = await async_db.products.find_one({"name": {"$regex": product_name, "$options": "i"}})
        if not product:
            return f"Sorry, '{product_name}' was not found in our catalog."

        inventory = await async_db.inventories.find_one({"product": product["_id"]})
        if not inventory:
            return f"Product '{product['name']}' is currently out of stock at all stores."

        stock = inventory.get("stock", 0)
        price = inventory.get("sellingPricePaise", 0) / 100
        return f"Product: {product['name']} | Stock Available: {stock} units | Price: ₹{price}"
    except Exception as e:
        return f"Database error while fetching inventory: {str(e)}"

def get_live_product_stock_sync(product_name: str) -> str:
    try:
        product = sync_db.products.find_one({"name": {"$regex": product_name, "$options": "i"}})
        if not product:
            return f"Sorry, '{product_name}' was not found in our catalog."

        inventory = sync_db.inventories.find_one({"product": product["_id"]})
        if not inventory:
            return f"Product '{product['name']}' is currently out of stock at all stores."

        stock = inventory.get("stock", 0)
        price = inventory.get("sellingPricePaise", 0) / 100
        return f"Product: {product['name']} | Stock Available: {stock} units | Price: ₹{price}"
    except Exception as e:
        return f"Database error while fetching inventory: {str(e)}"

def list_active_products_sync() -> list:
    try:
        products = []
        for doc in sync_db.products.find({"isActive": True}).limit(200):
            category_name = "General"
            cat_id = doc.get("category")
            if cat_id:
                cat = sync_db.categories.find_one({"_id": cat_id})
                if cat:
                    category_name = cat.get("name", "General")
            images = doc.get("images") or []
            products.append({
                "product_id": str(doc["_id"]),
                "name": doc.get("name", ""),
                "category": category_name,
                "image": images[0] if images else "",
                "images": images,
            })
        return products if products else FALLBACK_PRODUCTS
    except Exception as e:
        print(f"Mongo product list error: {e}")
        return FALLBACK_PRODUCTS

def get_order_by_number_sync(order_number: str):
    try:
        return sync_db.orders.find_one({"orderNumber": order_number})
    except Exception as e:
        print(f"Mongo order lookup error: {e}")
        return None

def get_latest_order_for_user_sync(user_id: str):
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None
    try:
        return sync_db.orders.find_one(
            {"user": oid, "status": {"$nin": ["delivered", "cancelled"]}},
            sort=[("createdAt", -1)],
        )
    except Exception as e:
        print(f"Mongo user order error: {e}")
        return None


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Do points ke beech distance (km). Backend geo.js jaisa."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_nearby_stores_sync(lat: float, lng: float, limit: int = 10) -> str:
    """
    User location se stores nikaalo.
    inRange = distance <= serviceRadiusKm AND store isOpen
    """
    try:
        stores = list(sync_db.stores.find({}))
        if not stores:
            return json.dumps({"count": 0, "nearby": [], "message": "No stores found"})

        cards = []
        for store in stores:
            coords = (store.get("location") or {}).get("coordinates") or []
            if len(coords) < 2:
                continue
            store_lng, store_lat = float(coords[0]), float(coords[1])
            distance = _haversine_km(float(lat), float(lng), store_lat, store_lng)
            radius = float(store.get("serviceRadiusKm") or 5)
            is_open = bool(store.get("isOpen", True))
            in_range = is_open and distance <= radius
            images = store.get("images") or []
            cards.append({
                "store_id": str(store["_id"]),
                "name": store.get("name", ""),
                "address": store.get("addressText", ""),
                "is_open": is_open,
                "distance_km": round(distance, 1),
                "service_radius_km": radius,
                "in_range": in_range,
                "image": images[0] if images else "",
            })

        cards.sort(key=lambda x: x["distance_km"])
        nearby = [c for c in cards if c["in_range"]][:limit]

        return json.dumps({
            "count": len(nearby),
            "nearby": nearby,
            "message": f"Found {len(nearby)} store(s) near you",
        })
    except Exception as e:
        return json.dumps({"error": f"nearby stores failed: {str(e)}"})


def resolve_store_id_sync(store_id: str = None, store_name: str = None, lat: float = None, lng: float = None) -> str:
    """
    store_id / name / nearest location se store resolve karo.
    """
    if store_id:
        try:
            oid = ObjectId(str(store_id).strip())
            store = sync_db.stores.find_one({"_id": oid})
            if store:
                return str(store["_id"])
        except Exception:
            pass

    if store_name and str(store_name).strip():
        name = str(store_name).strip()
        store = sync_db.stores.find_one({"name": {"$regex": name, "$options": "i"}})
        if store:
            return str(store["_id"])

    if lat is not None and lng is not None:
        nearby = json.loads(get_nearby_stores_sync(float(lat), float(lng), limit=1))
        rows = nearby.get("nearby") or []
        if rows:
            return rows[0].get("store_id")

    return ""


def get_store_categories_sync(store_id: str = None, store_name: str = None, lat: float = None, lng: float = None) -> str:
    """
    Ek store mein kaunsi categories hain jinke products inventory mein hain.
    """
    try:
        resolved = resolve_store_id_sync(store_id=store_id, store_name=store_name, lat=lat, lng=lng)
        if not resolved:
            return json.dumps({
                "error": "Store not found. Pass store_id, store_name, or lat/lng for nearest store."
            })

        store_oid = ObjectId(resolved)
        store = sync_db.stores.find_one({"_id": store_oid})
        if not store:
            return json.dumps({"error": "Store not found"})
        store_id = resolved

        inv_rows = list(sync_db.inventories.find({"store": store_oid, "stock": {"$gt": 0}}))
        product_ids = [row["product"] for row in inv_rows if row.get("product")]

        counts = {}  # category_id -> count
        for pid in product_ids:
            product = sync_db.products.find_one({"_id": pid, "isActive": True})
            if not product or not product.get("category"):
                continue
            cid = product["category"]
            counts[cid] = counts.get(cid, 0) + 1

        categories = []
        for cid, count in counts.items():
            cat = sync_db.categories.find_one({"_id": cid, "isActive": True})
            if not cat:
                continue
            images = cat.get("images") or []
            categories.append({
                "category_id": str(cat["_id"]),
                "name": cat.get("name", ""),
                "slug": cat.get("slug", ""),
                "product_count": count,
                "image": cat.get("imageUrl") or (images[0] if images else ""),
            })

        categories.sort(key=lambda x: x["name"])
        return json.dumps({
            "store_id": store_id,
            "store_name": store.get("name", ""),
            "category_count": len(categories),
            "categories": categories,
        })
    except Exception as e:
        return json.dumps({"error": f"store categories failed: {str(e)}"})


def _normalize_category_key(text: str) -> str:
    """fruits and vegetables / Fruits & Vegetables → fruitsvegetables"""
    t = (text or "").lower().strip()
    for token in ("&", " and ", " / ", "/", "-"):
        t = t.replace(token, " ")
    return "".join(ch for ch in t if ch.isalnum())


def resolve_category_sync(category: str):
    """
    Category id / slug / loose name match.
    'fruits and vegetables' → Fruits & Vegetables / fruits-vegetables
    """
    if not category or not str(category).strip():
        return None
    raw = str(category).strip()

    try:
        cat = sync_db.categories.find_one({"_id": ObjectId(raw)})
        if cat:
            return cat
    except Exception:
        pass

    slug_guess = raw.lower().replace("&", " ").replace(" and ", " ")
    slug_guess = "-".join(slug_guess.split())  # fruits-and-vegetables-ish → fruits-vegetables after cleanup
    slug_guess = slug_guess.replace("and-", "").replace("-and-", "-")

    cat = sync_db.categories.find_one({
        "$or": [
            {"slug": raw.lower()},
            {"slug": slug_guess},
            {"name": {"$regex": f"^{raw}$", "$options": "i"}},
        ]
    })
    if cat:
        return cat

    # Fuzzy: compare normalized keys against all active categories
    want = _normalize_category_key(raw)
    if not want:
        return None
    for doc in sync_db.categories.find({"isActive": True}):
        name_key = _normalize_category_key(doc.get("name", ""))
        slug_key = _normalize_category_key(doc.get("slug", ""))
        if want == name_key or want == slug_key:
            return doc
        # partial: "fruits" in "fruitsvegetables" or vice versa
        if want in name_key or name_key in want or want in slug_key or slug_key in want:
            return doc
    return None


def get_category_products_sync(
    store_id: str = None,
    category: str = "",
    limit: int = 20,
    store_name: str = None,
    lat: float = None,
    lng: float = None,
) -> str:
    """
    Store + category (id / slug / name) se products.
    Colour field schema mein nahi — brand/unit/highlights return karo.
    """
    try:
        resolved = resolve_store_id_sync(store_id=store_id, store_name=store_name, lat=lat, lng=lng)
        if not resolved:
            return json.dumps({
                "error": "Store not found. Pass store_id, store_name, or lat/lng for nearest store."
            })

        store_oid = ObjectId(resolved)
        store = sync_db.stores.find_one({"_id": store_oid})
        if not store:
            return json.dumps({"error": "Store not found"})
        store_id = resolved

        cat = resolve_category_sync(category)
        if not cat:
            return json.dumps({"error": f"Category '{category}' not found"})

        products_out = []
        inv_rows = list(sync_db.inventories.find({"store": store_oid}))
        for row in inv_rows:
            product = sync_db.products.find_one({
                "_id": row["product"],
                "category": cat["_id"],
                "isActive": True,
            })
            if not product:
                continue
            images = product.get("images") or []
            products_out.append({
                "product_id": str(product["_id"]),
                "name": product.get("name", ""),
                "brand": product.get("brand", ""),
                "unit": product.get("unit", ""),
                "highlights": product.get("highlights") or [],
                "description": (product.get("description") or "")[:120],
                "stock": row.get("stock", 0),
                "price_rupees": round((row.get("sellingPricePaise") or 0) / 100, 2),
                "image": images[0] if images else "",
                "images": images,
            })
            if len(products_out) >= limit:
                break

        return json.dumps({
            "store_id": store_id,
            "store_name": store.get("name", ""),
            "category": cat.get("name", ""),
            "product_count": len(products_out),
            "products": products_out,
        })
    except Exception as e:
        return json.dumps({"error": f"category products failed: {str(e)}"})