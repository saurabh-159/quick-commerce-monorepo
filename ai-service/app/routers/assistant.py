from fastapi import APIRouter
from app.schemas import AssistantRequest, AssistantResponse
from app.services.rag_service import get_rag_answer

router = APIRouter()

@router.post("/assistant", response_model=AssistantResponse)
def shopping_assistant(payload: AssistantRequest):
    result = get_rag_answer(payload.query)
    return result