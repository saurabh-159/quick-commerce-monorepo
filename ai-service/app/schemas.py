from pydantic import BaseModel
from typing import List, Optional

class ETARequest(BaseModel):
    storeLat: float
    storeLng: float
    userLat: float
    userLng: float

class ETAResponse(BaseModel):
    etaMinutes: int
    distanceKm: float

class RecommendRequest(BaseModel):
    product_id: str
    limit: Optional[int] = 3

class RecommendedProduct(BaseModel):
    product_id: str
    name: str
    category: str
    score: float

class RecommendResponse(BaseModel):
    seed_product_id: str
    recommendations: List[RecommendedProduct]

class ChatRequest(BaseModel):
    message: str
    system_prompt: Optional[str] = "You are a helpful quick-commerce assistant."

class ChatResponse(BaseModel):
    response: str    

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    text: str
    embedding: List[float]
    dimensions: int    

 class AssistantRequest(BaseModel):
    query: str

class AssistantResponse(BaseModel):
    query: str
    context_used: List[str]
    answer: str   


class Message(BaseModel):
    role: str # "user" or "assistant"
    content: str

class MemoryChatRequest(BaseModel):
    messages: List[Message] # Poori chat history

class MemoryChatResponse(BaseModel):
    response: str    

class AdminProductRequest(BaseModel):
    product_name: str
    category: str

class AdminProductResponse(BaseModel):
    title: str
    description: str
    tags: List[str]    

class SupportRequest(BaseModel):
    user_id: str
    query: str

class SupportResponse(BaseModel):
    user_id: str
    query: str
    response: str    