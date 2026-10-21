import json
from openai import OpenAI
from app.config import settings
from app.utils.cache import redis_client

client = OpenAI(api_key=settings.OPENAI_API_KEY or "sk-unset")

def generate_embedding(text: str) -> list[float]:
    try:
        response = client.embeddings.create(
            input=[text],
            model="text-embedding-3-small",
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding Generation Error: {e}")
        return []

def get_cached_product_embedding(product_id: str, name: str) -> list[float]:
    key = f"ai:embed:{product_id}"
    try:
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        print(f"Embedding cache read error: {e}")

    vector = generate_embedding(name)
    if not vector:
        return []

    try:
        redis_client.setex(key, 86400, json.dumps(vector))
    except Exception as e:
        print(f"Embedding cache write error: {e}")

    return vector