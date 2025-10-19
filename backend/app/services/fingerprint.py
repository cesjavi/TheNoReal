"""Utilities to compute and track narrative fingerprints."""
from __future__ import annotations

import re
from collections import deque
from dataclasses import dataclass
from threading import Lock
from typing import Deque, List


@dataclass
class Fingerprint:
    escenario: str
    epoca: str
    protagonista: str
    dispositivo: str
    tono: str
    first_sentence: str


_RING: Deque[Fingerprint] = deque(maxlen=20)
_LOCK = Lock()


def get_recent_fingerprints() -> List[Fingerprint]:
    with _LOCK:
        return list(reversed(_RING))


def push_fingerprint(fp: Fingerprint) -> None:
    with _LOCK:
        if fp.first_sentence and any(existing.first_sentence == fp.first_sentence for existing in _RING):
            return
        _RING.append(fp)


def _first_sentence_of(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    match = re.match(r"(.+?\.|.+$)", cleaned)
    sentence = match.group(1) if match else cleaned
    return sentence[:240]


def _extract_escenario(text: str) -> str:
    match = re.search(r"en\s+(?:un|una|el|la)\s+([^.,;!?]+)", text, flags=re.IGNORECASE)
    return match.group(1).strip().lower() if match else "desconocido"


def _extract_epoca(text: str) -> str:
    match = re.search(r"(\d{3,4}|edad media|prehistoria|futuro|actualidad|presente|siglo\s+[xiv0-9]+)", text, flags=re.IGNORECASE)
    return match.group(1).lower() if match else "desconocida"


def _extract_protagonista(text: str) -> str:
    stop_words = {"El", "La", "Los", "Las", "Un", "Una", "En", "Y", "Pero", "Cuando", "Mientras", "A"}
    words = re.split(r"[\s,]+", _first_sentence_of(text))
    for word in words:
        if re.match(r"^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$", word) and word not in stop_words:
            return word
    return "desconocido"


def _extract_dispositivo(text: str) -> str:
    match = re.search(
        r"(espada|arma|pistola|rifle|computadora|ordenador|tel[eé]fono|m[óo]vil|tableta|tablet|reloj|varita|libro|amuleto)",
        text,
        flags=re.IGNORECASE,
    )
    return match.group(1).lower() if match else "ninguno"


def compute_fingerprint(chapter_text: str, genres: List[str] | None = None) -> Fingerprint:
    first_sentence = _first_sentence_of(chapter_text)
    tono = genres[0] if genres else "neutro"
    return Fingerprint(
        escenario=_extract_escenario(chapter_text),
        epoca=_extract_epoca(chapter_text),
        protagonista=_extract_protagonista(chapter_text),
        dispositivo=_extract_dispositivo(chapter_text),
        tono=tono,
        first_sentence=first_sentence,
    )


def _similarity_score(a: Fingerprint, b: Fingerprint) -> int:
    score = 0
    if a.escenario and a.escenario == b.escenario:
        score += 1
    if a.epoca and a.epoca == b.epoca:
        score += 1
    if a.protagonista and a.protagonista == b.protagonista:
        score += 1
    if a.dispositivo and a.dispositivo == b.dispositivo:
        score += 1
    return score


def is_fingerprint_too_similar(fp: Fingerprint, others: List[Fingerprint]) -> bool:
    return any(_similarity_score(fp, other) >= 3 for other in others)
