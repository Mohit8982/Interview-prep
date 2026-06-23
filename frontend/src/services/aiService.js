// AI service for client-side calls + optional Emergent backend fallback
// Providers: 'gemini' (client-side @google/genai), 'openai' (client-side fetch), 'emergent' (backend proxy)

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function parseJsonFromText(text) {
  if (!text) return null;
  // Strip code fences
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  // Find first { or [
  const firstObj = cleaned.indexOf('{');
  const firstArr = cleaned.indexOf('[');
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) return null;
  // Find matching last bracket
  const lastObj = cleaned.lastIndexOf('}');
  const lastArr = cleaned.lastIndexOf(']');
  const end = Math.max(lastObj, lastArr);
  if (end === -1) return null;
  const jsonStr = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function buildError(status, providerMsg) {
  if (status === 401 || status === 403) return new Error('Invalid API key');
  if (status === 429) return new Error('Rate limit exceeded');
  if (!status) return new Error('Connection failed, check your internet');
  return new Error(providerMsg || `Request failed (${status})`);
}

// === OpenAI direct fetch ===
async function callOpenAI(apiKey, prompt, systemMessage = 'You are a helpful assistant.') {
  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });
  } catch (e) {
    throw buildError(0, e.message);
  }
  if (!res.ok) {
    let body = '';
    try {
      const j = await res.json();
      body = j?.error?.message || '';
    } catch { /* ignore */ }
    throw buildError(res.status, body);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// === Gemini via @google/genai SDK (lazy-loaded) ===
let _geminiModule = null;
async function getGenAI(apiKey) {
  if (!_geminiModule) {
    _geminiModule = await import('@google/genai');
  }
  const { GoogleGenAI } = _geminiModule;
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

async function callGemini(apiKey, prompt, systemMessage = 'You are a helpful assistant.') {
  try {
    const ai = await getGenAI(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      config: {
        systemInstruction: systemMessage,
        tools: [{ googleSearch: {} }],
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    // response.text is a getter on the SDK
    const text = typeof response.text === 'function' ? response.text() : response.text;
    return text || '';
  } catch (e) {
    const msg = (e && e.message) || '';
    if (/API key|401|403|invalid/i.test(msg)) throw new Error('Invalid API key');
    if (/429|quota|rate/i.test(msg)) throw new Error('Rate limit exceeded');
    if (/fetch|network/i.test(msg)) throw new Error('Connection failed, check your internet');
    throw new Error(msg || 'Gemini request failed');
  }
}

// === Emergent backend proxy ===
async function callEmergent(providerForEmergent, prompt, systemMessage = 'You are a helpful assistant.') {
  let res;
  try {
    res = await fetch(`${BACKEND_URL}/api/llm/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: providerForEmergent,
        prompt,
        system_message: systemMessage,
      }),
    });
  } catch (e) {
    throw buildError(0, e.message);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.detail || '';
    } catch { /* ignore */ }
    throw buildError(res.status, detail);
  }
  const data = await res.json();
  return data?.text || '';
}

// === Public API ===
// provider: 'gemini' | 'openai' | 'emergent-gemini' | 'emergent-openai'
export async function callAI({ provider, apiKey, prompt, systemMessage }) {
  if (provider === 'gemini') return callGemini(apiKey, prompt, systemMessage);
  if (provider === 'openai') return callOpenAI(apiKey, prompt, systemMessage);
  if (provider === 'emergent-gemini') return callEmergent('gemini', prompt, systemMessage);
  if (provider === 'emergent-openai') return callEmergent('openai', prompt, systemMessage);
  throw new Error(`Unknown provider: ${provider}`);
}

// === Prompts / High-level helpers ===

export async function inferDifficultyAndQuestions({ provider, apiKey, company, role, jobDescription, interviewType }) {
  const numQ = interviewType === 'System Design' ? 1 : '8 to 10';
  const prompt = `You are a senior hiring manager designing a mock interview.

COMPANY: ${company}
ROLE: ${role}
INTERVIEW TYPE: ${interviewType}
JOB DESCRIPTION:
${jobDescription || '(none provided)'}

TASK:
1. Infer the overall difficulty as one of: "Easy", "Medium", "Hard" based on the job description seniority and complexity.
2. Generate ${numQ} highly relevant ${interviewType} interview questions tailored to this exact role, company, and JD. ${interviewType === 'System Design' ? 'For System Design, produce ONE comprehensive architecture question.' : 'Make questions specific, not generic.'}

Return ONLY valid JSON in this exact shape, no prose, no markdown:
{
  "difficulty": "Easy" | "Medium" | "Hard",
  "questions": ["...", "..."]
}`;

  const text = await callAI({ provider, apiKey, prompt, systemMessage: 'You are a strict JSON generator. Return only valid JSON.' });
  const parsed = parseJsonFromText(text);
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('AI did not return a valid question set. Please try again.');
  }
  const difficulty = ['Easy', 'Medium', 'Hard'].includes(parsed.difficulty) ? parsed.difficulty : 'Medium';
  return { difficulty, questions: parsed.questions };
}

export async function interviewerReply({ provider, apiKey, company, interviewType, currentQuestion, questionNumber, totalQuestions, conversation }) {
  const system = `You are a professional ${interviewType} interviewer for ${company}.
STRICT GUIDELINES:
- NO small talk, pleasantries, or casual conversation
- Ask direct, specific follow-up questions (1-2 max)
- Probe for technical depth, examples, or clarification
- Keep responses VERY brief (1-2 sentences maximum)
- After 2-3 exchanges on the same question, move on: "Moving to question ${questionNumber + 1}: [next question]"
- Never say "that's interesting", "great" - stay professional and analytical
- For ${interviewType} interviews, ask only relevant technical/behavioral follow-ups`;

  const convoText = conversation
    .map((m) => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`)
    .join('\n');

  const prompt = `Current question being discussed (Q${questionNumber} of ${totalQuestions}): "${currentQuestion}"

Conversation so far:
${convoText}

Respond as the interviewer following the strict guidelines. Reply with ONLY your next short interviewer message (no labels, no JSON).`;

  const text = await callAI({ provider, apiKey, prompt, systemMessage: system });
  return text.trim();
}

export async function analyzeAnswer({ provider, apiKey, interviewType, question, candidateAnswer }) {
  const prompt = `Evaluate the following candidate answer for a ${interviewType} interview.

QUESTION: ${question}
CANDIDATE ANSWER: ${candidateAnswer}

Score the answer from 0 to 10. Provide concise feedback.
Return ONLY valid JSON:
{
  "score": <0-10 integer>,
  "good": "1-2 sentences on what was strong",
  "improve": "1-2 sentences on how to improve"
}`;

  const text = await callAI({ provider, apiKey, prompt, systemMessage: 'You are a strict JSON generator. Return only valid JSON.' });
  const parsed = parseJsonFromText(text);
  if (!parsed) {
    return { score: 5, good: 'Answer recorded.', improve: 'Add specific examples and metrics to strengthen the response.' };
  }
  const score = Math.max(0, Math.min(10, parseInt(parsed.score, 10) || 0));
  return {
    score,
    good: parsed.good || 'Answer recorded.',
    improve: parsed.improve || 'Add more specifics.',
  };
}

export async function finalEvaluation({ provider, apiKey, interviewType, transcript }) {
  const prompt = `Provide a final per-question evaluation for this ${interviewType} interview transcript.
${transcript}

Return ONLY valid JSON:
{
  "perQuestion": [
    { "question": "...", "score": <0-10>, "good": "...", "missing": "...", "feedback": "..." }
  ]
}`;

  const text = await callAI({ provider, apiKey, prompt, systemMessage: 'You are a strict JSON generator. Return only valid JSON.' });
  const parsed = parseJsonFromText(text);
  if (!parsed || !Array.isArray(parsed.perQuestion)) {
    return { perQuestion: [] };
  }
  return parsed;
}

export async function checkEmergentAvailable() {
  try {
    const r = await fetch(`${BACKEND_URL}/api/health`);
    if (!r.ok) return false;
    const j = await r.json();
    return !!j.emergent_available;
  } catch {
    return false;
  }
}
