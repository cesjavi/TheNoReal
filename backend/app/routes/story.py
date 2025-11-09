"""Story generation endpoint using FastAPI and Groq."""
from __future__ import annotations

import json
import logging
import os
import re
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.completion_utils import extract_message_content
from app.services.fingerprint import (
    compute_fingerprint,
    get_recent_fingerprints,
    is_fingerprint_too_similar,
    push_fingerprint,
)
from app.services.groq_client import run_chat_completion
from app.services.meta import BuildMetaArgs, build_meta
from app.services.sampling import limit_temperature, limit_top_p
from app.services.story_parser import parse_story_response
from app.services.story_prompt import SYSTEM_PROMPT_V3, build_user_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/story", tags=["story"])
REQUEST_TIMEOUT_MS = int(os.getenv("GROQ_REQUEST_TIMEOUT_MS", "30000"))
MODEL_PRIORITY = [os.getenv("GROQ_MODEL", "moonshotai/kimi-k2-instruct"), "gpt-oss-20b"]


class Ajustes(BaseModel):
    temperature: float | None = None
    top_p: float | None = None
    targetWords: int | None = None
    evitar: list[str] | None = None


class StoryPayload(BaseModel):
    story: str | None = ""
    option: str | None = ""
    optionsPerDecision: int | None = Field(2, ge=0)
    genres: list[str] | None = None
    estilo: dict[str, object] | None = None
    ajustes: Ajustes | None = None
    language: str | None = "es"
    endingMode: str | None = None
    chaptersCount: int | None = None
    chapterIndex: int | None = None
    finalize: bool = False


def _allow_anonymous() -> bool:
    return os.getenv("ALLOW_ANON_STORY_API", "1") != "0"


def _normalize_banned_keywords(values: list[str] | None) -> list[str]:
    if not values:
        return []
    return [str(value).strip() for value in values if str(value).strip()]


def _infer_chapter_index(text: str) -> int:
    normalized = (text or "").replace("\r\n", "\n")
    stripped = normalized.strip()
    if not stripped:
        return 1

    option_lines = re.findall(r"(?m)^\s*>\s", normalized)
    count = len(option_lines)
    if count == 0:
        return 1

    last_line = stripped.splitlines()[-1].lstrip()
    if last_line.startswith(">"):
        return max(1, count)

    return max(1, count + 1)


