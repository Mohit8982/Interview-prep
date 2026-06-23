import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Lightning,
  Eye,
  EyeSlash,
  ArrowRight,
  Sparkle,
  Lock,
  Cpu,
  ShieldCheck,
} from '@phosphor-icons/react';
import { toast, Toaster } from 'sonner';
import StatusPills from '../components/StatusPills';
import { SS_KEYS, ssSet, clearActiveSession } from '../lib/storage';
import { inferDifficultyAndQuestions } from '../services/aiService';

const INTERVIEW_TYPES = ['HR Round', 'Technical Round', 'System Design', 'Behavioural Round'];

const PROVIDERS = [
  {
    id: 'gemini',
    label: 'Google Gemini Flash Lite',
    badge: 'Recommended',
    description: 'Includes Google Search grounding. Free tier available.',
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpLabel: 'Get a free Gemini API key',
    needsKey: true,
    keyPrefix: 'AIza',
  },
  {
    id: 'openai',
    label: 'OpenAI GPT-4o',
    description: 'Direct browser → OpenAI API call.',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpLabel: 'Create an OpenAI API key',
    needsKey: true,
    keyPrefix: 'sk-',
  },
  {
    id: 'emergent-gemini',
    label: 'Emergent Universal Key · Gemini',
    badge: 'One key, any model',
    description: 'Use your own Emergent universal key (sk-emergent-...) — credits deducted from your Emergent balance. Routed via Gemini 2.5 Flash.',
    helpUrl: 'https://app.emergent.sh',
    helpLabel: 'Get your Emergent key from Profile → Universal Key',
    needsKey: true,
    keyPrefix: 'sk-emergent-',
  },
  {
    id: 'emergent-openai',
    label: 'Emergent Universal Key · OpenAI',
    description: 'Use your own Emergent universal key (sk-emergent-...) routed via OpenAI GPT-4o.',
    helpUrl: 'https://app.emergent.sh',
    helpLabel: 'Get your Emergent key from Profile → Universal Key',
    needsKey: true,
    keyPrefix: 'sk-emergent-',
  },
];

