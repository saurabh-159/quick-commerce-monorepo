import json
import logging
import math
import os
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph
from openai import OpenAI

from app.services.db_tools import (
    get_category_products_sync,
    get_nearby_stores_sync,
    get_store_categories_sync,
    list_active_products_sync,
    resolve_category_sync,
    sync_db,
)
from app.services.embedding_service import (
    generate_embedding,
    get_cached_product_embedding,
)

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# ----------------------------------------------------
# Fallback Card Images
# ----------------------------------------------------
DEFAULT_CATEGORY_ART = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
DEFAULT_STORE_ART = "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80"
DEFAULT_PRODUCT_ART = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80"


def _first_image(*candidates) -> str:
    for value in candidates:
        if isinstance(value, list) and value:
            first = value[0]
            if isinstance(first, str) and first.strip():
                return first.strip()
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def category_card_image(cat: Dict[str, Any]) -> str:
    return _first_image(cat.get("image"), cat.get("images")) or DEFAULT_CATEGORY_ART


def store_card_image(store: Dict[str, Any]) -> str:
    return _first_image(store.get("image"), store.get("images")) or DEFAULT_STORE_ART


def product_card_image(product: Dict[str, Any]) -> str:
    return _first_image(product.get("image"), product.get("images")) or DEFAULT_PRODUCT_ART


def _product_price_paise(product: Dict[str, Any], store_id: str = "") -> int:
    for key in ("sellingPricePaise", "price_paise", "pricePaise"):
        if product.get(key) is not None:
            try:
                return int(product.get(key))
            except (TypeError, ValueError):
                pass
    price = product.get("price") or product.get("price_rupees")
    if price is not None:
        try:
            return int(round(float(price) * 100))
        except (TypeError, ValueError):
            pass
    if store_id:
        try:
            from bson import ObjectId

            inv = sync_db.inventories.find_one(
                {"store": ObjectId(store_id), "product": ObjectId(str(product.get("_id") or product.get("product_id") or ""))}
            )
            if inv and inv.get("sellingPricePaise") is not None:
                return int(inv["sellingPricePaise"])
        except Exception:
            pass
    return 0


def _product_stock(product: Dict[str, Any], store_id: str = "") -> int:
    if product.get("stock") is not None:
        try:
            return int(product.get("stock"))
        except (TypeError, ValueError):
            pass
    if store_id:
        try:
            from bson import ObjectId

            inv = sync_db.inventories.find_one(
                {"store": ObjectId(store_id), "product": ObjectId(str(product.get("_id") or product.get("product_id") or ""))}
            )
            if inv and inv.get("stock") is not None:
                return int(inv["stock"])
        except Exception:
            pass
    return 99


def build_product_card(product: Dict[str, Any], store_id: str, store_name: str = "", store_eta: int = 15) -> Dict[str, Any]:
    pid = str(product.get("_id") or product.get("product_id") or "")
    price_paise = _product_price_paise(product, store_id)
    stock = _product_stock(product, store_id)
    unit = product.get("unit") or ""
    name = product.get("name") or "Product"
    price_label = f"₹{price_paise / 100:.0f}" if price_paise else None
    return {
        "type": "product",
        "id": pid,
        "title": name,
        "subtitle": f"Delivers in ~{store_eta} mins ({store_name or 'Store'})",
        "meta": price_label,
        "href": f"/store/{store_id}/product/{pid}",
        "store_id": store_id,
        "store_name": store_name or "",
        "image": product_card_image(product),
        "price_paise": price_paise,
        "unit": unit,
        "stock": stock,
    }


# ----------------------------------------------------
# Distance & Similarity Math
# ----------------------------------------------------
def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_eta_minutes(distance_km: float) -> int:
    if distance_km <= 2.0:
        return 10
    elif distance_km <= 5.0:
        return 20
    else:
        return min(45, int(15 + (distance_km * 4)))


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if not mag1 or not mag2:
        return 0.0
    return dot / (mag1 * mag2)


