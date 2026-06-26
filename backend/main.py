import os
import sqlite3
import hashlib
import jwt as pyjwt
import fitz  # PyMuPDF
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pathlib import Path

load_dotenv()

# ── Gemini setup ──────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("Warning: GEMINI_API_KEY not found.")

# ── Auth constants ────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "careeragent-jwt-secret-2026-production-key")
ALGORITHM  = "HS256"
TOKEN_HOURS = 24 * 7   # 7 days
DB_PATH = Path(__file__).parent / "careeragent.db"

# ── Database ──────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            username     TEXT    NOT NULL,
            email        TEXT    UNIQUE NOT NULL,
            password_hash TEXT   NOT NULL,
            role         TEXT    DEFAULT 'user',
            created_at   TEXT    DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS activity_log (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id   INTEGER,
            username  TEXT NOT NULL DEFAULT 'anonymous',
            email     TEXT NOT NULL DEFAULT '',
            action    TEXT NOT NULL,
            details   TEXT DEFAULT '',
            timestamp TEXT DEFAULT (datetime('now'))
        );
    """)
    # Default admin account
    admin_hash = hashlib.sha256(("Admin@123" + "careeragent_salt").encode()).hexdigest()
    conn.execute(
        "INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?,?,?,?)",
        ("Admin", "admin@careeragent.ai", admin_hash, "admin")
    )
    conn.commit()
    conn.close()

def hash_pw(password: str) -> str:
    return hashlib.sha256((password + "careeragent_salt").encode()).hexdigest()

def create_token(user_id: int, username: str, email: str, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    }
    return pyjwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return pyjwt.decode(authorization[7:], SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None

def log_activity(user: Optional[dict], action: str, details: str = ""):
    try:
        conn = get_db()
        if user:
            conn.execute(
                "INSERT INTO activity_log (user_id,username,email,action,details) VALUES (?,?,?,?,?)",
                (user.get("sub"), user.get("username","?"), user.get("email",""), action, details)
            )
        else:
            conn.execute(
                "INSERT INTO activity_log (user_id,username,email,action,details) VALUES (?,?,?,?,?)",
                (None, "anonymous", "", action, details)
            )
        conn.commit()
        conn.close()
    except Exception:
        pass

# ── FastAPI app ───────────────────────────────────────────────
app = FastAPI(title="AI Career Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

# ── Pydantic models ───────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AnalysisRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = ""

class ResumeGenerationRequest(BaseModel):
    name: str
    contact_info: str
    experience: str
    education: str
    skills: str

class InterviewRequest(BaseModel):
    resume_text: str
    job_description: str
    history: List[dict] = []

# ── Auth endpoints ────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "AI Career Agent API is running"}

@app.post("/register")
async def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email=?", (req.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(400, "Email already registered")
    pw_hash = hash_pw(req.password)
    cursor = conn.execute(
        "INSERT INTO users (username,email,password_hash) VALUES (?,?,?)",
        (req.username, req.email, pw_hash)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    token = create_token(user_id, req.username, req.email, "user")
    log_activity({"sub": user_id, "username": req.username, "email": req.email}, "register")
    return {"token": token, "user": {"id": user_id, "username": req.username, "email": req.email, "role": "user"}}

@app.post("/login")
async def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (req.email,)).fetchone()
    conn.close()
    if not user or user["password_hash"] != hash_pw(req.password):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], user["username"], user["email"], user["role"])
    log_activity({"sub": user["id"], "username": user["username"], "email": user["email"]}, "login")
    return {"token": token, "user": {"id": user["id"], "username": user["username"], "email": user["email"], "role": user["role"]}}

@app.get("/me")
async def me(authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    conn = get_db()
    row = conn.execute("SELECT id,username,email,role FROM users WHERE id=?", (user["sub"],)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(401, "User not found")
    return {"id": row["id"], "username": row["username"], "email": row["email"], "role": row["role"]}

# ── Admin endpoints ───────────────────────────────────────────
@app.get("/admin/data")
async def admin_data(authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    conn = get_db()

    # Activity log (latest 200)
    activities = conn.execute(
        "SELECT * FROM activity_log ORDER BY id DESC LIMIT 200"
    ).fetchall()

    # Users list
    users = conn.execute(
        "SELECT id,username,email,role,created_at FROM users ORDER BY id DESC"
    ).fetchall()

    # Stats
    total_users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_actions = conn.execute(
        "SELECT COUNT(*) as c FROM activity_log WHERE timestamp LIKE ?", (f"{today}%",)
    ).fetchone()["c"]
    action_counts = conn.execute(
        "SELECT action, COUNT(*) as c FROM activity_log GROUP BY action ORDER BY c DESC"
    ).fetchall()
    conn.close()

    return {
        "activities": [dict(a) for a in activities],
        "users": [dict(u) for u in users],
        "stats": {
            "total_users": total_users,
            "today_actions": today_actions,
            "action_counts": [{"action": r["action"], "count": r["c"]} for r in action_counts],
        }
    }

# ── Feature endpoints (with activity logging) ─────────────────
@app.post("/generate-resume")
async def generate_resume_content(request: ResumeGenerationRequest, authorization: Optional[str] = Header(None)):
    if not GEMINI_API_KEY:
        raise HTTPException(500, "Gemini API Key not configured")
    prompt = f"""
    Create a professional resume for {request.name}.
    Contact: {request.contact_info}
    Experience: {request.experience}
    Education: {request.education}
    Skills: {request.skills}
    Use a professional tone and optimize for ATS. Use strong action verbs.
    Return ONLY the professional content in Markdown format.
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        log_activity(decode_token(authorization), "generate_resume", f"Name: {request.name}")
        return {"resume_markdown": response.text}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, f"Failed to generate resume: {str(e)}")

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")
    try:
        contents = await file.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
        log_activity(decode_token(authorization), "parse_resume", file.filename)
        return {"text": text}
    except Exception as e:
        raise HTTPException(500, f"Error parsing PDF: {str(e)}")

