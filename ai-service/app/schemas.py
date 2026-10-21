from pydantic import BaseModel, Field
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

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 5

class SearchResult(BaseModel):
    product_id: str
    name: str
    category: str
    score: float

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]

class AssistantRequest(BaseModel):
    query: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class AssistantCard(BaseModel):
    type: str  # "store" | "product"
    id: str
    title: str
    subtitle: Optional[str] = None
    meta: Optional[str] = None
    href: str
    store_id: Optional[str] = None

class AssistantResponse(BaseModel):
    query: str
    context_used: List[str]
    answer: str
    tools_used: Optional[List[str]] = None
    cards: Optional[List[AssistantCard]] = None


class Message(BaseModel):
    role: str # "user" or "assistant"
    content: str

class MemoryChatRequest(BaseModel):
    messages: List[Message]
    session_id: Optional[str] = None

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

class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="Service status")
    message: str = Field(..., description="Detailed message")

class GenericPromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="User prompt text")
    temperature: float = Field(0.7, ge=0.0, le=1.0, description="Sampling temperature")
    system_prompt: Optional[str] = Field(None, description="Optional system instruction")
