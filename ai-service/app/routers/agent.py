from fastapi import APIRouter
from pydantic import BaseModel
from app.services.agent_service import run_agent_with_tools

router = APIRouter()

class AgentRequest(BaseModel):
    message: str

@router.post("/run-agent", tags=["AI Agents & Tools"])
def run_ai_agent(payload: AgentRequest):
    # Agent service call karna
    agent_answer = run_agent_with_tools(payload.message)
    
    return {
        "success": True,
        "response": agent_answer
    }