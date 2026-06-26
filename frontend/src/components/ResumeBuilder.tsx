"use client";

import React, { useState } from 'react';
import { FileText, Loader2, AlertCircle, Copy, Check, RotateCcw, Sparkles, ChevronDown, ChevronUp, Download } from 'lucide-react';
import API_BASE from '../lib/api';

interface ResumeBuilderProps {
  dark?: boolean;
  onResumeBuilt?: (text: string) => void;
}

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  certifications: string;
  targetRole: string;
}

const EMPTY: FormData = {
  fullName: '', email: '', phone: '', location: '', linkedin: '',
  summary: '', experience: '', education: '', skills: '',
  certifications: '', targetRole: '',
};

// ─── 3 ATS Templates ───────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Times New Roman · Timeless',
    preview: ['■■■■■■■■■■■■■', '── ── ── ──', '• ───────────', '• ───────────'],
    css: `
      @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'EB Garamond', 'Times New Roman', Georgia, serif; max-width: 760px; margin: 36px auto; padding: 0 52px; color: #1a1a1a; font-size: 13.5px; line-height: 1.65; }
      h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 3px; }
      .contact { font-size: 12.5px; color: #444; margin-bottom: 18px; }
      h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1.5px solid #1a1a1a; padding-bottom: 3px; margin: 20px 0 9px; }
      h3 { font-size: 13.5px; font-weight: 700; margin: 12px 0 1px; }
      ul { margin: 5px 0 10px 20px; } li { margin-bottom: 3px; }
      p { margin: 5px 0; }
      strong { font-weight: 700; }
      em { font-style: italic; color: #555; font-size: 12.5px; }
      hr { border: none; border-top: 1px solid #ccc; margin: 6px 0; }
      @media print { body { margin: 0; padding: 40px 52px; } }
    `,
  },
  {
    id: 'modern',
    name: 'Modern',
    desc: 'Inter · Clean & Sharp',
    preview: ['▌ ████████████', '  ─────────────', '  › ───────────', '  › ───────────'],
    css: `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 760px; margin: 36px auto; padding: 0 0; color: #111; font-size: 12.5px; line-height: 1.6; }
      .header { background: #111; color: #fff; padding: 28px 40px 22px; }
      h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; color: #fff; margin-bottom: 5px; }
      .contact { font-size: 11.5px; color: #aaa; letter-spacing: 0.01em; }
      .body { padding: 20px 40px 40px; }
      h2 { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #555; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
      h3 { font-size: 13px; font-weight: 600; margin: 12px 0 1px; color: #111; }
      ul { margin: 4px 0 10px 0; list-style: none; } li { margin-bottom: 4px; padding-left: 14px; position: relative; } li::before { content: '›'; position: absolute; left: 0; color: #777; font-weight: 600; }
      p { margin: 5px 0; }
      strong { font-weight: 600; }
      em { font-style: normal; font-size: 11.5px; color: #666; }
      @media print { body { margin: 0; } .header { padding: 24px 40px 18px; } }
    `,
    wrapBody: true,
  },
  {
    id: 'executive',
    name: 'Executive',
    desc: 'Lato · Bold & Structured',
    preview: ['██ ████████████', '   ════════════', '   ● ──────────', '   ● ──────────'],
    css: `
      @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Lato', Arial, sans-serif; max-width: 760px; margin: 36px auto; padding: 0 48px; color: #222; font-size: 12.5px; line-height: 1.6; }
      h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; color: #000; text-transform: uppercase; margin-bottom: 2px; }
      .contact { font-size: 12px; color: #555; border-left: 3px solid #000; padding-left: 10px; margin: 8px 0 20px; }
      h2 { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #000; margin: 22px 0 8px; display: flex; align-items: center; gap: 10px; }
      h2::after { content: ''; flex: 1; height: 2px; background: #000; display: inline-block; }
      h3 { font-size: 13.5px; font-weight: 700; margin: 12px 0 1px; color: #111; }
      ul { margin: 5px 0 10px 0; list-style: none; } li { margin-bottom: 4px; padding-left: 16px; position: relative; } li::before { content: '●'; position: absolute; left: 0; font-size: 6px; top: 5px; color: #333; }
      p { margin: 5px 0; }
      strong { font-weight: 700; }
      em { font-style: normal; color: #666; font-size: 11.5px; font-weight: 300; }
      @media print { body { margin: 0; padding: 36px 48px; } }
    `,
  },
] as const;

type TemplateId = typeof TEMPLATES[number]['id'];

// Convert markdown → HTML body content
function mdToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^---+$/gm, '<hr/>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)\n(?!<li>)/g, '<ul>$1</ul>\n')
    .replace(/\n\n/g, '</p><p>');
}

