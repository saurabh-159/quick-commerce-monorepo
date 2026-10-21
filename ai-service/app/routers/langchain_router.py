from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.langchain_service import run_langchain_shopping_query

router = APIRouter()

class LangChainSuggestRequest(BaseModel):
    category: str
    item: str

@router.post("/langchain-suggest", tags=["LangChain Integration"])
def langchain_suggest_endpoint(payload: LangChainSuggestRequest):
    """
    LangChain LCEL chain ke through smart product suggestions generate karna.
    """
    try:
        suggestion = run_langchain_shopping_query(payload.category, payload.item)
        return {
            "success": True,
            "suggestion": suggestion
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))