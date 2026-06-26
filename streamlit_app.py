import json
import os
from typing import Any

import fitz
import google.generativeai as genai
import streamlit as st


def apply_theme(theme_mode: str) -> None:
    if theme_mode == "Dark Slate":
        bg = "#0f172a"
        panel = "#111827"
        card = "#1f2937"
        text = "#e5e7eb"
        muted = "#9ca3af"
        primary = "#22c55e"
    else:
        bg = "#f4f6fb"
        panel = "#ffffff"
        card = "#eef2ff"
        text = "#0f172a"
        muted = "#475569"
        primary = "#0ea5e9"

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
            }}

            .stApp {{
                background: radial-gradient(circle at 10% 0%, var(--card), var(--bg) 45%);
                color: var(--text);
            }}

            .stMainBlockContainer {{
                max-width: 1100px;
                padding-top: 1.5rem;
            }}

            section[data-testid="stSidebar"] {{
                background: linear-gradient(180deg, var(--panel), var(--card));
                border-right: 1px solid color-mix(in srgb, var(--muted) 25%, transparent);
            }}

            div[data-testid="stTabs"] button[role="tab"] {{
                border-radius: 0.65rem;
                padding: 0.35rem 0.7rem;
                transition: all 0.15s ease;
            }}

            div[data-testid="stTabs"] button[aria-selected="true"] {{
                background: color-mix(in srgb, var(--primary) 16%, transparent);
                color: var(--text);
                border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
            }}

            .stButton > button {{
                border-radius: 0.6rem;
                border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
            }}

            .cg-banner {{
                background: linear-gradient(90deg, color-mix(in srgb, var(--primary) 18%, transparent), transparent);
                border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
                border-radius: 0.7rem;
                padding: 0.8rem 1rem;
                margin: 0.2rem 0 1rem 0;
                color: var(--text);
            }}

            .cg-caption {{
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
        raise RuntimeError("Missing GEMINI_API_KEY. Add it in Streamlit Cloud app settings -> Secrets.")
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)
    return (response.text or "").strip()


def fallback_roast(resume_text: str) -> str:
    words = [w for w in resume_text.replace("\n", " ").split(" ") if w.strip()]
    has_metrics = any(ch.isdigit() for ch in resume_text)
    score = 6 if has_metrics else 4
    return (
        "THE ROAST\n\n"
        "You have content, but it reads too generic and impact is not obvious. "
        "Recruiters need measurable wins and tighter bullets.\n\n"
        "BIGGEST CRIMES\n"
        "- Vague claims with weak proof\n"
        "- Bullets that describe duties instead of outcomes\n"
        "- Limited quantified impact\n"
        "- Repetitive wording and filler terms\n"
        "- Structure can be cleaner and more focused\n\n"
        "REDEMPTION ARC\n"
        "- Rewrite bullets as Action + Tool + Outcome + Metric\n"
        "- Add one number-driven impact per major bullet\n"
        "- Keep bullets concise and specific\n"
        "- Prioritize role-relevant projects and skills\n"
        "- Cut weak adjectives and use evidence\n\n"
        f"VERDICT\n{score}/10 - Solid base, needs sharper proof and clearer impact.\n"
        f"Word count checked: {len(words)}"
    )


def extract_pdf_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def ensure_state() -> None:
    if "theme_mode" not in st.session_state:
        st.session_state.theme_mode = "Light Sky"
    if "iv_history" not in st.session_state:
        st.session_state.iv_history = []


def ats_tab() -> None:
    st.subheader("ATS Analyzer")
    resume_text = st.text_area("Resume text", height=200)
    job_description = st.text_area("Job description (optional)", height=180)
    if st.button("Analyze ATS", use_container_width=True):
        if not resume_text.strip():
            st.warning("Resume text is required")
            return
        try:
            if job_description.strip():
                prompt = f"""
You are an ATS and recruiter expert.
Analyze this resume against this job description and return valid JSON with keys:
score (0-100), matching_keywords (list), missing_keywords (list), improvements (list), feedback (string).

Resume:
{resume_text}

Job Description:
{job_description}
"""
            else:
                prompt = f"""
You are an ATS and recruiter expert.
Analyze this resume and return valid JSON with keys:
score (0-100), matching_keywords (list), missing_keywords (list), improvements (list), feedback (string).

Resume:
{resume_text}
"""
            raw = run_gemini(prompt)
            st.markdown("### Result")
            try:
                parsed: Any = json.loads(raw)
                st.json(parsed)
            except Exception:
                st.code(raw, language="json")
        except Exception as exc:
            st.error(f"ATS analysis failed: {exc}")


def resume_tab() -> None:
    st.subheader("Resume Builder")
    name = st.text_input("Full name")
    contact = st.text_input("Contact info")
    experience = st.text_area("Experience", height=160)
    education = st.text_area("Education", height=120)
    skills = st.text_area("Skills", height=100)

    if st.button("Generate Resume", use_container_width=True):
        try:
            prompt = f"""
Create a professional ATS-optimized resume in Markdown format.

Name: {name}
Contact: {contact}
Experience: {experience}
Education: {education}
Skills: {skills}

Return only the resume markdown.
"""
            data = run_gemini(prompt)
            st.markdown("### Generated Resume")
            st.markdown(data)
        except Exception as exc:
            st.error(f"Resume generation failed: {exc}")


def roast_tab() -> None:
    st.subheader("Resume Roaster")
    resume_text = st.text_area("Paste resume text", height=220, key="roast_text")
    if st.button("Roast my resume", use_container_width=True):
        if not resume_text.strip():
            st.warning("Resume text is required")
            return
        try:
            if gemini_ready():
                prompt = f"""
You are a brutally honest but helpful resume reviewer.
Give a funny but professional roast with this structure:
1) THE ROAST (3-5 short paragraphs)
2) BIGGEST CRIMES (5 bullets)
3) REDEMPTION ARC (5-7 actionable fixes)
4) VERDICT (one-line score)

Resume:
{resume_text[:5000]}
"""
                result = run_gemini(prompt)
            else:
                result = fallback_roast(resume_text)
            st.markdown(result)
        except Exception as exc:
            st.error(f"Roast failed: {exc}")


def parse_pdf_tab() -> None:
    st.subheader("Parse Resume PDF")
    file = st.file_uploader("Upload resume PDF", type=["pdf"])
    if st.button("Extract Text", use_container_width=True):
        if file is None:
            st.warning("Please upload a PDF file")
            return
        try:
            text = extract_pdf_text(file.getvalue())
            st.text_area("Extracted text", text, height=250)
        except Exception as exc:
            st.error(f"PDF parsing failed: {exc}")


def interview_tab() -> None:
    st.subheader("Interview Coach")
    resume_text = st.text_area("Resume text", key="iv_resume", height=140)
    job_description = st.text_area("Job description", key="iv_job", height=140)

    st.markdown("### Conversation")
    for turn in st.session_state.iv_history:
        role = turn.get("role", "assistant")
        content = turn.get("content", "")
        if role == "assistant":
            st.info(content)
        else:
            st.write(content)

    user_answer = st.text_area("Your latest answer", key="iv_answer", height=100)

    if st.button("Get next question", use_container_width=True):
        try:
            if user_answer.strip():
                st.session_state.iv_history.append({"role": "user", "content": user_answer.strip()})
            history_str = "\n".join(f"{x['role']}: {x['content']}" for x in st.session_state.iv_history[-8:])
            prompt = f"""
You are a senior interviewer.
Resume:
{resume_text}

Job Description:
{job_description}

Conversation so far:
{history_str}

Ask exactly one strong follow-up interview question. Keep it concise.
"""
            next_q = run_gemini(prompt)
            st.session_state.iv_history.append({"role": "assistant", "content": next_q})
            st.markdown("### Next Question")
            st.info(next_q)
        except Exception as exc:
            st.error(f"Interview question failed: {exc}")

    if st.button("Clear interview history"):
        st.session_state.iv_history = []
        st.rerun()


def key_status() -> None:
    if gemini_ready():
        st.success("GEMINI_API_KEY detected. AI features are enabled.")
    else:
        st.warning("GEMINI_API_KEY is missing. Add it in Streamlit Cloud app settings -> Secrets.")


def main() -> None:
    st.set_page_config(page_title="CareerAgent Streamlit", page_icon=":briefcase:", layout="wide")
    configure_gemini()
    ensure_state()

    with st.sidebar:
        st.header("Configuration")
        st.session_state.theme_mode = st.selectbox(
            "Theme",
            ["Light Sky", "Dark Slate"],
            index=0 if st.session_state.theme_mode == "Light Sky" else 1,
        )
        key_status()

    apply_theme(st.session_state.theme_mode)

    st.title("CareerAgent Streamlit")
    st.markdown('<p class="cg-caption">Single-app mode: deploy on Streamlit Cloud directly from GitHub.</p>', unsafe_allow_html=True)
    st.markdown(
        '<div class="cg-banner">No external backend required. Add GEMINI_API_KEY in Streamlit Cloud secrets and deploy.</div>',
        unsafe_allow_html=True,
    )

    tabs = st.tabs(["ATS", "Resume Builder", "Roaster", "Parse PDF", "Interview"])
    with tabs[0]:
        ats_tab()
    with tabs[1]:
        resume_tab()
    with tabs[2]:
        roast_tab()
    with tabs[3]:
        parse_pdf_tab()
    with tabs[4]:
        interview_tab()


if __name__ == "__main__":
    main()