@app.post("/analyze-ats")
async def analyze_ats(request: AnalysisRequest, authorization: Optional[str] = Header(None)):
    if not GEMINI_API_KEY:
        raise HTTPException(500, "Gemini API Key not configured")
    if request.job_description and request.job_description.strip():
        prompt = f"""
    You are an expert ATS and professional recruiter.
    Analyze the following resume against the job description.
    Resume: {request.resume_text}
    Job Description: {request.job_description}
    Provide a detailed analysis in JSON format with keys:
    - score: integer 0-100 (how well the resume matches this job)
    - matching_keywords: list of keywords found in both resume and job description
    - missing_keywords: list of important keywords from the job description missing in the resume
    - improvements: list of specific actionable suggestions
    - feedback: brief overall summary
    """
    else:
        prompt = f"""
    You are an expert ATS (Applicant Tracking System) and professional recruiter.
    Analyze the following resume for ATS compatibility, formatting, keyword strength, and overall quality.
    Resume: {request.resume_text}
    Provide a detailed analysis in JSON format with keys:
    - score: integer 0-100 (overall ATS compatibility and resume quality score)
    - matching_keywords: list of strong keywords and skills already present in the resume
    - missing_keywords: list of common ATS keywords and power words that would strengthen this resume
    - improvements: list of specific actionable suggestions to improve the resume
    - feedback: brief overall summary of the resume strength
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        log_activity(decode_token(authorization), "analyze_ats", "ATS scan performed")
        return {"analysis": response.text}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, f"AI Analysis failed: {str(e)}")

@app.post("/interview-question")
async def get_interview_question(request: InterviewRequest, authorization: Optional[str] = Header(None)):
    if not GEMINI_API_KEY:
        raise HTTPException(500, "Gemini API Key not configured")
    history_str = "\n".join([f"{h['role']}: {h['content']}" for h in request.history])
    prompt = f"""
    You are a Senior Technical Interviewer conducting a voice interview.
    Resume: {request.resume_text}
    Job Description: {request.job_description}
    Interview History: {history_str}
    Ask the next relevant interview question. If this is the start, introduce yourself briefly.
    Keep the question concise and professional. Return only the question text.
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        if len(request.history) == 0:
            log_activity(decode_token(authorization), "start_interview", "Interview session started")
        return {"question": response.text}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, f"Failed to generate question: {str(e)}")

class RoastRequest(BaseModel):
    resume_text: str

