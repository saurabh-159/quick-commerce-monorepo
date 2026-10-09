import os
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def chat_with_memory(messages: list) -> str:
    try:
        # Pura message history array seedhe OpenAI ko bhejte hain
        formatted_messages = [{"role": m.role, "content": m.content} for m in messages]
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=formatted_messages
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"⚠️ Memory Chat Error: {str(e)}")
        return "Sorry, I lost my track. Can you repeat?"