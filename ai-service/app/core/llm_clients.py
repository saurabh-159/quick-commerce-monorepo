import os
from openai import OpenAI

class OpenAIClient:
    def __init__(self):
        # OpenAI client initialize karna .env key ke sath
        self.client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    def generate(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> str:
        """
        Sirf OpenAI (gpt-4o-mini) ko call karne ka clean method.
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                timeout=10.0
            )
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"⚠️ OpenAI API Error: {str(e)}")
            return "I am currently experiencing high traffic. Please try again later."

# Single instance export karna taaki poore project mein reuse ho sake
openai_llm = OpenAIClient()