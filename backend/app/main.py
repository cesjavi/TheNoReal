"""Main FastAPI application for TheNoReal backend."""

from __future__ import annotations

import logging
from typing import Final

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import backgrounds, options, ping, prompt, story
import os
from dotenv import load_dotenv

# Cargar variables desde .env
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("⚠️ Advertencia: GROQ_API_KEY no configurada")

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://thenonreal.com.ar",
        "https://the-no-real-frontend.vercel.app",
        "http://localhost:4000",
        "http://127.0.0.1:4000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ping.router)
app.include_router(prompt.router, prefix="/api")
app.include_router(options.router, prefix="/api")
app.include_router(backgrounds.router, prefix="/api")
app.include_router(story.router)
app.include_router(backgrounds.router, prefix="/api")


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
