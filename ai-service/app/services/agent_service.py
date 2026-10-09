import os
from typing import TypedDict, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END

# 1. Agent ki Memory/State define karna (Jisme messages store honge)
class AgentState(TypedDict):
    messages: List[BaseMessage]

# 2. Node Define karna (Yeh function OpenAI model ko call karega)
def call_model(state: AgentState):
    messages = state["messages"]
    llm = ChatOpenAI(
        model="gpt-3.5-turbo", 
        temperature=0.7, 
        api_key=os.environ.get("OPENAI_API_KEY")
    )
    response = llm.invoke(messages)
    # Naye AI message ko state mein jod kar wapas dena
    return {"messages": messages + [response]}

# 3. LangGraph Workflow Build karna
def run_shopping_agent(user_query: str) -> str:
    # StateGraph initialize kiya
    workflow = StateGraph(AgentState)

    # Node add kiya jiska naam "agent" rakha
    workflow.add_node("agent", call_model)

    # Entry point set kiya ki sabse pehle "agent" node chalega
    workflow.set_entry_point("agent")

    # Agent ke baad seedha END par chale jana hai
    workflow.add_edge("agent", END)

    # Graph ko compile karke runnable app banana
    app = workflow.compile()

    # Initial state create karke run karna
    initial_state = {"messages": [HumanMessage(content=user_query)]}
    result = app.invoke(initial_state)
    
    # Aakhri AI message ka content nikal kar return karna
    final_message = result["messages"][-1]
    return final_message.content