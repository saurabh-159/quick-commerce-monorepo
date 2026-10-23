import json
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

CATEGORY_ART = {
    "dairy-breakfast": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
    "fruits-vegetables": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
    "snacks-munchies": "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=600&q=80",
}
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
    slug = (cat.get("slug") or "").strip()
    return (
        _first_image(cat.get("image"), cat.get("imageUrl"), cat.get("images"))
        or CATEGORY_ART.get(slug)
        or DEFAULT_CATEGORY_ART
    )


def store_card_image(store: Dict[str, Any]) -> str:
    return _first_image(store.get("image"), store.get("images")) or DEFAULT_STORE_ART


def product_card_image(product: Dict[str, Any]) -> str:
    return _first_image(product.get("image"), product.get("images")) or DEFAULT_PRODUCT_ART


class AssistantState(TypedDict):
    query: str
    lat: Optional[float]
    lng: Optional[float]
    intent: str  # 'nearby_stores' | 'single_store_detail' | 'store_categories' | 'category_products' | 'product_search' | 'general_chat'
    cleaned_query: str
    target_store_name: Optional[str]
    target_category: Optional[str]
    primary_store: Optional[Dict[str, Any]]
    secondary_stores: List[Dict[str, Any]]
    selected_store: Optional[Dict[str, Any]]
    found_in_store: Optional[Dict[str, Any]]
    tool_result: Any
    is_fallback: bool
    is_completely_unavailable: bool
    cards: List[Dict[str, Any]]
    answer: str
    tools_used: List[str]


