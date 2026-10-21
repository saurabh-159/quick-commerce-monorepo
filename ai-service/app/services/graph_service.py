from typing import TypedDict, List
from langgraph.graph import StateGraph, END

# Step 1: State define karna (Data container jo har step par aage pass hoga)
class AgentState(TypedDict):
    messages: List[str]
    current_task: str
    is_resolved: bool

# Step 2: Nodes (Alag-alag workers ya functions jo graph ke andar chalenge)
def analyze_user_query(state: AgentState):
    print("--- 1. Analyzing User Query ---")
    query = state["messages"][-1]
    
    if "order" in query.lower():
        state["current_task"] = "check_order"
    else:
        state["current_task"] = "general_chat"
        
    return state

def handle_order_task(state: AgentState):
    print("--- 2. Executing Order Task ---")
    state["messages"].append("System: Order status checked successfully. Out for delivery!")
    state["is_resolved"] = True
    return state

def handle_general_chat(state: AgentState):
    print("--- 2. Executing General Chat ---")
    state["messages"].append("System: How can I help you with quick commerce today?")
    state["is_resolved"] = True
    return state

# Step 3: Conditional Routing Function (Decision Maker / Gatekeeper)
def route_next_step(state: AgentState):
    if state["current_task"] == "check_order":
        return "order_node"
    return "chat_node"

# Step 4: Graph Builder banana (StateGraph)
workflow = StateGraph(AgentState)

# Nodes add karna (Factory ke rooms / workers)
workflow.add_node("analyzer_node", analyze_user_query)
workflow.add_node("order_node", handle_order_task)
workflow.add_node("chat_node", handle_general_chat)

# Entry point set karna (Shuruat kahan se hogi)
workflow.set_entry_point("analyzer_node")

# Conditional Edges jodna (Decision ke hisaab se rasta dena)
workflow.add_conditional_edges(
    "analyzer_node",
    route_next_step,
    {
        "order_node": "order_node",
        "chat_node": "chat_node"
    }
)

# End points jodna (Kaam khatam kahan hoga)
workflow.add_edge("order_node", END)
workflow.add_edge("chat_node", END)

# Graph ko compile karna taaki machine ki tarah run ho sake
app_graph = workflow.compile()

# Step 5: Workflow ko run karne ka runner function
def run_workflow(user_message: str):
    initial_state = {
        "messages": [user_message],
        "current_task": "",
        "is_resolved": False
    }
    # Graph ko execute karna
    final_state = app_graph.invoke(initial_state)
    return final_state["messages"]