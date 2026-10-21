import os
from openai import OpenAI
from app.services.session_memory import save_message_to_session, get_session_history

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def chat_with_memory(messages: list, session_id: str = None) -> str:
    try:
        incoming = [{"role": m.role, "content": m.content} for m in messages]
        if session_id:
            history = get_session_history(session_id)
            formatted_messages = history + incoming
            for item in incoming:
                save_message_to_session(session_id, item["role"], item["content"])
        else:
            formatted_messages = incoming

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=formatted_messages,
        )
        answer = response.choices[0].message.content.strip()
        if session_id:
            save_message_to_session(session_id, "assistant", answer)
        return answer
    except Exception as e:
        print(f"Memory Chat Error: {e}")
        return "Sorry, I lost my track. Can you repeat?"