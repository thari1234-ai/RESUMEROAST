import json
import os
from typing import Any

import fitz
import google.generativeai as genai
import streamlit as st


def apply_theme(theme_mode: str) -> None:
    if theme_mode == "Night Ember":
        bg = "#0b1020"
        panel = "#11162a"
        card = "#1b2340"
        text = "#f3f4f6"
        muted = "#94a3b8"
        primary = "#fb7185"
        accent = "#f59e0b"
    else:
        bg = "#fdf7f2"
        panel = "#fffaf5"
        card = "#ffe7d6"
        text = "#1f2937"
        muted = "#6b7280"
        primary = "#ea580c"
        accent = "#0ea5e9"

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

            .rr-banner {{
                background: linear-gradient(90deg, color-mix(in srgb, var(--primary) 24%, transparent), color-mix(in srgb, var(--accent) 14%, transparent));
                border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent);
                border-radius: 0.8rem;
                padding: 0.9rem 1rem;
                margin: 0.3rem 0 1rem 0;
            }}

            .rr-note {{
                color: var(--muted);
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

    raw = run_gemini(prompt)
    return parse_json_response(raw)


def key_status() -> None:
    if gemini_ready():
        st.success("GEMINI_API_KEY detected")
    else:
        st.warning("Missing GEMINI_API_KEY in secrets")


def main() -> None:
    st.set_page_config(page_title="ResumeRoast", page_icon=":fire:", layout="wide")
    configure_gemini()

    if "theme_mode" not in st.session_state:
        st.session_state.theme_mode = "Sunset Paper"
    if "resume_text" not in st.session_state:
        st.session_state.resume_text = ""

    with st.sidebar:
        st.header("ResumeRoast")
        st.session_state.theme_mode = st.selectbox(
            "Theme",
            ["Sunset Paper", "Night Ember"],
            index=0 if st.session_state.theme_mode == "Sunset Paper" else 1,
        )
        key_status()
        st.caption("Single-purpose app: Upload resume -> ATS score + Roast")

    apply_theme(st.session_state.theme_mode)

    st.markdown('<span class="rr-badge">ResumeRoast v1</span>', unsafe_allow_html=True)
    st.title("Upload Resume, Get Roasted")
    st.markdown(
        '<div class="rr-banner">This app only does one thing: analyze your resume, score ATS fit, and give a hard-hitting roast with fixes.</div>',
        unsafe_allow_html=True,
    )

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

        c1, c2 = st.columns([1, 2])
        with c1:
            st.metric("ATS Score", f"{score}/100")
        with c2:
            st.info(result.get("verdict", "No verdict returned"))

        left, right = st.columns(2)
        with left:
            st.subheader("Matching Keywords")
            for item in result.get("matching_keywords", []):
                st.write(f"- {item}")

        with right:
            st.subheader("Missing Keywords")
            for item in result.get("missing_keywords", []):
                st.write(f"- {item}")

        st.subheader("Roast")
        st.write(result.get("roast", "No roast returned"))

        st.subheader("Fixes")
        for fix in result.get("fixes", []):
            st.write(f"- {fix}")

    st.markdown('<p class="rr-note">Tip: Better roast quality comes from resumes with clear projects, metrics, and role context.</p>', unsafe_allow_html=True)


if __name__ == "__main__":
    main()