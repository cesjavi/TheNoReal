import type { Fingerprint } from "../types/fingerprint";
export type { Fingerprint };

type GlobalWithRing = typeof globalThis & {
  __fingerprints?: Fingerprint[];
};

function getRing(): Fingerprint[] {
  const g = globalThis as GlobalWithRing;
  if (!g.__fingerprints) g.__fingerprints = [];
  return g.__fingerprints;
}

export function getRecentFingerprints(): Fingerprint[] {
  return [...getRing()].slice(-20).reverse();
}

export function pushFingerprint(fp: Fingerprint): void {
  const ring = getRing();
  // evitar duplicados simples por primera oración
  if (fp.firstSentence) {
    const exists = ring.some(r => r.firstSentence === fp.firstSentence);
    if (exists) return;
  }
  ring.push(fp);
  if (ring.length > 20) ring.splice(0, ring.length - 20);
}

function firstSentenceOf(text: string): string {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  const m = cleaned.match(/(.+?\.|.+?$)/);
  return (m ? m[1] : cleaned).slice(0, 240);
}

// Heurística mínima; puedes mejorar con NER/keywords si quieres
export function computeFingerprint({
  chapterText,
  genres,
}: {
  chapterText: string;
  genres?: string[];
}): Fingerprint {
  const firstSentence = firstSentenceOf(chapterText);
  return {
    escenario: "desconocido",
    epoca: "desconocida",
    protagonista: "desconocido",
    dispositivo: "desconocido",
    tono: (genres && genres.length ? genres[0] : "neutro"),
    firstSentence,
  };
}
