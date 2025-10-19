"""Utility helpers for working with Groq chat completion responses."""
from __future__ import annotations

from typing import Any


def extract_message_content(completion: Any) -> str | None:
    """Safely extract the first message content from a Groq response."""
    try:
        choices = getattr(completion, "choices", None)
        if not choices:
            return None
        first_choice = choices[0]
        message = getattr(first_choice, "message", None)
        content = getattr(message, "content", None)
        if isinstance(content, str):
            return content.strip()
    except (AttributeError, IndexError, KeyError, TypeError):
        return None
    return None
