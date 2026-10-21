import os
import json
from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI

router = APIRouter()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class ParseQueryRequest(BaseModel):
    user_query: str

@router.post("/parse-query")
def parse_query(payload: ParseQueryRequest):
    prompt = (
        "Convert this shopping query into JSON with keys "
        "category (string or null), maxPrice (number or null), and tags (array of strings). "
        f"Query: {payload.user_query}"
    )
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Parse query error: {e}")
        return {"category": None, "maxPrice": None, "tags": []}