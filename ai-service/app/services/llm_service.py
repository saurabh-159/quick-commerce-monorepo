import os
from openai import OpenAI
from fastapi import HTTPException

# OpenAI client initialize kar rahe hain .env se key utha kar
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def get_llm_response(message: str, system_prompt: str) -> str:
    try:
        # LLM API call with timeout protection
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            timeout=10.0 # 10 seconds timeout safety
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"⚠️ LLM API Error: {str(e)}")
        # Fallback response agar API fail ho jaye ya key na ho
        return "I am currently experiencing high traffic. How else can I help you with your order?"