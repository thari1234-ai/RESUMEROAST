"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Play, Bot, RotateCcw, AlertCircle, Loader2, Volume2 } from 'lucide-react';
import API_BASE from '../lib/api';

interface InterviewSceneProps {
  resumeText: string;
  jobDescription: string;
  dark?: boolean;
}

// Static bar heights to avoid Math.random() in render (causes hydration mismatch)
const BAR_HEIGHTS = [8, 16, 24, 12, 20];

export default function InterviewScene({ resumeText, dark = true }: InterviewSceneProps) {
  const [jd, setJd] = useState('');
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        const interim = Array.from(e.results).map((r: any) => r[0].transcript).join('');
        setTranscript(interim);
        if (e.results[e.results.length - 1].isFinal) {
          setTranscript('');
          handleUserAnswer(interim);
        }
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
    }
    synthRef.current = window.speechSynthesis;
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(u);
  };

  const askQuestion = async (currentHistory: { role: string; content: string }[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/interview-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText, job_description: jd, history: currentHistory }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      const question = data.question || '';
      const updated = [...currentHistory, { role: 'assistant', content: question }];
      setHistory(updated);
      speak(question);
    } catch (err: any) {
      setError(err.message || 'Failed to reach backend.');
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    setStarted(true);
    setHistory([]);
    await askQuestion([]);
  };

  const handleUserAnswer = useCallback(async (text: string) => {
    const updated = [...history, { role: 'user', content: text }];
    setHistory(updated);
    await askQuestion(updated);
  }, [history, jd, resumeText]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Your browser does not support voice input. Try Chrome.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const reset = () => {
    synthRef.current?.cancel();
    recognitionRef.current?.stop();
    setHistory([]);
    setStarted(false);
    setError(null);
    setTranscript('');
  };

  if (!started) {
    const bg = dark ? '#18181b' : '#ffffff';
    const border = dark ? '#27272a' : '#e4e4e7';
    const textSub = dark ? '#71717a' : '#6b7280';
    const inputBg = dark ? '#09090b' : '#f9fafb';
    const textMain = dark ? '#fafafa' : '#09090b';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 8, background: dark ? '#0c1a2e' : '#eff6ff', borderRadius: 10, display: 'flex' }}>
            <Bot size={16} color="#3b82f6" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: textMain }}>AI Voice Interview</p>
            <p style={{ fontSize: 12, color: textSub, margin: 0 }}>Practice with a real-time AI interviewer — uses your microphone</p>
          </div>
        </div>

        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Job Description <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none' }}>(optional)</span></p>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste a job description to tailor the questions, or leave blank for general questions..."
            rows={4}
            style={{ width: '100%', padding: '12px 14px', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: textMain, fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ padding: '14px 16px', background: dark ? '#0c1a2e' : '#eff6ff', border: `1px solid ${dark ? '#1e3a5f' : '#bfdbfe'}`, borderRadius: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 12, color: dark ? '#60a5fa' : '#1d4ed8', margin: '0 0 8px' }}>How it works</p>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['AI asks questions based on your resume', 'Click the mic button and speak your answer', 'AI listens and asks the next question', 'Works best in Chrome — needs microphone access'].map((s) => (
              <li key={s} style={{ fontSize: 12, color: dark ? '#93c5fd' : '#1d4ed8', lineHeight: 1.5 }}>{s}</li>
            ))}
          </ul>
        </div>

        <button
          onClick={startInterview}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
          }}
        >
          <Play size={15} style={{ fill: 'currentColor' }} />
          Start Interview
        </button>
      </div>
    );
  }

  const lastMsg = history[history.length - 1];

  return (
    <div className="flex flex-col bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800" style={{ height: '600px' }}>
      {/* Avatar area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-800 to-zinc-950 text-center">
        <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-6 transition-all duration-300 ${isSpeaking ? 'border-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.4)]' : 'border-zinc-700'}`}>
          <Bot className={`w-16 h-16 transition-colors ${isSpeaking ? 'text-blue-400' : 'text-zinc-500'}`} />
        </div>

        {isSpeaking && (
          <div className="flex items-end gap-1 mb-4 h-8">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-blue-400 rounded-full animate-bounce"
                style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        )}

        {loading && !isSpeaking && (
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
          </div>
        )}

        {lastMsg && (
          <p className="text-zinc-100 text-base font-medium italic max-w-md leading-relaxed">
            "{lastMsg.role === 'assistant' ? lastMsg.content : (history[history.length - 2]?.content ?? '')}"
          </p>
        )}

        {isListening && (
          <div className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-sm flex items-center gap-2">
            <Mic className="w-3 h-3" /> {transcript || 'Listening...'}
          </div>
        )}

        {error && (
          <div className="mt-4 max-w-sm p-3 bg-red-900/40 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>

      {/* Chat transcript */}
      {history.length > 0 && (
        <div className="h-40 overflow-y-auto px-4 py-3 bg-zinc-950 space-y-2 border-t border-zinc-800">
          {history.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`max-w-xs px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'assistant' ? 'bg-zinc-800 text-zinc-200' : 'bg-blue-600 text-white'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Controls */}
      <div className="h-20 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between px-8">
        <button onClick={reset} className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors" title="Reset">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={toggleListening}
          disabled={isSpeaking || loading}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-red-500 text-white scale-110'
              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-40'
          }`}
          title={isListening ? 'Stop listening' : 'Speak your answer'}
        >
          {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        <button
          onClick={() => lastMsg && speak(lastMsg.content)}
          disabled={!lastMsg || lastMsg.role !== 'assistant' || isSpeaking}
          className="p-3 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
          title="Replay question"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
