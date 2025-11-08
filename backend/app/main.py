"""Main FastAPI application for TheNoReal backend."""

from __future__ import annotations

import logging
from typing import Final

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import backgrounds, options, ping, prompt, story

logger = logging.getLogger(__name__)

TAGS_METADATA: Final = [
    {
        "name": "prompt",
        "description": "Generación y mejora de prompts narrativos.",
    },
    {
        "name": "story",
        "description": "Creación y continuación de capítulos interactivos.",
    },
    {
        "name": "options",
        "description": "Gestión de opciones alternativas para la historia.",
    },
    {
        "name": "backgrounds",
        "description": "Recursos visuales disponibles para la experiencia.",
    },
    {
        "name": "meta",
        "description": "Endpoints utilitarios para monitoreo y salud del servicio.",
    },
]

app = FastAPI(
    title="TheNoReal API",
    description=(
        "API pública del generador de historias interactivas de TheNoReal. "
        "Incluye un playground Swagger disponible en `/docs` para realizar pruebas."
    ),
    version="0.1.0",
    openapi_tags=TAGS_METADATA,
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ping.router)
app.include_router(prompt.router)
app.include_router(story.router)
app.include_router(options.router)
app.include_router(backgrounds.router)


@app.get("/", tags=["meta"])
@app.get("/api", tags=["meta"])
def root():
    """Application heartbeat endpoint."""
    return {
        "status": "ok",
        "message": "TheNoReal API",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }


@app.get("/api/health", tags=["meta"])
def health():
    """Return a basic health-check payload."""
    return {"ok": True}
