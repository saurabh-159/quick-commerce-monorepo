from fastapi import APIRouter
from pydantic import BaseModel
from app.services.tool_service import run_tool_assisted_chat

router = APIRouter()

class ToolRequest(BaseModel):
    message: str

@router.post("/tool-chat")
def tool_chat_endpoint(payload: ToolRequest):
    result = run_tool_assisted_chat(payload.message)
    return result