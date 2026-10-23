# ai-service/app/services/catalog_agent.py
import os
import json
from typing import Optional
from openai import OpenAI
from app.services.catalog_tools import CATALOG_TOOLS, execute_catalog_tool

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are a shopping assistant for a quick-commerce app.
Use tools for live store/category/product data. Do not invent counts or names.

Tool rules:
- Nearby / "mere location stores" → get_nearby_stores only.
- Categories / "is store ki category" → get_store_categories (NOT get_nearby_stores).
  If store_id unknown, pass store_name OR lat/lng so nearest store is used.
- Products in a category → get_category_products with category name/slug.
Keep answers short. List category names clearly when asked.
"""


def detect_intent(query: str) -> str:
    q = (query or "").lower()
    if any(w in q for w in ("categor", "category", "categories", "categary", "categry")):
        return "categories"
    if any(w in q for w in ("product", "products", "item", "items", "price", "stock", "dairy", "milk")):
        # product-ish, but "dairy category" already caught above via categor*
        if "categor" in q:
            return "categories"
        return "products"
    nearby_phrases = (
        "near me",
        "nearby",
        "near by",
        "mere location",
        "meri location",
        "paas",
        "aas paas",
        "kitne store",
        "kitni store",
        "stores near",
        "store near",
        "location mein store",
        "location me store",
    )
    if any(p in q for p in nearby_phrases):
        return "nearby"
    return "general"


def cards_from_tool(tool_name: str, result_json: str) -> list:
    """Build UI cards from live tool JSON (not from LLM text)."""
    try:
        data = json.loads(result_json)
    except Exception:
        return []

    if data.get("error"):
        return []

    cards = []

    if tool_name == "get_nearby_stores":
        for s in (data.get("nearby") or [])[:6]:
            sid = s.get("store_id")
            if not sid:
                continue
            distance = s.get("distance_km")
            cards.append({
                "type": "store",
                "id": sid,
                "title": s.get("name") or "Store",
                "subtitle": s.get("address") or "",
                "meta": f"{distance} km" if distance is not None else None,
                "href": f"/store/{sid}",
                "store_id": sid,
                "image": s.get("image") or "",
            })

    if tool_name == "get_store_categories":
        store_id = data.get("store_id")
        for c in (data.get("categories") or [])[:12]:
            slug = c.get("slug") or c.get("category_id")
            cid = c.get("category_id") or slug
            if not cid or not store_id:
                continue
            count = c.get("product_count")
            cards.append({
                "type": "category",
                "id": str(cid),
                "title": c.get("name") or "Category",
                "subtitle": data.get("store_name") or "",
                "meta": f"{count} products" if count is not None else None,
                "href": f"/store/{store_id}?category={slug}",
                "store_id": store_id,
                "image": c.get("image") or "",
            })

    if tool_name == "get_category_products":
        store_id = data.get("store_id")
        store_name = data.get("store_name") or ""
        for p in (data.get("products") or [])[:8]:
            pid = p.get("product_id")
            if not pid or not store_id:
                continue
            price = p.get("price_rupees")
            stock = p.get("stock")
            price_paise = int(round(float(price) * 100)) if price is not None else 0
            meta_parts = []
            if price is not None:
                meta_parts.append(f"₹{price}")
            if stock is not None:
                meta_parts.append(f"stock {stock}")
            cards.append({
                "type": "product",
                "id": pid,
                "title": p.get("name") or "Product",
                "subtitle": p.get("brand") or data.get("category") or "",
                "meta": " · ".join(meta_parts) if meta_parts else None,
                "href": f"/store/{store_id}/product/{pid}",
                "store_id": store_id,
                "store_name": store_name,
                "image": p.get("image") or "",
                "price_paise": price_paise,
                "unit": p.get("unit") or "",
                "stock": stock if stock is not None else 99,
            })

    return cards


def run_catalog_assistant(
    query: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict:
    location_note = ""
    if lat is not None and lng is not None:
        location_note = f"\nUser location: lat={lat}, lng={lng}"
    else:
        location_note = "\nUser location: not provided. If they ask nearby stores, ask for location."

    intent = detect_intent(query)
    intent_note = f"\nDetected user intent: {intent}."
    if intent == "categories":
        intent_note += " Call get_store_categories. Do not call get_nearby_stores."
    elif intent == "products":
        intent_note += " Call get_category_products with the category name."
    elif intent == "nearby":
        intent_note += " Call get_nearby_stores."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + location_note + intent_note},
        {"role": "user", "content": query},
    ]

    tools_used = []
    cards = []
    max_rounds = 4

    for round_idx in range(max_rounds):
        tool_choice = "auto"
        if round_idx == 0:
            if intent == "nearby" and lat is not None and lng is not None:
                tool_choice = {
                    "type": "function",
                    "function": {"name": "get_nearby_stores"},
                }
            elif intent == "categories":
                tool_choice = {
                    "type": "function",
                    "function": {"name": "get_store_categories"},
                }
            elif intent == "products":
                tool_choice = {
                    "type": "function",
                    "function": {"name": "get_category_products"},
                }

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            tools=CATALOG_TOOLS,
            tool_choice=tool_choice,
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            answer = (msg.content or "").strip()
            return {
                "query": query,
                "answer": answer or "I could not find an answer.",
                "tools_used": tools_used,
                "context_used": tools_used,
                "cards": cards,
            }

        messages.append(msg)

        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            try:
                args = json.loads(tool_call.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}

            # Inject location when helpful
            if name == "get_nearby_stores":
                if args.get("lat") is None and lat is not None:
                    args["lat"] = lat
                if args.get("lng") is None and lng is not None:
                    args["lng"] = lng

            if name in ("get_store_categories", "get_category_products"):
                if args.get("lat") is None and lat is not None:
                    args["lat"] = lat
                if args.get("lng") is None and lng is not None:
                    args["lng"] = lng

            result = execute_catalog_tool(name, args)
            tools_used.append(f"{name}({json.dumps(args)})")

            new_cards = cards_from_tool(name, result)
            # Category/product answers should not keep old store cards
            if name in ("get_store_categories", "get_category_products") and new_cards:
                cards = new_cards
            elif name == "get_nearby_stores" and new_cards:
                cards = new_cards
            elif new_cards:
                cards.extend(new_cards)

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

    return {
        "query": query,
        "answer": "I gathered some data but could not finish. Please try a simpler question.",
        "tools_used": tools_used,
        "context_used": tools_used,
        "cards": cards,
    }
