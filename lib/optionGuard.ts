export function normalizeOption(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function countWords(s: string): number {
  const m = s.match(/[\p{L}\p{N}]+/gu);
  return m ? m.length : 0;
}

export function looksLikeVerbStartEs(s: string): boolean {
  const first = normalizeOption(s).split(" ")[0]?.toLowerCase() || "";
  if (!first) return false;
  if (/(ar|er|ir)$/.test(first)) return true; // infinitivo
  const commonImperatives = ["ve","haz","sigue","entra","toma","abre","mira","detén","corre","huye","busca","investiga","pregunta","enfrenta","rompe","cruza","sube","baja","miente","confiesa","llama","esconde","revela"];
  return commonImperatives.includes(first);
}

export function isValidOption(s: string, min=8, max=16): boolean {
  const t = normalizeOption(s);
  const words = countWords(t);
  if (words < min || words > max) return false;
  if (!looksLikeVerbStartEs(t)) return false;
  return true;
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

export function validateOptions(options: string[], N: number): string[] {
  const deduped = dedupeOptions(options);
  const filtered = deduped.filter(o => isValidOption(o));
  return filtered.slice(0, Math.max(0, N|0 || 0));
}
