import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, ClockCounterClockwise, Trash } from '@phosphor-icons/react';
import { lsGetInterviews, LS_KEYS } from '../lib/storage';

export default function HistoryScreen() {
  const list = useMemo(() => {
    return [...lsGetInterviews()].sort((a, b) => {
      const da = new Date(a.completedAt || a.timestamp).getTime();
      const db = new Date(b.completedAt || b.timestamp).getTime();
      return db - da;
    });
  }, []);

  const clearAll = () => {
    if (window.confirm('Delete all interview history? This cannot be undone.')) {
      window.localStorage.removeItem(LS_KEYS.interviews);
      window.location.reload();
    }
  };

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-6 py-10" data-testid="history-screen">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="micro-label">// History</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">Past Interviews</h1>
          <p className="text-foreground/60 text-sm mt-2">{list.length} session{list.length === 1 ? '' : 's'} stored locally in this browser.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="btn-primary-glow bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-md flex items-center gap-2 text-sm"
            data-testid="new-interview-from-history-btn"
          >
            <Plus size={16} weight="bold" /> New Interview
          </Link>
          {list.length > 0 && (
            <button
              onClick={clearAll}
              className="border border-destructive/40 text-destructive hover:bg-destructive/10 rounded-md px-3 py-2.5 flex items-center gap-2 text-xs"
              data-testid="clear-history-btn"
            >
              <Trash size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center" data-testid="empty-history">
          <div className="inline-flex w-12 h-12 rounded-full bg-primary/10 border border-primary/40 items-center justify-center mb-4">
            <ClockCounterClockwise size={22} className="text-primary" weight="duotone" />
          </div>
          <h2 className="text-lg font-bold">No interviews yet</h2>
          <p className="text-foreground/60 text-sm mt-2">Start your first interview to see history here.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 mt-6 text-primary hover:underline text-sm"
          >
            Begin <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((r, i) => {
            const score = r.overallScore ?? 0;
            const color = score >= 75 ? 'text-success' : score >= 50 ? 'text-primary' : 'text-destructive';
            const dt = new Date(r.completedAt || r.timestamp);
            return (
              <motion.div
                key={r.session_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={`/results/${r.session_id}`}
                  className="block border border-border bg-card/40 rounded-lg p-5 hover:border-primary/50 hover:bg-card/70 transition-colors"
                  data-testid={`history-card-${i}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="micro-label">{r.interview_type}</p>
                      <h3 className="font-bold text-base mt-1 truncate">{r.company_name}</h3>
                      <p className="text-xs text-foreground/60 truncate">{r.job_role}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-mono text-2xl font-black ${color}`}>{score}</div>
                      <div className="micro-label">/ 100</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary uppercase">
                      {r.difficulty_level}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border text-foreground/60 uppercase">
                      {r.ai_provider}
                    </span>
                    <span className="text-[10px] text-foreground/50 ml-auto font-mono">
                      {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
