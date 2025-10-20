"""Vercel serverless entrypoint for the FastAPI backend."""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure the backend package is importable when running on Vercel.
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app as fastapi_app  # noqa: E402  (import after sys.path tweak)

# Vercel looks for a module-level callable named `app`.
app = fastapi_app

# Keep a `handler` alias for compatibility with previous configurations.
handler = fastapi_app
