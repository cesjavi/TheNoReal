export type OptionDiscard = { option: string; reason: string };

export function normalizeOption(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function countWords(s: string): number {
  const m = s.match(/[\p{L}\p{N}]+/gu);
  return m ? m.length : 0;
}

export function looksLikeVerbStartEs(s: string): boolean {
  const firstToken = normalizeOption(s).split(" ")[0] || "";
  const first = firstToken
    .toLowerCase()
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
  if (!first) return false;
  if (/(ar|er|ir)$/.test(first)) return true; // infinitivo
  const irregularImperatives = [
    "ve",
    "haz",
    "sigue",
    "entra",
    "toma",
    "abre",
    "mira",
    "detén",
    "corre",
    "huye",
    "busca",
    "investiga",
    "pregunta",
    "enfrenta",
    "rompe",
    "cruza",
    "sube",
    "baja",
    "miente",
    "confiesa",
    "llama",
    "esconde",
    "revela",
    "ven",
    "di",
    "sal",
    "pon",
    "ten",
    "sé",
  ];
  if (irregularImperatives.includes(first)) return true;
  return /(ad|ed|id|en|emos|amos|a|e|os)$/.test(first);
}

export function isValidOption(
  s: string,
  min = 8,
  max = 16,
): { ok: boolean; reason?: string } {
  const t = normalizeOption(s);
  const words = countWords(t);
  if (words < min)
    return { ok: false, reason: `menos de ${min} palabras` };
  if (words > max)
    return { ok: false, reason: `más de ${max} palabras` };
  if (!looksLikeVerbStartEs(t))
    return { ok: false, reason: "no empieza por verbo" };
  return { ok: true };
}

export function dedupeOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of options) {
    const k = normalizeOption(o).toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(normalizeOption(o));
    }
  }
  return out;
}

export function validateOptions(
  options: string[],
  N: number,
  min = 8,
  max = 16,
): { valid: string[]; discarded: OptionDiscard[] } {
  const deduped = dedupeOptions(options);
  const valid: string[] = [];
  const discarded: OptionDiscard[] = [];
  for (const o of deduped) {
    const { ok, reason } = isValidOption(o, min, max);
    if (ok) {
      valid.push(normalizeOption(o));
    } else {
      discarded.push({ option: normalizeOption(o), reason: reason || "" });
    }
  }
  return {
    valid: valid.slice(0, Math.max(0, N | 0 || 0)),
    discarded,
  };
}
