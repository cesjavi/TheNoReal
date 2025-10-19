"""Utilities to parse structured story responses."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


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


def _extract_options(block: str) -> List[str]:
    options: List[str] = []
    for line in block.splitlines():
        match = re.match(r"^\s*\d+\.\s+(.*)$", line)
        if match:
            options.append(match.group(1).strip())
    return options


def parse_story_response(text: str, options_per_decision: int) -> ParseResult:
    normalized, _ = _normalize_raw(text)
    working = normalized
    is_final = False
    lines = working.split("\n")
    if lines and lines[-1].strip().upper() == "FINALIZADO":
        is_final = True
        working = "\n".join(lines[:-1]).rstrip()
    story, options_block, separator_line = _split_story_and_options(working)
    options: List[str] = []
    if not is_final and options_per_decision > 0:
        if options_block and separator_line == "---":
            options = _extract_options(options_block)
    return ParseResult(story=story.strip(), options=options, is_final=is_final)
