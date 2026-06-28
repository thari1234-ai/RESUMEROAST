"use client";

import React, { useState } from 'react';
import { Target, CheckCircle2, XCircle, Lightbulb, Loader2, AlertCircle, RotateCcw, Copy, Check, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import API_BASE from '../lib/api';

interface AtsAnalysisProps {
  resumeText: string;
  dark?: boolean;
}

interface AnalysisResult {
  score?: number;
  matching_keywords?: string[];
  missing_keywords?: string[];
  improvements?: string[];
  feedback?: string;
}

export default function AtsAnalysis({ resumeText: resumeTextProp, dark = true }: AtsAnalysisProps) {
  const hasUploadedResume = !!resumeTextProp && resumeTextProp !== 'BUILD_NEW';
  const [resumeInput, setResumeInput] = useState(hasUploadedResume ? resumeTextProp : '');
  const resumeText = resumeInput;
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editedSuggestions, setEditedSuggestions] = useState<string[]>([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const bg = dark ? '#18181b' : '#ffffff';
  const border = dark ? '#27272a' : '#e4e4e7';
  const textSub = dark ? '#71717a' : '#6b7280';
  const inputBg = dark ? '#09090b' : '#f9fafb';
  const textMain = dark ? '#fafafa' : '#09090b';

  const performAnalysis = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setRawText(null);
    setEditedSuggestions([]);

    try {
      const res = await fetch(`${API_BASE}/analyze-ats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server error (${res.status})`);
      }
      const data = await res.json();
      const raw: string = data.analysis || '';
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          const parsed: AnalysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          setAnalysis(parsed);
          setEditedSuggestions(parsed.improvements ?? []);
          return;
        } catch { /* fallthrough */ }
      }
      setRawText(raw);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    if (!analysis) return;
    const text = [
      `ATS Score: ${analysis.score ?? 'N/A'}/100`,
      `Feedback: ${analysis.feedback ?? ''}`,
      `Matching Keywords: ${(analysis.matching_keywords ?? []).join(', ')}`,
      `Missing Keywords: ${(analysis.missing_keywords ?? []).join(', ')}`,
      `Suggested Improvements:\n${editedSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    ].join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySuggestion = async (idx: number) => {
    await navigator.clipboard.writeText(editedSuggestions[idx]);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const score = analysis?.score ?? 0;
  const scoreColor = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const scoreLabel = score >= 75 ? 'Strong Match' : score >= 50 ? 'Moderate Match' : 'Weak Match';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Input card */}
      <div style={{ padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 8, background: dark ? '#1e3a5f' : '#eff6ff', borderRadius: 10, display: 'flex' }}>
            <Target size={16} color="#3b82f6" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>ATS Resume Checker</p>
            <p style={{ fontSize: 12, color: textSub, margin: 0 }}>Analyze your resume for ATS compatibility and keyword strength</p>
          </div>
        </div>
        {/* Resume input — shown when no resume was uploaded */}
        {!hasUploadedResume && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: textSub, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Your Resume Text *</label>
            <textarea
              value={resumeInput}
              onChange={(e) => setResumeInput(e.target.value)}
              placeholder="Paste your resume text here..."
              rows={6}
              style={{ width: '100%', padding: '12px 14px', background: inputBg, border: `1px solid ${border}`, borderRadius: 10, color: textMain, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        )}
        {hasUploadedResume && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: dark ? '#0d1f0d' : '#f0fdf4', border: '1px solid #22c55e44', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>✅</span>
            <span style={{ fontSize: 12, color: dark ? '#86efac' : '#16a34a', fontWeight: 600 }}>Resume loaded — {resumeTextProp.split(/\s+/).filter(Boolean).length} words</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button
            onClick={performAnalysis}
            disabled={!resumeText.trim() || loading}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none',
              cursor: !resumeText.trim() || loading ? 'not-allowed' : 'pointer',
              background: !resumeText.trim() || loading ? (dark ? '#27272a' : '#f4f4f5') : 'linear-gradient(135deg,#2563eb,#7c3aed)',
              color: !resumeText.trim() || loading ? (dark ? '#52525b' : '#a1a1aa') : '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: !resumeText.trim() || loading ? 'none' : '0 4px 14px rgba(37,99,235,0.25)',
            }}
          >
            {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</> : 'Run ATS Scan'}
          </button>
          {(analysis || rawText) && (
            <button onClick={() => { setAnalysis(null); setRawText(null); setError(null); setEditedSuggestions([]); }}
              style={{ padding: '0 14px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textSub, display: 'flex', alignItems: 'center' }} title="Reset">
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '14px 16px', background: dark ? '#450a0a30' : '#fef2f2', border: `1px solid ${dark ? '#7f1d1d50' : '#fecaca'}`, borderRadius: 12, color: dark ? '#f87171' : '#b91c1c', fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><strong>Analysis Failed</strong><br />{error}</div>
        </div>
      )}

      {/* Raw fallback */}
      {rawText && !analysis && (
        <div style={{ padding: 20, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 10 }}>AI Feedback</p>
          <p style={{ fontSize: 13, color: textSub, whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{rawText}</p>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <>
          {/* Score card */}
          <div style={{ padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Analysis Results</p>
                  <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: `${scoreColor}22`, color: scoreColor, fontWeight: 700, border: `1px solid ${scoreColor}44` }}>{scoreLabel}</span>
                </div>
                {analysis.feedback && <p style={{ fontSize: 13, color: textSub, margin: '0 0 16px', lineHeight: 1.6, maxWidth: 520 }}>{analysis.feedback}</p>}
                {analysis.score !== undefined && (
                  <div style={{ maxWidth: 400 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: textSub, marginBottom: 6 }}>
                      <span>ATS Match Score</span><span style={{ fontWeight: 700, color: scoreColor }}>{analysis.score}%</span>
                    </div>
                    <div style={{ height: 10, background: dark ? '#27272a' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${analysis.score}%`, background: `linear-gradient(90deg,${scoreColor}88,${scoreColor})`, borderRadius: 99, transition: 'width 1.2s ease' }} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginLeft: 24 }}>
                {analysis.score !== undefined && (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: `5px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${scoreColor}12` }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{analysis.score}</span>
                    <span style={{ fontSize: 10, color: textSub }}>/ 100</span>
                  </div>
                )}
                <button onClick={copyAll} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: copied ? '#22c55e' : textSub, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy All</>}
                </button>
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {analysis.matching_keywords && analysis.matching_keywords.length > 0 && (
              <div style={{ padding: 20, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <CheckCircle2 size={15} color="#22c55e" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>Matching Keywords</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: textSub }}>{analysis.matching_keywords.length} found</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {analysis.matching_keywords.map((kw, i) => (
                    <span key={i} style={{ padding: '4px 11px', background: dark ? '#14532d25' : '#f0fdf4', border: `1px solid ${dark ? '#16653435' : '#bbf7d0'}`, borderRadius: 99, fontSize: 11, color: dark ? '#4ade80' : '#15803d', fontWeight: 600 }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
            {analysis.missing_keywords && analysis.missing_keywords.length > 0 && (
              <div style={{ padding: 20, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <XCircle size={15} color="#ef4444" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Missing Keywords</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: textSub }}>{analysis.missing_keywords.length} missing</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {analysis.missing_keywords.map((kw, i) => (
                    <span key={i} style={{ padding: '4px 11px', background: dark ? '#450a0a25' : '#fef2f2', border: `1px solid ${dark ? '#7f1d1d35' : '#fecaca'}`, borderRadius: 99, fontSize: 11, color: dark ? '#f87171' : '#b91c1c', fontWeight: 600 }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Editable Suggestions */}
          {editedSuggestions.length > 0 && (
            <div style={{ padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Lightbulb size={16} color="#f59e0b" />
                <span style={{ fontSize: 14, fontWeight: 800 }}>Suggested Improvements</span>
                <span style={{ fontSize: 11, color: textSub, marginLeft: 4 }}>â€” click to expand & edit each suggestion</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editedSuggestions.map((imp, i) => (
                  <div key={i} style={{ borderTop: `1px solid ${expandedSuggestion === i ? '#f59e0b55' : border}`, borderRight: `1px solid ${expandedSuggestion === i ? '#f59e0b55' : border}`, borderBottom: `1px solid ${expandedSuggestion === i ? '#f59e0b55' : border}`, borderLeft: '3px solid #f59e0b', borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                    {/* Suggestion header */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', background: expandedSuggestion === i ? (dark ? '#1c1910' : '#fffbeb') : 'transparent' }}
                      onClick={() => setExpandedSuggestion(expandedSuggestion === i ? null : i)}
                    >
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#f59e0b22', color: '#f59e0b', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <p style={{ fontSize: 13, color: textMain, margin: 0, flex: 1, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expandedSuggestion === i ? 999 : 1, WebkitBoxOrient: 'vertical' }}>{imp}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ color: textSub }}>{expandedSuggestion === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {expandedSuggestion === i && (
                      <div style={{ padding: '0 16px 14px', background: dark ? '#0f0f0f' : '#fafafa' }}>
                        <p style={{ fontSize: 11, color: textSub, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Pencil size={10} /> Edit this suggestion:
                        </p>
                        <textarea
                          value={imp}
                          onChange={(e) => {
                            const updated = [...editedSuggestions];
                            updated[i] = e.target.value;
                            setEditedSuggestions(updated);
                          }}
                          rows={4}
                          style={{ width: '100%', padding: '10px 12px', background: inputBg, border: `1px solid ${border}`, borderRadius: 8, color: textMain, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <button
                            onClick={() => copySuggestion(i)}
                            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: copiedIdx === i ? '#22c55e' : textSub, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                          >
                            {copiedIdx === i ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy this</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
