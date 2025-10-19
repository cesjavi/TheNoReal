"""Prompt generation and improvement endpoints."""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.completion_utils import extract_message_content
from app.services.groq_client import run_chat_completion

logger = logging.getLogger(__name__)

router = APIRouter()
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


class GeneratePayload(BaseModel):
    config: dict[str, Any] = Field(..., description="Configuración de la historia a generar")


class ImprovePayload(BaseModel):
    prompt: str = Field(..., description="Prompt existente que se desea mejorar")


def _ensure_api_key() -> bool:
    return bool(os.getenv("GROQ_API_KEY"))


@router.post("/generate")
async def generate_prompt(payload: GeneratePayload):
    if not _ensure_api_key():
        return JSONResponse(status_code=400, content={"error": "GROQ_API_KEY is not configured"})

    params = {
        "model": DEFAULT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Genera una semilla de historia creativa basada en la configuración proporcionada. "
                    "La semilla debe ser un texto corto y conciso, de alrededor de 30 palabras."
                ),
            },
            {"role": "user", "content": json.dumps(payload.config, ensure_ascii=False)},
        ],
    }
    completion = await run_chat_completion(params)
    prompt = extract_message_content(completion)
    if not prompt:
        logger.error("Empty response from model during prompt generation")
        return JSONResponse(status_code=502, content={"error": "Empty response from model"})
    return {"prompt": prompt}


@router.post("/improve")
async def improve_prompt(payload: ImprovePayload):
    if not _ensure_api_key():
        return JSONResponse(status_code=400, content={"error": "GROQ_API_KEY is not configured"})
    if not isinstance(payload.prompt, str) or not payload.prompt.strip():
        return JSONResponse(status_code=400, content={"error": "prompt is required"})

    params = {
        "model": DEFAULT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Eres un asistente que mejora prompts manteniendo la intención original. "
                    "La semilla debe ser un texto corto y conciso, de alrededor de 30 palabras."
                ),
            },
            {"role": "user", "content": payload.prompt},
        ],
    }
    completion = await run_chat_completion(params)
    improved = extract_message_content(completion)
    if not improved:
        logger.error("Empty response from model during prompt improvement")
        return JSONResponse(status_code=502, content={"error": "Empty response from model"})
    return {"prompt": improved}
