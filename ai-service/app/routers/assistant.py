from fastapi import APIRouter
from app.schemas import AssistantRequest, AssistantResponse
from app.services.catalog_graph import run_catalog_graph

router = APIRouter()

@router.post("/assistant", response_model=AssistantResponse)
def shopping_assistant(payload: AssistantRequest):
    return run_catalog_graph(
        query=payload.query,
        lat=payload.lat,
        lng=payload.lng,
    )