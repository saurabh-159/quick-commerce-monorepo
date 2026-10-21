import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.config import settings
from app.utils.security_middleware import api_key_and_rate_limit

load_dotenv()

app = FastAPI(
    title="Gen AI Master Production API",
    version="1.0.0",
    description="Fully Production-Ready Gen AI Backend Pipeline for Quick Commerce"
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logging.info(f"Path: {request.url.path} | Execution Time: {process_time:.4f}s")
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    return await api_key_and_rate_limit(request, call_next)


from app.routers import (
    health, eta, recommend, rag, agent, multimodal, security,
    langchain_router, memory, search, assistant, tools,
    agent_router, support_router, admin_router, parse,
)

app.include_router(health.router, tags=["Health"])
app.include_router(eta.router, tags=["ETA Service"])
app.include_router(recommend.router, tags=["Recommendations"])
app.include_router(rag.router, prefix="/api/v1/rag", tags=["RAG Pipeline"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["AI Agents & LangGraph"])
app.include_router(multimodal.router, prefix="/api/v1/multimodal", tags=["Multimodal AI"])
app.include_router(security.router, prefix="/api/v1/security", tags=["Security Guardrails"])

app.include_router(langchain_router.router, tags=["LangChain"])
app.include_router(memory.router, tags=["Memory"])
app.include_router(search.router, tags=["Search"])
app.include_router(assistant.router, tags=["Assistant"])
app.include_router(tools.router, tags=["Tools"])
app.include_router(agent_router.router, tags=["Agent Support"])
app.include_router(support_router.router, tags=["Order Support"])
app.include_router(admin_router.router, tags=["Admin AI"])
app.include_router(parse.router, tags=["Parse Query"])

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Gen AI Master Service is 100% Production Ready and Live!"}