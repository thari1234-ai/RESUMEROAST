import json
import os
from typing import Any

import fitz
import google.generativeai as genai
import streamlit as st

APP_VERSION = "ResumeRoast v2.4"


def apply_theme(theme_mode: str) -> None:
    if theme_mode == "Carbon Mint":
        bg = "#0f1418"
        panel = "#141b20"
        card = "#1a232a"
        text = "#e8eef2"
        muted = "#9fb0bc"
        primary = "#2dd4bf"
        accent = "#22d3ee"
    else:
        bg = "#f6fbfa"
        panel = "#ffffff"
        card = "#e9f7f4"
        text = "#1c2b2f"
        muted = "#5b7078"
        primary = "#0f766e"
        accent = "#0891b2"

    st.markdown(
        f"""
        <style>
            :root {{
                --bg: {bg};
                --panel: {panel};
                --card: {card};
                --text: {text};
                --muted: {muted};
                --primary: {primary};
                --accent: {accent};
            }}

            .stApp {{
                background:
                    radial-gradient(circle at 5% 10%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 40%),
                    radial-gradient(circle at 95% 20%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 40%),
                    linear-gradient(160deg, var(--bg), color-mix(in srgb, var(--panel) 85%, black));
                color: var(--text);
            }}

            .stMainBlockContainer {{
                max-width: 980px;
                padding-top: 1.2rem;
            }}

            section[data-testid="stSidebar"] {{
                background: linear-gradient(180deg, var(--panel), color-mix(in srgb, var(--card) 60%, var(--panel)));
                border-right: 1px solid color-mix(in srgb, var(--muted) 22%, transparent);
            }}

            .stButton > button {{
                border-radius: 0.75rem;
                border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
                background: color-mix(in srgb, var(--primary) 18%, transparent);
                font-weight: 700;
            }}

            .rr-badge {{
                display: inline-block;
                padding: 0.35rem 0.7rem;
                border-radius: 999px;
                border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
                background: color-mix(in srgb, var(--primary) 15%, transparent);
                margin-bottom: 0.55rem;
                font-size: 0.82rem;
            }}

            .rr-note {{
                color: var(--muted);
            }}

            .rr-section h3 {{
                margin-top: 0.3rem;
                margin-bottom: 0.45rem;
            }}

            .rr-list {{
                background: color-mix(in srgb, var(--panel) 75%, transparent);
                border: 1px solid color-mix(in srgb, var(--muted) 20%, transparent);
                border-radius: 0.7rem;
                padding: 0.7rem 0.9rem;
                min-height: 170px;
            }}
        </style>
        """,
        unsafe_allow_html=True,
    )


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

    base = 58
    score = base

    # Basic structure checks
    for section in ("experience", "education", "skills", "project"):
        if section in lower_text:
            score += 4

    has_metrics = any(ch.isdigit() for ch in text)
    if has_metrics:
        score += 8

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

        score += min(14, len(matching_keywords))
        score -= min(10, len(missing_keywords) // 3)
    else:
        # General ATS defaults when no JD is provided
        for kw in ("python", "sql", "api", "leadership", "communication"):
            if kw in lower_text:
                matching_keywords.append(kw)
            else:
                missing_keywords.append(kw)

    score = max(35, min(92, score))

    roast = (
        "Your resume has solid material, but it still feels too duty-focused in places. "
        "Recruiters and ATS systems reward evidence, not just responsibilities. "
        "Use sharper impact language and quantified results to turn this from acceptable to shortlist-worthy."
    )

    fixes = [
        "Rewrite bullets as Action + Tool + Result + Metric.",
        "Add measurable outcomes (% improvement, time saved, revenue impact).",
        "Prioritize role-relevant keywords from the job description near top sections.",
        "Trim repetitive or generic phrases and keep bullets concise.",
        "Group skills by category (Languages, Tools, Frameworks) for better ATS parsing.",
        "Ensure each project includes scope, your contribution, and business impact.",
    ]

    return {
        "ats_score": score,
        "verdict": summarize_error_reason(reason),
        "matching_keywords": matching_keywords[:12],
        "missing_keywords": missing_keywords[:12],
        "roast": roast,
        "fixes": fixes,
        "source": "fallback",
    }


def analyze_resume(resume_text: str, job_description: str) -> dict[str, Any]:
    prompt = f"""
You are an ATS specialist and brutal but useful resume critic.
Return STRICT VALID JSON only, no markdown.

Required keys:
- ats_score: integer from 0 to 100
- verdict: short one-line summary
- matching_keywords: array of strings
- missing_keywords: array of strings
- roast: string (3-5 short paragraphs, witty but professional)
- fixes: array of exactly 6 specific actionable bullet points

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
    st.set_page_config(page_title="ResumeRoast", page_icon=":fire:", layout="wide")
    configure_gemini()

    if "theme_mode" not in st.session_state:
        st.session_state.theme_mode = "Mint Glass"
    if "resume_text" not in st.session_state:
        st.session_state.resume_text = ""

    with st.sidebar:
        st.header("ResumeRoast")
        st.session_state.theme_mode = st.selectbox(
            "Theme",
            ["Mint Glass", "Carbon Mint"],
            index=0 if st.session_state.theme_mode == "Mint Glass" else 1,
        )

    apply_theme(st.session_state.theme_mode)

    st.markdown(f'<span class="rr-badge">{APP_VERSION}</span>', unsafe_allow_html=True)
    st.title("Upload Resume, Get Roasted")

    uploaded = st.file_uploader("Upload resume", type=["pdf", "txt"], help="PDF or TXT")
    job_description = st.text_area("Job description (optional)", height=140)

    if uploaded is not None:
        try:
            st.session_state.resume_text = read_uploaded_resume(uploaded)
            st.success(f"Loaded: {uploaded.name}")
        except Exception as exc:
            st.error(f"Failed to read file: {exc}")

    st.text_area("Resume text (editable)", key="resume_text", height=260)

    if st.button("Run Roast + ATS Score", use_container_width=True):
        if not st.session_state.resume_text.strip():
            st.warning("Upload a resume or paste text first")
            st.stop()

        try:
            result = analyze_resume(st.session_state.resume_text, job_description)
        except Exception as exc:
            st.error(f"Analysis failed: {exc}")
            st.stop()

        score = int(result.get("ats_score", 0))
        score = max(0, min(100, score))

        if result.get("source") == "fallback":
            st.warning("Fallback mode active for this result.")

        st.subheader("ATS Summary")
        s1, s2 = st.columns([1, 2])
        with s1:
            st.metric("ATS Score", f"{score}/100")
        with s2:
            st.success(result.get("verdict", "No verdict returned"))

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

        st.subheader("Roast")
        st.write(result.get("roast", "No roast returned"))

        st.subheader("Fixes")
        for fix in result.get("fixes", []):
            st.write(f"- {fix}")

    st.markdown('<p class="rr-note">Tip: Better roast quality comes from resumes with clear projects, metrics, and role context.</p>', unsafe_allow_html=True)


if __name__ == "__main__":
    main()