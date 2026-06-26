"use client";

import React, { useState } from 'react';
import { Mail, Loader2, AlertCircle, Copy, Check, RotateCcw, Sparkles, Download } from 'lucide-react';
import API_BASE from '../lib/api';

interface CoverLetterProps {
  resumeText: string;
  dark?: boolean;
}

export default function CoverLetter({ resumeText, dark = true }: CoverLetterProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [tone, setTone] = useState<'professional' | 'enthusiastic' | 'concise'>('professional');
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const downloadPDF = () => {
    if (!letter) return;
    const company = companyName || 'Company';
    const role = roleName || 'Position';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cover Letter — ${role} at ${company}</title><style>body{font-family:Georgia,serif;max-width:700px;margin:60px auto;padding:0 40px;color:#1a1a1a;line-height:1.8;font-size:14px}h1{font-size:18px;font-weight:700;margin:0 0 4px}p.meta{color:#555;font-size:13px;margin:0 0 32px}p{white-space:pre-wrap;margin:0}@media print{body{margin:0;padding:40px}}</style></head><body><h1>Cover Letter</h1><p class="meta">${role} at ${company}</p><p>${letter.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const bg = dark ? '#18181b' : '#ffffff';
  const border = dark ? '#27272a' : '#e4e4e7';
  const textSub = dark ? '#71717a' : '#6b7280';
  const inputBg = dark ? '#09090b' : '#f9fafb';
  const textMain = dark ? '#fafafa' : '#09090b';

  const generate = async () => {
    if (!jobDescription.trim()) return;
    setLoading(true);
    setError(null);
    setLetter(null);

    const prompt = `Write a ${tone} cover letter for a ${roleName || 'job'} position${companyName ? ` at ${companyName}` : ''}.

Resume:
${resumeText}

Job Description:
${jobDescription}

Instructions:
- Write in first person
- Keep it to 3-4 paragraphs
- ${tone === 'concise' ? 'Keep it under 250 words' : tone === 'enthusiastic' ? 'Show genuine excitement about the role and company' : 'Use formal professional language'}
- Highlight the most relevant experience from the resume
- End with a strong call to action
- Do NOT include a subject line or email headers, just the letter body`;

    try {
      const res = await fetch(`${API_BASE}/generate-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cover Letter',
          contact_info: '',
          experience: resumeText,
          education: '',
          skills: `Job Description: ${jobDescription}\nTone: ${tone}\nCompany: ${companyName}\nRole: ${roleName}\nCustom prompt: ${prompt}`,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server error (${res.status})`);
      }
      const data = await res.json();
      // Strip markdown formatting if present
      let text: string = data.resume_markdown || data.text || '';
      text = text.replace(/^#+\s.*\n?/gm, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
      setLetter(text);
    } catch (err: any) {
      setError(err.message || 'Failed to generate. Make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tones: { id: typeof tone; label: string; desc: string }[] = [
    { id: 'professional', label: 'Professional', desc: 'Formal & structured' },
    { id: 'enthusiastic', label: 'Enthusiastic', desc: 'Warm & energetic' },
    { id: 'concise', label: 'Concise', desc: 'Short & to the point' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Input card */}
      <div style={{ padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ padding: 8, background: dark ? '#1a1033' : '#f3e8ff', borderRadius: 10, display: 'flex' }}>
            <Mail size={16} color="#8b5cf6" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Cover Letter Generator</p>
            <p style={{ fontSize: 12, color: textSub, margin: 0 }}>AI writes a tailored letter from your resume</p>
          </div>
        </div>

        {/* Tone selector */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: textSub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tone</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {tones.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${tone === t.id ? '#8b5cf6' : border}`,
                  background: tone === t.id ? (dark ? '#1a1033' : '#f3e8ff') : (dark ? '#09090b' : '#f9fafb'),
                  color: tone === t.id ? '#8b5cf6' : textSub, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center',
                }}
              >
                <div>{t.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400, marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Optional fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[
            { label: 'Company Name', value: companyName, set: setCompanyName, placeholder: 'e.g. Google' },
            { label: 'Role / Position', value: roleName, set: setRoleName, placeholder: 'e.g. Software Engineer' },
          ].map((f) => (
            <div key={f.label}>
              <p style={{ fontSize: 12, fontWeight: 600, color: textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label} <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none' }}>(optional)</span></p>
              <input
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', padding: '10px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: textMain, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>

        {/* JD textarea */}
        <p style={{ fontSize: 12, fontWeight: 600, color: textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Description</p>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          rows={5}
          style={{
            width: '100%', padding: '12px 14px', background: inputBg, border: `1px solid ${border}`, borderRadius: 10,
            color: textMain, fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />

        <button
          onClick={generate}
          disabled={!jobDescription.trim() || loading}
          style={{
            width: '100%', padding: '12px 0', marginTop: 14, borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none',
            cursor: !jobDescription.trim() || loading ? 'not-allowed' : 'pointer',
            background: !jobDescription.trim() || loading ? (dark ? '#27272a' : '#f4f4f5') : 'linear-gradient(135deg,#7c3aed,#2563eb)',
            color: !jobDescription.trim() || loading ? (dark ? '#52525b' : '#a1a1aa') : '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: !jobDescription.trim() || loading ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
          }}
        >
          {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={15} /> Generate Cover Letter</>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '14px 16px', background: dark ? '#450a0a30' : '#fef2f2', border: `1px solid ${dark ? '#7f1d1d50' : '#fecaca'}`, borderRadius: 12, color: dark ? '#f87171' : '#b91c1c', fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><strong>Generation Failed</strong><br />{error}</div>
        </div>
      )}

      {/* Generated letter */}
      {letter && (
        <div style={{ padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Your Cover Letter</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={copy}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: copied ? '#22c55e' : textSub, fontSize: 12, fontWeight: 600 }}
              >
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
              <button
                onClick={downloadPDF}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${border}`, background: dark ? '#14532d20' : '#f0fdf4', cursor: 'pointer', color: '#22c55e', fontSize: 12, fontWeight: 600 }}
              >
                <Download size={13} /> Download PDF
              </button>
              <button
                onClick={() => { setLetter(null); setError(null); }}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textSub, display: 'flex', alignItems: 'center' }}
                title="Reset"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
          <div style={{ padding: '20px 24px', background: dark ? '#09090b' : '#f9fafb', border: `1px solid ${border}`, borderRadius: 12 }}>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: dark ? '#d4d4d8' : '#374151', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'Georgia, serif' }}>{letter}</p>
          </div>
          <p style={{ fontSize: 11, color: textSub, marginTop: 10, textAlign: 'center' }}>
            AI-generated — review and personalize before sending
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
