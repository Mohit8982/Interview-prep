"""Backend tests for AI Interview Prep app.

Covers:
- /api/health
- /api/llm/proxy (gemini, openai, invalid provider)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-interview-coach-86.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health endpoint ---
class TestHealth:
    def test_health_ok(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/health", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("emergent_available") is True


# --- LLM proxy endpoint ---
class TestLLMProxy:
    def test_proxy_gemini_ok(self, api_client):
        payload = {
            "provider": "gemini",
            "prompt": "Reply with the single word OK",
            "system_message": "You are a terse assistant. Reply with only the requested word."
        }
        r = api_client.post(f"{BASE_URL}/api/llm/proxy", json=payload, timeout=90)
        assert r.status_code == 200, f"Body: {r.text}"
        data = r.json()
        assert "text" in data and isinstance(data["text"], str) and len(data["text"]) > 0
        assert data.get("provider_used") == "gemini"
        assert data.get("model_used") == "gemini-2.5-flash-lite"

    def test_proxy_openai_ok(self, api_client):
        payload = {
            "provider": "openai",
            "prompt": "Reply with the single word OK",
            "system_message": "You are a terse assistant. Reply with only the requested word."
        }
        r = api_client.post(f"{BASE_URL}/api/llm/proxy", json=payload, timeout=90)
        assert r.status_code == 200, f"Body: {r.text}"
        data = r.json()
        assert "text" in data and isinstance(data["text"], str) and len(data["text"]) > 0
        assert data.get("provider_used") == "openai"
        assert data.get("model_used") == "gpt-4o"

    def test_proxy_invalid_provider(self, api_client):
        payload = {"provider": "anthropic", "prompt": "hi"}
        r = api_client.post(f"{BASE_URL}/api/llm/proxy", json=payload, timeout=30)
        assert r.status_code == 400

    def test_proxy_missing_prompt(self, api_client):
        payload = {"provider": "gemini"}
        r = api_client.post(f"{BASE_URL}/api/llm/proxy", json=payload, timeout=20)
        assert r.status_code in (400, 422)
