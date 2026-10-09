from fastapi import APIRouter
from app.schemas import RecommendRequest, RecommendResponse
from app.services.recommend_service import get_recommendations

router = APIRouter()

@router.post("/recommend", response_model=RecommendResponse)
def recommend_products(payload: RecommendRequest):
    results = get_recommendations(payload.product_id, payload.limit)
    if not results:
        raise HTTPException(status_code=404, detail="Product not found or no recommendations available.")
    
    return {
        "seed_product_id": payload.product_id,
        "recommendations": results
    }