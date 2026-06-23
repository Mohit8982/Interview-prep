from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (kept for template parity; app is client-side first)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")


class LLMProxyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    provider: str = Field(..., description="openai | gemini")
    prompt: str
    system_message: Optional[str] = "You are a helpful assistant."


class LLMProxyResponse(BaseModel):
    text: str
    provider_used: str
    model_used: str


@api_router.get("/")
async def root():
    return {"message": "AI Interview Prep API", "emergent_key_available": bool(EMERGENT_LLM_KEY)}


@api_router.get("/health")
async def health():
    return {"status": "ok", "emergent_available": bool(EMERGENT_LLM_KEY)}


@api_router.post("/llm/proxy", response_model=LLMProxyResponse)
async def llm_proxy(req: LLMProxyRequest):
    """Optional fallback: call LLMs via Emergent universal key on the server.
    Frontend uses this only when user opts for the Emergent fallback option.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="Emergent key not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"emergentintegrations not available: {e}")

    provider = req.provider.lower()
    if provider == "openai":
        model = "gpt-4o"
        provider_id = "openai"
    elif provider == "gemini":
        model = "gemini-2.5-flash-lite"
        provider_id = "gemini"
    else:
        raise HTTPException(status_code=400, detail="provider must be openai or gemini")

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=req.system_message or "You are a helpful assistant.",
        ).with_model(provider_id, model)

        user_msg = UserMessage(text=req.prompt)
        text = await chat.send_message(user_msg)
        if not isinstance(text, str):
            text = str(text)
        return LLMProxyResponse(text=text, provider_used=provider_id, model_used=model)
    except Exception as e:
        logger.exception("LLM proxy error")
        raise HTTPException(status_code=502, detail=f"LLM call failed: {e}")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
