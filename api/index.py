"""Vercel serverless entrypoint for the FastAPI backend."""
from __future__ import annotations

import sys
from pathlib import Path

from mangum import Mangum


def _ensure_backend_on_path() -> None:
    """Add the backend source directory to ``sys.path`` if needed."""

    root_dir = Path(__file__).resolve().parent
    backend_dir = root_dir.parent / "backend"
    backend_app_dir = backend_dir / "app"

    for candidate in (backend_dir, backend_app_dir):
        path_str = str(candidate)
        if path_str not in sys.path:
            sys.path.insert(0, path_str)


_ensure_backend_on_path()

from app.main import app as fastapi_app  # noqa: E402 (import after path fix)


# Vercel looks for a module-level callable named ``app``.
app = fastapi_app

# Provide a ``handler`` callable compatible with AWS-style adapters.
handler = Mangum(fastapi_app)


__all__ = ["app", "handler"]
