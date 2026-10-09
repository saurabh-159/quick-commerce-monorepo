from app.services.embedding_service import generate_embedding
import math

# Mock Products Database (Asli app mein yeh MongoDB / Vector DB se aayega)
MOCK_PRODUCTS = [
    {"product_id": "p1", "name": "Nike Sports Running Shoes for Gym", "category": "Footwear"},
    {"product_id": "p2", "name": "Fresh Organic Cow Milk 1L", "category": "Dairy"},
    {"product_id": "p3", "name": "Chocolate Ice Cream Family Pack", "category": "Desserts"},
    {"product_id": "p4", "name": "Comfortable Walking Sneakers", "category": "Footwear"},
]

def cosine_similarity(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    magnitude1 = math.sqrt(sum(a * a for a in v1))
    magnitude2 = math.sqrt(sum(b * b for b in v2))
    if not magnitude1 or not magnitude2:
        return 0.0
    return dot_product / (magnitude1 * magnitude2)

def semantic_search(query: str, limit: int = 2):
    # 1. User query ka embedding (number) nikala
    query_vector = generate_embedding(query)
    if not query_vector:
        return []

    scored_products = []
    for product in MOCK_PRODUCTS:
        # 2. Product name ka embedding nikala
        prod_vector = generate_embedding(product["name"])
        
        # 3. Dono vectors ki similarity check ki
        score = cosine_similarity(query_vector, prod_vector)
        scored_products.append({**product, "score": round(score, 2)})

    # 4. Sabse acche match wale products ko upar rakhna
    scored_products.sort(key=lambda x: x["score"], reverse=True)
    return scored_products[:limit]