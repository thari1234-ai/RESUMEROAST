"use client";

import React, { useState } from "react";
import { Flame, Loader2, AlertCircle, RotateCcw, RefreshCw } from "lucide-react";
import API_BASE from "../lib/api";

interface ResumeRoasterProps {
  resumeText?: string;
  dark?: boolean;
}

export default function ResumeRoaster({ resumeText: initialText = "", dark = false }: ResumeRoasterProps) {
  const [resumeText, setResumeText] = useState(initialText);
  const [roast, setRoast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bg = dark ? "#18181b" : "#ffffff";
  const surface = dark ? "#09090b" : "#fafafa";
  const border = dark ? "#27272a" : "#e4e4e7";
  const textMain = dark ? "#fafafa" : "#0a0a0a";
  const textSub = dark ? "#71717a" : "#6b7280";

  const normalizeError = (message: string) => {
    const m = (message || "").toLowerCase();
    if (m.includes("quota") || m.includes("resource_exhausted") || m.includes("429")) {
      return "AI quota is currently exhausted. Please try again later.";
    }
    if (m.includes("failed to fetch") || m.includes("network") || m.includes("backend")) {
      return "Cannot reach backend right now. Please ensure the server is running.";
    }
    return "Failed to roast resume. Please try again.";
  };

  const doRoast = async () => {
    if (!resumeText.trim()) { setError("Paste your resume text first — we need something to roast!"); return; }
    setLoading(true);
    setError(null);
    setRoast(null);
    try {
      const token = localStorage.getItem("ca_token");
      const res = await fetch(`${API_BASE}/roast-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ resume_text: resumeText }),
      });
      if (!res.ok) {
        let detail = `Error ${res.status}`;
        try {
          const d = await res.json();
          detail = d?.detail || detail;
        } catch {
          const txt = await res.text();
          if (txt?.trim()) detail = txt;
        }
        throw new Error(detail);
      }
      const data = await res.json();
      if (!data?.roast) {
        throw new Error("Empty roast response from server.");
      }
      setRoast(data.roast);
    } catch (e: any) {
      setError(normalizeError(e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  // Parse roast into sections for nice rendering
  const renderRoast = (text: string) => {
    const sections = [
      { key: "🔥 THE ROAST 🔥", emoji: "🔥", bg: dark ? "#1c0a00" : "#fff7ed", border: "#f97316", color: "#ea580c" },
      { key: "💀 BIGGEST CRIMES", emoji: "💀", bg: dark ? "#0f0014" : "#fdf4ff", border: "#a855f7", color: "#9333ea" },
      { key: "✨ REDEMPTION ARC — HOW TO FIX THIS MESS", emoji: "✨", bg: dark ? "#001a0a" : "#f0fdf4", border: "#22c55e", color: "#16a34a" },
      { key: "⚡ VERDICT", emoji: "⚡", bg: dark ? "#0a0a00" : "#fefce8", border: "#eab308", color: "#ca8a04" },
    ];

    const parts: { title: string; content: string; style: typeof sections[0] }[] = [];
    let remaining = text;

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const idx = remaining.indexOf(s.key);
      if (idx === -1) continue;
      const nextIdx = sections.slice(i + 1).reduce((acc, ns) => {
        const ni = remaining.indexOf(ns.key);
        return ni > -1 && ni < acc ? ni : acc;
      }, remaining.length);
      const content = remaining.slice(idx + s.key.length, nextIdx).trim();
      parts.push({ title: s.key, content, style: s });
    }

    if (parts.length === 0) {
      return (
        <div style={{ padding: "20px 24px", background: surface, borderRadius: 12, border: `1px solid ${border}`, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.75, color: textMain }}>
          {text}
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {parts.map((p) => (
          <div key={p.title} style={{ borderRadius: 14, border: `1.5px solid ${p.style.border}`, overflow: "hidden" }}>
            {/* Section header */}
            <div style={{ padding: "12px 20px", background: p.style.border, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{p.style.emoji}</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#ffffff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {p.title.replace(/[🔥💀✨⚡]/g, "").trim()}
              </span>
            </div>
            {/* Section body */}
            <div style={{ padding: "16px 20px", background: p.style.bg }}>
              {p.content.split("\n").map((line, i) => {
                const isBullet = line.trim().startsWith("-") || line.trim().startsWith("•") || line.trim().startsWith("*");
                if (isBullet) {
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{ color: p.style.color, fontWeight: 900, fontSize: 16, lineHeight: "1.5", flexShrink: 0 }}>›</span>
                      <span style={{ fontSize: 14, color: textMain, lineHeight: 1.7 }}>{line.replace(/^[-•*]\s*/, "")}</span>
                    </div>
                  );
                }
                if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
                return <p key={i} style={{ fontSize: 14, color: textMain, lineHeight: 1.75, margin: "0 0 8px" }}>{line}</p>;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", background: bg, border: `1px solid ${border}`, borderRadius: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #f97316, #dc2626)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Flame size={22} color="#fff" />
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 17, margin: "0 0 3px", color: textMain }}>Resume Roaster 🔥</p>
          <p style={{ fontSize: 13, color: textSub, margin: 0 }}>Paste your resume. AI will brutally roast it — then tell you exactly how to fix it.</p>
        </div>
        <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: "linear-gradient(135deg,#f97316,#dc2626)", fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Brutal Mode ON
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: "20px 24px", background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: textSub, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Your Resume Text
          </label>
          {resumeText && (
            <button onClick={() => { setResumeText(""); setRoast(null); setError(null); }}
              style={{ fontSize: 11, color: textSub, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <RotateCcw size={11} /> Clear
            </button>
          )}
        </div>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder={`Paste your resume text here...\n\nFor example:\nJohn Smith\njohn@email.com | New York, NY\n\nObjective: Results-oriented team player looking for synergies...\n\n(we'll roast every single word)`}
          rows={12}
          style={{
            width: "100%", padding: "14px 16px", background: surface, border: `1px solid ${border}`,
            borderRadius: 10, color: textMain, fontSize: 13, lineHeight: 1.7, resize: "vertical",
            outline: "none", fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <span style={{ fontSize: 11, color: textSub }}>{resumeText.length > 0 ? `${resumeText.split(/\s+/).filter(Boolean).length} words` : "No text yet"}</span>
          <button
            onClick={doRoast}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "11px 28px",
              borderRadius: 10, border: "none", cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800, fontSize: 14, letterSpacing: "0.02em",
              background: loading ? (dark ? "#27272a" : "#f4f4f5") : "linear-gradient(135deg, #f97316, #dc2626)",
              color: loading ? textSub : "#ffffff",
              boxShadow: loading ? "none" : "0 4px 20px rgba(249,115,22,0.4)",
              transition: "all 0.2s",
            }}
          >
            {loading
              ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Roasting...</>
              : <><Flame size={15} /> Roast My Resume 🔥</>
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", gap: 10, padding: "14px 18px", background: dark ? "#1c0505" : "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 12, color: dark ? "#f87171" : "#b91c1c", fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><strong>Error:</strong> {error}</div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: "32px 24px", background: bg, border: `1px solid ${border}`, borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: textMain, margin: "0 0 6px" }}>AI is reading your resume...</p>
          <p style={{ fontSize: 13, color: textSub, margin: 0 }}>Sharpening the claws. This might sting.</p>
        </div>
      )}

      {/* Roast result */}
      {roast && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Re-roast button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontWeight: 800, fontSize: 15, color: textMain, margin: 0 }}>🍖 The Roast Is Served</p>
            <button onClick={doRoast} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${border}`, background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: textSub }}>
              <RefreshCw size={12} /> Roast Again
            </button>
          </div>

          {renderRoast(roast)}

          <div style={{ padding: "18px 22px", background: "linear-gradient(135deg, #0f172a, #1e1b4b)", borderRadius: 14 }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: "#ffffff", margin: "0 0 4px" }}>Ready to fix it?</p>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Apply the fixes above, update your resume, and roast it again until it is solid.</p>
          </div>
        </div>
      )}
    </div>
  );
}