@router.post("")
async def create_story(payload: StoryPayload):
    request_id = str(uuid4())
    if not _allow_anonymous():
        return JSONResponse(
            status_code=401,
            content={
                "error": "Unauthorized",
                "detail": "Set ALLOW_ANON_STORY_API to enable unauthenticated access.",
                "requestId": request_id,
            },
        )

    if not os.getenv("GROQ_API_KEY"):
        return JSONResponse(
            status_code=400, content={"error": "GROQ_API_KEY no configurada", "requestId": request_id}
        )

    try:
        story_text = payload.story or ""
        chosen_option = payload.option or ""
        options_count = int(payload.optionsPerDecision or 2)
        estilos = payload.estilo or {}
        ajustes = payload.ajustes or Ajustes()
        language = payload.language or "es"
        ending_mode = payload.endingMode
        chapters_count = payload.chaptersCount
        chapter_index_raw = payload.chapterIndex
        finalize = payload.finalize

        is_first_turn = not re.search(r"\n>\s*", story_text)
        if not finalize and not is_first_turn and not chosen_option.strip():
            return JSONResponse(
                status_code=400, content={"error": "Missing option", "requestId": request_id}
            )

        if isinstance(chapter_index_raw, int) and chapter_index_raw > 0:
            chapter_index = chapter_index_raw
        else:
            chapter_index = _infer_chapter_index(story_text)

        if isinstance(chapters_count, int):
            if finalize:
                chapter_index = min(max(chapter_index, chapters_count), chapters_count)
            else:
                chapter_index = max(1, min(chapter_index, chapters_count))
        else:
            chapter_index = max(1, chapter_index)

        base_temp = limit_temperature(ajustes.temperature) or 0.75
        base_top_p = limit_top_p(ajustes.top_p) or 0.9
        options_count = options_count or 2
        if isinstance(ajustes.targetWords, (int, float)):
            target_words = int(ajustes.targetWords)
        else:
            target_words = 220

        banned_keywords = _normalize_banned_keywords(ajustes.evitar)
        recent = get_recent_fingerprints()

        meta_base = build_meta(
            BuildMetaArgs(
                options_count=options_count,
                target_words=target_words,
                recent_fingerprints=recent,
                banned_cliches=[
                    "todo fue un sueño",
                    "llamadas sin identificador",
                    "hospital psiquiátrico abandonado",
                ],
                banned_keywords=banned_keywords,
                is_first_turn=is_first_turn,
            )
        )

        genres_list = payload.genres or []
        genres_text = ", ".join(json.dumps(genre, ensure_ascii=False) for genre in genres_list)
        meta_config_lines = [
            f"language={language}",
            f"genres=[{genres_text}]",
            f"chapter_index={chapter_index}",
        ]
        if ending_mode:
            meta_config_lines.append(f"ending_mode={ending_mode}")
        if isinstance(chapters_count, int):
            meta_config_lines.append(f"chapters_count={chapters_count}")
            meta_config_lines.append(f"max_chapters={chapters_count}")
        meta_config_lines.append(f"estilo={json.dumps(estilos, ensure_ascii=False)}")
        ajustes_rest = ajustes.model_dump(
            exclude={"evitar", "temperature", "top_p", "targetWords"}, exclude_none=True
        )
        meta_config_lines.append(f"ajustes={json.dumps(ajustes_rest, ensure_ascii=False)}")
        if finalize:
            meta_config_lines.append("finalize_now=true")

        meta_block = "\n".join([line for line in [meta_base.strip()] + meta_config_lines if line])

        finalize_suffix = "\nFinaliza ahora." if finalize else ""
        user_content = build_user_message(
            text=f"{story_text}{finalize_suffix}",
            chosen_option=chosen_option,
            options_count=options_count,
            target_words=target_words,
            meta_block=meta_block,
        )

        max_retries = 3
        timeout_seconds = REQUEST_TIMEOUT_MS / 1000

        for model in MODEL_PRIORITY:
            if not model:
                continue
            for attempt in range(max_retries + 1):
                temperature = min(base_temp + attempt * 0.15, 1.3)
                top_p = min(base_top_p + attempt * 0.05, 1.0)
                anti_repetition = ""
                if attempt > 0:
                    anti_repetition = (
                        "\n\n[ANTI_REPETITION]\n"
                        f"Evita repetir tramas o giros usados antes. Sé más específico, original y ligado a {json.dumps(payload.genres or [])}."
                    )

                messages = [
                    {"role": "system", "content": SYSTEM_PROMPT_V3},
                    {"role": "user", "content": user_content + anti_repetition},
                ]

                try:
                    completion = await run_chat_completion(
                        {
                            "model": model,
                            "messages": messages,
                            "temperature": temperature,
                            "top_p": top_p,
                            "stream": False,
                        },
                        timeout=timeout_seconds,
                    )
                except Exception as error:  # pylint: disable=broad-except
                    logger.error(
                        "[%s] Error with model %s (attempt %s): %s",
                        request_id,
                        model,
                        attempt,
                        error,
                    )
                    if attempt >= max_retries:
                        break
                    continue

                text = extract_message_content(completion) or ""
                if not text:
                    if attempt < max_retries:
                        continue
                    break

                result = parse_story_response(text, options_count)
                story_body = result.story
                options = result.options
                is_final = result.is_final

                if not is_final and not finalize and story_body:
                    fingerprint = compute_fingerprint(story_body, payload.genres)
                    similar = is_fingerprint_too_similar(fingerprint, recent)
                    if similar:
                        if attempt < max_retries:
                            continue
                        return {
                            "story": story_body,
                            "options": options,
                            "isFinal": is_final,
                            "similar": True,
                        }
                    push_fingerprint(fingerprint)
                    recent.insert(0, fingerprint)

                return {"story": story_body, "options": options, "isFinal": is_final}

        return JSONResponse(
            status_code=502, content={"error": "Todos los modelos fallaron", "requestId": request_id}
        )
    except Exception as error:  # pylint: disable=broad-except
        logger.exception("[%s] api/story error", request_id)
        message = str(error)
        return JSONResponse(
            status_code=500,
            content={"error": "Error al procesar la solicitud", "detail": message, "requestId": request_id},
        )
