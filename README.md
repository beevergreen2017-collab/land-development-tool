# Arch Estimation Platform

This project is a FastAPI application for managing land development projects.

## Setup

1.  Install Python 3.8+.
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    - Windows: `venv\Scripts\activate`
    - Mac/Linux: `source venv/bin/activate`
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Running the App

```bash
uvicorn main:app --reload
```

## API Documentation

Once running, visit `http://127.0.0.1:8000/docs` for the interactive API documentation.

## Debug Runbook (Troubleshooting)

If you encounter issues (500 Error, Connection Refused, CORS), follow these 5 steps:

1.  **Check Backend Status**:
    - Open terminal, run: `curl http://127.0.0.1:8001/health`
    - Expect: `{"status":"ok"}`.
    - If failed: Backend is down. Check python terminal for errors.

2.  **Check Database Schema**:
    - Backend error `no such column`?
    - Run: `python patch_db.py` to auto-migrate missing columns.

3.  **Check API Proxy (Frontend)**:
    - 404 on `/api/projects/`?
    - Check `frontend/vite.config.js`. Ensure `target: 'http://127.0.0.1:8001'` matches running backend port.
    - Restart Frontend: `npm run dev` (Vite config changes require restart).

4.  **Check Validation Logs**:
    - Open Browser Console (F12).
    - Look for `[Schema Validation Warning]`. This means Backend returned data that Frontend didn't expect (e.g. missing new field).
    - Action: Check `CHECKLIST.md` - did you update Frontend Schema?

5.  **Run Regression Tests**:
    - Logic weird?
    - Run: `cd frontend && npm run verify`
    - If tests fail, you broke the core calculation logic. Revert or fix.
