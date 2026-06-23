import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperPlaneRight,
  SpeakerHigh,
  SpeakerSlash,
  TextAa,
  CheckCircle,
  Lightbulb,
  Flag,
  ArrowLeft,
} from '@phosphor-icons/react';
import { toast, Toaster } from 'sonner';
import VoiceRecorder, { speak, stopSpeaking } from '../components/VoiceRecorder';
import {
  SS_KEYS,
  ssGet,
  ssSet,
  lsSaveInterview,
  clearActiveSession,
} from '../lib/storage';
import {
  interviewerReply,
  analyzeAnswer,
  finalEvaluation,
} from '../services/aiService';

const FONT_SIZES = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

export default function InterviewScreen() {
  const navigate = useNavigate();
  const interviewData = ssGet(SS_KEYS.interviewData);
  const apiKey = ssGet(SS_KEYS.apiKey, '');
  const provider = ssGet(SS_KEYS.provider, 'gemini');

  const [messages, setMessages] = useState(() => ssGet(SS_KEYS.chatMessages, []));
  const [feedback, setFeedback] = useState(() => ssGet(SS_KEYS.liveFeedback, []));
  const [qIndex, setQIndex] = useState(() => ssGet(SS_KEYS.currentQuestionIndex, 0));
  const [fontSize, setFontSize] = useState(() => ssGet(SS_KEYS.chatFontSize, 'medium'));
  const [voiceOn, setVoiceOn] = useState(() => ssGet(SS_KEYS.voiceOn, false));
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!interviewData) navigate('/');
  }, [interviewData, navigate]);

  // Persist
  useEffect(() => { ssSet(SS_KEYS.chatMessages, messages); }, [messages]);
  useEffect(() => { ssSet(SS_KEYS.liveFeedback, feedback); }, [feedback]);
  useEffect(() => { ssSet(SS_KEYS.currentQuestionIndex, qIndex); }, [qIndex]);
  useEffect(() => { ssSet(SS_KEYS.chatFontSize, fontSize); }, [fontSize]);
  useEffect(() => { ssSet(SS_KEYS.voiceOn, voiceOn); }, [voiceOn]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Bootstrap first interviewer message
  useEffect(() => {
    if (!interviewData) return;
    if (messages.length === 0 && interviewData.questions?.length > 0) {
      const opening = `Question 1 of ${interviewData.questions.length}: ${interviewData.questions[0]}`;
      setMessages([{ role: 'assistant', content: opening, timestamp: new Date().toISOString() }]);
      if (voiceOn) speak(opening, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewData]);

  const totalQuestions = interviewData?.questions?.length || 0;
  const currentQuestion = interviewData?.questions?.[qIndex] || '';

  const answeredCount = feedback.length;
  const liveScore = useMemo(() => {
    if (answeredCount === 0) return 0;
    const sum = feedback.reduce((s, f) => s + (f.score || 0), 0);
    return Math.round((sum / (answeredCount * 10)) * 100);
  }, [feedback, answeredCount]);

  if (!interviewData) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    stopSpeaking();

    const newMessages = [...messages, { role: 'user', content: text, timestamp: new Date().toISOString() }];
    setMessages(newMessages);
    setThinking(true);

    // Kick off two parallel calls: interviewer reply + answer analysis
    const [replyRes, analysisRes] = await Promise.allSettled([
      interviewerReply({
        provider,
        apiKey,
        company: interviewData.company_name,
        interviewType: interviewData.interview_type,
        currentQuestion,
        questionNumber: qIndex + 1,
        totalQuestions,
        conversation: newMessages,
      }),
      analyzeAnswer({
        provider,
        apiKey,
        interviewType: interviewData.interview_type,
        question: currentQuestion,
        candidateAnswer: text,
      }),
    ]);

    if (analysisRes.status === 'fulfilled') {
      const a = analysisRes.value;
      setFeedback((prev) => [
        ...prev,
        {
          questionNumber: qIndex + 1,
          question: currentQuestion,
          answer: text,
          score: a.score,
          good: a.good,
          improve: a.improve,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    if (replyRes.status === 'fulfilled') {
      let replyText = replyRes.value || 'Could you elaborate?';
      // Detect "Moving to question X" to advance index
      const movingMatch = replyText.match(/Moving to question\s+(\d+)/i);
      if (movingMatch) {
        const nextIdx = Math.min(parseInt(movingMatch[1], 10) - 1, totalQuestions - 1);
        if (nextIdx > qIndex) setQIndex(nextIdx);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: replyText, timestamp: new Date().toISOString() }]);
      if (voiceOn) speak(replyText, true);
    } else {
      const err = replyRes.reason?.message || 'AI error';
      toast.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `(System) ${err}`, timestamp: new Date().toISOString(), isError: true },
      ]);
    }

    setThinking(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      const transcript = messages.map((m) => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`).join('\n');
      let evaluation = { perQuestion: [] };
      try {
        evaluation = await finalEvaluation({
          provider,
          apiKey,
          interviewType: interviewData.interview_type,
          transcript,
        });
      } catch (e) {
        // If final eval fails, fall back to per-answer feedback
      }

      const record = {
        ...interviewData,
        messages,
        liveFeedback: feedback,
        finalEvaluation: evaluation,
        overallScore: liveScore,
        completedAt: new Date().toISOString(),
      };
      lsSaveInterview(record);
      stopSpeaking();
      clearActiveSession();
      navigate(`/results/${interviewData.session_id}`);
    } catch (e) {
      toast.error(e.message || 'Failed to finish');
      setFinishing(false);
    }
  };

  const onExit = () => {
    if (window.confirm('Exit interview? Your progress in this session will be lost (not saved to history).')) {
      stopSpeaking();
      clearActiveSession();
      navigate('/');
    }
  };

  const fontClass = FONT_SIZES[fontSize];

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6" data-testid="interview-screen">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="text-foreground/60 hover:text-foreground p-2 -ml-2"
            data-testid="exit-interview-btn"
            title="Exit"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-base font-bold tracking-tight" data-testid="question-progress">
              Question {Math.min(qIndex + 1, totalQuestions)} of {totalQuestions}
            </div>
            <div className="micro-label mt-1">
              {interviewData.company_name} · {interviewData.interview_type} · {interviewData.difficulty_level}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FontControl current={fontSize} onChange={setFontSize} />
          <button
            onClick={() => {
              if (voiceOn) stopSpeaking();
              setVoiceOn((v) => !v);
            }}
            className={`w-10 h-10 rounded-md border flex items-center justify-center transition-colors ${
              voiceOn ? 'border-primary text-primary bg-primary/10' : 'border-border text-foreground/70 hover:text-foreground'
            }`}
            data-testid="voice-toggle-btn"
            title="Voice output"
          >
            {voiceOn ? <SpeakerHigh size={18} weight="duotone" /> : <SpeakerSlash size={18} weight="duotone" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Live Feedback Panel */}
        <aside className="lg:col-span-4 lg:border-r lg:border-border/60 lg:pr-6" data-testid="feedback-panel">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} weight="duotone" className="text-primary" />
              <span className="text-sm font-semibold">Live Feedback</span>
            </div>
            <div className="text-right">
              <div className="micro-label">Score</div>
              <div className="font-mono text-2xl font-bold text-primary" data-testid="live-score">{liveScore}</div>
            </div>
          </div>
          <p className="micro-label mb-4">{answeredCount} of {totalQuestions} analyzed</p>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {feedback.length === 0 && (
              <p className="text-xs text-foreground/50 italic">Your per-answer feedback will appear here as the interview progresses…</p>
            )}
            <AnimatePresence initial={false}>
              {feedback.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="border border-border bg-card/60 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs text-foreground/60 line-clamp-2 flex-1">Q: {f.question}</p>
                    <ScoreBadge score={f.score} />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] text-foreground/80">
                      <span className="text-success font-semibold inline-flex items-center gap-1"><CheckCircle size={12} weight="fill" /> GOOD</span>
                      <p className="mt-1">{f.good}</p>
                    </div>
                    <div className="text-[11px] text-foreground/80">
                      <span className="text-primary font-semibold inline-flex items-center gap-1"><Lightbulb size={12} weight="fill" /> IMPROVE</span>
                      <p className="mt-1">{f.improve}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </aside>

        {/* Chat Panel */}
        <section className="lg:col-span-8 flex flex-col min-h-[60vh]" data-testid="chat-panel">
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[60vh]">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'user' ? (
                    <div className={`chat-user p-4 max-w-[85%] ${fontClass}`} data-testid={`msg-user-${i}`}>
                      <div className="micro-label mb-1 text-right">You</div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  ) : (
                    <div className={`chat-ai max-w-[90%] ${fontClass} ${m.isError ? 'border-destructive' : ''}`} data-testid={`msg-ai-${i}`}>
                      <div className="micro-label mb-1">Interviewer</div>
                      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{m.content}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {thinking && (
              <div className="chat-ai max-w-[90%]" data-testid="thinking-indicator">
                <div className="micro-label mb-1">Interviewer</div>
                <div className="flex gap-1 items-center pt-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '120ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="mt-4 border border-border bg-card/60 rounded-lg p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your answer… (Shift+Enter for new line)"
              rows={3}
              className={`w-full bg-transparent outline-none resize-none placeholder:text-foreground/30 ${fontClass}`}
              data-testid="chat-input"
              disabled={thinking || finishing}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <VoiceRecorder
                disabled={thinking || finishing}
                onTranscript={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))}
              />
              <div className="flex items-center gap-2">
                {qIndex >= totalQuestions - 1 && answeredCount >= 2 && (
                  <button
                    onClick={onFinish}
                    disabled={finishing}
                    className="bg-success/15 text-success border border-success/40 hover:bg-success/25 transition-colors rounded-md px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-60"
                    data-testid="finish-interview-btn"
                  >
                    <Flag size={14} weight="fill" /> {finishing ? 'Finalizing…' : 'Finish Interview'}
                  </button>
                )}
                <button
                  onClick={sendMessage}
                  disabled={thinking || finishing || !input.trim()}
                  className="btn-primary-glow bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-md flex items-center gap-2 text-sm disabled:opacity-60"
                  data-testid="send-btn"
                >
                  Send <PaperPlaneRight size={14} weight="fill" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FontControl({ current, onChange }) {
  const sizes = [
    { id: 'small', label: 'A', cls: 'text-xs' },
    { id: 'medium', label: 'A', cls: 'text-sm' },
    { id: 'large', label: 'A', cls: 'text-base' },
  ];
  return (
    <div className="flex border border-border rounded-md overflow-hidden" data-testid="font-control">
      {sizes.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`px-2.5 h-10 ${s.cls} font-bold transition-colors ${
            current === s.id ? 'bg-primary text-primary-foreground' : 'text-foreground/60 hover:bg-muted/40'
          }`}
          data-testid={`font-${s.id}`}
          title={s.id}
        >
          {s.label}
        </button>
      ))}
      <div className="px-2 h-10 flex items-center border-l border-border text-foreground/40">
        <TextAa size={14} />
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 8 ? 'text-success border-success/40 bg-success/10'
    : score >= 5 ? 'text-primary border-primary/40 bg-primary/10'
    : 'text-destructive border-destructive/40 bg-destructive/10';
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${color}`} data-testid="score-badge">
      {score}/10
    </span>
  );
}
