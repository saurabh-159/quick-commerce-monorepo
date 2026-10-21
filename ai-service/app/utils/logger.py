import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GenAILogger")

def log_ai_execution(model_name: str, prompt_length: int, latency_seconds: float):
    """
    AI execution metrics aur latency ko log karna.
    """
    logger.info(f"📊 [AI METRICS] Model: {model_name} | Prompt Chars: {prompt_length} | Latency: {latency_seconds:.2f}s")