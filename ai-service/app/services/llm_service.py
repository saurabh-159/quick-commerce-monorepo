import os
import time
from openai import OpenAI
from app.utils.cache import get_cached_ai_response, set_cached_ai_response
from app.utils.logger import log_ai_execution

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def get_llm_response_with_cache(message: str, system_prompt: str) -> str:
    start = time.perf_counter()
    cached_response = get_cached_ai_response(message, system_prompt)
    if cached_response:
        log_ai_execution("cache", len(message), time.perf_counter() - start)
        return cached_response

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            timeout=10.0,
        )
        answer = response.choices[0].message.content.strip()
        set_cached_ai_response(message, answer, expire_seconds=3600, system_prompt=system_prompt)
        log_ai_execution("gpt-4o-mini", len(message), time.perf_counter() - start)
        return answer
    except Exception as e:
        print(f"LLM API Error: {e}")
        log_ai_execution("gpt-4o-mini-error", len(message), time.perf_counter() - start)
        return "I am currently experiencing high traffic. How else can I help you with your order?"