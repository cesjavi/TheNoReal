// lib/story-config.ts

export type NormalizedStoryConfig = {
  optionsPerDecision: number;
  endingMode: 'CAPITULOS' | 'SIN_FINAL_DEFINIDO' | 'FINAL_SORPRESA' | 'INFINITA';
  chaptersCount: number | null;
};

type AnyObj = Record<string, unknown>;

const endingMap = {
  capitulos: 'CAPITULOS',
  sin_final_definido: 'SIN_FINAL_DEFINIDO',
  final_sorpresa: 'FINAL_SORPRESA',
  infinita: 'INFINITA',
} as const;

const ACCENTS = /[\u0300-\u036f]/g;

function toInt(x: unknown): number | null {
  if (typeof x === 'number' && Number.isInteger(x)) return x;
  if (typeof x === 'string') {
    const n = Number(x.trim());
    return Number.isInteger(n) ? n : null;
  }
  return null;
}

// 🔧 normaliza claves: minúsculas, sin acentos, separadores → "_"
function normalizeKeys(obj: AnyObj): AnyObj {
  const out: AnyObj = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = k
      .toLowerCase()
      .normalize('NFD')
      .replace(ACCENTS, '')
      .replace(/[\s\-\.]+/g, '_'); // espacios, guiones, puntos → _
    out[nk] = v;
  }
  return out;
}

function pick(o: AnyObj, keys: string[]) {
  for (const k of keys) if (o[k] !== undefined) return o[k];
  return undefined;
}

export function normalizeStoryConfig(raw: unknown):
  | { ok: true; data: NormalizedStoryConfig }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Body debe ser un objeto JSON' };

  const r = normalizeKeys(raw as AnyObj);

  // admite: opciones_por_decision, optionsPerDecision, opciones, etc.
  const opcionesVal = pick(r, [
    'opciones_por_decision',
    'optionsperdecision',
    'opciones',
    'options_count',
    'choicesperstep',
    'choices',
  ]);
  const opciones = toInt(opcionesVal);
  if (opciones === null || opciones < 2) {
    return { ok: false, error: 'opciones_por_decision debe ser entero ≥ 2' };
  }

  // final: acepta "Final sorpresa", "final_sorpresa", etc.
  const finalKey = (typeof r['final'] === 'string'
    ? r['final']
    : '').toLowerCase().normalize('NFD').replace(ACCENTS, '').replace(/\s+/g, '_');

  if (!(finalKey in endingMap)) {
    return { ok: false, error: "final inválido. Usa: 'capitulos' | 'sin_final_definido' | 'final_sorpresa' | 'infinita'" };
  }
  const endingMode = endingMap[finalKey as keyof typeof endingMap];

  // capítulos: múltiples alias
  const chaptersVal = pick(r, ['capitulos', 'chapterscount', 'chapters', 'numcapitulos']);
  const chapters = chaptersVal === undefined ? null : toInt(chaptersVal);

  if (endingMode === 'CAPITULOS') {
    if (chapters === null || chapters < 1)
      return { ok: false, error: 'capitulos es requerido y debe ser entero ≥ 1 cuando final = capitulos' };
    return { ok: true, data: { optionsPerDecision: opciones, endingMode, chaptersCount: chapters } };
  }

  if (endingMode === 'FINAL_SORPRESA') {
    if (chapters !== null && chapters < 1)
      return { ok: false, error: 'capitulos (opcional) debe ser entero ≥ 1 cuando final = final_sorpresa' };
    return { ok: true, data: { optionsPerDecision: opciones, endingMode, chaptersCount: chapters ?? null } };
  }

  if (chapters !== null)
    return { ok: false, error: "No envíes 'capitulos/chaptersCount' salvo en 'capitulos' o 'final_sorpresa'." };

  return { ok: true, data: { optionsPerDecision: opciones, endingMode, chaptersCount: null } };
}

export function validateStoryConfig(raw: unknown): raw is Record<string, unknown> {
  return normalizeStoryConfig(raw).ok;
}
