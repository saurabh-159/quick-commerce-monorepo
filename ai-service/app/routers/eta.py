from fastapi import APIRouter
from app.schemas import ETARequest, ETAResponse
from app.services.eta_service import calculate_eta

router = APIRouter()

@router.post("/eta", response_model=ETAResponse)
def get_eta(payload: ETARequest):
    result = calculate_eta(payload.storeLat, payload.storeLng, payload.userLat, payload.userLng)
    return result