function buildHtml(result: string, fullName: string, templateId: TemplateId): string {
  const tpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  let body = mdToHtml(result);

  if (templateId === 'modern') {
    // Split header from body: everything before first ## goes in dark header
    const firstSection = body.indexOf('<h2>');
    const headerPart = firstSection > -1 ? body.slice(0, firstSection) : '';
    const restPart = firstSection > -1 ? body.slice(firstSection) : body;
    body = `<div class="header">${headerPart}</div><div class="body">${restPart}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${fullName || 'Resume'} — Resume</title>
  <style>${tpl.css}</style>
</head>
<body>${body}</body>
</html>`;
}
// ───────────────────────────────────────────────────────────────────────────

export default function ResumeBuilder({ dark = true, onResumeBuilt }: ResumeBuilderProps) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('contact');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('classic');

  const bg = dark ? '#18181b' : '#ffffff';
  const border = dark ? '#27272a' : '#e4e4e7';
  const textSub = dark ? '#71717a' : '#6b7280';
  const inputBg = dark ? '#09090b' : '#f9fafb';
  const textMain = dark ? '#fafafa' : '#09090b';
  const labelColor = dark ? '#52525b' : '#9ca3af';

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: inputBg, border: `1px solid ${border}`,
    borderRadius: 8, color: textMain, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const taStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', lineHeight: 1.6 };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'block' };

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
    const open = expandedSection === id;
    return (
      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
        <button
          onClick={() => setExpandedSection(open ? '' : id)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: open ? (dark ? '#1c1c1f' : '#f9fafb') : 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: textMain, textAlign: 'left' }}
        >
          {title}
          {open ? <ChevronUp size={15} color={textSub} /> : <ChevronDown size={15} color={textSub} />}
        </button>
        {open && <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
      </div>
    );
  };

  const generate = async () => {
    if (!form.fullName.trim()) { setError('Please enter at least your full name.'); return; }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/generate-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          contact_info: [form.email, form.phone, form.location, form.linkedin].filter(Boolean).join(' | '),
          experience: form.experience || 'No experience provided',
          education: form.education || 'No education provided',
          skills: [
            form.skills && `Skills: ${form.skills}`,
            form.certifications && `Certifications: ${form.certifications}`,
            form.summary && `Professional Summary: ${form.summary}`,
            form.targetRole && `Target Role: ${form.targetRole}`,
          ].filter(Boolean).join('\n'),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      const text: string = data.resume_markdown || '';
      setResult(text);
      if (onResumeBuilt) onResumeBuilt(text.replace(/[#*_`]/g, '').replace(/\n+/g, ' '));
    } catch (err: any) {
      setError(err.message || 'Failed to generate. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!result) return;
    const html = buildHtml(result, form.fullName, selectedTemplate);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.fullName || 'Resume'}_Resume_${selectedTemplate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ padding: 8, background: dark ? '#0d1f0d' : '#f0fdf4', borderRadius: 10, display: 'flex' }}>
            <FileText size={16} color="#22c55e" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>AI Resume Builder</p>
            <p style={{ fontSize: 12, color: textSub, margin: 0 }}>Fill in your details — AI writes the rest</p>
          </div>
        </div>
      </div>

      {/* Template Picker */}
      <div style={{ padding: '18px 20px', background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Choose ATS Template</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {TEMPLATES.map(t => {
            const active = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                style={{
                  padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: active ? `2px solid ${dark ? '#22c55e' : '#16a34a'}` : `1px solid ${border}`,
                  background: active ? (dark ? '#0d1f0d' : '#f0fdf4') : inputBg,
                  transition: 'all 0.15s',
                }}
              >
                {/* Mini preview lines */}
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {t.preview.map((line, i) => (
                    <div key={i} style={{ fontSize: 9, fontFamily: 'monospace', color: active ? (dark ? '#22c55e' : '#16a34a') : textSub, letterSpacing: '-0.01em', opacity: i === 0 ? 1 : 0.5 + i * 0.1 }}>{line}</div>
                  ))}
                </div>
                <p style={{ fontWeight: 700, fontSize: 12, color: textMain, margin: '0 0 2px' }}>{t.name}</p>
                <p style={{ fontSize: 10, color: textSub, margin: 0 }}>{t.desc}</p>
                {active && <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: dark ? '#22c55e' : '#16a34a' }}>✓ Selected</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
        {/* Contact */}
        <Section id="contact" title="📋 Contact Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Full Name *', key: 'fullName' as const, placeholder: 'John Doe' },
              { label: 'Email', key: 'email' as const, placeholder: 'john@example.com' },
              { label: 'Phone', key: 'phone' as const, placeholder: '+1 (555) 000-0000' },
              { label: 'Location', key: 'location' as const, placeholder: 'New York, NY' },
            ].map((f) => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>LinkedIn / Portfolio URL</label>
              <input value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/johndoe" style={inputStyle} />
            </div>
          </div>
        </Section>

        {/* Target role */}
        <Section id="target" title="🎯 Target Role">
          <label style={labelStyle}>Job Title You're Applying For</label>
          <input value={form.targetRole} onChange={set('targetRole')} placeholder="e.g. Senior Software Engineer, Product Manager..." style={inputStyle} />
          <label style={labelStyle}>Professional Summary (optional — AI will write one if blank)</label>
          <textarea value={form.summary} onChange={set('summary')} placeholder="Brief 2-3 sentence overview of your professional background..." rows={3} style={taStyle} />
        </Section>

        {/* Experience */}
        <Section id="experience" title="💼 Work Experience">
          <p style={{ fontSize: 12, color: textSub, margin: '0 0 4px' }}>Describe your work history. The more detail you give, the better the AI output.</p>
          <textarea
            value={form.experience}
            onChange={set('experience')}
            placeholder={`Example:\n\nSoftware Engineer at Acme Corp (2021–2024)\n- Built REST APIs serving 500k daily users\n- Led migration to microservices, reducing latency by 40%\n\nJunior Developer at StartupXYZ (2019–2021)\n- Developed React frontend for e-commerce platform`}
            rows={8}
            style={taStyle}
          />
        </Section>

        {/* Education */}
        <Section id="education" title="🎓 Education">
          <textarea
            value={form.education}
            onChange={set('education')}
            placeholder={`Example:\n\nB.S. Computer Science, MIT, 2019\nGPA: 3.8 | Dean's List\nRelevant coursework: Algorithms, Distributed Systems`}
            rows={4}
            style={taStyle}
          />
        </Section>

        {/* Skills */}
        <Section id="skills" title="🛠️ Skills & Certifications">
          <label style={labelStyle}>Technical / Professional Skills</label>
          <textarea
            value={form.skills}
            onChange={set('skills')}
            placeholder="React, TypeScript, Node.js, Python, AWS, PostgreSQL, Docker, Git..."
            rows={3}
            style={taStyle}
          />
          <label style={labelStyle}>Certifications (optional)</label>
          <textarea
            value={form.certifications}
            onChange={set('certifications')}
            placeholder="AWS Certified Solutions Architect, Google Cloud Professional, PMP..."
            rows={2}
            style={taStyle}
          />
        </Section>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? (dark ? '#27272a' : '#f4f4f5') : 'linear-gradient(135deg,#16a34a,#059669)',
            color: loading ? (dark ? '#52525b' : '#a1a1aa') : '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
            boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.3)',
          }}
        >
          {loading
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating your resume...</>
            : <><Sparkles size={15} /> Generate Resume with AI</>
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '14px 16px', background: dark ? '#450a0a30' : '#fef2f2', border: `1px solid ${dark ? '#7f1d1d50' : '#fecaca'}`, borderRadius: 12, color: dark ? '#f87171' : '#b91c1c', fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><strong>Error</strong><br />{error}</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ padding: 24, background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Your AI-Generated Resume</p>
              <p style={{ fontSize: 12, color: textSub, margin: '3px 0 0' }}>Review and edit before using</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: copied ? '#22c55e' : textSub, fontSize: 12, fontWeight: 600 }}>
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
              <button onClick={download} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${border}`, background: dark ? '#14532d20' : '#f0fdf4', cursor: 'pointer', color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                <Download size={13} /> Download · {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
              </button>
              <button onClick={() => setResult(null)} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textSub, display: 'flex', alignItems: 'center' }}>
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Editable textarea */}
          <textarea
            value={result}
            onChange={(e) => {
              setResult(e.target.value);
              if (onResumeBuilt) onResumeBuilt(e.target.value.replace(/[#*_`]/g, '').replace(/\n+/g, ' '));
            }}
            rows={28}
            style={{
              width: '100%', padding: '18px 20px', background: dark ? '#09090b' : '#f9fafb',
              border: `1px solid ${border}`, borderRadius: 12, color: dark ? '#d4d4d8' : '#374151',
              fontSize: 13, lineHeight: 1.8, fontFamily: 'Georgia, "Times New Roman", serif',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 11, color: textSub, marginTop: 10, textAlign: 'center' }}>
            ✏️ Editable above — make any changes before copying
          </p>

          {onResumeBuilt && (
            <button
              onClick={() => onResumeBuilt && onResumeBuilt(result.replace(/[#*_`]/g, '').replace(/\n+/g, ' '))}
              style={{ marginTop: 12, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Use this resume for ATS & Interview →
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
