def check_prompt_injection(user_message: str) -> bool:
    """
    Check karna ki kya user AI ko hack karne ki koshish kar raha hai (Prompt Injection).
    """
    blacklisted_phrases = [
        "ignore previous instructions",
        "forget all rules",
        "system prompt",
        "reveal your secret",
        "hack database"
    ]
    
    message_lower = user_message.lower()
    
    # Check karna ki koi dangerous phrase message mein hai ya nahi
    for phrase in blacklisted_phrases:
        if phrase in message_lower:
            return True  # Threat detected!
            
    return False # Safe message