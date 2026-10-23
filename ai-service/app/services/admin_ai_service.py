import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def generate_admin_product_content(product_name: str, category: str) -> dict:
    prompt = (
        f"You are an e-commerce catalog expert. For the product '{product_name}' in category '{category}', "
        "generate a professional SEO-friendly product title, a short catchy description (2 sentences), "
        "and a list of 4-5 relevant search tags. "
        "Return the output STRICTLY as a JSON object with keys: 'title', 'description', and 'tags' (array of strings)."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"⚠️ Admin AI Error: {str(e)}")
        return {
            "title": product_name,
            "description": "High quality product available for quick delivery.",
            "tags": [category, product_name.lower()]
        }