"""Utilities to parse structured story responses."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


_CAPITULO_TAGS = ("CAPITULO", "CAPÍTULO")
_OPCIONES_TAGS = ("OPCIONES",)


def _extract_tagged_section(text: str, tag: str) -> str | None:
    pattern = re.compile(rf"\[{tag}\](.*?)\[/\s*{tag}\]", re.IGNORECASE | re.DOTALL)
    match = pattern.search(text)
    if match:
        return match.group(1).strip()
    return None


def _extract_chapter_from_tags(text: str) -> str | None:
    for tag in _CAPITULO_TAGS:
        content = _extract_tagged_section(text, tag)
        if content:
            return content
    return None


def _extract_options_from_tags(text: str) -> List[str]:
    for tag in _OPCIONES_TAGS:
        block = _extract_tagged_section(text, tag)
        if block:
            return _clean_options_block(block)
    return []


@dataclass
class ParseResult:
    story: str
    options: List[str]
    is_final: bool


def _normalize_raw(raw: str) -> tuple[str, int]:
    text = (raw or "").replace("\r\n", "\n")
    match = re.search(r"(\n+)$", text)
    trailing_blank_lines = len(match.group(1).splitlines()) if match else 0
    return text.rstrip("\n"), trailing_blank_lines


def _split_story_and_options(text: str) -> tuple[str, str | None, str | None]:
    lines = text.split("\n")
    for idx, line in enumerate(lines):
        if line.strip() == "---":
            story = "\n".join(lines[:idx]).rstrip()
            options_block = "\n".join(lines[idx + 1:]).strip()
            return story, options_block, line
    return text.strip(), None, None


def _clean_option_line(line: str) -> str:
    stripped = line.strip()
    if not stripped:
        return ""

    stripped = re.sub(r"^[\-\*\u2022]+\s*", "", stripped)

    patterns = [
        r"^(?:opci[oó]n|option)\s*\d+\s*[:\.-]\s*",
        r"^\d+\s*[:\.-]\s*",
        r"^\d+\s*[\)\]]\s*",
    ]

    for pattern in patterns:
        cleaned = re.sub(pattern, "", stripped, flags=re.IGNORECASE)
        if cleaned != stripped:
            stripped = cleaned
            break

    return stripped.strip()


def _clean_options_block(block: str) -> List[str]:
    options: List[str] = []
    for raw_line in block.splitlines():
        cleaned = _clean_option_line(raw_line)
        if cleaned:
            options.append(cleaned)
    return options


def _extract_numbered_options(block: str) -> List[str]:
    options: List[str] = []
    for line in block.splitlines():
        match = re.match(r"^\s*\d+\.\s+(.*)$", line)
        if match:
            cleaned = _clean_option_line(match.group(1))
            if cleaned:
                options.append(cleaned)
    return options


def parse_story_response(text: str, options_per_decision: int) -> ParseResult:
    normalized, _ = _normalize_raw(text)
    working = normalized
    is_final = False
    lines = working.split("\n")
    if lines and lines[-1].strip().upper() == "FINALIZADO":
        is_final = True
        working = "\n".join(lines[:-1]).rstrip()
    story_from_tags = _extract_chapter_from_tags(working)
    options: List[str] = []
    story: str
    if story_from_tags:
        story = story_from_tags
        if not is_final and options_per_decision > 0:
            options = _extract_options_from_tags(working)
    else:
        story, options_block, separator_line = _split_story_and_options(working)
        if not is_final and options_per_decision > 0:
            if options_block and separator_line == "---":
                options = _extract_numbered_options(options_block)

    if not options and not is_final and options_per_decision > 0:
        _, options_block, separator_line = _split_story_and_options(working)
        if options_block:
            extra: List[str] = []
            if separator_line == "---":
                extra = _extract_numbered_options(options_block)
            if not extra:
                extra = _clean_options_block(options_block)
            options = extra

    return ParseResult(story=story.strip(), options=options, is_final=is_final)