# ----------------------------------------------------
# LangGraph State Definition
# ----------------------------------------------------
class AssistantState(TypedDict):
    query: str
    lat: Optional[float]
    lng: Optional[float]
    tool_calls: List[Dict[str, Any]]
    direct_answer: str
    tool_result: Any
    cards: List[Dict[str, Any]]
    answer: str
    tools_used: List[str]


# ----------------------------------------------------
# Phase 1: Autonomous Tools Definition
# ----------------------------------------------------
CATALOG_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_nearest_store_only",
            "description": "Jab user specifically puche 'sabse paas wali dukaan', 'nearest store' ya 'closest dark store'.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_all_nearby_stores",
            "description": "Jab user aas-paas ke saare stores dekhna chahta ho ('nearby stores', 'paas ke stores dikhao').",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_specific_store_info",
            "description": "Jab user kisi specific store/area ke baare me puche (e.g., 'janakpuri store ke baare mein batao', 'rajouri garden store').",
            "parameters": {
                "type": "object",
                "properties": {
                    "store_name": {
                        "type": "string",
                        "description": "Store ya area ka naam (e.g. janakpuri, rajouri garden, saket).",
                    }
                },
                "required": ["store_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_category_details",
            "description": "Jab user kisi category ke baare me puche ya us category ke items/products maange (e.g. 'fruits kaun kaun se hai', 'pet category', 'medical category do', 'snacks dikhao', 'doodh category').",
            "parameters": {
                "type": "object",
                "properties": {
                    "category_slug": {
                        "type": "string",
                        "description": "Exact category slug: 'dairy-bread-eggs', 'fresh-vegetables-fruits', 'snacks-munchies', 'cold-drinks-juices', 'pharmacy-doctor-care', 'pet-animal-care', 'personal-care-hygiene', 'cleaning-household', ya 'all' agar saari dekhni ho.",
                    },
                    "fetch_products": {
                        "type": "boolean",
                        "description": "Set TRUE agar user category ke andar ke products/items dekhna chahta hai (e.g. 'fruits kaun se hai', 'snacks dikhao', 'medicines kya hai'). Agar user sirf category ka overview maange toh False.",
                    },
                    "target_store": {
                        "type": "string",
                        "description": "Agar kisi specific store ka naam mention ho, warna null.",
                    },
                },
                "required": ["category_slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_catalog_products",
            "description": "Jab user specific product, food item, problem-based item maange (e.g., 'crocin', 'doodh', 'chips', 'dog food', 'sar dard ki dawa').",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_query": {
                        "type": "string",
                        "description": "Search term cleaned (e.g. 'chips', 'milk', 'paracetamol', 'pet food').",
                    },
                    "target_store": {
                        "type": "string",
                        "description": "Agar specific store bola ho, warna null.",
                    },
                },
                "required": ["product_query"],
            },
        },
    },
]

