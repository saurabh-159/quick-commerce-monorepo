# ai-service/app/services/catalog_tools.py
import json
from app.services.db_tools import (
    get_nearby_stores_sync,
    get_store_categories_sync,
    get_category_products_sync,
)


# ---------- 1) Wrappers (Phase 1 helpers ko clean args do) ----------

def get_nearby_stores(lat: float, lng: float, limit: int = 10) -> str:
    """User ke paas kitne stores hain (live Mongo)."""
    if lat is None or lng is None:
        return json.dumps({
            "error": "lat and lng are required for nearby stores"
        })
    try:
        return get_nearby_stores_sync(float(lat), float(lng), int(limit or 10))
    except Exception as e:
        return json.dumps({"error": f"get_nearby_stores failed: {str(e)}"})


def get_store_categories(
    store_id: str = None,
    store_name: str = None,
    lat: float = None,
    lng: float = None,
) -> str:
    """Ek store ki categories + product counts."""
    try:
        return get_store_categories_sync(
            store_id=store_id,
            store_name=store_name,
            lat=lat,
            lng=lng,
        )
    except Exception as e:
        return json.dumps({"error": f"get_store_categories failed: {str(e)}"})


def get_category_products(
    store_id: str = None,
    category: str = None,
    limit: int = 20,
    store_name: str = None,
    lat: float = None,
    lng: float = None,
) -> str:
    """Store + category ke products (name, brand, stock, price)."""
    if not category or not str(category).strip():
        return json.dumps({"error": "category is required"})
    try:
        return get_category_products_sync(
            store_id=store_id,
            category=str(category).strip(),
            limit=int(limit or 20),
            store_name=store_name,
            lat=lat,
            lng=lng,
        )
    except Exception as e:
        return json.dumps({"error": f"get_category_products failed: {str(e)}"})


# ---------- 2) OpenAI tools schema ----------

CATALOG_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_nearby_stores",
            "description": (
                "Find stores near the user's location ONLY when they ask nearby/near me/"
                "kitne stores/mere location. Do NOT use this for category or product questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "User latitude"},
                    "lng": {"type": "number", "description": "User longitude"},
                    "limit": {"type": "integer", "description": "Max stores (default 10)"},
                },
                "required": ["lat", "lng"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_store_categories",
            "description": (
                "List categories in a store with product counts. "
                "Use when user asks categories of a store / is store ki category. "
                "Prefer store_id if known; else store_name; else lat/lng picks nearest store."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "store_id": {"type": "string", "description": "Mongo store _id"},
                    "store_name": {"type": "string", "description": "Partial store name e.g. Paschim Vihar"},
                    "lat": {"type": "number", "description": "User lat to resolve nearest store"},
                    "lng": {"type": "number", "description": "User lng to resolve nearest store"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_category_products",
            "description": (
                "List products in a store for a category (id/slug/name). "
                "Use for product questions inside a category."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "store_id": {"type": "string", "description": "Mongo store _id"},
                    "store_name": {"type": "string", "description": "Partial store name"},
                    "category": {"type": "string", "description": "Category id, slug, or name e.g. dairy"},
                    "limit": {"type": "integer", "description": "Max products (default 20)"},
                    "lat": {"type": "number"},
                    "lng": {"type": "number"},
                },
                "required": ["category"],
            },
        },
    },
]


TOOL_HANDLERS = {
    "get_nearby_stores": get_nearby_stores,
    "get_store_categories": get_store_categories,
    "get_category_products": get_category_products,
}


def execute_catalog_tool(tool_name: str, arguments: dict) -> str:
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})

    args = arguments or {}
    try:
        if tool_name == "get_nearby_stores":
            return handler(
                lat=args.get("lat"),
                lng=args.get("lng"),
                limit=args.get("limit", 10),
            )
        if tool_name == "get_store_categories":
            return handler(
                store_id=args.get("store_id"),
                store_name=args.get("store_name"),
                lat=args.get("lat"),
                lng=args.get("lng"),
            )
        if tool_name == "get_category_products":
            return handler(
                store_id=args.get("store_id"),
                category=args.get("category"),
                limit=args.get("limit", 20),
                store_name=args.get("store_name"),
                lat=args.get("lat"),
                lng=args.get("lng"),
            )
        return json.dumps({"error": f"No executor for {tool_name}"})
    except Exception as e:
        return json.dumps({"error": f"{tool_name} crashed: {str(e)}"})
