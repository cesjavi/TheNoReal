"""Helpers to post-process raw options returned by the LLM."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

_OPTION_PATTERN = re.compile(r"^\s*(\d+)\.\s+(.+)$")


@dataclass
class OptionValidationResult:
    valid: List[str]
    invalid: List[str]
    too_many: bool
    too_few: bool


def validate_options(options: List[str], expected: int) -> OptionValidationResult:
    valid: List[str] = []
    invalid: List[str] = []
    for line in options:
        match = _OPTION_PATTERN.match(line.strip())
        if match:
            valid.append(match.group(2).strip())
        else:
            invalid.append(line)
    too_many = len(valid) > expected
    too_few = len(valid) < expected
    return OptionValidationResult(valid=valid[:expected], invalid=invalid, too_many=too_many, too_few=too_few)
