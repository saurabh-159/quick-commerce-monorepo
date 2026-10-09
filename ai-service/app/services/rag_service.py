import os
from openai import OpenAI
from app.services.search_service import semantic_search

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def get_rag_answer(query: str) -> dict:
    # Step 1: Retrieval (Database/Mock se relevant products nikalna)
    relevant_products = semantic_search(query, limit=2)
    
    # Products ko text context banana
    context_texts = [p["name"] for p in relevant_products]
    context_block = "\n".join([f"- {name}" for name in context_texts])

    # Step 2: Prompt designing with strict grounding rules
    system_prompt = (
        "You are a helpful quick-commerce shopping assistant. "
        "Answer the user's question using ONLY the provided catalog context below. "
        "If the answer cannot be found in the context, politely say that the item is currently not available in our store."
    )

    user_prompt = f"Catalog Context:\n{context_block}\n\nUser Question: {query}"

    try:
        # Step 3: LLM Generation (Context + Question bhejna)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0 # Strict answers ke liye low temperature
        )
        answer = response.choices[0].message.content.strip()
    except Exception as e:
        print(f"⚠️ RAG LLM Error: {str(e)}")
        answer = "Sorry, I am unable to process your request right now."

    return {
        "query": query,
        "context_used": context_texts,
        "answer": answer
    }