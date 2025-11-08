"""Vercel entrypoint that exposes the FastAPI application."""
from __future__ import annotations

import logging
from typing import Any

from mangum import Mangum

try:
    from app.main import app
except ModuleNotFoundError as exc:  # pragma: no cover - import failure is fatal in prod
    raise RuntimeError("Unable to import FastAPI application") from exc

logger = logging.getLogger(__name__)

# Mangum turns the ASGI app into a handler compatible with the serverless runtime.
_mangum_handler = Mangum(app, lifespan="auto")


def handler(event: dict[str, Any], context: dict[str, Any] | None = None) -> Any:
    """Entrypoint expected by the Vercel Python runtime."""
    logger.debug("Handling request via Mangum", extra={"path": event.get("rawPath")})
    return _mangum_handler(event, context)


# Allow running the app locally with ``python api/index.py`` for quick tests.
if __name__ == "__main__":  # pragma: no cover - convenience execution path
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
