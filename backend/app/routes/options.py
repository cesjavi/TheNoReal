"""Endpoints for generating branching options using Groq."""
from __future__ import annotations

import logging
import os

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.completion_utils import extract_message_content
from app.services.groq_client import run_chat_completion
from app.services.option_guard import validate_options
from app.services.sampling import limit_temperature, limit_top_p

logger = logging.getLogger(__name__)

router = APIRouter()
MAX_OPTIONS = 5
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "moonshotai/kimi-k2-instruct")


class OptionsPayload(BaseModel):
    prompt: str = Field(..., description="Texto base utilizado para pedir opciones nuevas")
    numOptions: int | None = Field(None, ge=1, le=MAX_OPTIONS)
    temperature: float | None = None
    top_p: float | None = None

@router.api_route("/{rest_of_path:path}", methods=["OPTIONS"])  
def handle_preflight(rest_of_path: str):
    # CORSMiddleware agregará los headers. 204 es estándar para preflight OK.
    return Response(status_code=204)

@router.post("/")
async def generate_options(payload: OptionsPayload):
    if not os.getenv("GROQ_API_KEY"):
        return JSONResponse(status_code=400, content={"error": "GROQ_API_KEY is not configured"})

    count = payload.numOptions or 1
    if count > MAX_OPTIONS:
        return JSONResponse(status_code=400, content={"error": f"numOptions cannot exceed {MAX_OPTIONS}"})

    safe_temperature = limit_temperature(payload.temperature)
    safe_top_p = limit_top_p(payload.top_p)

    raw_options: list[str] = []
    valid_options: list[str] = []
    attempts = 0
    max_attempts = count + 2

    while len(valid_options) < count and attempts < max_attempts:
        attempts += 1
        params = {
            "model": DEFAULT_MODEL,
            "messages": [{"role": "user", "content": payload.prompt}],
            "n": 1,
            "temperature": safe_temperature,
            "top_p": safe_top_p,
        }
        completion = await run_chat_completion(params)
        option_text = extract_message_content(completion)
        if option_text:
            raw_options.append(option_text)
            result = validate_options(raw_options, count)
            valid_options = result.valid
        logger.info(
            "options progress", extra={"expected": count, "received": len(valid_options), "attempts": attempts}
        )

    if len(valid_options) < count:
        logger.warning(
            "Fewer valid options generated than requested", extra={"expected": count, "received": len(valid_options)}
        )
        return JSONResponse(
            status_code=502,
            content={"error": f"Generated {len(valid_options)} of {count} options", "options": valid_options},
        )

    logger.debug("Groq options response: %s", valid_options)
    return {"options": valid_options}
