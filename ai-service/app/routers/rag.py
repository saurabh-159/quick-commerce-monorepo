from fastapi import APIRouter
from pydantic import BaseModel
from app.services.rag_service import add_document_to_db, search_similar_documents
from app.services.llm_service import get_llm_response_with_cache

router = APIRouter()

# Request body ke liye Pydantic models (Validation)
class AddDocRequest(BaseModel):
    doc_id: str
    text: str

class RAGQueryRequest(BaseModel):
    query: str

@router.post("/add-doc", tags=["RAG Pipeline"])
def add_doc(payload: AddDocRequest):
    # Database mein naya document dalne ka route
    result = add_document_to_db(payload.doc_id, payload.text)
    return result

@router.post("/ask-rag", tags=["RAG Pipeline"])
def ask_with_rag(payload: RAGQueryRequest):
    # Step A: User ki query ke hisaab se Vector DB se relevant context nikalna (Retrieval)
    relevant_docs = search_similar_documents(payload.query)
    context = "\n".join(relevant_docs) if relevant_docs else "No context found."
    
    # Step B: Context ko system prompt mein daal kar LLM ko dena (Augmented Generation)
    system_prompt = f"You are a helpful assistant. Use the following context to answer the user's question:\n\n{context}"
    
    # Step C: OpenAI se final smart answer generate karwana
    answer = get_llm_response_with_cache(payload.query, system_prompt)
    
    return {
        "success": True,
        "retrieved_context": relevant_docs,
        "answer": answer
    }