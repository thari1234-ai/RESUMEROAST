import json
import os
import time
from typing import Any

import fitz
import google.generativeai as genai
import streamlit as st
import streamlit.components.v1 as components

APP_VERSION = "ResumeRoast v3.6"


def score_emoji(score: int) -> str:
    if score >= 80:
        return "🟢"
    if score >= 60:
        return "🟡"
    if score >= 40:
        return "🟠"
    return "🔴"


def verdict_emoji(verdict: str) -> str:
    value = verdict.lower().strip()
    if "interview" in value:
        return "🏆"
    if "maybe" in value:
        return "🤏"
    return "🗑️"


def section_emoji(name: str) -> str:
    key = name.lower().strip()
    if "summary" in key:
        return "🧾"
    if "experience" in key:
        return "💼"
    if "skill" in key:
        return "🛠️"
    if "project" in key:
        return "🚀"
    if "format" in key or "clarity" in key:
        return "🧼"
    return "🔥"


def get_roast_dialogues(result: dict[str, Any]) -> list[str]:
    raw_dialogues = result.get("roast_dialogues", [])
    if isinstance(raw_dialogues, list):
        cleaned = [str(item).strip() for item in raw_dialogues if str(item).strip()]
        if cleaned:
            return cleaned[:6]

    generated: list[str] = []
    for block in result.get("section_roasts", [])[:5]:
        section = str(block.get("section", "Section")).strip()
        issue = str(block.get("issue", "This section is weak.")).strip()
        generated.append(f"{section}? This is rough. {issue}")

    if generated:
        return generated

    return [
        "This resume talks big and proves small.",
        "You wrote ambition. Recruiters wanted evidence.",
        "This is not a final draft. This is a warning label.",
        "Half these bullets are smoke, no fire.",
        "If impact was the goal, this missed by miles.",
    ]


