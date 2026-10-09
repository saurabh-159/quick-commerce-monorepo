from fastapi import APIRouter
from pydantic import BaseModel
from app.services.langchain_service import run_langchain_shopping_query

router = APIRouter()

class LangChainRequest(BaseModel):
    category: str
    item: str

@router.post("/langchain-suggest")
def langchain_suggest_endpoint(payload: LangChainRequest):
    result = run_langchain_shopping_query(payload.category, payload.item)
    return {"suggestion": result}