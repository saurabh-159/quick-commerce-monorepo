from fastapi import APIRouter
from app.schemas import AdminProductRequest, AdminProductResponse
from app.services.admin_ai_service import generate_admin_product_content

router = APIRouter()

@router.post("/admin/generate-product-content", response_model=AdminProductResponse)
def admin_generate_content(payload: AdminProductRequest):
    result = generate_admin_product_content(payload.product_name, payload.category)
    return result