import time
from fastapi import Request
from fastapi.responses import JSONResponse
from app.config import settings
from app.utils.cache import redis_client

PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc", "/docs/oauth2-redirect"}

async def api_key_and_rate_limit(request: Request, call_next):
    path = request.url.path

    if path in PUBLIC_PATHS:
        return await call_next(request)

    # 1) API key (sirf jab AI_API_KEY set ho)
    if settings.AI_API_KEY:
        incoming = request.headers.get("X-AI-API-Key", "")
        if incoming != settings.AI_API_KEY:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "Invalid or missing X-AI-API-Key"},
            )

    # 2) Rate limit (per IP, per minute)
    client_ip = request.client.host if request.client else "unknown"
    minute_bucket = int(time.time() // 60)
    rate_key = f"ai:rate:{client_ip}:{minute_bucket}"

    try:
        count = redis_client.incr(rate_key)
        if count == 1:
            redis_client.expire(rate_key, 60)
        if count > settings.RATE_LIMIT_PER_MINUTE:
            return JSONResponse(
                status_code=429,
                content={"success": False, "error": "Rate limit exceeded. Try again in a minute."},
            )
    except Exception as e:
        print(f"Rate limit Redis error: {e}")
        # Redis down = request allow (fail-open)

    return await call_next(request)