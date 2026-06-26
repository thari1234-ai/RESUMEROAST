"use client";

import React, { useState } from "react";
import { Briefcase, ChevronRight } from "lucide-react";
import ResumeUpload from "../components/ResumeUpload";
import ResumeRoaster from "../components/ResumeRoaster";

// Fixed black & white theme — no colours
const T = {
  bg: "#ffffff",
  surface: "#fafafa",
  surfaceHov: "#f4f4f4",
  border: "#e8e8e8",
  borderStrong: "#0a0a0a",
  text: "#0a0a0a",
  textSub: "#666666",
  textFaint: "#bbbbbb",
  accent: "#0a0a0a",
  accentFg: "#ffffff",
  navBg: "rgba(255,255,255,0.94)",
};

export default function Home() {
  const [resumeText, setResumeText] = useState("");

  const FEATURES = [
    { icon: <span style={{fontSize:18}}>🔥</span>, title: "Resume Roaster", desc: "Get your resume brutally roasted by AI. Savage critique and specific fixes to make it actually good." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Navbar */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: `1px solid ${T.border}`, background: T.navBg, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: T.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase size={15} color={T.accentFg} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.03em" }}>RoastMyResume<span style={{ color: T.textSub, fontWeight: 600 }}>.ai</span></span>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {resumeText && (
              <button onClick={() => setResumeText("")} style={{ fontSize: 12, fontWeight: 500, color: T.textSub, background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
                ← Back
              </button>
            )}
          </nav>
        </div>
      </header>

      {!resumeText ? (
        <>
          {/* ROAST HERO */}
          <section style={{ background: T.bg }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "88px 32px 80px", display: "grid", gridTemplateColumns: "1fr 440px", gap: 72, alignItems: "center" }}>

              {/* Left copy */}
              <div>
                {/* Badge */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: T.textSub, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: "4px 12px", marginBottom: 28, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  AI Resume Roaster · Powered by Gemini
                </div>

                {/* Headline */}
                <h1 style={{ fontSize: 60, fontWeight: 900, lineHeight: 1.03, letterSpacing: "-0.045em", margin: "0 0 10px", color: T.text }}>
                  Your resume<br />
                  <span style={{ fontStyle: "italic" }}>is getting roasted.</span>
                </h1>

                {/* Sub-hook */}
                <p style={{ fontSize: 20, fontWeight: 500, color: T.textSub, lineHeight: 1.55, margin: "0 0 14px", maxWidth: 480 }}>
                  Upload your resume and our AI will <strong style={{ color: T.text }}>tear it apart</strong> — brutally, specifically, and actually helpfully.
                </p>
                <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.65, margin: "0 0 44px", maxWidth: 460 }}>
                  No sugar-coating. No generic advice. Just savage, line-by-line critique + a clear fix-it plan so your resume stops getting ghosted.
                </p>

                {/* Proof pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 44 }}>
                  {[
                    { emoji: "💀", text: "Savage critique, no fluff" },
                    { emoji: "🎯", text: "Pinpoints every weak line" },
                    { emoji: "✅", text: "Tells you exactly how to fix it" },
                    { emoji: "⚡", text: "Results in 10 seconds" },
                  ].map(p => (
                    <div key={p.text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: T.textSub, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: "5px 12px" }}>
                      <span>{p.emoji}</span> {p.text}
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 40, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
                  {[{ v: "50k+", l: "Resumes roasted" }, { v: "95%", l: "Rated it helpful" }, { v: "2x", l: "More callbacks after" }].map(s => (
                    <div key={s.v}>
                      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: T.text }}>{s.v}</div>
                      <div style={{ fontSize: 11, color: T.textSub, marginTop: 3, fontWeight: 500 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload / Roast card */}
              <div style={{ border: `1.5px solid ${T.borderStrong}`, borderRadius: 14, background: T.bg, overflow: "hidden" }}>
                {/* Card header */}
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                        🔥
                      </div>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 15, margin: 0, color: T.text }}>Roast My Resume</p>
                        <p style={{ fontSize: 11, color: T.textSub, margin: "2px 0 0", fontWeight: 500 }}>Drop it. We'll handle the brutality.</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: T.text, background: T.surfaceHov, border: `1px solid ${T.border}`, borderRadius: 4, padding: "3px 9px", letterSpacing: "0.04em" }}>
                      <span style={{ width: 5, height: 5, background: T.text, borderRadius: "50%", display: "inline-block" }} /> LIVE
                    </div>
                  </div>
                </div>

                {/* Upload zone */}
                <div style={{ padding: "20px 20px 12px" }}>
                  <ResumeUpload onParsedText={setResumeText} dark={false} />
                </div>

                {/* Disclaimer */}
                <div style={{ padding: "12px 20px 18px", borderTop: `1px solid ${T.border}`, textAlign: "center" }}>
                  <p style={{ fontSize: 11, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>
                    ⚠️ Warning: may cause existential dread about your career choices.<br />
                    <span style={{ color: T.textSub }}>No sugar-coating. Just precise fixes that make your resume better.</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section style={{ borderTop: `1px solid ${T.border}`, padding: "80px 32px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textSub, margin: "0 0 40px", textAlign: "center" }}>One tool. Better resume.</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 1, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                {FEATURES.map((f, i) => (
                  <div key={f.title} style={{
                    padding: "32px 28px",
                    background: T.surfaceHov,
                    borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
                    borderTop: `3px solid ${T.borderStrong}`,
                  }}>
                    <div style={{ color: T.textSub, marginBottom: 16 }}>{f.icon}</div>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 10px", color: T.text }}>{f.title}</p>
                    <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Dashboard */
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 32px" }}>
          <div style={{ padding: "14px", border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 12, background: T.surface }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.text, display: "inline-block" }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.textSub, textTransform: "uppercase" }}>Resume loaded</span>
            </div>
            <p style={{ fontSize: 11, color: T.textSub, margin: "0 0 8px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>
              {resumeText.substring(0, 120)}…
            </p>
            <button onClick={() => setResumeText("")} style={{ fontSize: 11, fontWeight: 600, color: T.text, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 3 }}>
              Change <ChevronRight size={11} />
            </button>
          </div>
          <main style={{ minWidth: 0 }}>
            <ResumeRoaster resumeText={resumeText} dark={false} />
          </main>
        </div>
      )}

      <footer style={{ borderTop: `1px solid ${T.border}`, padding: "24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: T.textFaint }}>RoastMyResume.ai · Powered by Google Gemini · Free forever</span>
          <span style={{ fontSize: 12, color: T.textFaint }}>Built by <span style={{ fontWeight: 600, color: T.textSub }}>Tharini Parthasarathy</span></span>
        </div>
      </footer>
    </div>
  );
}