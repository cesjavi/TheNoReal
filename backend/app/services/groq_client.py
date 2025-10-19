"""Thin wrapper around the Groq Python SDK with logging and caching."""
from __future__ import annotations

import asyncio
import json
import logging
import os
from functools import lru_cache
from typing import Any

from groq import Groq

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set")
    return Groq(api_key=api_key)


def _filter_sensitive(data: Any) -> Any:
    secret = os.getenv("GROQ_API_KEY")
    if not secret:
        return data
    if isinstance(data, str):
        return data.replace(secret, "[REDACTED]")
    if isinstance(data, list):
        return [_filter_sensitive(item) for item in data]
    if isinstance(data, dict):
        return {key: _filter_sensitive(value) for key, value in data.items()}
    return data


def create_chat_completion(params: dict[str, Any]) -> Any:
    client = _get_client()
    logger.debug(
        "groq.chat.completions.create called: %s",
        json.dumps(_filter_sensitive({"model": params.get("model"), "messages": params.get("messages")}), ensure_ascii=False),
    )
    result = client.chat.completions.create(**params)
    logger.debug("groq.chat.completions.create result: %s", _filter_sensitive(result))
    return result


async def run_chat_completion(params: dict[str, Any], *, timeout: float | None = None) -> Any:
    call = asyncio.to_thread(create_chat_completion, params)
    if timeout is not None:
        return await asyncio.wait_for(call, timeout=timeout)
    return await call
