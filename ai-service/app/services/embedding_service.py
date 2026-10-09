import os
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def generate_embedding(text: str) -> list[float]:
    try:
        # OpenAI ka text-embedding-3-small model use kar rahe hain
        response = client.embeddings.create(
            input=[text],
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"⚠️ Embedding Generation Error: {str(e)}")
        return []