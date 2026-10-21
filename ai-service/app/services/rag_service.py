import os
from openai import OpenAI
from app.core.vector_db import get_vector_collection

# OpenAI client initialize karna
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
collection = get_vector_collection()

def add_document_to_db(doc_id: str, text: str):
    """
    Step 1: Text ko OpenAI ke embedding model se numbers (vectors) mein convert karna
    """
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    vector = response.data[0].embedding
    
    # Step 2: Vector aur original text ko database (collection) mein save karna
    collection.add(
        ids=[doc_id],
        embeddings=[vector],
        documents=[text]
    )
    return {"status": "success", "message": "Document added successfully!"}

def search_similar_documents(query: str, n_results: int = 2):


    """
    Step 3: User ke sawal (query) ko vector mein badalkar database se sabse milta-julta text dhundna
    """
    response = client.embeddings.create(
        input=query,
        model="text-embedding-3-small"
    )
    query_vector = response.data[0].embedding
    
    # Semantic search run karna
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=n_results
    )
    
    # Jo documents match hue unhe return karna
    return results['documents'][0] if results['documents'] else []


def get_rag_answer(query: str) -> dict:
    from app.services.llm_service import get_llm_response_with_cache
    from app.prompts.templates import RAG_CONTEXT_PROMPT

    docs = search_similar_documents(query)
    context = "\n".join(docs) if docs else "No context found."
    system_prompt = RAG_CONTEXT_PROMPT.format(context=context, query=query)
    answer = get_llm_response_with_cache(query, system_prompt)
    return {
        "query": query,
        "context_used": docs,
        "answer": answer,
    }