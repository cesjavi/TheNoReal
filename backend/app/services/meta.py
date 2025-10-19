"""Meta block builder replicating the shared TypeScript logic."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence

from .fingerprint import Fingerprint


@dataclass
class BuildMetaArgs:
    options_count: int
    target_words: int | None = None
    recent_fingerprints: Sequence[Fingerprint] | None = None
    banned_cliches: Sequence[str] | None = None
    banned_keywords: Sequence[str] | None = None
    is_first_turn: bool = False


def _collect_frequent_values(
    recent: Sequence[Fingerprint] | None,
    key: str,
    *,
    min_count: int = 2,
    limit: int = 5,
    disallow: Iterable[str] | None = None,
) -> List[str]:
    if not recent:
        return []
    disallow_set = {value.lower().strip() for value in (disallow or [])}
    counts: dict[str, int] = {}
    for fp in recent:
        raw = getattr(fp, key, "") or ""
        value = str(raw).lower().strip()
        if not value or value in disallow_set:
            continue
        counts[value] = counts.get(value, 0) + 1
    filtered = [(value, count) for value, count in counts.items() if count >= min_count]
    filtered.sort(key=lambda item: item[1], reverse=True)
    return [value for value, _ in filtered[:limit]]


def _quote_list(values: Sequence[str]) -> str:
    #return ", ".join(f'"{(value or "").replace("\"", r"\\\"")}"' for value in values)
    return ", ".join('"' + (value or "").replace('"', '\\"') + '"' for value in values)



def build_meta(args: BuildMetaArgs) -> str:
    lines: List[str] = [f"options_count={args.options_count}"]
    if isinstance(args.target_words, int):
        lines.append(f"target_words={args.target_words}")
    recent = list(args.recent_fingerprints or [])
    if recent:
        lines.append("recent_fingerprints:")
        for fp in recent:
            esc = (fp.escenario or "desconocido").replace('"', '\\"')
            epo = (fp.epoca or "desconocida").replace('"', '\\"')
            pro = (fp.protagonista or "desconocido").replace('"', '\\"')
            dis = (fp.dispositivo or "desconocido").replace('"', '\\"')
            ton = (fp.tono or "neutro").replace('"', '\\"')
            lines.append(
                f'- escenario:"{esc}", epoca:"{epo}", protagonista:"{pro}", dispositivo:"{dis}", tono:"{ton}"'
            )
    if args.banned_cliches:
        lines.append(f"cliches_prohibidos:[{_quote_list(args.banned_cliches)}]")
    if args.banned_keywords:
        lines.append(f"banned_keywords:[{_quote_list(args.banned_keywords)}]")

    if args.is_first_turn and recent:
        protagonists = _collect_frequent_values(
            recent, "protagonista", disallow={"desconocido", "desconocida"}
        )
        escenarios = _collect_frequent_values(recent, "escenario", disallow={"desconocido"})
        dispositivos = _collect_frequent_values(recent, "dispositivo", disallow={"ninguno"})
        if protagonists:
            lines.append(f"rotate_protagonists:[{_quote_list(protagonists)}]")
        if escenarios:
            lines.append(f"rotate_escenarios:[{_quote_list(escenarios)}]")
        if dispositivos:
            lines.append(f"rotate_dispositivos:[{_quote_list(dispositivos)}]")

    return "\n".join(lines)
