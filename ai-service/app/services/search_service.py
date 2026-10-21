import math
from app.services.embedding_service import generate_embedding, get_cached_product_embedding
from app.services.db_tools import list_active_products_sync

def cosine_similarity(v1, v2):
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    magnitude1 = math.sqrt(sum(a * a for a in v1))
    magnitude2 = math.sqrt(sum(b * b for b in v2))
    if not magnitude1 or not magnitude2:
        return 0.0
    return dot_product / (magnitude1 * magnitude2)

def semantic_search(query: str, limit: int = 2):
    query_vector = generate_embedding(query)
    if not query_vector:
        return []

    products = list_active_products_sync()
    scored_products = []
    for product in products:
        prod_vector = get_cached_product_embedding(product["product_id"], product["name"])
        score = cosine_similarity(query_vector, prod_vector)
        scored_products.append({**product, "score": round(score, 2)})

    scored_products.sort(key=lambda x: x["score"], reverse=True)
    return scored_products[:limit]
