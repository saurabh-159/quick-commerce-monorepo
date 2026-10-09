from fastapi import APIRouter
from app.schemas import ChatRequest, ChatResponse
from app.services.llm_service import get_llm_response

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat_with_llm(payload: ChatRequest):
    answer = get_llm_response(payload.message, payload.system_prompt)
    return {"response": answer}