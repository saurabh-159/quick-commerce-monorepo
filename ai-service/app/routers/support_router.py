from fastapi import APIRouter
from app.schemas import SupportRequest, SupportResponse
from app.services.support_service import handle_order_support

router = APIRouter()

@router.post("/support/query", response_model=SupportResponse)
def order_support_endpoint(payload: SupportRequest):
    answer = handle_order_support(payload.user_id, payload.query)
    return {
        "user_id": payload.user_id,
        "query": payload.query,
        "response": answer
    }