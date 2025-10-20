"""FastAPI application entrypoint."""
from __future__ import annotations

import logging
import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="TheNoReal API")

DEFAULT_CORS_ORIGINS = [
    "http://the-no-real-backend.vercel.app",
    "https://the-no-real-frontend.vercel.app",
    "https://localhost",
    "http://localhost",
    "http://localhost:3000",    
    "capacitor://localhost",
]

raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "")
origins: List[str] = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
if origins:
    logger.info("Using explicit CORS origins: %s", origins)
else:
    origins = DEFAULT_CORS_ORIGINS
    logger.info("CORS_ALLOW_ORIGINS not set; using default origins: %s", origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    """Simple health check used by the frontend."""
    return {"status": "ok"}


from app.routes import backgrounds, options, prompt, story  # noqa: E402  pylint: disable=wrong-import-position

app.include_router(backgrounds.router, prefix="/api/backgrounds", tags=["backgrounds"])
app.include_router(options.router, prefix="/api/options", tags=["options"])
app.include_router(prompt.router, prefix="/api/prompt", tags=["prompt"])
app.include_router(story.router, prefix="/api/story", tags=["story"])
