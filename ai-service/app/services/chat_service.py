from app.core.llm_clients import openai_llm

class ChatService:
    @staticmethod
    async def generate_response(prompt: str, system_prompt: str = None, temperature: float = 0.7):
        system = system_prompt or "You are a helpful AI assistant."
        return openai_llm.generate(prompt, system)

chat_service = ChatService()
