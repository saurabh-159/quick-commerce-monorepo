from fastapi import APIRouter
from app.schemas import EmbedRequest, EmbedResponse
from app.services.embedding_service import generate_embedding

router = APIRouter()

@router.post("/embed", response_model=EmbedResponse)
def create_embedding(payload: EmbedRequest):
    vector = generate_embedding(payload.text)
    return {
        "text": payload.text,
        "embedding": vector,
        "dimensions": len(vector)
    }


@router.post("/search", response_model=SearchResponse)
def search_products(payload: SearchRequest):
    results = semantic_search(payload.query, payload.limit)
    return {
        "query": payload.query,
        "results": results
    }    