export default function InputScreen() {
  const navigate = useNavigate();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [type, setType] = useState('Technical Round');
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const providerInfo = PROVIDERS.find((p) => p.id === provider);
  const needsKey = providerInfo?.needsKey;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      toast.error('Please enter company and role');
      return;
    }
    if (needsKey && !apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    setLoading(true);
    try {
      clearActiveSession();
      const { difficulty, questions } = await inferDifficultyAndQuestions({
        provider,
        apiKey: apiKey.trim(),
        company: company.trim(),
        role: role.trim(),
        jobDescription: jd.trim(),
        interviewType: type,
      });

      const sessionId = `interview_${Date.now()}`;
      const interviewData = {
        session_id: sessionId,
        company_name: company.trim(),
        job_role: role.trim(),
        job_description: jd.trim(),
        interview_type: type,
        difficulty_level: difficulty,
        questions,
        ai_provider: provider,
        timestamp: new Date().toISOString(),
      };

      ssSet(SS_KEYS.apiKey, apiKey.trim());
      ssSet(SS_KEYS.provider, provider);
      ssSet(SS_KEYS.interviewData, interviewData);
      ssSet(SS_KEYS.sessionId, sessionId);
      ssSet(SS_KEYS.currentQuestionIndex, 0);
      ssSet(SS_KEYS.chatMessages, []);
      ssSet(SS_KEYS.liveFeedback, []);
      ssSet(SS_KEYS.chatFontSize, 'medium');
      ssSet(SS_KEYS.voiceOn, false);

      toast.success(`Generated ${questions.length} ${difficulty} questions`);
      navigate('/interview');
    } catch (err) {
      toast.error(err.message || 'Failed to generate interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 lg:py-16" data-testid="input-screen">
      <Toaster position="top-right" theme="dark" />

      <div className="mb-8">
        <StatusPills />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none"
          >
            Ace your
            <br />
            <span className="text-primary">Interview</span> with AI.
          </motion.h1>
          <p className="mt-6 text-foreground/70 max-w-xl text-sm md:text-base leading-relaxed">
            Mock interviews tailored to the company, role and JD. Live scoring, follow-up questions,
            and per-answer feedback — all processed client-side in your browser. Your API key never
            leaves this tab.
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-8" data-testid="input-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label="Company Name" testId="field-company">
                <input
                  className="input-base"
                  placeholder="e.g. Google"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  data-testid="input-company"
                />
              </Field>
              <Field label="Job Role" testId="field-role">
                <input
                  className="input-base"
                  placeholder="e.g. Senior Backend Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  data-testid="input-role"
                />
              </Field>
            </div>

            <Field label="Job Description (auto-infers difficulty)" testId="field-jd">
              <textarea
                className="input-base"
                placeholder="Paste the JD here — we'll infer Easy / Medium / Hard..."
                rows={6}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                data-testid="input-jd"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label="Interview Type" testId="field-type">
                <select
                  className="input-base"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  data-testid="select-type"
                >
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="AI Provider" testId="field-provider">
                <select
                  className="input-base"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  data-testid="select-provider"
                >
                  {PROVIDERS.filter((p) => p.needsKey || emergentAvailable).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}{p.badge ? ` · ${p.badge}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {providerInfo && (
              <div className="border border-border bg-card/40 rounded-md px-4 py-3 text-xs text-foreground/70 flex items-start gap-3">
                <Sparkle size={16} weight="duotone" className="text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p>{providerInfo.description}</p>
                  {providerInfo.helpUrl && (
                    <a
                      href={providerInfo.helpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                      data-testid="provider-help-link"
                    >
                      {providerInfo.helpLabel} <ArrowRight size={12} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {needsKey && (
              <Field label="API Key" testId="field-apikey">
                <div className="relative">
                  <input
                    className="input-base pr-12"
                    type={showKey ? 'text' : 'password'}
                    placeholder={providerInfo?.keyPrefix ? `${providerInfo.keyPrefix}...` : 'API key…'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    data-testid="input-apikey"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground p-2"
                    data-testid="toggle-apikey-visibility"
                  >
                    {showKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="micro-label mt-2 flex items-center gap-2">
                  <Lock size={10} /> Stored only in sessionStorage. Never sent to our servers.
                </p>
              </Field>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              transition={{ ease: [0.16, 1, 0.3, 1] }}
              className="btn-primary-glow bg-primary text-primary-foreground font-semibold px-6 py-4 rounded-md w-full sm:w-auto flex items-center justify-center gap-3 disabled:opacity-60"
              data-testid="run-analysis-btn"
            >
              <Lightning size={20} weight="fill" />
              {loading ? 'Generating Questions…' : 'Run Interview Analysis'}
              <ArrowRight size={18} />
            </motion.button>
          </form>
        </div>

        {/* Right column: stats / info grid */}
        <div className="lg:col-span-5 lg:pl-8 lg:border-l lg:border-border/60 space-y-4">
          <p className="micro-label">// What you get</p>
          <div className="grid grid-cols-2 gap-3">
            <StatBlock icon={<Cpu size={18} weight="duotone" />} label="Questions" value="8–10" testId="stat-questions" />
            <StatBlock icon={<ShieldCheck size={18} weight="duotone" />} label="Client-Side" value="100%" testId="stat-client" />
            <StatBlock icon={<Lock size={18} weight="duotone" />} label="Private" value="YES" testId="stat-private" />
            <StatBlock icon={<Sparkle size={18} weight="duotone" />} label="Difficulty" value="AI Auto" testId="stat-difficulty" />
          </div>

          <div className="mt-6 border border-border bg-card/40 rounded-lg p-5">
            <p className="micro-label mb-3">// How it works</p>
            <ol className="space-y-3 text-xs text-foreground/70">
              <li className="flex gap-3"><span className="text-primary font-mono">01</span> Paste the JD → AI infers difficulty</li>
              <li className="flex gap-3"><span className="text-primary font-mono">02</span> 8–10 questions tailored to role & company</li>
              <li className="flex gap-3"><span className="text-primary font-mono">03</span> Chat with an interviewer agent in real time</li>
              <li className="flex gap-3"><span className="text-primary font-mono">04</span> Live scoring + per-answer feedback</li>
              <li className="flex gap-3"><span className="text-primary font-mono">05</span> History saved locally to your browser</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, testId }) {
  return (
    <label className="block" data-testid={testId}>
      <span className="micro-label block mb-2">{label}</span>
      {children}
    </label>
  );
}

function StatBlock({ icon, label, value, testId }) {
  return (
    <div className="border border-border bg-card/40 rounded-md p-4" data-testid={testId}>
      <div className="text-primary mb-2">{icon}</div>
      <div className="micro-label">{label}</div>
      <div className="text-xl font-bold tracking-tight mt-1">{value}</div>
    </div>
  );
}
