"""Backend tests for AI Interview Prep API.

Covers:
- /api/health
- /api/llm/emergent (validation & error mapping)
"""
import pytest
import requests

# Backend is supervisor-managed on 0.0.0.0:8001 (internal). Per review request,
# we test via localhost for backend-only verification.
BASE_URL = "http://localhost:8001"


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/health ----------
class TestHealth:
    def test_health_ok(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data == {"status": "ok"}

    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        assert "message" in r.json()


# ---------- /api/llm/emergent validation ----------
class TestEmergentLLMValidation:
    def test_invalid_key_format(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/llm/emergent",
            json={"api_key": "bad-key", "model_choice": "gemini", "prompt": "Hi"},
            timeout=15,
        )
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data
        assert "Invalid Emergent key format" in data["detail"]

    def test_invalid_model_choice(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/llm/emergent",
            json={
                "api_key": "sk-emergent-cD7214d71F59746437",
                "model_choice": "invalid",
                "prompt": "Hi",
            },
            timeout=15,
        )
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data
        assert data["detail"] == "model_choice must be 'gemini' or 'openai'"

    def test_empty_api_key_pydantic_422(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/llm/emergent",
            json={"api_key": "", "model_choice": "gemini", "prompt": "Hi"},
            timeout=15,
        )
        # Pydantic min_length=1 => 422
        assert r.status_code == 422

    def test_empty_prompt_pydantic_422(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/llm/emergent",
            json={
                "api_key": "sk-emergent-cD7214d71F59746437",
                "model_choice": "gemini",
                "prompt": "",
            },
            timeout=15,
        )
        assert r.status_code == 422


# ---------- /api/llm/emergent provider error mapping ----------
class TestEmergentLLMErrorMapping:
    def test_provided_key_clean_response(self, api_client):
        """Use the provided sk-emergent- key. Expect either:
        - 200 with text/model_used (key still has budget, full stack works), OR
        - 401/402/429/502 with clean HTTPException 'detail' (error mapping works).
        Never a 500 traceback."""
        r = api_client.post(
            f"{BASE_URL}/api/llm/emergent",
            json={
                "api_key": "sk-emergent-cD7214d71F59746437",
                "model_choice": "gemini",
                "prompt": "Reply with single word OK",
            },
            timeout=60,
        )
        assert r.status_code != 500, f"500 leak: {r.text}"
        assert r.status_code in (200, 401, 402, 429, 502), (
            f"Unexpected status {r.status_code}: {r.text}"
        )
        data = r.json()
        if r.status_code == 200:
            assert "text" in data and isinstance(data["text"], str) and len(data["text"]) > 0
            assert data.get("model_used") == "gemini/gemini-2.5-flash"
        else:
            assert "detail" in data
            assert isinstance(data["detail"], str) and len(data["detail"]) > 0
            assert "Traceback" not in data["detail"]

    def test_openai_model_choice_routes(self, api_client):
        """Verify openai branch maps without 500 (clean response either way)."""
        r = api_client.post(
            f"{BASE_URL}/api/llm/emergent",
            json={
                "api_key": "sk-emergent-cD7214d71F59746437",
                "model_choice": "openai",
                "prompt": "Reply with single word OK",
            },
            timeout=60,
        )
        assert r.status_code != 500, f"500 leak: {r.text}"
        assert r.status_code in (200, 401, 402, 429, 502)
        if r.status_code == 200:
            assert r.json().get("model_used") == "openai/gpt-4o"
