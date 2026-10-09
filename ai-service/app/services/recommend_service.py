from app.services.embedding_service import generate_embedding
import math

# Mock Database (Wahi products jo Phase 3 mein the)
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

def get_recommendations(product_id: str, limit: int = 3):
    # 1. Dhoondho ki user ne kaun sa product select kiya hai (Seed Product)
    seed_product = next((p for p in MOCK_PRODUCTS if p["product_id"] == product_id), None)
    if not seed_product:
        return []

    # 2. Seed product ka embedding nikala
    seed_vector = generate_embedding(seed_product["name"])

    recommendations = []
    for product in MOCK_PRODUCTS:
        # Khud wahi product recommend nahi karna hai
        if product["product_id"] == product_id:
            continue
        
        # Baaki products ka embedding nikal kar similarity check ki
        prod_vector = generate_embedding(product["name"])
        score = cosine_similarity(seed_vector, prod_vector)
        
        recommendations.append({
            **product,
            "score": round(score, 2)
        })

    # 3. Score ke hisab se sort karke top results dena
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations[:limit]