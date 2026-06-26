# CareerAgent Streamlit (Single-App)

AI-powered career toolkit built as a single Streamlit app.

Features:
- ATS Analyzer
- Resume Builder
- Resume Roaster
- Resume PDF Parser
- Interview Coach

No external backend deployment required.

## Deploy Public App From GitHub (Streamlit Cloud)

1. Push this project to your GitHub repository.
2. Open: https://share.streamlit.io/deploy
3. Select your repository and branch.
4. Set **Main file path** to `streamlit_app.py`.
5. In Streamlit app settings, add secret:

```toml
GEMINI_API_KEY = "your_gemini_api_key"
```

6. Click **Deploy**.

## Local Run

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Theme

- Sidebar theme switcher included: `Light Sky` and `Dark Slate`
- Default Streamlit theme config is in `.streamlit/config.toml`
