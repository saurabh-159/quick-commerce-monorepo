from fastapi import APIRouter
from pydantic import BaseModel
from app.services.agent_service import run_shopping_agent

router = APIRouter()

class AgentRequest(BaseModel):
    query: str

@router.post("/agent-support")
def agent_support_endpoint(payload: AgentRequest):
    answer = run_shopping_agent(payload.query)
    return {"agent_response": answer}