SYSTEM_PROMPT = """
Aap ek ultra-smart, polite aur proactive Quick Commerce Sales Assistant hain.
User ki raw query, Hinglish bhasha, spelling mistakes (typos), aur ajeeb/confusing sawalon ko samajh kar sahi decision lijiye.

HUMARE CATALOG ME STRICTLY YAHI 8 CATEGORIES AVAILABLE HAIN:
1. 'dairy-bread-eggs': Milk, Doodh, Curd, Dahi, Butter, Makhan, Eggs, Anda, Paneer, Brown Bread
2. 'fresh-vegetables-fruits': Sabzi, Fruits, Fal, Tamatar, Tomato, Aloo, Potato, Pyaz, Onion, Kela, Banana, Seb, Apple, Dhaniya
3. 'snacks-munchies': Chips, Lays, Kurkure, Bhujia, Sev, Chocolate, Dairy Milk Silk, Popcorn, Namkeen, Munchies
4. 'cold-drinks-juices': Cold drink, Coke, Coca-Cola Zero, Real Fruit Juice, Bisleri Water, Paani, Red Bull[cite: 2]
5. 'pharmacy-doctor-care': Medical, Medicine, Dawa, Dettol, Crocin, Paracetamol, Sar dard, Pain relief, Volini spray, Hansaplast bandage, Vicks, Chyawanprash, Thermometer[cite: 2]
6. 'pet-animal-care': Pet, Kutta, Billi, Dog food, Cat food, Pedigree, Whiskas, Dog treats, Calcium bone, Cat litter, Pet shampoo[cite: 2]
7. 'personal-care-hygiene': Toothpaste, Colgate, Soap, Sabun, Dove, Shampoo, Head & Shoulders, Sanitary pads, Whisper[cite: 2]
8. 'cleaning-household': Bartan dhona, Vim gel, Surf Excel liquid, Detergent, Lizol, Floor cleaner, Odonil room/bathroom freshener[cite: 2]

======================================================================
STRICT DECISION RULES (PRIORITY ORDER)
======================================================================

RULE 1: STORE + CATEGORY QUERY (HIGHEST PRIORITY)
- Agar user kisi store ka naam aur category ek sath maange (e.g. 'rohini store ki category do', 'janakpuri dark store ki categories dikhao', 'saket store me kya categories hain')[cite: 2]:
  -> HAMESHA call karein: get_category_details(category_slug="all", fetch_products=False, target_store="<store_name>")[cite: 2].
  -> FORBIDDEN: Kabhi bhi 'get_specific_store_info' call MAT karein jab category puchi gayi ho.

RULE 2: CATEGORY KE ITEMS / PRODUCTS MANGA HO
- Agar user kisi category ke andar ke items/products dekhna chahe (e.g. 'fruits kaun kaun se hai', 'pet food kya hai', 'medical ki dawayi dikhao', 'snacks dikhao', 'sabzi kya kya hai')[cite: 2]:
  -> HAMESHA call karein: get_category_details(category_slug="<slug>", fetch_products=True, target_store="<store_name_if_any>")[cite: 2].
  -> Output me direct items (Shimla Apple, Banana, Crocin, Pedigree) ke product cards aane chahiye[cite: 2].

RULE 3: PROBLEM-BASED & MOOD QUERIES (NO DIRECT PRODUCT NAME)
- User aksar product ka naam nahi leta, bas apni problem batata hai:
  * "sar dard ho raha hai" / "chot lag gayi" -> search_catalog_products(product_query="crocin paracetamol pain relief")[cite: 2]
  * "pet kharab hai" / "halka khana" -> search_catalog_products(product_query="curd dahi")[cite: 2]
  * "shaam ki chai ke sath kya lu" / "chai nashta" -> search_catalog_products(product_query="rusk biscuits namkeen snacks")[cite: 2]
  * "ghar me pocha lagana hai" / "safai ka saman" -> search_catalog_products(product_query="lizol floor cleaner")[cite: 2]
  * "party karni hai dosto ke sath" -> search_catalog_products(product_query="chips cold drink snacks")[cite: 2]

RULE 4: SPECIFIC PRODUCT YA BRAND SEARCH (WITH TYPOS & QUANTITY)
- User typing mistake kare ya desi word bole, clean search term use karein:
  * 'dhoodh', '1 ltr milk', 'amul doodh' -> search_catalog_products(product_query="milk")[cite: 2]
  * 'chpis', 'cooldrnk', 'lays' -> search_catalog_products(product_query="chips")[cite: 2]
  * 'tamatar pyaz', 'aloo', 'kela' -> search_catalog_products(product_query="tomato onion potato banana")[cite: 2]
  * Agar user bole 'Paschim vihar se cold drink bhej do' -> search_catalog_products(product_query="cold drink", target_store="paschim vihar")[cite: 2]

RULE 5: PURE STORE LOCATION / DISTANCE QUERIES
- 'mera sabse paas wala store kaun sa hai' / 'nearest store' -> get_nearest_store_only().
- 'aas paas ke saare stores dikhao' / 'nearby stores list' -> list_all_nearby_stores().
- Sirf store ke baare me puchna (bina category/product ke), e.g. 'janakpuri store ke baare mein batao', 'saket store kitna dur hai'[cite: 2] -> get_specific_store_info(store_name="janakpuri")[cite: 2].

RULE 6: OUT-OF-SCOPE / PROHIBITED ITEMS (STRICT NO TOOL CALL)
- Hum ye deliver NAHI karte:
  * Footwear: Hawai chappal, Joote, Shoes, Sandals, Slippers[cite: 2]
  * Clothing/Fashion: Shirt, Pant, T-shirt, Kurta, Jeans, Kapde[cite: 2]
  * Electronics: Mobile phone, iPhone, Charger, Earphones, Laptop[cite: 2]
  * Alcohol/Cigarettes: Beer, Whiskey, Daaru, Cigarette[cite: 2]
- REACTION: KOI TOOL CALL MAT KAREIN.
  Seedha polite Hinglish text me mana karein:
  "Sorry! Hum abhi <item_name> deliver nahi karte. Hamare paas Fresh Grocery, Daily Essentials, Snacks aur Pharmacy products 10-20 mins me available hain. Kya aap inme se kuch order karna chahenge?"

RULE 7: CASUAL CHAT & SHOPPING REDIRECT (NO TOOL CALL)
- Agar user bole 'Hi', 'Hello', 'Kaise ho', 'Kya chal raha hai', 'Bore ho raha hu':
  -> KOI TOOL CALL MAT KAREIN.
  -> 1-2 line me friendly greeting dein aur shopping redirect karein:
     "Hey! Main aapka shopping assistant hoon. Aaj snacks, cold drinks ya kitchen ke essentials me se kya mangwana chahenge? 😊"[cite: 1]

RULE 8: COMPETITOR OR PRICE ARGUMENTS (NO TOOL CALL)
- User bole 'Blinkit/Zepto pe toh sasta hai' ya 'delivery charge kitna hai':
  -> Polite Hinglish me reassure karein ki hamare paas best quality, direct partner stores se fastest 10-20 minute delivery milti hai[cite: 2].
"""


