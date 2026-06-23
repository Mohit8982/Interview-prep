import React, { useEffect, useRef, useState } from 'react';
import { Microphone, MicrophoneSlash } from '@phosphor-icons/react';

export default function VoiceRecorder({ onTranscript, disabled }) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ');
      if (transcript) onTranscript(transcript);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* ignore */ }
    };
  }, [onTranscript]);

  const toggle = () => {
    if (!supported || disabled) return;
    if (recording) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setRecording(true);
      } catch { /* ignore */ }
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`relative w-10 h-10 rounded-md flex items-center justify-center border transition-colors ${
        recording
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-foreground/70 hover:text-foreground hover:bg-muted/40'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={recording ? 'Stop recording' : 'Start voice input'}
      data-testid="voice-record-btn"
    >
      {recording ? <MicrophoneSlash size={18} weight="duotone" /> : <Microphone size={18} weight="duotone" />}
      {recording && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
      )}
    </button>
  );
}

export function speak(text, enabled) {
  if (!enabled) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch { /* ignore */ }
}

export function stopSpeaking() {
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
}
