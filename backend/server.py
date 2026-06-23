from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)


class EmergentLLMRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    api_key: str = Field(..., min_length=1, description="User's Emergent universal key (sk-emergent-...)")
    model_choice: str = Field("gemini", description="gemini | openai")
    prompt: str = Field(..., min_length=1)
    system_message: Optional[str] = "You are a helpful assistant."


class EmergentLLMResponse(BaseModel):
    text: str
    model_used: str


@api_router.get("/")
async def root():
    return {"message": "AI Interview Prep API"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


@api_router.post("/llm/emergent", response_model=EmergentLLMResponse)
async def llm_emergent(req: EmergentLLMRequest):
    """Proxy LLM call using a USER-PROVIDED Emergent universal key.
    The key is never stored on the server — it's used only for this single call.
    """
    if not req.api_key.startswith("sk-emergent-"):
        raise HTTPException(status_code=400, detail="Invalid Emergent key format (expected sk-emergent-...)")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"emergentintegrations not available: {e}")

    choice = (req.model_choice or "gemini").lower()
    if choice == "openai":
        provider_id, model = "openai", "gpt-4o"
    elif choice == "gemini":
        provider_id, model = "gemini", "gemini-2.5-flash"
    else:
        raise HTTPException(status_code=400, detail="model_choice must be 'gemini' or 'openai'")

    try:
        chat = LlmChat(
            api_key=req.api_key,
            session_id=str(uuid.uuid4()),
            system_message=req.system_message or "You are a helpful assistant.",
        ).with_model(provider_id, model)

        text = await chat.send_message(UserMessage(text=req.prompt))
        if not isinstance(text, str):
            text = str(text)
        return EmergentLLMResponse(text=text, model_used=f"{provider_id}/{model}")
    except Exception as e:
        msg = str(e)
        logger.exception("Emergent LLM call failed")
        if "budget" in msg.lower():
            raise HTTPException(status_code=402, detail="Emergent key budget exceeded. Add credits at Profile → Universal Key.")
        if "401" in msg or "invalid" in msg.lower() or "unauthor" in msg.lower():
            raise HTTPException(status_code=401, detail="Invalid Emergent key or insufficient permissions")
        if "429" in msg or "rate" in msg.lower() or "quota" in msg.lower():
            raise HTTPException(status_code=429, detail="Rate limit / quota exceeded")
        raise HTTPException(status_code=502, detail=f"LLM call failed: {msg}")


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
