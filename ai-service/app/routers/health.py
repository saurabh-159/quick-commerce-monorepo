from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    return {"success": True, "message": "ai-service is up", "data": {"service": "ai-service"}}