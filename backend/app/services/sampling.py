"""Sampling helpers shared by multiple endpoints."""
from __future__ import annotations


def clamp01(value: float) -> float:
    """Clamp a float to the inclusive [0, 1] range."""
    return max(0.0, min(1.0, value))


def limit_temperature(temperature: float | None) -> float | None:
    if temperature is None:
        return None
    return clamp01(float(temperature))


def limit_top_p(top_p: float | None) -> float | None:
    if top_p is None:
        return None
    return clamp01(float(top_p))
