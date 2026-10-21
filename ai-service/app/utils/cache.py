import hashlib
import redis
from app.config import settings

redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

def _make_cache_key(message: str, system_prompt: str = "") -> str:
    raw = f"{system_prompt}||{message}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"ai:cache:{digest}"

def get_cached_ai_response(message: str, system_prompt: str = ""):
    try:
        cached_answer = redis_client.get(_make_cache_key(message, system_prompt))
        if cached_answer:
            print("[CACHE HIT]: Response found in Redis.")
            return cached_answer
    except Exception as e:
        print(f"Redis connection error: {e}")
    return None

def set_cached_ai_response(message: str, response: str, expire_seconds: int = 3600, system_prompt: str = ""):
    try:
        redis_client.setex(
            _make_cache_key(message, system_prompt),
            expire_seconds,
            response,
        )
    except Exception as e:
        print(f"Redis save error: {e}")