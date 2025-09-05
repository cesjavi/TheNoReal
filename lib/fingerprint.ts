export type Fingerprint = {
  escenario: string;
  epoca: string;
  protagonista: string;
  dispositivo: string;
  tono: string;
  firstSentence: string;
};

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
    const exists = ring.some((r) => r.firstSentence === fp.firstSentence);
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

function extractEscenario(text: string): string {
  const m = text.match(/en\s+(?:un|una|el|la)\s+([^.,;!?]+)/i);
  return m ? m[1].trim().toLowerCase() : "desconocido";
}

function extractEpoca(text: string): string {
  const m = text.match(
    /(\d{3,4}|edad media|prehistoria|futuro|actualidad|presente|siglo\s+[xiv0-9]+)/i
  );
  return m ? m[1].toLowerCase() : "desconocida";
}

function extractProtagonista(text: string): string {
  const stop = new Set([
    "El",
    "La",
    "Los",
    "Las",
    "Un",
    "Una",
    "En",
    "Y",
    "Pero",
    "Cuando",
    "Mientras",
    "A",
  ]);
  const words = firstSentenceOf(text).split(/[\s,]+/);
  const found = words.find(
    (w) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(w) && !stop.has(w)
  );
  return found ? found : "desconocido";
}

function extractDispositivo(text: string): string {
  const m = text.match(
    /(espada|arma|pistola|rifle|computadora|ordenador|tel[eé]fono|m[óo]vil|tableta|tablet|reloj|varita|libro|amuleto)/i
  );
  return m ? m[1].toLowerCase() : "ninguno";
}

export function computeFingerprint({
  chapterText,
  genres,
}: {
  chapterText: string;
  genres?: string[];
}): Fingerprint {
  const firstSentence = firstSentenceOf(chapterText);
  return {
    escenario: extractEscenario(chapterText),
    epoca: extractEpoca(chapterText),
    protagonista: extractProtagonista(chapterText),
    dispositivo: extractDispositivo(chapterText),
    tono: genres && genres.length ? genres[0] : "neutro",
    firstSentence,
  };
}

function similarityScore(a: Fingerprint, b: Fingerprint): number {
  let score = 0;
  if (a.escenario && a.escenario === b.escenario) score++;
  if (a.epoca && a.epoca === b.epoca) score++;
  if (a.protagonista && a.protagonista === b.protagonista) score++;
  if (a.dispositivo && a.dispositivo === b.dispositivo) score++;
  return score;
}

export function isFingerprintTooSimilar(
  fp: Fingerprint,
  others: Fingerprint[]
): boolean {
  return others.some((o) => similarityScore(fp, o) >= 3);
}
