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
