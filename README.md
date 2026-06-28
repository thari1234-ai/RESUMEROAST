# ResumeRoast

ResumeRoast is an AI resume roasting app with ATS scoring and practical fixes.

This repository includes:
- Streamlit app (primary deployment target)
- FastAPI backend (for full-stack usage)
- Next.js frontend (for full-stack usage)

## Current Product Status

- Streamlit app is production-ready and deployed from streamlit_app.py
- Backend dependencies are installed and backend code is implemented
- Next.js frontend builds successfully in production mode
- Voice Interview AI (simulated avatar) is implemented in frontend

## Main Features (Streamlit)

- Upload PDF or TXT resume
- AI roast with high-intensity dialogue style
- ATS score, verdict, keyword match/gap analysis
- Section-by-section issues and fixes
- Loading skeleton, toast + visible success banner, smooth jump to results
- Fallback roast flow when AI is unavailable or rate-limited

## Streamlit Deployment

1. Push the latest code to GitHub.
2. Open https://share.streamlit.io/deploy
3. Select repository and branch.
4. Set main file path to streamlit_app.py
5. Add secret in app settings:

```toml
GEMINI_API_KEY = "your_gemini_api_key"
```

6. Deploy or reboot app.

## Local Run (Streamlit)

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Optional Full-Stack Local Run

Backend:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:
- Streamlit: http://localhost:8501
- Backend API: http://localhost:8001
- Frontend: http://localhost:3000

## Verification Notes

- Python compile checks passed for backend/main.py and streamlit_app.py
- Next.js production build passed
- Streamlit UX changes validated locally
