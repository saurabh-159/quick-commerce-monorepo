import json
import os
from typing import Optional, TypedDict

from langgraph.graph import END, START, StateGraph
from openai import OpenAI

from app.services.catalog_agent import cards_from_tool, detect_intent
from app.services.catalog_tools import CATALOG_TOOLS, execute_catalog_tool

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

FORCED_TOOL = {
    "nearby": "get_nearby_stores",
    "categories": "get_store_categories",
    "products": "get_category_products",
}


class QuickCommerceState(TypedDict):
    query: str
    lat: Optional[float]
    lng: Optional[float]
    intent: str
    tool_name: str
    tool_result: str
    cards: list
    answer: str


def intent_node(state: QuickCommerceState) -> dict:
    intent = detect_intent(state.get("query") or "")
    q = (state.get("query") or "").lower()
    if intent == "general" and any(w in q for w in ("fruit", "vegetable", "veggie", "veggies")):
        intent = "products"
    return {"intent": intent}


def tool_node(state: QuickCommerceState) -> dict:
    """Intent ke hisaab se ek live Mongo tool chalao."""
    name = FORCED_TOOL.get(state.get("intent") or "")
    if not name:
        return {"tool_name": "", "tool_result": "", "cards": []}

    args = {}
    if name == "get_category_products":
        args["category"] = state.get("query") or ""
        args["limit"] = 8
    if name == "get_nearby_stores":
        args["limit"] = 6
    if state.get("lat") is not None:
        args["lat"] = state["lat"]
    if state.get("lng") is not None:
        args["lng"] = state["lng"]

    result = execute_catalog_tool(name, args)
    return {
        "tool_name": name,
        "tool_result": result,
        "cards": cards_from_tool(name, result),
    }


def answer_node(state: QuickCommerceState) -> dict:
    """Tool JSON se short answer. Data na ho to seedha message."""
    if not state.get("tool_result"):
        return {
            "answer": "Ask about nearby stores, a store's categories, or products in a category."
        }

    try:
        data = json.loads(state["tool_result"])
    except json.JSONDecodeError:
        data = {}

    if data.get("error"):
        return {"answer": str(data["error"])}

    prompt = (
        "Write a short shopping answer using ONLY this JSON. Do not invent stores or products.\n"
        f"User question: {state.get('query')}\n"
        f"Data: {state.get('tool_result')}"
    )
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        timeout=10.0,
    )
    text = (response.choices[0].message.content or "").strip()
    return {"answer": text or "I could not build an answer from the store data."}


def route_after_intent(state: QuickCommerceState) -> str:
    if state.get("intent") in FORCED_TOOL:
        return "tool"
    return "answer"


def build_graph():
    graph = StateGraph(QuickCommerceState)
    graph.add_node("intent", intent_node)
    graph.add_node("tool", tool_node)
    graph.add_node("answer", answer_node)

    graph.add_edge(START, "intent")
    graph.add_conditional_edges(
        "intent",
        route_after_intent,
        {"tool": "tool", "answer": "answer"},
    )
    graph.add_edge("tool", "answer")
    graph.add_edge("answer", END)
    return graph.compile()


catalog_graph = build_graph()


def run_catalog_graph(query: str, lat: Optional[float] = None, lng: Optional[float] = None) -> dict:
    final = catalog_graph.invoke(
        {
            "query": query,
            "lat": lat,
            "lng": lng,
            "intent": "",
            "tool_name": "",
            "tool_result": "",
            "cards": [],
            "answer": "",
        }
    )
    tool_name = final.get("tool_name") or ""
    used = [tool_name] if tool_name else []
    return {
        "query": query,
        "answer": final.get("answer") or "",
        "cards": final.get("cards") or [],
        "tools_used": used,
        "context_used": used,
    }
