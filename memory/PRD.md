# INTERVUE.AI — AI Interview Prep (Client-Side)

## Original Problem Statement
Build a 100% client-side React AI Interview preparation app with NO backend logic. All AI calls happen directly from the browser. Tech: React 18 + Tailwind, @phosphor-icons/react, framer-motion, @google/genai (Gemini), plain fetch (OpenAI). Storage: sessionStorage (active) + localStorage (history). Four screens: Input → Interview → Results → History.

## Architecture
- Frontend only: React Router, sessionStorage active state, localStorage history.
- Backend: kept minimal (only /api/health). All AI calls are made from the browser using user-provided API keys.
- AI Providers:
  - Google Gemini Flash Lite via `@google/genai` SDK (with Google Search grounding)
  - OpenAI GPT-4o via plain `fetch`
- Voice: browser-native SpeechRecognition (input) + SpeechSynthesis (output)

## Design System
Resume Intelligence dark theme. Amber primary (#F59E0B). Inter font + JetBrains Mono micro-labels. Background grid + ambient blobs. Asymmetric layouts, no bouncy animations.

## Implemented (2026-02-23)
- ✅ Input Screen: company/role/JD/type/provider/API key inputs, AI-inferred difficulty, 8–10 question generation
- ✅ Interview Screen: split view (live feedback + chat), font controls, voice toggle, mic input, session persistence across reload
- ✅ Results Screen: overall score, per-question breakdown with good/missing/feedback
- ✅ History Screen: localStorage-backed past interviews
- ✅ React Router navigation, ambient background, status pills

## Removed (per user request)
- ❌ Emergent Universal Key fallback (backend `/api/llm/proxy` endpoint and provider options) — app is now strictly client-side.

## Backlog / Next
- P1: Export interview transcript (PDF/MD)
- P1: Resume upload + JD-vs-resume matching for tailored questions
- P2: Coding sandbox embedded for technical rounds
- P2: Multi-language support
