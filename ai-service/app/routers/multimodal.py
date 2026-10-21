import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

router = APIRouter()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class ImageAnalysisRequest(BaseModel):
    image_url: str
    prompt: str = "What is in this image and is there any damage visible?"

@router.post("/analyze-image", tags=["Multimodal AI"])
def analyze_product_image(payload: ImageAnalysisRequest):
    """
    User dwara di gayi product image ko analyze karke batana ki wo thik hai ya damaged.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o",  # Multimodal model jo images samajh sakta hai
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": payload.prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": payload.image_url,
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
        )
        
        analysis_result = response.choices[0].message.content
        return {
            "success": True,
            "analysis": analysis_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))