def apply_theme() -> None:
    bg = "#0b090a"
    panel = "#180c0d"
    text = "#f8ebed"
    muted = "#d4b5bc"
    primary = "#ef4444"
    accent = "#fb7185"

    st.markdown(
        f"""
        <style>
            :root {{
                --bg: {bg};
                --panel: {panel};
                --text: {text};
                --muted: {muted};
                --primary: {primary};
                --accent: {accent};
            }}

            .stApp {{
                background:
                    radial-gradient(circle at 10% 12%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 42%),
                    radial-gradient(circle at 90% 8%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 36%),
                    radial-gradient(circle at 52% 78%, rgba(255, 132, 0, 0.08), transparent 45%),
                    linear-gradient(160deg, var(--bg), color-mix(in srgb, var(--panel) 88%, black));
                color: var(--text);
                scroll-behavior: smooth;
            }}

            h1, h2, h3, h4, h5, h6,
            p, li, label,
            .stMarkdown, .stText,
            [data-testid="stMetricLabel"],
            [data-testid="stMetricValue"],
            [data-testid="stCaptionContainer"] {{
                color: var(--text) !important;
            }}

            [data-testid="stSidebar"] * {{
                color: var(--text) !important;
            }}

            section[data-testid="stSidebar"] {{
                display: none !important;
            }}

            .stTextArea textarea,
            .stTextInput input,
            .stFileUploader,
            [data-baseweb="textarea"],
            [data-baseweb="input"] {{
                color: var(--text) !important;
            }}

            .stTextArea textarea {{
                background: #1b1013 !important;
                border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent) !important;
                border-radius: 0.7rem !important;
            }}

            .stTextArea label,
            .stFileUploader label,
            .st-emotion-cache-1wmy9hl,
            .st-emotion-cache-16idsys p {{
                color: var(--text) !important;
            }}

            .stMainBlockContainer {{
                max-width: 980px;
                padding-top: 1.2rem;
                position: relative;
            }}

            section[data-testid="stSidebar"] {{
                background: linear-gradient(180deg, var(--panel), color-mix(in srgb, var(--panel) 88%, black));
                border-right: 1px solid color-mix(in srgb, var(--muted) 22%, transparent);
            }}

            .stButton > button {{
                border-radius: 0.75rem;
                border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
                background: color-mix(in srgb, var(--primary) 18%, transparent);
                font-weight: 700;
                color: var(--text);
                box-shadow: 0 0 0 rgba(239, 68, 68, 0.55);
                animation: pulseGlow 2.2s infinite;
            }}

            .rr-badge {{
                display: inline-block;
                padding: 0.35rem 0.7rem;
                border-radius: 999px;
                border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
                background: color-mix(in srgb, var(--primary) 15%, transparent);
                margin-bottom: 0.55rem;
                font-size: 0.82rem;
                animation: floaty 3.4s ease-in-out infinite;
            }}

            .rr-note {{
                color: var(--muted);
            }}

            .rr-card {{
                border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
                background: linear-gradient(135deg, color-mix(in srgb, var(--panel) 90%, black), color-mix(in srgb, var(--primary) 10%, transparent));
                border-radius: 0.9rem;
                padding: 0.8rem 0.95rem;
                margin-bottom: 0.7rem;
            }}

            .rr-roast-block {{
                border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
                border-radius: 0.95rem;
                padding: 1rem;
                background: linear-gradient(140deg, rgba(47, 9, 11, 0.7), rgba(20, 8, 10, 0.9));
                margin-bottom: 0.8rem;
            }}

            .rr-result-glow {{
                border-radius: 1rem;
                border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
                background: linear-gradient(145deg, rgba(57, 10, 12, 0.64), rgba(21, 8, 10, 0.9));
                padding: 0.95rem;
                box-shadow: 0 0 0 rgba(251, 113, 133, 0.22);
                animation: resultGlow 2.4s ease-in-out infinite;
                margin-bottom: 0.8rem;
            }}

            .rr-skeleton-wrap {{
                margin: 0.75rem 0 0.85rem 0;
                padding: 0.8rem;
                border-radius: 0.9rem;
                border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
                background: linear-gradient(130deg, rgba(39, 10, 12, 0.7), rgba(23, 10, 12, 0.9));
            }}

            .rr-skeleton-line {{
                height: 11px;
                border-radius: 999px;
                margin-bottom: 0.52rem;
                background: linear-gradient(90deg, rgba(120, 42, 49, 0.35) 15%, rgba(251, 113, 133, 0.62) 45%, rgba(120, 42, 49, 0.35) 75%);
                background-size: 220% 100%;
                animation: shimmer 1.25s linear infinite;
            }}

            .rr-skeleton-line.short {{
                width: 62%;
            }}

            .rr-skeleton-line.med {{
                width: 82%;
            }}

            .rr-skeleton-line.full {{
                width: 100%;
            }}

            .rr-kicker {{
                font-size: 0.95rem;
                color: #fecaca;
                margin-bottom: 0.3rem;
                letter-spacing: 0.02rem;
            }}

            .rr-card h4 {{
                margin: 0 0 0.45rem 0;
            }}

            .rr-dialogue-card {{
                border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
                border-radius: 0.9rem;
                padding: 0.7rem 0.85rem;
                margin-bottom: 0.55rem;
                background: linear-gradient(145deg, rgba(61, 8, 10, 0.72), rgba(29, 8, 10, 0.9));
                box-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.06);
            }}

            .rr-dialogue-label {{
                color: #fecaca;
                font-size: 0.82rem;
                margin-bottom: 0.2rem;
                letter-spacing: 0.02rem;
            }}

            .rr-dialogue-line {{
                color: #ffe4e6;
                font-weight: 600;
                line-height: 1.35;
            }}

            .rr-issue {{
                color: #fecdd3;
                margin: 0.2rem 0;
            }}

            .rr-fix {{
                color: #bbf7d0;
                margin: 0.2rem 0;
            }}

            .rr-hero {{
                position: relative;
                overflow: hidden;
                border-radius: 1rem;
                border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
                background: linear-gradient(120deg, color-mix(in srgb, var(--panel) 82%, transparent), color-mix(in srgb, var(--panel) 95%, black));
                padding: 1rem 1rem 0.8rem 1rem;
                margin-bottom: 0.9rem;
            }}

            .rr-hero::before,
            .rr-hero::after {{
                content: "";
                position: absolute;
                width: 220px;
                height: 220px;
                border-radius: 999px;
                filter: blur(28px);
                pointer-events: none;
            }}

            .rr-fireline {{
                height: 2px;
                border-radius: 999px;
                background: linear-gradient(90deg, rgba(239, 68, 68, 0.08), rgba(251, 113, 133, 0.9), rgba(255, 153, 0, 0.8), rgba(239, 68, 68, 0.08));
                margin: 0.4rem 0 0.85rem 0;
                animation: pulseLine 2.2s ease-in-out infinite;
            }}

            .rr-hero::before {{
                background: color-mix(in srgb, var(--accent) 42%, transparent);
                top: -110px;
                right: -70px;
                animation: driftA 8s ease-in-out infinite;
            }}

            .rr-hero::after {{
                background: color-mix(in srgb, var(--primary) 35%, transparent);
                bottom: -120px;
                left: -70px;
                animation: driftB 9s ease-in-out infinite;
            }}

            @keyframes pulseGlow {{
                0% {{ box-shadow: 0 0 0 rgba(239, 68, 68, 0.25); }}
                50% {{ box-shadow: 0 0 18px rgba(239, 68, 68, 0.45); }}
                100% {{ box-shadow: 0 0 0 rgba(239, 68, 68, 0.25); }}
            }}

            @keyframes floaty {{
                0%, 100% {{ transform: translateY(0); }}
                50% {{ transform: translateY(-3px); }}
            }}

            @keyframes driftA {{
                0%, 100% {{ transform: translate(0, 0); }}
                50% {{ transform: translate(-14px, 12px); }}
            }}

            @keyframes driftB {{
                0%, 100% {{ transform: translate(0, 0); }}
                50% {{ transform: translate(14px, -10px); }}
            }}

            @keyframes pulseLine {{
                0%, 100% {{ opacity: 0.45; transform: scaleX(0.98); }}
                50% {{ opacity: 1; transform: scaleX(1); }}
            }}

            @keyframes shimmer {{
                0% {{ background-position: 0% 50%; }}
                100% {{ background-position: 100% 50%; }}
            }}

            @keyframes resultGlow {{
                0%, 100% {{ box-shadow: 0 0 0 rgba(251, 113, 133, 0.24); }}
                50% {{ box-shadow: 0 0 22px rgba(251, 113, 133, 0.36); }}
            }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_loading_skeleton() -> None:
    st.markdown('<div class="rr-kicker">🔥 Roasting your resume...</div>', unsafe_allow_html=True)
    st.markdown(
        """
        <div class="rr-skeleton-wrap">
            <div class="rr-skeleton-line full"></div>
            <div class="rr-skeleton-line med"></div>
            <div class="rr-skeleton-line short"></div>
            <div class="rr-skeleton-line full"></div>
            <div class="rr-skeleton-line med"></div>
            <div class="rr-skeleton-line short"></div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def smooth_scroll_to(anchor_id: str) -> None:
    components.html(
        f"""
        <script>
            const targetId = {json.dumps(anchor_id)};
            const scrollToTarget = () => {{
                const doc = window.parent.document;
                const target = doc.getElementById(targetId);
                if (target) {{
                    target.scrollIntoView({{ behavior: "smooth", block: "start" }});
                }}
            }};
            setTimeout(scrollToTarget, 120);
        </script>
        """,
        height=0,
    )


def render_result(result: dict[str, Any]) -> None:
    score = int(result.get("ats_score", 0))
    score = max(0, min(100, score))

    st.markdown('<div id="roast-result"></div>', unsafe_allow_html=True)

    if result.get("source") == "fallback":
        st.warning("Fallback mode active for this result.")

    st.markdown('<div class="rr-result-glow">', unsafe_allow_html=True)
    st.markdown('<div class="rr-kicker">🔥 Fresh Roast Result</div>', unsafe_allow_html=True)

    st.subheader("ATS Summary")
    s1, s2 = st.columns([1, 2])
    with s1:
        st.metric("ATS Score", f"{score_emoji(score)} {score}/100")
    with s2:
        verdict = result.get("verdict", "No verdict returned")
        verdict_reason = result.get("verdict_reason", "")
        st.success(f"{verdict_emoji(verdict)} {verdict}")
        if verdict_reason:
            st.caption(verdict_reason)

    st.markdown('</div>', unsafe_allow_html=True)

    st.subheader("Keywords")
    k1, k2 = st.columns(2, gap="large")
    with k1:
        st.markdown("**Matching Keywords**")
        matching = result.get("matching_keywords", [])
        if matching:
            for item in matching:
                st.write(f"- {item}")
        else:
            st.caption("No strong matches detected")

    with k2:
        st.markdown("**Missing Keywords**")
        missing = result.get("missing_keywords", [])
        if missing:
            for item in missing:
                st.write(f"- {item}")
        else:
            st.caption("No critical gaps detected")

    st.subheader("Live Recruiter Roast")
    st.markdown('<div class="rr-roast-block">', unsafe_allow_html=True)
    st.markdown('<div class="rr-kicker">🔥 Live panel reaction</div>', unsafe_allow_html=True)
    st.write(result.get("roast", "No roast returned"))
    st.markdown('</div>', unsafe_allow_html=True)

    st.subheader("Roast Dialogues")
    for idx, line in enumerate(get_roast_dialogues(result), start=1):
        st.markdown(
            f"""
            <div class="rr-dialogue-card">
                <div class="rr-dialogue-label">🎙️ Judge {idx}</div>
                <div class="rr-dialogue-line">{line}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.subheader("Section-by-Section Roast")
    for block in result.get("section_roasts", []):
        section = block.get("section", "Section")
        sec_score = block.get("score", "-")
        issue = block.get("issue", "-")
        reaction = block.get("reaction", "-")
        fix = block.get("fix", "-")
        emoji = section_emoji(section)
        st.markdown(
            f"""
            <div class="rr-card">
                <h4>{emoji} {section} - {sec_score}/10</h4>
                <p class="rr-issue"><strong>🚨 Issue:</strong> {issue}</p>
                <p class="rr-issue"><strong>🎤 Recruiter reaction:</strong> {reaction}</p>
                <p class="rr-fix"><strong>🛠️ Change:</strong> {fix}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.subheader("Fixes")
    for fix in result.get("fixes", []):
        st.write(f"✅ {fix}")


def configure_gemini() -> None:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if key:
        genai.configure(api_key=key)


def gemini_ready() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def run_gemini(prompt: str) -> str:
    if not gemini_ready():
        raise RuntimeError("Missing GEMINI_API_KEY. Add it in Streamlit Cloud secrets.")
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)
    return (response.text or "").strip()


def extract_pdf_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def read_uploaded_resume(file_obj: Any) -> str:
    if file_obj is None:
        return ""

    name = file_obj.name.lower()
    raw = file_obj.getvalue()
    if name.endswith(".pdf"):
        return extract_pdf_text(raw)
    if name.endswith(".txt"):
        return raw.decode("utf-8", errors="ignore")

    raise RuntimeError("Unsupported file type. Upload PDF or TXT.")


def parse_json_response(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    return json.loads(cleaned)


def show_roast_loader() -> None:
    stages = [
        ("🔥 Igniting roast engine...", "Warming up sarcasm cores", 12),
        ("🧠 Reading your resume line by line...", "Looking for vague claims", 28),
        ("📉 Measuring impact credibility...", "Numbers missing? We will find out", 46),
        ("🎯 Matching ATS keywords...", "Checking what recruiters expect", 63),
        ("🧨 Detecting fluff and buzzwords...", "No mercy for filler", 79),
        ("⚔️ Drafting your roast + fixes...", "Turning criticism into action", 93),
        ("✅ Finalizing report...", "Serving hot feedback", 100),
    ]

    status = st.empty()
    hook = st.empty()
    bar = st.progress(0)

    for headline, subline, pct in stages:
        status.info(headline)
        hook.caption(subline)
        bar.progress(pct)
        time.sleep(0.34)

    status.success("Roast complete. Brace yourself.")


def summarize_error_reason(reason: str) -> str:
    lower = reason.lower()
    if "429" in lower or "quota" in lower or "rate limit" in lower:
        return "AI rate limit reached. Fallback mode is active."
    if "api key" in lower:
        return "API key issue detected. Fallback mode is active."
    return "AI service temporarily unavailable. Fallback mode is active."


def heuristic_analyze_resume(resume_text: str, job_description: str, reason: str) -> dict[str, Any]:
    text = resume_text or ""
    lower_text = text.lower()
    words = [w for w in text.replace("\n", " ").split(" ") if w.strip()]
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    bullet_count = sum(1 for ln in lines if ln.startswith(("-", "*", "•")))
    metric_chars = sum(1 for ch in text if ch.isdigit())

    score = 42

    # Basic structure checks
    for section in ("experience", "education", "skills", "project"):
        if section in lower_text:
            score += 5

    has_metrics = any(ch.isdigit() for ch in text)
    if has_metrics:
        score += min(14, metric_chars // 5)

    if bullet_count >= 8:
        score += 6
    elif bullet_count <= 2:
        score -= 5

    if len(words) >= 350:
        score += 6
    elif len(words) <= 160:
        score -= 8

    # Simple JD keyword matching
    matching_keywords: list[str] = []
    missing_keywords: list[str] = []
    if job_description.strip():
        jd_tokens = {
            tok.strip(".,:;()[]{}!?\"'").lower()
            for tok in job_description.split()
            if len(tok.strip(".,:;()[]{}!?\"'")) >= 4
        }
        common_stop = {
            "with", "that", "this", "from", "your", "have", "will", "role",
            "team", "work", "experience", "years", "skills", "must", "able",
        }
        jd_keywords = [k for k in jd_tokens if k not in common_stop][:30]
        for kw in jd_keywords:
            if kw in lower_text:
                matching_keywords.append(kw)
            else:
                missing_keywords.append(kw)

        score += min(16, len(matching_keywords) * 2)
        score -= min(14, len(missing_keywords))
    else:
        # General ATS defaults when no JD is provided
        for kw in ("python", "sql", "api", "leadership", "communication"):
            if kw in lower_text:
                matching_keywords.append(kw)
            else:
                missing_keywords.append(kw)

    score = max(22, min(94, score))

    buzzwords = [
        "team player", "hardworking", "results-oriented", "passionate", "responsible for",
        "detail-oriented", "self-motivated", "dynamic", "fast learner",
    ]
    buzz_found = [b for b in buzzwords if b in lower_text]

    issues: list[str] = []
    if not has_metrics:
        issues.append("zero measurable impact")
    if len(words) < 220:
        issues.append("thin content that reads like a draft")
    if buzz_found:
        issues.append("buzzword overload")
    if "project" not in lower_text:
        issues.append("weak project evidence")
    if "lead" not in lower_text and "managed" not in lower_text:
        issues.append("limited leadership signals")

    if not issues:
        issues.append("execution details are still too generic")

    roast = (
        "🔥 Roast panel is live. Your resume walked in loud, but the evidence walked in late.\n\n"
        f"🚨 Main offense: {issues[0]}. Recruiters do not hire confidence theater; they hire proven outcomes.\n\n"
        "😂 Current vibe: this reads like a trailer for achievements, not the full movie. "
        "If impact had subtitles here, half the bullets would still be buffering.\n\n"
        "🧠 Good news: this is fixable fast. Bad news: in this state, many recruiters will pass in under 15 seconds."
    )

    fixes = [
        "Rewrite each bullet as Action + Tool + Result + Metric (no metric = rewrite again).",
        "Replace vague phrases with quantifiable outcomes (% improvement, latency drop, revenue impact).",
        "Mirror top job-description keywords in your summary, skills, and strongest experience bullets.",
        "Delete weak filler adjectives and keep each bullet to one concrete impact statement.",
        "Add a project section with stack, scale, and one measurable result per project.",
        "Prioritize high-impact achievements first; stop leading with low-value maintenance tasks.",
    ]

    roast_dialogues = [
        "Panelist 1: This summary is confidence cosplay with zero receipts.",
        "Panelist 2: Experience section reads like chores, not impact.",
        "Panelist 3: Skills are loud, proof is whispering in the corner.",
        "Panelist 4: Projects look busy but not valuable yet.",
        "Panelist 5: Formatting is clean enough, content is still undercooked.",
    ]

    section_roasts = [
        {
            "section": "Summary",
            "score": 4,
            "issue": "Sounds generic and does not establish clear value.",
            "reaction": "Recruiter reaction: 'I read this exact summary 20 times this morning.'",
            "fix": "Use 2-3 lines with role target + domain + one measurable achievement.",
        },
        {
            "section": "Experience",
            "score": 5,
            "issue": "Reads like responsibilities, not outcomes.",
            "reaction": "Recruiter reaction: 'Nice duties. Where are the results?'",
            "fix": "Rewrite bullets with impact metrics and clear results.",
        },
        {
            "section": "Skills",
            "score": 5,
            "issue": "Tool list has weak proof of depth.",
            "reaction": "Recruiter reaction: 'Skill list is loud, proof is quiet.'",
            "fix": "Tie top skills to specific projects and measurable outcomes.",
        },
        {
            "section": "Projects",
            "score": 6,
            "issue": "Projects are present but impact framing is weak.",
            "reaction": "Recruiter reaction: 'Cool build, unclear why it matters.'",
            "fix": "For each project, include problem, your contribution, and measurable outcome.",
        },
        {
            "section": "Formatting & Clarity",
            "score": 6,
            "issue": "Readable, but key wins are buried and bullets are too soft.",
            "reaction": "Recruiter reaction: 'Not broken, but too easy to skip.'",
            "fix": "Move top wins higher, tighten bullet length, and remove filler language.",
        },
    ]

    return {
        "ats_score": score,
        "verdict": "Maybe",
        "verdict_reason": summarize_error_reason(reason),
        "matching_keywords": matching_keywords[:12],
        "missing_keywords": missing_keywords[:12],
        "roast": roast,
        "roast_dialogues": roast_dialogues,
        "fixes": fixes,
        "section_roasts": section_roasts,
        "source": "fallback",
    }


def analyze_resume(resume_text: str, job_description: str) -> dict[str, Any]:
    prompt = f"""
Roast this resume like a panel of ruthless senior recruiters, hiring managers, startup founders, and internet comedians are reviewing it live.

Do not sugarcoat. Be brutally honest, sarcastic, witty, and specific.

Maximum chaos mode:
- Reviewer has seen 800 resumes today.
- Has only 15 seconds to decide.
- Every criticism must include a practical fix.

Return STRICT VALID JSON only, no markdown.

Required keys:
- ats_score: integer from 0 to 100
- verdict: one of ["Interview", "Maybe", "Straight to the Recycle Bin"]
- verdict_reason: short explanation for the verdict
- matching_keywords: array of strings
- missing_keywords: array of strings
- roast: string (4-7 paragraphs, savage, funny, specific, and uses a few fitting emojis)
- roast_dialogues: array of exactly 5 short lines, each a judge panel quote
- fixes: array of exactly 6 specific actionable bullet points
- section_roasts: array of exactly 5 objects with keys:
    - section
    - score (1-10)
    - issue
    - reaction
    - fix

Rules:
- Roast summary, experience, skills, projects, and formatting.
- Point out clichés, filler words, weak projects, unrealistic claims, and recruiter cringe moments.
- Explain why each issue is weak after each joke.
- Keep the output hilarious but genuinely useful.
- Keep tone high-energy with roast-show vibes, but never generic.
- No compliments, no softening language, no polite framing. Keep it pure roast.

Resume:
{resume_text[:9000]}

Target Job Description (optional):
{job_description[:4000]}
"""

    try:
        raw = run_gemini(prompt)
        parsed = parse_json_response(raw)
        parsed["source"] = "gemini"
        return parsed
    except Exception as exc:
        return heuristic_analyze_resume(resume_text, job_description, str(exc))


def main() -> None:
    st.set_page_config(page_title="ResumeRoast", page_icon=":fire:", layout="wide", initial_sidebar_state="collapsed")
    configure_gemini()

    if "resume_text" not in st.session_state:
        st.session_state.resume_text = ""
    if "analysis_result" not in st.session_state:
        st.session_state.analysis_result = None
    if "auto_scroll_to_roast" not in st.session_state:
        st.session_state.auto_scroll_to_roast = False

    apply_theme()

    st.markdown('<div class="rr-hero">', unsafe_allow_html=True)
    st.markdown(f'<span class="rr-badge">{APP_VERSION}</span>', unsafe_allow_html=True)
    st.title("Upload Resume, Get Roasted")
    st.markdown('<div class="rr-fireline"></div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

    uploaded = st.file_uploader("Upload resume", type=["pdf", "txt"], help="PDF or TXT")
    job_description = st.text_area("Job description (optional)", height=140)

    if uploaded is not None:
        try:
            st.session_state.resume_text = read_uploaded_resume(uploaded)
            st.success(f"Loaded: {uploaded.name}")
        except Exception as exc:
            st.error(f"Failed to read file: {exc}")

    st.text_area("Resume text (editable)", key="resume_text", height=260)

    jump_col, _ = st.columns([1, 3])
    with jump_col:
        if st.session_state.analysis_result is not None:
            if st.button("Jump to Roast Result 🔥", use_container_width=True):
                st.session_state.auto_scroll_to_roast = True

    if st.button("Run Roast + ATS Score", use_container_width=True):
        if not st.session_state.resume_text.strip():
            st.warning("Upload a resume or paste text first")
            st.stop()

        skeleton = st.empty()
        with skeleton.container():
            render_loading_skeleton()

        show_roast_loader()

        try:
            result = analyze_resume(st.session_state.resume_text, job_description)
        except Exception as exc:
            skeleton.empty()
            st.error(f"Analysis failed: {exc}")
            st.stop()

        skeleton.empty()
        st.session_state.analysis_result = result
        st.session_state.auto_scroll_to_roast = True
        st.toast("🔥 Your resume has been roasted")

    if st.session_state.analysis_result is not None:
        render_result(st.session_state.analysis_result)
        if st.session_state.auto_scroll_to_roast:
            smooth_scroll_to("roast-result")
            st.session_state.auto_scroll_to_roast = False

    st.markdown('<p class="rr-note">Tip: Better roast quality comes from resumes with clear projects, metrics, and role context.</p>', unsafe_allow_html=True)


if __name__ == "__main__":
    main()