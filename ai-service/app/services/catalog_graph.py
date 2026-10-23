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

# Production default: gpt-4o (tool calling + Hinglish routing). Override via ASSISTANT_MODEL.
ASSISTANT_MODEL = os.environ.get("ASSISTANT_MODEL", "gpt-4o")

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
# Autonomous Tools Definition (OpenAI Function Schemas)
# ----------------------------------------------------
CATALOG_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_nearest_store_only",
            "description": "SIRF tab chalayein jab user specifically puche 'sabse paas wali dukaan', 'nearest store' ya 'closest dark store' bina kisi category ya product ke.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_all_nearby_stores",
            "description": "DEFAULT store-list tool. Call immediately for: 'Stores near me?', 'store near me', 'nearby stores', 'paas ke stores', 'aas paas stores', 'kitni dukaane hain'. Do NOT ask clarifying questions — just call this tool.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_specific_store_info",
            "description": "Jab user kisi specific store/area ke location, distance ya delivery time ke bare me puche (e.g., 'janakpuri store kitna dur hai', 'rajouri garden store kahan hai'). NOTE: Agar user us store ki CATEGORY ya PRODUCTS maange toh yeh tool KABHI call na karein.",
            "parameters": {
                "type": "object",
                "properties": {
                    "store_name": {
                        "type": "string",
                        "description": "Store area name (e.g. janakpuri, rohini, saket, rajouri garden).",
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
            "description": "Jab user kisi category ke baare me puche, category ke items maange, YA KISI SPECIFIC STORE KI CATEGORIES maange (e.g. 'rohini store ki category do', 'fruits kaun kaun se hai', 'pet category dikhao', 'medical category').",
            "parameters": {
                "type": "object",
                "properties": {
                    "category_slug": {
                        "type": "string",
                        "description": "Exact category slug: 'dairy-bread-eggs', 'fresh-vegetables-fruits', 'snacks-munchies', 'cold-drinks-juices', 'pharmacy-doctor-care', 'pet-animal-care', 'personal-care-hygiene', 'cleaning-household', ya 'all' agar store ki saari categories maangi hon.",
                    },
                    "fetch_products": {
                        "type": "boolean",
                        "description": "Set TRUE jab user category ke andar ke items/products dekhna chahta hai (e.g. 'fruits kaun kaun se hai', 'snacks me kya hai', 'medicines dikhao'). Set FALSE agar user sirf category dekhna chahe (e.g. 'rohini store ki categories do', 'medical category dikhao').",
                    },
                    "target_store": {
                        "type": "string",
                        "description": "Agar user ne kisi specific store/area ka naam bola ho (e.g. 'rohini', 'janakpuri'), warna null.",
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
            "description": "Jab user direct kisi specific product, brand, problem-based item, budget filter ya price sort ke sath saman maange (e.g. 'doodh', 'chips', 'crocin', 'sar dard ki dawa', 'sabse sasta doodh', 'snacks under 50').",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_query": {
                        "type": "string",
                        "description": "Cleaned search term (e.g. 'milk', 'chips', 'paracetamol', 'dog food', 'curd').",
                    },
                    "sort_by": {
                        "type": "string",
                        "enum": ["price_low_to_high", "price_high_to_low"],
                        "description": "Sirf tab pass karein jab user ne explicitly 'sasta' (price_low_to_high) ya 'expensive/premium' (price_high_to_low) manga ho. Normal search me null rakhein.",
                    },
                    "max_price": {
                        "type": "number",
                        "description": "Budget limit agar user ne manga ho (e.g. 'under 50' me 50, 'under 100' me 100). Warna null.",
                    },
                    "target_store": {
                        "type": "string",
                        "description": "Agar user ne specific store bola ho (e.g. 'paschim vihar se cold drink'), warna null.",
                    },
                },
                "required": ["product_query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_store_policy",
            "description": "Jab user non-product policies puche jaise Delivery fee, Minimum order value, Delivery ETA time, Cash on Delivery (COD) ya return/cancellation policy.",
            "parameters": {
                "type": "object",
                "properties": {
                    "policy_type": {
                        "type": "string",
                        "enum": ["delivery_fee", "delivery_time", "payment_cod", "general_policy"],
                        "description": "Type of policy requested.",
                    }
                },
                "required": ["policy_type"],
            },
        },
    },
]

# ----------------------------------------------------
# Ultra-Comprehensive System Prompt & Rules
# ----------------------------------------------------
SYSTEM_PROMPT = """
Aap Quick Commerce platform ke AI Shopping Assistant hain.
User ke conversational bhasha, Hinglish words, typos aur alag-alag shopping intents ko samajh kar 100% accurate tool call karein ya direct polite response dein.

HUMARE CATALOG ME STRICTLY YAHI 8 CATEGORIES AVAILABLE HAIN:
1. 'dairy-bread-eggs': Milk, Doodh, Curd, Dahi, Butter, Makhan, Eggs, Anda, Paneer, Brown Bread[cite: 2]
2. 'fresh-vegetables-fruits': Sabzi, Fruits, Fal, Tamatar, Tomato, Aloo, Potato, Pyaz, Onion, Kela, Banana, Seb, Apple, Dhaniya[cite: 2]
3. 'snacks-munchies': Chips, Lays, Kurkure, Bhujia, Sev, Chocolate, Dairy Milk Silk, Popcorn, Namkeen, Munchies[cite: 2]
4. 'cold-drinks-juices': Cold drink, Coke, Coca-Cola Zero, Real Fruit Juice, Bisleri Water, Paani, Red Bull[cite: 2]
5. 'pharmacy-doctor-care': Medical, Medicine, Dawa, Dettol, Crocin, Paracetamol, Sar dard, Pain relief, Volini spray, Hansaplast bandage, Vicks, Chyawanprash, Thermometer[cite: 2]
6. 'pet-animal-care': Pet, Kutta, Billi, Dog food, Cat food, Pedigree, Whiskas, Dog treats, Calcium bone, Cat litter, Pet shampoo[cite: 2]
7. 'personal-care-hygiene': Toothpaste, Colgate, Soap, Sabun, Dove, Shampoo, Head & Shoulders, Sanitary pads, Whisper[cite: 2]
8. 'cleaning-household': Bartan dhona, Vim gel, Surf Excel liquid, Detergent, Lizol, Floor cleaner, Odonil freshener[cite: 2]

======================================================================
STRICT DECISION RULES (CONFUSION ROKNE KE LIYE PRIORITY ORDER)
======================================================================

RULE 1: STORE + CATEGORY QUERY (HIGHEST PRIORITY)
- Agar user kisi store ka naam aur 'category' ek sath maange (e.g. 'rohini store ki category do', 'janakpuri ki categories dikhao', 'saket store me kya categories hain')[cite: 2]:
  -> ACTION: HAMESHA call karein 'get_category_details(category_slug="all", fetch_products=False, target_store="<store_name>")'[cite: 2].
  -> STRICT PROHIBITION: KABHI BHI 'get_specific_store_info' call MAT KAREIN jab category puchi gayi ho!

RULE 2: CATEGORY KE ITEMS / PRODUCTS MANGA HO
- Agar user kisi category ke andar ke specific items/products dekhna chahe (e.g. 'fruits btao kaun kaun se hai', 'pet food kya hai', 'medical ki dawayi dikhao', 'snacks dikhao', 'sabzi kya kya hai')[cite: 2]:
  -> ACTION: HAMESHA call karein 'get_category_details(category_slug="<slug>", fetch_products=True, target_store="<store_name_if_any>")'[cite: 2].
  -> Isse direct Shimla Apple, Banana, Crocin, Pedigree jaise product cards frontend par display honge[cite: 2].

RULE 3: PRICE SORT, COMPARISON YA BUDGET FILTER
- Agar user 'sabse sasta', 'under 50', 'cheap', 'expensive' bole:
  * "sabse sasta doodh" -> search_catalog_products(product_query="milk", sort_by="price_low_to_high")[cite: 2]
  * "chips under 50" -> search_catalog_products(product_query="chips", max_price=50)[cite: 2]
  * "Amul aur Mother dairy me sasta kaunsa hai" -> search_catalog_products(product_query="butter", sort_by="price_low_to_high")[cite: 2]

RULE 4: PROBLEM-BASED & MOOD QUERIES (NO DIRECT PRODUCT NAME)
- User aksar product ka naam nahi leta, bas apni problem batata hai:
  * "sar dard ho raha hai" / "chot lag gayi" -> search_catalog_products(product_query="crocin paracetamol pain relief")[cite: 2]
  * "pet kharab hai" / "halka khana" -> search_catalog_products(product_query="curd dahi")[cite: 2]
  * "shaam ki chai ke sath kya lu" / "chai nashta" -> search_catalog_products(product_query="rusk biscuits namkeen")[cite: 2]
  * "ghar me pocha lagana hai" -> search_catalog_products(product_query="lizol floor cleaner")[cite: 2]
  * "party karni hai snacks aur cold drink" -> search_catalog_products(product_query="chips cold drink snacks")[cite: 2]

RULE 5: NORMAL PRODUCT SEARCH & TYPOS
- User spelling mistakes ya desi Hinglish likhe toh query clean karein:
  * 'dhoodh', '1 ltr milk', 'amul doodh' -> search_catalog_products(product_query="milk")[cite: 2]
  * 'chpis', 'cooldrnk', 'lays' -> search_catalog_products(product_query="chips")[cite: 2]
  * 'tamatar pyaz', 'aloo', 'kela' -> search_catalog_products(product_query="tomato potato onion banana")[cite: 2]
  * Agar user bole 'Paschim vihar se cold drink' -> search_catalog_products(product_query="cold drink", target_store="paschim vihar")[cite: 2]

RULE 6: PURE STORE LOCATION / DISTANCE QUERIES (NO CLARIFYING QUESTIONS)
- DEFAULT: Agar user 'Stores near me?', 'store near me', 'nearby stores', 'paas ke stores', 'aas paas stores', 'meri location ke paas stores' bole -> TURANT call karein list_all_nearby_stores(). Clarifying question MAT poochho.
- SIRF jab user clearly 'sabse paas / nearest / closest ek store' bole -> get_nearest_store_only().
- Specific area/store naam (bina category/product ke), e.g. 'janakpuri store', 'saket store kitna dur hai' -> get_specific_store_info(store_name="...").
- IMPORTANT: Store location queries pe text reply mat do — pehle tool call karo.

RULE 7: STORE POLICY & DELIVERY FAQS (check_store_policy)
- Agar user puche 'Delivery kitne der me hogi' -> check_store_policy(policy_type="delivery_time").
- Agar user puche 'Delivery charge kitna lagega' ya 'Free delivery limit' -> check_store_policy(policy_type="delivery_fee").
- Agar user puche 'Cash on delivery (COD) available hai kya' -> check_store_policy(policy_type="payment_cod").

RULE 8: OUT-OF-SCOPE / PROHIBITED ITEMS (STRICT NO TOOL CALL)
- Hum ye deliver NAHI karte:
  * Footwear: Hawai chappal, Joote, Shoes, Sandals, Slippers[cite: 2]
  * Clothing/Fashion: Shirt, Pant, T-shirt, Kurta, Jeans, Kapde[cite: 2]
  * Electronics: Mobile phone, iPhone, Charger, Earphones, Laptop[cite: 2]
  * Alcohol/Cigarettes: Beer, Whiskey, Daaru, Cigarette[cite: 2]
- REACTION: KOI TOOL CALL MAT KAREIN.
  Seedha polite Hinglish text me mana karein:
  "Sorry! Hum abhi <item_name> deliver nahi karte. Hamare paas Fresh Grocery, Daily Essentials, Snacks aur Pharmacy products 10-20 mins me available hain. Kya aap inme se kuch order karna chahenge?"[cite: 1, 2]

RULE 9: CASUAL CHAT (STRICT NO TOOL CALL)
- Agar user bole 'Hi', 'Hello', 'Kaise ho', 'Kya chal raha hai', 'Bore ho raha hu':
  -> KOI TOOL CALL MAT KAREIN.
  -> 1-2 line me friendly greeting dein aur shopping redirect karein:
     "Hey! Main aapka shopping assistant hoon. Aaj snacks, cold drinks ya kitchen ke essentials me se kya mangwana chahenge? 😊"[cite: 1]
"""


# ----------------------------------------------------
# Phase 2: Agent LLM Decision Node
# ----------------------------------------------------
def agent_decision_node(state: AssistantState) -> Dict[str, Any]:
    raw_query = state.get("query") or ""

    try:
        response = client.chat.completions.create(
            model=ASSISTANT_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": raw_query},
            ],
            tools=CATALOG_TOOLS_SCHEMA,
            tool_choice="auto",
            temperature=0.1,
            timeout=15.0,
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
        logging.exception("assistant model call failed model=%s", ASSISTANT_MODEL)
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

    # Tool 3: Specific Store Info (Distance & ETA only)
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

    # Tool 4: Category Details & Category Products
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

        # Category resolution
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

            for p in prod_list:
                pid = str(p.get("_id") or p.get("product_id") or "")
                price = p.get("price") or p.get("price_rupees") or 0
                cards.append(
                    {
                        "type": "product",
                        "id": pid,
                        "title": p.get("name", ""),
                        "subtitle": f"Delivers in ~{store_eta} mins ({store_to_use.get('name', 'Store')})",
                        "meta": f"₹{price}",
                        "href": f"/store/{store_id}/product/{pid}",
                        "store_id": store_id,
                        "image": product_card_image(p),
                    }
                )

            tool_result_data = {
                "category_name": matched_cat.get("name"),
                "store_name": store_to_use.get("name") if store_to_use else "Partner Store",
                "products": [p.get("name") for p in prod_list],
                "product_count": len(prod_list),
            }

        # B) User wants Category Cards (e.g. "rohini store ki categories do")
        else:
            cats_to_display = [matched_cat] if (matched_cat and slug != "all") else categories
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
                        "href": f"/store/{store_id}/category/{c_slug}",
                        "store_id": store_id,
                        "image": category_card_image(cat),
                    }
                )

            tool_result_data = {
                "store_name": store_to_use.get("name") if store_to_use else "Partner Store",
                "categories": [c.get("name") for c in cats_to_display if c],
            }

    # Tool 5: Search Products (With Sort & Budget Filter)
    elif func_name == "search_catalog_products":
        prod_query = args.get("product_query") or ""
        sort_by = args.get("sort_by")
        max_price = args.get("max_price")
        target_store_name = (args.get("target_store") or "").lower()
        source_store = primary_store
        if target_store_name and stores:
            source_store = next((s for s in stores if target_store_name in s.get("name", "").lower()), primary_store)

        found_prods = []
        try:
            query_filter: Dict[str, Any] = {
                "name": {"$regex": prod_query, "$options": "i"},
                "isActive": True,
            }
            if max_price is not None:
                query_filter["price"] = {"$lte": max_price}

            cursor = sync_db.products.find(query_filter)
            if sort_by == "price_low_to_high":
                cursor = cursor.sort("price", 1)
            elif sort_by == "price_high_to_low":
                cursor = cursor.sort("price", -1)

            mongo_prods = list(cursor.limit(6))
            for p in mongo_prods:
                p["_id"] = str(p["_id"])
                found_prods.append(p)
        except Exception:
            found_prods = []

        # Cosine Similarity Fallback with Safe Threshold
        if not found_prods and max_price is None:
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
        for p in found_prods:
            pid = str(p.get("_id") or p.get("product_id") or "")
            price = p.get("price") or p.get("price_rupees") or 0
            cards.append(
                {
                    "type": "product",
                    "id": pid,
                    "title": p.get("name", ""),
                    "subtitle": f"Delivers in ~{store_eta} mins ({source_store.get('name') if source_store else 'Store'})",
                    "meta": f"₹{price}",
                    "href": f"/store/{store_id}/product/{pid}",
                    "store_id": store_id,
                    "image": product_card_image(p),
                }
            )
        tool_result_data = {
            "query": prod_query,
            "store_name": source_store.get("name") if source_store else None,
            "found_count": len(found_prods),
            "products": [p.get("name") for p in found_prods],
        }

    # Tool 6: Store Policy & FAQs
    elif func_name == "check_store_policy":
        ptype = args.get("policy_type")
        if ptype == "delivery_fee":
            tool_result_data = {
                "message": "Hamari delivery fee ₹25 hai, lekin ₹199 ke upar ke orders par DELIVERY ekdum FREE hai!"
            }
        elif ptype == "delivery_time":
            tool_result_data = {
                "message": "Hamare dark stores se delivery 10 se 20 minutes ke andar aapke doorstep par pahunch jaati hai."
            }
        elif ptype == "payment_cod":
            tool_result_data = {
                "message": "Haan, Cash on Delivery (COD) aur Online UPI/Cards dono payment methods available hain."
            }
        else:
            tool_result_data = {
                "message": "Hum 10-minute instant delivery, easy replacement aur 100% fresh items guarantee provide karte hain."
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
    Aap Quick Commerce sales assistant hain. Aapka kaam hai backend data ko natural aur polite Hinglish response me convert karna.

    Context:
    - User Query: '{query}'
    - Backend Data: {json.dumps(tool_result, default=str)}

    SCENARIO RULES:
    1. STORE KI CATEGORIES AAYI HAIN:
       - Store ka naam lein aur available categories ke naam batayein (e.g. 'QuickStore Rohini me Dairy, Snacks, Vegetables aur Pharmacy available hain')[cite: 2].
       - Puchein: 'Aap kis category ke items dekhna chahenge?'

    2. CATEGORY PRODUCTS AAYE HAIN (e.g. Fal ya Sabzi ke items):
       - Category ka naam mat dohraiye. Direct 2-3 top items ke naam lijiye (e.g. 'Hamare paas taaze Shimla Apple aur Robusta Banana available hain')[cite: 2].
       - Delivery time mention karein aur puchein cart me kya add karna hai.

    3. STORE DETAILS / NEAREST STORE:
       - Store ka naam, distance (e.g. 4.4 km) aur delivery time (e.g. 20 mins) batayein.
       - DO NOT say item is out of stock when user only asked about a store!

    4. PRODUCT SEARCH RESULT:
       - Product mila toh uska delivery time aur price highlight karein.
       - Agar 0 mila toh bataiye ki item stock me nahi hai par baki fresh grocery items available hain[cite: 2].

    5. STORE POLICY / FAQ:
       - Policy details simple aur clear bhasha me batayein.

    GUIDELINES: Short (2 lines), conversational Hinglish, engaging follow-up question.
    """

    try:
        response = client.chat.completions.create(
            model=ASSISTANT_MODEL,
            messages=[{"role": "system", "content": system_prompt}],
            temperature=0.4,
            timeout=15.0,
        )
        answer = (response.choices[0].message.content or "").strip()
    except Exception:
        logging.exception("assistant final answer failed model=%s", ASSISTANT_MODEL)
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