def generate_fallback_roast(resume_text: str) -> str:
    text = resume_text.strip()
    text_l = text.lower()
    words = [w for w in text.replace("\n", " ").split(" ") if w.strip()]
    line_count = len([ln for ln in text.splitlines() if ln.strip()])
    has_metrics = any(ch.isdigit() for ch in text)

    buzzwords = [
        "results-oriented", "team player", "hardworking", "detail-oriented",
        "passionate", "motivated", "dynamic", "responsible for"
    ]
    found_buzz = [b for b in buzzwords if b in text_l]

    missing_sections = []
    if "experience" not in text_l:
        missing_sections.append("Experience section is unclear or missing")
    if "education" not in text_l:
        missing_sections.append("Education section is unclear or missing")
    if "skills" not in text_l:
        missing_sections.append("Skills section is unclear or missing")
    if "@" not in text and "email" not in text_l:
        missing_sections.append("Contact details are incomplete")

    score = 7
    if not has_metrics:
        score -= 2
    if len(found_buzz) >= 2:
        score -= 2
    if line_count < 8:
        score -= 1
    if len(missing_sections) >= 2:
        score -= 1
    score = max(2, min(9, score))

    buzz_line = ", ".join(found_buzz[:4]) if found_buzz else "generic filler phrases"
    crimes = [
        "Too many vague claims, not enough proof.",
        "Bullets read like job duties, not impact.",
        "Weak quantification: where are the numbers?" if not has_metrics else "Metrics exist, but impact framing is weak.",
        f"Buzzword overload detected: {buzz_line}.",
        missing_sections[0] if missing_sections else "Structure needs cleaner section hierarchy.",
    ]

    fixes = [
        "Rewrite each bullet as Action + Tool + Outcome + Metric.",
        "Replace vague words with concrete evidence (what improved, by how much, in what time).",
        "Add at least one measurable result per project or role (%, $, time saved, throughput).",
        "Cut repeated adjectives and keep bullets concise (1-2 lines max).",
        "Use a consistent format: Role | Company | Dates, then 3-5 impact bullets.",
        "Prioritize relevant skills and move strongest projects to the top.",
    ]

    roast = [
        "🔥 THE ROAST 🔥",
        "",
        "Your resume has potential, but right now it reads like a polite collection of intentions instead of proof of impact.",
        "Recruiters skim fast, and vague language gets skipped faster than a loading spinner on 1% battery.",
        f"The biggest issue is that it leans on {buzz_line} instead of sharp, measurable outcomes.",
        "It is not bad, but it is too safe and too generic for a competitive shortlist.",
        "",
        "💀 BIGGEST CRIMES",
        "",
        f"- {crimes[0]}",
        f"- {crimes[1]}",
        f"- {crimes[2]}",
        f"- {crimes[3]}",
        f"- {crimes[4]}",
        "",
        "✨ REDEMPTION ARC — HOW TO FIX THIS MESS",
        "",
        f"- {fixes[0]}",
        f"- {fixes[1]}",
        f"- {fixes[2]}",
        f"- {fixes[3]}",
        f"- {fixes[4]}",
        f"- {fixes[5]}",
        "",
        "⚡ VERDICT",
        "",
        f"{score}/10 — Promising foundation, but it needs sharper evidence to stop getting filtered out.",
    ]
    return "\n".join(roast)

@app.post("/roast-resume")
async def roast_resume(request: RoastRequest, authorization: Optional[str] = Header(None)):
    if not request.resume_text.strip():
        raise HTTPException(400, "Resume text is required")

    if not GEMINI_API_KEY:
        fallback = generate_fallback_roast(request.resume_text)
        log_activity(decode_token(authorization), "roast_resume_fallback", "Fallback used: missing Gemini key")
        return {"roast": fallback, "source": "fallback"}

    prompt = f"""
You are the world's most brutally honest, savage, yet secretly helpful resume critic.
Your job: ROAST this resume like a comedy roast — be merciless, funny, and specific.
Pick apart every flaw: vague buzzwords, weak bullet points, missing metrics, formatting crimes, cringe phrases like "results-oriented" or "team player", gaps, weird formatting, anything ridiculous.

Be savage but never mean-spirited. Think Gordon Ramsay meets a career coach.

After the roast, give a "Redemption Arc" section with 5-7 very specific, actionable fixes to make this resume actually good.

Structure your response EXACTLY like this:

?? THE ROAST ??
[3-5 paragraphs of brutal, specific, funny critique. Reference actual content from the resume. Use fire/roast metaphors. Be specific — quote bad phrases from the resume and tear them apart.]

?? BIGGEST CRIMES
[Bullet list of the 5 worst specific issues, short and punchy]

? REDEMPTION ARC — HOW TO FIX THIS MESS
[5-7 specific, actionable improvements with before/after examples where possible]

? VERDICT
[One brutal one-liner summary score like "3/10 — Currently getting interviews from your mom's contacts only"]

Resume to roast:
---
{request.resume_text[:4000]}
---
"""

    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        log_activity(decode_token(authorization), "roast_resume", "Resume roasted")
        return {"roast": response.text}
    except Exception as e:
        msg = str(e)
        if "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower() or "429" in msg:
            fallback = generate_fallback_roast(request.resume_text)
            log_activity(decode_token(authorization), "roast_resume_fallback", "Fallback used: Gemini quota exceeded")
            return {"roast": fallback, "source": "fallback", "notice": "AI quota exceeded; using fallback roast"}
        fallback = generate_fallback_roast(request.resume_text)
        log_activity(decode_token(authorization), "roast_resume_fallback", "Fallback used: AI generation error")
        return {"roast": fallback, "source": "fallback", "notice": "AI unavailable; using fallback roast"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
