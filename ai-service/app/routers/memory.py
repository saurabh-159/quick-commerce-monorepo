from fastapi import APIRouter
from app.schemas import MemoryChatRequest, MemoryChatResponse
from app.services.memory_service import chat_with_memory

router = APIRouter()

@router.post("/chat-memory", response_model=MemoryChatResponse)
def memory_chat_endpoint(payload: MemoryChatRequest):
    answer = chat_with_memory(payload.messages, payload.session_id)
    return {"response": answer}