import redis
import json
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def save_message_to_session(session_id: str, role: str, content: str):
    """
    User ya assistant ke message ko Redis session list mein push karna (24h TTL).
    """
    try:
        message_data = {"role": role, "content": content}
        redis_client.rpush(f"session:{session_id}", json.dumps(message_data))
        redis_client.expire(f"session:{session_id}", 86400)
    except Exception as e:
        print(f"Redis session save error: {e}")

def get_session_history(session_id: str) -> list:
    """
    Redis se purani chat history fetch karna.
    """
    try:
        raw_messages = redis_client.lrange(f"session:{session_id}", 0, -1)
        return [json.loads(msg) for msg in raw_messages]
    except Exception as e:
        print(f"Redis session read error: {e}")
        return []