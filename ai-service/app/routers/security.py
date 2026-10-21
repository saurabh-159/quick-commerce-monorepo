from fastapi import APIRouter
from pydantic import BaseModel
from app.utils.security_filters import check_prompt_injection
from app.services.llm_service import get_llm_response_with_cache
from app.prompts.templates import QUICK_COMMERCE_SYSTEM_PROMPT


router = APIRouter()

class SecureChatRequest(BaseModel):
    message: str
    system_prompt: str = QUICK_COMMERCE_SYSTEM_PROMPT

@router.post("/secure-chat", tags=["Security & Guardrails"])
def secure_chat_endpoint(payload: SecureChatRequest):
    """
    Pehle prompt injection check karega, safe hone par cached LLM response dega.
    """
    # Step 1: Security Guardrail Check
    is_threat = check_prompt_injection(payload.message)
    
    if is_threat:
        return {
            "success": False,
            "error": "Security Alert: Malicious prompt injection or forbidden keyword detected. Request blocked!"
        }
        
    # Step 2: Secure aur Cached AI Response lana
    answer = get_llm_response_with_cache(payload.message, payload.system_prompt)
    
    return {
        "success": True,
        "source": "secure_ai_pipeline",
        "response": answer
    }