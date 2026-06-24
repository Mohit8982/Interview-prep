# Render Deployment Guide

Deploy the FastAPI backend so the **Emergent Universal Key** provider option works.

## Service settings (Web Service on Render)

| Setting              | Value                                                  |
|----------------------|--------------------------------------------------------|
| Environment          | Python                                                 |
| Python Version       | `3.11.9` (set via `backend/runtime.txt`)               |
| Root Directory       | `backend`                                              |
| Build Command        | `pip install -r requirements.txt`                      |
| Start Command        | `uvicorn server:app --host 0.0.0.0 --port $PORT`       |
| Health Check Path    | `/api/health`                                          |

## Environment Variables (Render)

None required. The user passes their own Emergent key in each request — the server never stores it.

## After deploy

1. Copy the Render URL (e.g. `https://intervue-ai-backend.onrender.com`).
2. In your Vercel project → **Settings → Environment Variables**, set:
   ```
   REACT_APP_BACKEND_URL = https://intervue-ai-backend.onrender.com
   ```
3. Trigger a Vercel redeploy (Deployments → ⋯ → Redeploy, uncheck build cache).
4. The Emergent provider options will now work.

## Verify

```bash
curl https://intervue-ai-backend.onrender.com/api/health
# → {"status":"ok"}
```