# ----------------------------------------------------
# Phase 2: Agent LLM Decision Node
# ----------------------------------------------------
def agent_decision_node(state: AssistantState) -> Dict[str, Any]:
    raw_query = state.get("query") or ""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": raw_query},
            ],
            tools=CATALOG_TOOLS_SCHEMA,
            tool_choice="auto",
            temperature=0.1,
            timeout=8.0,
        )
        choice = response.choices[0].message
        tool_calls = []
        if choice.tool_calls:
            for tc in choice.tool_calls:
                tool_calls.append(
                    {
                        "name": tc.function.name,
                        "arguments": json.loads(tc.function.arguments or "{}"),
                    }
                )

        direct_answer = choice.content or ""
    except Exception:
        logging.exception("assistant model call failed")
        tool_calls = []
        direct_answer = "Main aapki shopping me help karne ke liye yahan hoon! Aapko Grocery, Snacks, ya Pharmacy me se kya chahiye?"

    return {
        "tool_calls": tool_calls,
        "direct_answer": direct_answer,
    }


# ----------------------------------------------------
# Phase 3: Tool Execution Node (Mongo & Real Data)
# ----------------------------------------------------
def tool_execution_node(state: AssistantState) -> Dict[str, Any]:
    tool_calls = state.get("tool_calls") or []
    lat = state.get("lat")
    lng = state.get("lng")

    if not tool_calls:
        return {"tool_result": None, "cards": [], "tools_used": []}

    tc = tool_calls[0]
    func_name = tc.get("name")
    args = tc.get("arguments") or {}

    # Nearby stores calculate karein
    stores = []
    if lat is not None and lng is not None:
        try:
            nearby_raw = get_nearby_stores_sync(lat=lat, lng=lng, limit=8)
            nearby_res = json.loads(nearby_raw) if isinstance(nearby_raw, str) else nearby_raw
            stores = nearby_res.get("nearby") or nearby_res.get("stores") or []
        except Exception:
            stores = []

    for s in stores:
        dist = s.get("distance_km")
        if dist is None:
            s_loc = (s.get("location") or {}).get("coordinates") or []
            if len(s_loc) >= 2 and lat is not None and lng is not None:
                dist = calculate_distance_km(lat, lng, s_loc[1], s_loc[0])
                s["distance_km"] = round(dist, 1)
            else:
                dist = 2.0
                s["distance_km"] = dist
        s["eta_minutes"] = get_eta_minutes(float(dist))

    stores.sort(key=lambda x: x.get("distance_km", 999))
    primary_store = stores[0] if stores else None

    cards = []
    tool_result_data = None

    # Tool 1: Nearest Store Only
    if func_name == "get_nearest_store_only":
        if primary_store:
            sid = str(primary_store.get("store_id") or primary_store.get("_id") or "")
            cards.append(
                {
                    "type": "store",
                    "id": sid,
                    "title": primary_store.get("name", "Store"),
                    "subtitle": f"{primary_store.get('eta_minutes')} mins delivery ({primary_store.get('distance_km')} km)",
                    "meta": f"{primary_store.get('distance_km')} km",
                    "href": f"/store/{sid}",
                    "store_id": sid,
                    "image": store_card_image(primary_store),
                }
            )
        tool_result_data = {"nearest_store": primary_store}

    # Tool 2: List All Nearby Stores
    elif func_name == "list_all_nearby_stores":
        for s in stores[:4]:
            sid = str(s.get("store_id") or s.get("_id") or "")
            cards.append(
                {
                    "type": "store",
                    "id": sid,
                    "title": s.get("name", "Store"),
                    "subtitle": f"{s.get('eta_minutes')} mins delivery ({s.get('distance_km')} km)",
                    "meta": f"{s.get('distance_km')} km",
                    "href": f"/store/{sid}",
                    "store_id": sid,
                    "image": store_card_image(s),
                }
            )
        tool_result_data = {"stores": stores[:4]}

    # Tool 3: Specific Store Info
    elif func_name == "get_specific_store_info":
        target = (args.get("store_name") or "").lower()
        matched = next((s for s in stores if target in s.get("name", "").lower()), primary_store)
        if matched:
            sid = str(matched.get("store_id") or matched.get("_id") or "")
            cards.append(
                {
                    "type": "store",
                    "id": sid,
                    "title": matched.get("name", "Store"),
                    "subtitle": f"{matched.get('eta_minutes')} mins delivery ({matched.get('distance_km')} km)",
                    "meta": f"{matched.get('distance_km')} km",
                    "href": f"/store/{sid}",
                    "store_id": sid,
                    "image": store_card_image(matched),
                }
            )
        tool_result_data = {"matched_store": matched}

    # Tool 4: Category Details & Products
    elif func_name == "get_category_details":
        slug = args.get("category_slug")
        fetch_prods = args.get("fetch_products", False)
        target_store_name = (args.get("target_store") or "").lower()
        store_to_use = primary_store
        if target_store_name and stores:
            store_to_use = next((s for s in stores if target_store_name in s.get("name", "").lower()), primary_store)

        store_id = str(store_to_use.get("store_id") or store_to_use.get("_id") or "") if store_to_use else ""
        store_eta = store_to_use.get("eta_minutes", 15) if store_to_use else 15
        categories = []

        if store_id:
            try:
                cat_raw = get_store_categories_sync(store_id)
                cat_res = json.loads(cat_raw) if isinstance(cat_raw, str) else cat_raw
                categories = cat_res.get("categories") or []
            except Exception:
                categories = []

        # Exact slug filter
        matched_cat = None
        if slug and slug != "all":
            for c in categories:
                if slug.lower() in (c.get("slug") or "").lower():
                    matched_cat = c
                    break

        # A) User wants actual PRODUCTS inside category (e.g. "fruits kaun se hai")
        if fetch_prods and matched_cat and store_id:
            cat_id = str(matched_cat.get("_id") or matched_cat.get("category_id") or "")
            prod_list = []
            try:
                prod_raw = get_category_products_sync(store_id=store_id, category=cat_id, limit=8)
                prod_res = json.loads(prod_raw) if isinstance(prod_raw, str) else prod_raw
                prod_list = prod_res.get("products") or []
            except Exception:
                prod_list = []

            store_name = store_to_use.get("name", "Store") if store_to_use else "Store"
            for p in prod_list:
                cards.append(build_product_card(p, store_id, store_name=store_name, store_eta=store_eta))

            tool_result_data = {
                "category_name": matched_cat.get("name"),
                "store_name": store_to_use.get("name") if store_to_use else "Partner Store",
                "products": [p.get("name") for p in prod_list],
                "product_count": len(prod_list),
            }

        # B) User wants Category Card (e.g. "medical category do")
        else:
            cats_to_display = [matched_cat] if matched_cat else categories
            for cat in cats_to_display:
                if not cat:
                    continue
                cid = str(cat.get("_id") or cat.get("category_id") or "")
                name = cat.get("name", "Category")
                c_slug = cat.get("slug") or name.lower().replace(" ", "-")
                cards.append(
                    {
                        "type": "category",
                        "id": cid,
                        "title": name,
                        "subtitle": f"{cat.get('product_count', 0)} items",
                        "href": f"/store/{store_id}?category={c_slug}",
                        "store_id": store_id,
                        "image": category_card_image(cat),
                    }
                )

            tool_result_data = {
                "store_name": store_to_use.get("name") if store_to_use else "Partner Store",
                "categories": [c.get("name") for c in cats_to_display if c],
            }

    # Tool 5: Search Products (by query)
    elif func_name == "search_catalog_products":
        prod_query = args.get("product_query") or ""
        target_store_name = (args.get("target_store") or "").lower()
        source_store = primary_store
        if target_store_name and stores:
            source_store = next((s for s in stores if target_store_name in s.get("name", "").lower()), primary_store)

        found_prods = []
        try:
            query_filter = {"name": {"$regex": prod_query, "$options": "i"}, "isActive": True}
            mongo_prods = list(sync_db.products.find(query_filter).limit(6))
            for p in mongo_prods:
                p["_id"] = str(p["_id"])
                found_prods.append(p)
        except Exception:
            found_prods = []

        # Cosine Similarity Fallback with Safe Threshold
        if not found_prods:
            try:
                user_vector = generate_embedding(prod_query)
                all_active = list_active_products_sync()[:50]
                scored = []
                for item in all_active:
                    iid = str(item.get("_id") or item.get("product_id") or "")
                    ivec = get_cached_product_embedding(iid, item.get("name", ""))
                    if ivec:
                        scored.append((cosine_similarity(user_vector, ivec), item))
                scored.sort(key=lambda x: x[0], reverse=True)
                found_prods = [item for sc, item in scored[:4] if sc >= 0.70]
            except Exception:
                found_prods = []

        store_id = str(source_store.get("store_id") or source_store.get("_id") or "") if source_store else ""
        store_eta = source_store.get("eta_minutes", 15) if source_store else 15
        store_name = source_store.get("name") if source_store else "Store"
        for p in found_prods:
            cards.append(build_product_card(p, store_id, store_name=store_name or "Store", store_eta=store_eta))
        tool_result_data = {
            "query": prod_query,
            "store_name": source_store.get("name") if source_store else None,
            "found_count": len(found_prods),
            "products": [p.get("name") for p in found_prods],
        }

    return {
        "tool_result": tool_result_data,
        "cards": cards,
        "tools_used": [func_name],
    }


