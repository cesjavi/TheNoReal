"""Endpoints that expose available SVG backgrounds."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

router = APIRouter()


def _resolve_public_dir() -> Path:
    override = os.getenv("BACKGROUND_ASSETS_DIR")
    if override:
        return Path(override).expanduser().resolve()
    backend_root = Path(__file__).resolve().parents[2]
    return backend_root.parent / "frontend" / "public"


def _list_svg_files(directory: Path, prefix: str) -> List[str]:
    if not directory.exists() or not directory.is_dir():
        return []
    results: List[str] = []
    for entry in directory.iterdir():
        if entry.is_file() and entry.suffix.lower() == ".svg":
            results.append(f"{prefix}/{entry.name}")
    return results


@router.get("/")
async def list_backgrounds() -> dict[str, List[str]]:
    """Return the available top/bottom background SVGs."""
    public_dir = _resolve_public_dir()
    top_dir = public_dir / "top"
    bottom_dir = public_dir / "bottom"
    logger.debug("Listing backgrounds from %s", public_dir)
    top = await run_in_threadpool(_list_svg_files, top_dir, "/top")
    bottom = await run_in_threadpool(_list_svg_files, bottom_dir, "/bottom")
    return {"top": top, "bottom": bottom}
