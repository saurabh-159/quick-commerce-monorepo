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

def get_recommendations(product_id: str, limit: int = 3):
    products = list_active_products_sync()
    seed_product = next((p for p in products if p["product_id"] == product_id), None)
    if not seed_product:
        return []

    seed_vector = get_cached_product_embedding(seed_product["product_id"], seed_product["name"])
    if not seed_vector:
        seed_vector = generate_embedding(seed_product["name"])
    if not seed_vector:
        return []

    recommendations = []
    for product in products:
        if product["product_id"] == product_id:
            continue
        prod_vector = get_cached_product_embedding(product["product_id"], product["name"])
        score = cosine_similarity(seed_vector, prod_vector)
        recommendations.append({**product, "score": round(score, 2)})

    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations[:limit]