def calculate_distance_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Do coordinates ke beech distance calculate karta hai (KM)."""
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
    """Distance se delivery ETA nikalta hai."""
    if distance_km <= 2.0:
        return 10
    elif distance_km <= 5.0:
        return 20
    else:
        return min(45, int(15 + (distance_km * 4)))


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Embeddings similarity math."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if not mag1 or not mag2:
        return 0.0
    return dot / (mag1 * mag2)


def intent_cleaner_node(state: AssistantState) -> Dict[str, Any]:
    raw_query = state.get("query") or ""

    system_prompt = """
    Aap Quick Commerce AI intent classifier hain.
    Query ko analyze karein aur JSON return karein with 4 keys:
    1. "intent": Inme se EXACTLY ek select karein:
       - "single_store_detail": User kisi ek specific store ke baare me puch raha hai (e.g. 'janakpuri wale store ke baare mein batao', 'janakpuri dark store').
       - "nearby_stores": User aas-paas ke saare stores ya 'sabse paas wala store' dekhna chahta hai bina kisi specific location ke.
       - "store_categories": User kisi store ki categories/sections maang raha hai (e.g. 'is store me kya categories hain', 'categories dikhao').
       - "category_products": User specific category ke items maang raha hai (e.g. 'fruits category me kya hai', 'snacks dikhao').
       - "product_search": User kisi product/item ya category ki cheez maang raha hai (e.g. 'milk', 'doodh', 'chips', 'footwear', 'chappal', 'medicines', 'dawaai').
       - "general_chat": Casual greetings jaise 'hi', 'kaise ho', 'bore ho raha hu'.
    2. "target_store_name": Agar query me kisi area ya store ka naam hai (jaise 'janakpuri', 'paschim vihar') ya 'nearest' bola ho, toh extract karein. Warna null.
    3. "target_category": Agar category ka naam pucha ho toh extract karein. Warna null.
    4. "cleaned_query": Typo/local language theek karein (e.g. 'juta/chappal' -> 'footwear', 'dawa' -> 'medicine', 'chip' -> 'chips').
    """

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw_query},
            ],
            temperature=0.0,
            timeout=5.0,
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
        intent = parsed.get("intent", "general_chat")
        target_store = parsed.get("target_store_name")
        target_cat = parsed.get("target_category")
        cleaned = parsed.get("cleaned_query", raw_query)
    except Exception:
        intent = "general_chat"
        target_store = None
        target_cat = None
        cleaned = raw_query

    return {
        "intent": intent,
        "cleaned_query": cleaned,
        "target_store_name": target_store,
        "target_category": target_cat,
    }


def catalog_tool_node(state: AssistantState) -> Dict[str, Any]:
    lat = state.get("lat")
    lng = state.get("lng")
    intent = state.get("intent")
    cleaned_query = state.get("cleaned_query") or ""
    target_store = state.get("target_store_name")
    target_category = state.get("target_category")

    # Step 1: Nearby stores nikaalein aur distance sort karein
    stores = []
    if lat is not None and lng is not None:
        try:
            nearby_raw = get_nearby_stores_sync(lat=lat, lng=lng, limit=8)
            nearby_res = (
                json.loads(nearby_raw) if isinstance(nearby_raw, str) else nearby_raw
            )
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
    secondary_stores = stores[1:] if len(stores) > 1 else []

    # Selected store resolve karein (agar user ne specific area manga ho)
    selected_store = primary_store
    if target_store and stores:
        t_lower = target_store.lower()
        matched = next(
            (s for s in stores if t_lower in s.get("name", "").lower()),
            None,
        )
        if matched:
            selected_store = matched

    selected_store_id = str(
        (selected_store or {}).get("store_id")
        or (selected_store or {}).get("_id")
        or ""
    )

    # ----------------------------------------------------
    # Case 1: Specific Single Store Detail (e.g. "Janakpuri store ke bare me batao")
    # ----------------------------------------------------
    if intent == "single_store_detail" and selected_store:
        sid = str(selected_store.get("store_id") or selected_store.get("_id") or "")
        cards = [
            {
                "type": "store",
                "id": sid,
                "title": selected_store.get("name", "Store"),
                "subtitle": f"{selected_store.get('eta_minutes')} mins delivery ({selected_store.get('distance_km')} km)",
                "meta": f"{selected_store.get('distance_km')} km",
                "href": f"/store/{sid}",
                "store_id": sid,
                "image": store_card_image(selected_store),
            }
        ]
        return {
            "primary_store": primary_store,
            "secondary_stores": secondary_stores,
            "selected_store": selected_store,
            "found_in_store": selected_store,
            "tool_result": selected_store,
            "is_fallback": False,
            "is_completely_unavailable": False,
            "cards": cards,
            "tools_used": ["get_nearby_stores"],
        }

    # ----------------------------------------------------
    # Case 2: Nearby Stores List ya Nearest Store
    # ----------------------------------------------------
    if intent == "nearby_stores":
        q_lower = cleaned_query.lower()
        is_only_nearest = any(
            w in q_lower for w in ["sabse paas", "nearest", "closest", "paas wala store"]
        )
        display_stores = [primary_store] if (is_only_nearest and primary_store) else stores[:4]
        cards = []
        for s in display_stores:
            if not s:
                continue
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
        return {
            "primary_store": primary_store,
            "secondary_stores": secondary_stores,
            "selected_store": primary_store,
            "found_in_store": primary_store,
            "tool_result": display_stores,
            "is_fallback": False,
            "is_completely_unavailable": False,
            "cards": cards,
            "tools_used": ["get_nearby_stores"],
        }

    # ----------------------------------------------------
    # Case 3: Store Categories (Filtered)
    # ----------------------------------------------------
    if intent == "store_categories":
        categories = []
        if selected_store_id:
            try:
                cat_raw = get_store_categories_sync(selected_store_id)
                cat_res = json.loads(cat_raw) if isinstance(cat_raw, str) else cat_raw
                categories = cat_res.get("categories") or []
            except Exception:
                categories = []

        # Agar user ne specific category/word manga hai (jaise "pet")
        filter_word = (target_category or cleaned_query or "").lower().strip()

        # Generic words skip; specific words (pet, doodh, snacks) se filter
        if filter_word and filter_word not in ["category", "categories", "all", "sab", "dukaan"]:
            matching_cats = [
                c
                for c in categories
                if filter_word in c.get("name", "").lower()
                or filter_word in c.get("slug", "").lower()
            ]
            if matching_cats:
                categories = matching_cats

        cards = []
        for cat in categories:
            cid = str(cat.get("_id") or cat.get("category_id") or "")
            name = cat.get("name", "Category")
            slug = cat.get("slug") or name.lower().replace(" ", "-")
            cards.append(
                {
                    "type": "category",
                    "id": cid,
                    "title": name,
                    "subtitle": f"{cat.get('product_count', 0)} items",
                    "href": f"/store/{selected_store_id}/category/{slug}",
                    "store_id": selected_store_id,
                    "image": category_card_image(cat),
                }
            )
        return {
            "primary_store": selected_store,
            "secondary_stores": secondary_stores,
            "selected_store": selected_store,
            "found_in_store": selected_store,
            "tool_result": {
                "store_name": (selected_store or {}).get("name"),
                "categories": categories,
            },
            "is_fallback": False,
            "is_completely_unavailable": len(categories) == 0,
            "cards": cards,
            "tools_used": ["get_store_categories"],
        }

    # ----------------------------------------------------
    # Case 4: Category Products (With Cross-Store Check)
    # ----------------------------------------------------
    if intent == "category_products":
        category_name = target_category or cleaned_query
        prod_list = []
        source_store = selected_store

        # Selected store me check karein
        if selected_store_id and category_name:
            try:
                cat_meta = resolve_category_sync(category_name)
                cat_id = str(cat_meta.get("_id") or "") if cat_meta else category_name
                prod_raw = get_category_products_sync(
                    store_id=selected_store_id, category=cat_id, limit=8
                )
                prod_res = json.loads(prod_raw) if isinstance(prod_raw, str) else prod_raw
                prod_list = prod_res.get("products") or []
            except Exception:
                prod_list = []

        # Agar selected store me nahi mila, baki stores me check karein
        if not prod_list and stores:
            for other_s in stores:
                other_sid = str(other_s.get("store_id") or other_s.get("_id") or "")
                if other_sid == selected_store_id:
                    continue
                try:
                    cat_meta = resolve_category_sync(category_name)
                    cat_id = str(cat_meta.get("_id") or "") if cat_meta else category_name
                    prod_raw = get_category_products_sync(
                        store_id=other_sid, category=cat_id, limit=8
                    )
                    prod_res = json.loads(prod_raw) if isinstance(prod_raw, str) else prod_raw
                    items = prod_res.get("products") or []
                    if items:
                        prod_list = items
                        source_store = other_s
                        break
                except Exception:
                    continue

        is_unavail = len(prod_list) == 0
        cards = []
        store_eta = (source_store or {}).get("eta_minutes", 15)
        source_sid = str((source_store or {}).get("store_id") or (source_store or {}).get("_id") or "")

        for p in prod_list:
            pid = str(p.get("_id") or p.get("product_id") or "")
            price = p.get("price")
            if price is None and p.get("price_rupees") is not None:
                price = p.get("price_rupees")
            cards.append(
                {
                    "type": "product",
                    "id": pid,
                    "title": p.get("name", ""),
                    "subtitle": f"Delivers in ~{store_eta} mins ({source_store.get('name', 'Store')})",
                    "meta": f"₹{price}" if price is not None else None,
                    "href": f"/store/{source_sid}/product/{pid}",
                    "store_id": source_sid,
                    "image": product_card_image(p),
                }
            )

        return {
            "primary_store": primary_store,
            "secondary_stores": secondary_stores,
            "selected_store": selected_store,
            "found_in_store": source_store,
            "tool_result": {
                "searched_store": (selected_store or {}).get("name"),
                "found_store": (source_store or {}).get("name") if not is_unavail else None,
                "category": category_name,
                "products": prod_list,
            },
            "is_fallback": (source_store != selected_store and not is_unavail),
            "is_completely_unavailable": is_unavail,
            "cards": cards,
            "tools_used": ["get_category_products"],
        }

    # ----------------------------------------------------
    # Case 5: Product Search (Exact match + Multi-Store + Strict Safe Similarity)
    # ----------------------------------------------------
    found_products = []
    is_fallback = False
    is_completely_unavail = False
    source_store = selected_store

    # 1. MongoDB Regex Check
    try:
        query_filter = {
            "name": {"$regex": cleaned_query, "$options": "i"},
            "isActive": True,
        }
        mongo_products = list(sync_db.products.find(query_filter).limit(6))
        for p in mongo_products:
            p["_id"] = str(p["_id"])
            found_products.append(p)
    except Exception:
        found_products = []

    # 2. Strict Cosine Similarity (Score >= 0.70 to avoid irrelevant footwear/grocery mixing)
    if not found_products:
        try:
            user_vector = generate_embedding(cleaned_query)
            all_active = list_active_products_sync()[:60]

            scored_items = []
            for item in all_active:
                item_id = str(item.get("_id") or item.get("product_id") or "")
                item_vector = get_cached_product_embedding(
                    item_id, item.get("name", "")
                )
                if item_vector:
                    score = cosine_similarity(user_vector, item_vector)
                    scored_items.append((score, item))

            scored_items.sort(key=lambda x: x[0], reverse=True)
            # High threshold prevents matching footwear with biscuits/vegetables
            relevant_items = [item for score, item in scored_items[:4] if score >= 0.70]

            if relevant_items:
                found_products = relevant_items
                is_fallback = True
            else:
                is_completely_unavail = True
        except Exception:
            is_completely_unavail = True

    cards = []
    store_eta = (source_store or {}).get("eta_minutes", 15)
    source_sid = str((source_store or {}).get("store_id") or (source_store or {}).get("_id") or "")

    for p in found_products:
        pid = str(p.get("_id") or p.get("product_id") or "")
        if not pid:
            continue
        price = p.get("price")
        if price is None and p.get("price_rupees") is not None:
            price = p.get("price_rupees")
        cards.append(
            {
                "type": "product",
                "id": pid,
                "title": p.get("name", ""),
                "subtitle": f"Delivers in ~{store_eta} mins",
                "meta": f"₹{price}" if price is not None else None,
                "href": f"/store/{source_sid}/product/{pid}" if source_sid else f"/product/{pid}",
                "store_id": source_sid,
                "image": product_card_image(p),
            }
        )

    return {
        "primary_store": primary_store,
        "secondary_stores": secondary_stores,
        "selected_store": selected_store,
        "found_in_store": source_store,
        "tool_result": found_products,
        "is_fallback": is_fallback,
        "is_completely_unavailable": is_completely_unavail,
        "cards": cards,
        "tools_used": ["product_search"],
    }


def sales_answer_node(state: AssistantState) -> Dict[str, Any]:
    intent = state.get("intent")
    query = state.get("query") or ""
    tool_result = state.get("tool_result")
    is_fallback = state.get("is_fallback")
    is_unavail = state.get("is_completely_unavailable")
    primary_store = state.get("primary_store")
    selected_store = state.get("selected_store")
    found_in_store = state.get("found_in_store")

    # Casual Chat
    if intent == "general_chat":
        system_prompt = """
        Aap ek warm aur helpful Quick Commerce shopping assistant hain.
        User ki casual baat ka short polite jawab dein aur turant shopping par redirect karein.
        Puchein ki unka kya order karne ka mood hai (Grocery, Snacks, Fruits, Dairy).
        Keep it within 2 lines in Hindi-English mix.
        """
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query},
                ],
                temperature=0.7,
                timeout=10.0,
            )
            answer = (response.choices[0].message.content or "").strip()
        except Exception:
            answer = "Hey! Main yahan hoon help ke liye. Snacks, grocery ya daily essentials me se kya lena hai?"
        return {"answer": answer, "cards": [], "tools_used": []}

    # Case: Specific Store details query (NO OUT-OF-STOCK HALLUCINATION)
    if intent == "single_store_detail" and selected_store:
        system_prompt = f"""
        User asked about a specific store: '{query}'.
        Store details: {json.dumps(selected_store, default=str)}
        Task:
        - Store ka naam, distance ({selected_store.get('distance_km')} km), aur delivery time ({selected_store.get('eta_minutes')} mins) batayein.
        - DO NOT mention any product or item being unavailable since user didn't ask for any item.
        - Puchein: 'Kya aap is store ki categories dekhna chahenge?'
        Tone: Friendly Hinglish.
        """
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": system_prompt}],
                temperature=0.4,
                timeout=10.0,
            )
            answer = (response.choices[0].message.content or "").strip()
        except Exception:
            answer = f"{selected_store.get('name')} aapse lagbhag {selected_store.get('distance_km')} km dur hai aur yahan se ~{selected_store.get('eta_minutes')} mins me delivery ho jayegi. Kya aap is store ki categories dekhna chahenge?"
        return {"answer": answer}

    # Case: Product / Category completely unavailable (e.g. Footwear / Medicines)
    if is_unavail:
        system_prompt = f"""
        User requested: '{query}'.
        Status: This item or category is completely unavailable across all nearby dark stores.
        Task:
        1. Clearly and politely explain that '{query}' hamare kisi bhi nearby dark store par abhi available nahi hai.
        2. Do NOT hallucinate or show unrelated grocery items.
        3. Explain: 'Hamare paas abhi Fresh Grocery, Fruits, Vegetables, aur Daily Essentials available hain.'
        4. Ask: 'Kya aap inme se kuch mangwana chahenge?'
        Tone: Polite, helpful Hinglish.
        """
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": system_prompt}],
                temperature=0.3,
                timeout=10.0,
            )
            answer = (response.choices[0].message.content or "").strip()
        except Exception:
            answer = f"Sorry! '{query}' abhi hamare kisi bhi nearby dark store par available nahi hai. Hum abhi Fresh Grocery aur Daily Essentials deliver kar rahe hain. Kya aap inme se kuch dekhna chahenge?"
        return {"answer": answer, "cards": [], "tools_used": ["catalog_search"]}

    # Case: Normal response (Store list, Categories, Products, or Switched Store)
    is_switched = (
        intent in ("category_products", "product_search")
        and selected_store != found_in_store
        and found_in_store is not None
    )

    system_prompt = f"""
    Aap ek proactive Quick Commerce sales assistant hain.
    Context:
    - User Query: {query}
    - Intent: {intent}
    - Requested/Primary Store: {(selected_store or {}).get('name', 'Nearest Store')}
    - Found In Store: {(found_in_store or {}).get('name')} (ETA: {(found_in_store or {}).get('eta_minutes', 15)} mins)
    - Is Switched Store: {is_switched}
    - Is Fallback (Similar Item): {is_fallback}
    - Data: {json.dumps(tool_result, default=str)}

    Rules:
    1. Agar Is Switched Store True hai: Explain karein ki item selected store me nahi mila, par [Found Store Name] par available hai jo [ETA] mins me deliver kar dega.
    2. Agar Is Fallback True hai: Batayein ki exact item nahi mila par milte-julte options ye rahe.
    3. Agar Nearby stores dikha rahe hain: Fast delivery time jarur mention karein.
    4. Agar Categories dikha rahe hain: Store ka naam batayein aur puchein kaunsi category dekhni hai.
    5. Hamesha helpful engaging question ke sath close karein.
    Tone: Hinglish, professional, fast sales assistant.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": system_prompt}],
            temperature=0.5,
            timeout=10.0,
        )
        answer = (
            response.choices[0].message.content
            or "Aapke liye ye options available hain!"
        ).strip()
    except Exception:
        answer = "Aapke liye ye options available hain! Aur kuch check karna hai?"

    return {"answer": answer}


def route_after_intent(state: AssistantState) -> str:
    if state.get("intent") == "general_chat":
        return "sales_answer"
    return "catalog_tool"


def build_catalog_graph():
    workflow = StateGraph(AssistantState)
    workflow.add_node("intent_cleaner", intent_cleaner_node)
    workflow.add_node("catalog_tool", catalog_tool_node)
    workflow.add_node("sales_answer", sales_answer_node)

    workflow.add_edge(START, "intent_cleaner")
    workflow.add_conditional_edges(
        "intent_cleaner",
        route_after_intent,
        {
            "catalog_tool": "catalog_tool",
            "sales_answer": "sales_answer",
        },
    )
    workflow.add_edge("catalog_tool", "sales_answer")
    workflow.add_edge("sales_answer", END)
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
        "intent": "general_chat",
        "cleaned_query": query or "",
        "target_store_name": None,
        "target_category": None,
        "primary_store": None,
        "secondary_stores": [],
        "selected_store": None,
        "found_in_store": None,
        "tool_result": None,
        "is_fallback": False,
        "is_completely_unavailable": False,
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