# ----------------------------------------------------
# Phase 4: Final Synthesis Node
# ----------------------------------------------------
def final_answer_node(state: AssistantState) -> Dict[str, Any]:
    tool_calls = state.get("tool_calls") or []
    direct_ans = state.get("direct_answer")
    tool_result = state.get("tool_result")
    query = state.get("query") or ""

    if not tool_calls:
        return {"answer": direct_ans}

  system_prompt = f"""
Aap Quick Commerce sales assistant hain. Aapka kaam hai backend se aaye real data ko user-friendly Hinglish bhasha me convert karna.

Context:
- User Query: '{query}'
- Backend Data: {json.dumps(tool_result, default=str)}

SCENARIO-BASED RULES:
1. SPECIFIC STORE KI CATEGORIES (Jab user ne store ki categories maangi hon):
   - Store ka naam lein aur available categories ke naam mention karein (jaise: "QuickStore Rohini me Dairy, Snacks, Vegetables aur Pharmacy categories available hain").
   - Puchein: "Aap kis category ke items dekhna chahenge?"

2. CATEGORY KE PRODUCTS (Jab fal, sabzi, ya snacks ke items aaye hon):
   - Broad category ka naam mat dohraiye. Direct 2-3 top items ke naam lijiye (e.g. "Hamare paas taaze Shimla Apple aur Robusta Banana available hain").
   - Delivery time mention karein aur puchein cart me kya add karna hai.

3. STORE DETAILS / NEAREST STORE (Jab store ki location/distance puchi ho):
   - Store ka naam, distance (e.g. 4.4 km) aur delivery time (ETA, e.g. 20 mins) saaf batayein.
   - Bilkul mat boliye ki "item out of stock hai" agar user ne koi saman manga hi nahi tha!

4. PRODUCT MIL GAYA (Direct search success):
   - Product ka naam aur delivery time highlight karein.

5. PRODUCT 0 MILA / OUT OF STOCK:
   - Saaf aur politely bataiye ki yeh item abhi stock me nahi hai, par similar daily essentials available hain.

GENERAL GUIDELINES:
- Tone: Friendly, short (maximum 2-3 lines), Hinglish.
- Kabhi bhi ek hi line me contradiction mat karein ("nahi hai lekin hai" jaisa bilkul nahi bolna).
- Har answer ko ek engaging shopping question ke sath end karein.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}],
            temperature=0.4,
            timeout=8.0,
        )
        answer = (response.choices[0].message.content or "").strip()
    except Exception:
        answer = "Aapke liye ye options available hain! Kya aap inme se kuch order karna chahenge?"

    return {"answer": answer}


# ----------------------------------------------------
# LangGraph Routing & Compile
# ----------------------------------------------------
def route_after_agent(state: AssistantState) -> str:
    if state.get("tool_calls"):
        return "tool_execution"
    return "final_answer"


def build_catalog_graph():
    workflow = StateGraph(AssistantState)
    workflow.add_node("agent_decision", agent_decision_node)
    workflow.add_node("tool_execution", tool_execution_node)
    workflow.add_node("final_answer", final_answer_node)

    workflow.add_edge(START, "agent_decision")
    workflow.add_conditional_edges(
        "agent_decision",
        route_after_agent,
        {
            "tool_execution": "tool_execution",
            "final_answer": "final_answer",
        },
    )
    workflow.add_edge("tool_execution", "final_answer")
    workflow.add_edge("final_answer", END)
    return workflow.compile()


_catalog_graph = build_catalog_graph()


def run_catalog_graph(
    query: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict:
    initial_state: AssistantState = {
        "query": query or "",
        "lat": lat,
        "lng": lng,
        "tool_calls": [],
        "direct_answer": "",
        "tool_result": None,
        "cards": [],
        "answer": "",
        "tools_used": [],
    }

    final_state = _catalog_graph.invoke(initial_state)
    tools_used = final_state.get("tools_used") or []

    return {
        "query": query or "",
        "answer": final_state.get("answer") or "",
        "cards": final_state.get("cards") or [],
        "tools_used": tools_used,
        "context_used": tools_used,
    }