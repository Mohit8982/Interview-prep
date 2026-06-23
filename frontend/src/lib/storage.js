// Storage helpers for sessionStorage (active interview) and localStorage (history)

const SS = window.sessionStorage;
const LS = window.localStorage;

export const SS_KEYS = {
  apiKey: 'currentApiKey',
  provider: 'currentProvider',
  interviewData: 'interviewData',
  sessionId: 'sessionId',
  currentQuestionIndex: 'currentQuestionIndex',
  chatMessages: 'chatMessages',
  liveFeedback: 'liveFeedback',
  chatFontSize: 'chatFontSize',
  voiceOn: 'voiceOn',
};

export const LS_KEYS = {
  interviews: 'interviews',
};

export function ssGet(key, fallback = null) {
  try {
    const v = SS.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function ssSet(key, value) {
  try {
    SS.setItem(key, JSON.stringify(value));
  } catch { /* quota */ }
}

export function ssRemove(key) {
  try { SS.removeItem(key); } catch { /* ignore */ }
}

export function clearActiveSession() {
  [
    SS_KEYS.interviewData,
    SS_KEYS.sessionId,
    SS_KEYS.currentQuestionIndex,
    SS_KEYS.chatMessages,
    SS_KEYS.liveFeedback,
    SS_KEYS.chatFontSize,
  ].forEach((k) => ssRemove(k));
}

export function lsGetInterviews() {
  try {
    const v = LS.getItem(LS_KEYS.interviews);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

export function lsSaveInterview(record) {
  const list = lsGetInterviews();
  // Upsert by session_id
  const idx = list.findIndex((r) => r.session_id === record.session_id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  LS.setItem(LS_KEYS.interviews, JSON.stringify(list));
}

export function lsGetInterview(sessionId) {
  return lsGetInterviews().find((r) => r.session_id === sessionId) || null;
}
