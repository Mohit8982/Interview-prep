import React, { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Lightbulb, XCircle, Plus, ClockCounterClockwise } from '@phosphor-icons/react';
import { lsGetInterview } from '../lib/storage';

export default function ResultsScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const record = lsGetInterview(sessionId);

  const merged = useMemo(() => {
    if (!record) return [];
    const final = record.finalEvaluation?.perQuestion || [];
    const live = record.liveFeedback || [];
    // Prefer final eval items per question; fall back to live feedback
    const total = record.questions?.length || Math.max(final.length, live.length);
    const out = [];
    for (let i = 0; i < total; i++) {
      const f = final[i];
      const l = live[i];
      if (f) {
        out.push({
          question: f.question || record.questions?.[i] || `Question ${i + 1}`,
          score: clampScore(f.score),
          good: f.good || l?.good || '—',
          missing: f.missing || '—',
          feedback: f.feedback || l?.improve || '—',
        });
      } else if (l) {
        out.push({
          question: l.question || record.questions?.[i] || `Question ${i + 1}`,
          score: clampScore(l.score),
          good: l.good || '—',
          missing: '—',
          feedback: l.improve || '—',
        });
      } else {
        out.push({
          question: record.questions?.[i] || `Question ${i + 1}`,
          score: 0,
          good: 'Not attempted',
          missing: 'Not attempted',
          feedback: '—',
        });
      }
    }
    return out;
  }, [record]);

  if (!record) {
    return (
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16" data-testid="results-not-found">
        <h1 className="text-3xl font-black tracking-tight">Interview not found</h1>
        <p className="text-foreground/60 mt-3 text-sm">This session is no longer available in your local history.</p>
        <Link to="/" className="inline-flex items-center gap-2 mt-6 text-primary hover:underline">
          <ArrowRight size={14} /> Back to Home
        </Link>
      </div>
    );
  }

  const overall = record.overallScore ?? computeOverall(merged);
  const overallColor = overall >= 75 ? 'text-success' : overall >= 50 ? 'text-primary' : 'text-destructive';
  const dt = new Date(record.completedAt || record.timestamp);

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-6 py-10" data-testid="results-screen">
      <div className="mb-6">
        <p className="micro-label">// Interview Summary</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">
          {record.company_name} · {record.job_role}
        </h1>
      </div>

      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border border-border bg-card/60 rounded-xl p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center"
        data-testid="overall-score-card"
      >
        <div>
          <p className="micro-label">Overall Score</p>
          <div className={`text-6xl sm:text-7xl font-black ${overallColor} font-mono`} data-testid="overall-score">
            {overall}<span className="text-2xl text-foreground/40">/100</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><span className="micro-label w-28">Type</span> {record.interview_type}</div>
          <div className="flex items-center gap-2"><span className="micro-label w-28">Difficulty</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary uppercase">{record.difficulty_level}</span>
          </div>
          <div className="flex items-center gap-2"><span className="micro-label w-28">Provider</span> {record.ai_provider}</div>
          <div className="flex items-center gap-2"><span className="micro-label w-28">Completed</span> {dt.toLocaleString()}</div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-primary-glow bg-primary text-primary-foreground font-semibold px-5 py-3 rounded-md flex items-center justify-center gap-2 text-sm"
            data-testid="new-interview-btn"
          >
            <Plus size={16} weight="bold" /> New Interview
          </button>
          <Link
            to="/history"
            className="border border-border text-foreground/80 hover:bg-muted/40 transition-colors rounded-md px-5 py-3 flex items-center justify-center gap-2 text-sm"
            data-testid="view-history-btn"
          >
            <ClockCounterClockwise size={16} /> View History
          </Link>
        </div>
      </motion.div>

      {/* Per-question breakdown */}
      <div className="mt-10">
        <p className="micro-label mb-4">// Question-by-Question Breakdown</p>
        <div className="space-y-4">
          {merged.map((q, i) => (
            <div key={i} className="border border-border bg-card/40 rounded-lg p-5" data-testid={`question-card-${i}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="micro-label">Q{i + 1}</p>
                  <p className="text-sm font-semibold mt-1 leading-snug">{q.question}</p>
                </div>
                <ScorePill score={q.score} />
              </div>
              <div className="score-bar-track mb-4">
                <div className="score-bar-fill" style={{ width: `${(q.score / 10) * 100}%` }} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <FeedbackBlock icon={<CheckCircle size={14} weight="fill" className="text-success" />} label="What was good" text={q.good} testId={`q-${i}-good`} />
                <FeedbackBlock icon={<XCircle size={14} weight="fill" className="text-destructive" />} label="What was missing" text={q.missing} testId={`q-${i}-missing`} />
                <FeedbackBlock icon={<Lightbulb size={14} weight="fill" className="text-primary" />} label="Overall feedback" text={q.feedback} testId={`q-${i}-feedback`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedbackBlock({ icon, label, text, testId }) {
  return (
    <div className="border border-border/60 rounded-md p-3" data-testid={testId}>
      <p className="micro-label flex items-center gap-2 mb-2">{icon} {label}</p>
      <p className="text-foreground/80 leading-relaxed">{text}</p>
    </div>
  );
}

function ScorePill({ score }) {
  const color = score >= 8 ? 'text-success border-success/40 bg-success/10'
    : score >= 5 ? 'text-primary border-primary/40 bg-primary/10'
    : 'text-destructive border-destructive/40 bg-destructive/10';
  return (
    <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${color}`}>
      {score}/10
    </span>
  );
}

function clampScore(s) {
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function computeOverall(merged) {
  if (!merged.length) return 0;
  const sum = merged.reduce((s, m) => s + (m.score || 0), 0);
  return Math.round((sum / (merged.length * 10)) * 100);
}
