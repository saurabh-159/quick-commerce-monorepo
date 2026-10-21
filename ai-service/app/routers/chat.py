import redis
import json

# Redis server se connect kar rahe hain (Localhost par default port 6379)
# Node.js mein jaise redis.createClient() hota hai, wahi yeh hai
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def get_cached_ai_response(prompt: str):
    """
    Check karna ki kya is prompt ka jawab pehle se Redis cache mein hai ya nahi.
    """
    try:
        cached_answer = redis_client.get(prompt)
        if cached_answer:
            print("⚡ [CACHE HIT]: Response found in Redis! Saving OpenAI cost.")
            return cached_answer
    except Exception as e:
        print(f"Redis connection error: {e}")
        
    return None # Cache miss

def set_cached_ai_response(prompt: str, response: str, expire_seconds: int = 3600):
    """
    AI ke response ko Redis mein save karna (default 1 ghante ke liye expire time).
    """
    try:
        # Key: Prompt, Value: AI Response, Expiration: 1 hour
        redis_client.setex(prompt, expire_seconds, response)
    except Exception as e:
        print(f"Redis save error: {e}")