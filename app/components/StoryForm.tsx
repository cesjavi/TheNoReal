'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useLanguage } from '../providers/LanguageProvider';
import Story from './Story';
import StorySettings, {
  ConfigGeneracion,
  ESTILO_SECTIONS,
  AJUSTES_SECTIONS,
  Ajustes,
} from './StorySettings';
import { parseStoryResponse } from '@/lib/parseStoryResponse';
import { resolveLanguagePreference } from '@/lib/language';

const MODALITY_HELP = {
  capitulos: 'Divide la historia en capítulos.',
  final_sorpresa: 'Añade un giro inesperado al final.',
  sin_final_definido: 'La historia no tiene un final predeterminado.',
  infinita: 'La historia continúa indefinidamente.',
} as const;

type EndingMode = keyof typeof MODALITY_HELP;

const GENRES = [
  'Aventura',
  'Ciencia ficción',
  'Terror',
  'Fantasía',
  'Misterio',
  'Romance',
  'Comedia',
] as const;

const GENRE_ICONS: Record<string, string> = {
  Aventura: '/icons/aventura.svg',
  'Ciencia ficción': '/icons/ciencia-ficcion.svg',
  Terror: '/icons/terror.svg',
  Fantasía: '/icons/fantasia.svg',
  Misterio: '/icons/misterio.svg',
  Romance: '/icons/romance.svg',
  Comedia: '/icons/comedia.svg',
};

const TOKEN_LIMIT = 500;

/** Helpers */
function countTokens(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const toArray = <T,>(v: T | T[] | undefined | null): T[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const isNonEmptyArray = (v: unknown): v is unknown[] => Array.isArray(v) && v.length > 0;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
function isStoryAPI(x: unknown): x is { story: string; options?: unknown } {
  return !!x && typeof (x as { story?: unknown }).story === 'string';
}
function hasText(x: unknown): x is { text: string } {
  return !!x && typeof (x as { text?: unknown }).text === 'string';
}
function normalizeStringArray(a: unknown): string[] {
  if (!Array.isArray(a)) return [];
  return a.filter((v): v is string => typeof v === 'string').map((s) => s.trim()).filter(Boolean);
}

const defaults: ConfigGeneracion = {
  generos: [],
  estilo: { tono: [], ritmo: [], voz: [], tiempo: [], formato: [], descripcion: [], dialogo: [], matiz: [] },
  ajustes: {
    publico: [],
    epoca: [],
    ambito: [],
    estructura: [],
    incluir: [],
    evitar: [],
    clasificacion: [],
    idioma: [],
    registro: [],
    creatividad: 0.75,
    topP: 0.9,
    opcionesPorCapitulo: [],
    targetWords: 220,
  },
};

export default function StoryForm() {
  const t = useTranslations('StoryForm');
  const { locale } = useLanguage();

  const [userPrompt, setUserPrompt] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [numOptions, setNumOptions] = useState(2);
  const [modality, setModality] = useState<EndingMode>('capitulos');
  const [chapters, setChapters] = useState('3');
  const [targetWords, setTargetWords] = useState<number>(defaults.ajustes.targetWords);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialStory, setInitialStory] = useState<string | null>(null);
  const [initialOptions, setInitialOptions] = useState<string[]>([]);
  const [storyConfig, setStoryConfig] = useState<{
    optionsPerDecision: number;
    endingMode: EndingMode;
    chaptersCount?: number; 
  } | null>(null);
  const [promptTruncated, setPromptTruncated] = useState(false);
  const [config, setConfig] = useState<ConfigGeneracion>(defaults);
  const [open, setOpen] = useState(false);
  const [topSvgs, setTopSvgs] = useState<string[] | null>([]);
  const [bottomSvgs, setBottomSvgs] = useState<string[] | null>([]);
  const [topSvg, setTopSvg] = useState<string | null>(null);
  const [bottomSvg, setBottomSvg] = useState<string | null>(null);
  const [topDelay, setTopDelay] = useState<string>('0s');
  const [bottomDelay, setBottomDelay] = useState<string>('0s');

  useEffect(() => {
    const nextTarget =
      typeof config.ajustes.targetWords === 'number' && Number.isFinite(config.ajustes.targetWords)
        ? config.ajustes.targetWords
        : defaults.ajustes.targetWords;

    setTargetWords((prev) => (prev === nextTarget ? prev : nextTarget));
  }, [config.ajustes.targetWords]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/backgrounds');
        const data = (await res.json()) as unknown;
        setTopSvgs(Array.isArray((data as Record<string, unknown>)?.top) ? ((data as { top: string[] }).top) : []);
        setBottomSvgs(Array.isArray((data as Record<string, unknown>)?.bottom) ? ((data as { bottom: string[] }).bottom) : []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching backgrounds', err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (topSvgs?.length) {
      setTopSvg(randomPick(topSvgs));
      setTopDelay(`${Math.random()}s`);
    }
  }, [topSvgs]);

  useEffect(() => {
    if (bottomSvgs?.length) {
      setBottomSvg(randomPick(bottomSvgs));
      setBottomDelay(`${Math.random()}s`);
    }
  }, [bottomSvgs]);

  const resetStory = () => {
    setInitialStory(null);
    setInitialOptions([]);
    setStoryConfig(null);
  };

  const showChapters = modality === 'capitulos' || modality === 'final_sorpresa';
  const tokenLimitReached = tokenCount >= TOKEN_LIMIT;
  const tokenWarningId = tokenLimitReached ? 'prompt-token-warning' : undefined;
  const errorMessageId = error ? 'storyform-error' : undefined;
  const promptDescribedBy = useMemo(() => {
    const ids = [tokenWarningId, errorMessageId].filter(Boolean);
    return ids.length ? ids.join(' ') : undefined;
  }, [errorMessageId, tokenWarningId]);

  const toggleGenre = (genre: string) => {
    setConfig((prev) => ({
      ...prev,
      generos: prev.generos.includes(genre) ? prev.generos.filter((g) => g !== genre) : [...prev.generos, genre],
    }));
  };

  const clearGenres = () => setConfig((prev) => ({ ...prev, generos: [] }));

  const randomizeConfig = () => {
    const genero = randomPick([...GENRES]);
    const estilo = ESTILO_SECTIONS.reduce((acc, { key, options }) => {
      acc[key] = [randomPick(options)];
      return acc;
    }, {} as ConfigGeneracion['estilo']);

    const ajustes: Ajustes = {
      publico: [],
      epoca: [],
      ambito: [],
      estructura: [],
      incluir: [],
      evitar: [],
      clasificacion: [],
      idioma: [],
      registro: [],
      opcionesPorCapitulo: [],
      targetWords,
    };
    AJUSTES_SECTIONS.forEach(({ key, options }) => {
      ajustes[key] = [randomPick(options)];
    });

    setConfig({ generos: [genero], estilo, ajustes });
  };

  const updateTargetWords = (value: number) => {
    const clampedValue = clamp(value, 80, 600);
    setTargetWords(clampedValue);
    setConfig((prev) => ({
      ...prev,
      ajustes: { ...prev.ajustes, targetWords: clampedValue },
    }));
  };

  const handleImprovePrompt = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prompt/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = typeof data?.error === 'string' ? data.error : 'Error al mejorar el prompt';
        throw new Error(errMsg);
      }
      const improvedPrompt: string = typeof data?.prompt === 'string' ? data.prompt : '';
      const tokens = countTokens(improvedPrompt);
      setPrompt(improvedPrompt);
      setTokenCount(tokens);
      setPromptTruncated(tokens > TOKEN_LIMIT);
    } catch (err) {
      console.error('Error improving prompt', err);
      setError(err instanceof Error ? err.message : 'Error al mejorar el prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompt = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prompt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = typeof data?.error === 'string' ? data.error : 'Error al generar el prompt';
        throw new Error(errMsg);
      }
      const text = typeof data?.prompt === 'string' ? data.prompt : '';
      const tokens = countTokens(text);
      setPrompt(text);
      setTokenCount(tokens);
      setPromptTruncated(tokens > TOKEN_LIMIT);
    } catch (err) {
      console.error('Error generating prompt', err);
      setError(err instanceof Error ? err.message : 'Error al generar el prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setInitialStory(null);
    setInitialOptions([]);

    try {
      const trimmed = prompt.trim();
      if (!trimmed) {
        setError('El inicio no puede estar vacío');
        setLoading(false);
        return;
      }

      // Permitir que el usuario fije N opciones desde Configuración (ajustes.opcionesPorCapitulo)
      const opcionesCfgRaw = toArray<string>(config.ajustes.opcionesPorCapitulo)[0];
      const opcionesCfg = opcionesCfgRaw ? Number(opcionesCfgRaw) : NaN;
      const optionsPerDecision = clamp(opcionesCfg || (Number(numOptions) || 2), 2, 6);

      const requiresChapters = modality === 'capitulos' || modality === 'final_sorpresa';
      const chaptersNum = requiresChapters ? Number(chapters) : undefined;

      if (requiresChapters && (!chaptersNum || chaptersNum < 1)) {
        setError('Ingresá un número de capítulos válido (>= 1)');
        setLoading(false);
        return;
      }

      let effectivePrompt = trimmed;
      if (tokenCount > TOKEN_LIMIT) {
        const words = trimmed.split(/\s+/).filter(Boolean).slice(0, TOKEN_LIMIT);
        effectivePrompt = words.join(' ');
        setPromptTruncated(true);
      }
      setUserPrompt(effectivePrompt);

      const final: EndingMode = modality;

      const { creatividad, topP, evitar, ...restAjustes } = config.ajustes;
      const ajustesPayload = {
        ...restAjustes,
        evitar: normalizeStringArray(evitar),
        temperature: typeof creatividad === 'number' ? creatividad : 0.75,
        top_p: typeof topP === 'number' ? topP : 0.9,
        targetWords,
      } satisfies Record<string, unknown>;

      // Si el usuario eligió un idioma en ajustes, priorizarlo (ej: "es-AR")
      const lang = resolveLanguagePreference({ forced: config.ajustes.idioma, locale });

      const payload = {
        story: effectivePrompt,
        option: '',
        optionsPerDecision,
        genres: config.generos,
        estilo: config.estilo,
        ajustes: ajustesPayload,
        language: lang,
        endingMode: final,
        chaptersCount: final === 'capitulos' || final === 'final_sorpresa' ? chaptersNum : undefined,
        finalize: false, // dejar explícito para la API
      } as const;

      // eslint-disable-next-line no-console
      console.log('/api/story payload', payload);

      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const dataUnknown = await response.json().catch(() => ({}));
      const data = dataUnknown as unknown;

      if (!response.ok) {
        let errMsg = 'Error al obtener la historia inicial';
        if (isObject(data)) {
          const record = data as Record<string, unknown>;
          if (typeof record.error === 'string') {
            errMsg = record.error;
          }
        }
        throw new Error(errMsg);
      }

      // ✅ Compatibilidad: nueva API ({story, options}) o vieja API ({text})
      let firstChapter = '';
      let firstOptions: string[] = [];

      if (isStoryAPI(data)) {
        firstChapter = data.story || '';
        firstOptions = Array.from(new Set(normalizeStringArray((data as { options?: unknown }).options)));
      } else if (hasText(data)) {
        const parsed = parseStoryResponse(data.text, optionsPerDecision);
        firstChapter = parsed.story;
        firstOptions = parsed.options;
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }

      setInitialStory(firstChapter);
      setInitialOptions(firstOptions);
      setStoryConfig({
        optionsPerDecision,
        endingMode: final,
        chaptersCount: final === 'capitulos' || final === 'final_sorpresa' ? chaptersNum : undefined,
      });

      setPrompt('');
      setTokenCount(0);
      setNumOptions(2);
      setModality('capitulos');
      setChapters('');
    } catch (err) {
      console.error('Error al iniciar la historia', err);
      const message = err instanceof Error ? err.message : 'Error al conectar con el servidor';
      setError(message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center p-8 gap-4">
      <div>
        {topSvg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={topSvg}
            style={{ animationDelay: topDelay }}
            alt="T"
            className="fixed left-1/2 top-0 -translate-x-1/2 -translate-y-0 object-cover h-80 w-200 pointer-events-none opacity-40"
          />
        )}

        {bottomSvg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bottomSvg}
            style={{ animationDelay: bottomDelay }}
            alt="B"
            className="absolute bottom-0 left-0 w-full h-40 z-0 pointer-events-none"
          />
        )}
      </div>

      {!initialStory && (
        <>
          {/* 1) Texto inicial */}
          <div className="flex flex-col w-full max-w-xl">
            <textarea
              id="story-initial-prompt"
              className="w-full p-2 mb-2 border border-black/30 hover:border-black/60 rounded-lg focus:ring-2 focus:ring-accent"
              placeholder="Escribe el inicio de la historia"
              value={prompt}
              onChange={(e) => {
                const value = e.target.value;
                setPrompt(value);
                setTokenCount(countTokens(value));
                setPromptTruncated(false);
              }}
              aria-invalid={tokenLimitReached}
              aria-describedby={promptDescribedBy}
              disabled={loading}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {tokenCount}/{TOKEN_LIMIT} tokens
              </span>
              {tokenLimitReached && (
                <span
                  id={tokenWarningId}
                  className="text-red-600"
                  role="status"
                  aria-live="polite"
                >
                  Límite alcanzado
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleImprovePrompt}
                disabled={loading}
                className="px-2 py-1 text-sm rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark disabled:opacity-50"
              >
                {t("improvePrompt")}
              </button>
              <button
                type="button"
                onClick={handleGeneratePrompt}
                disabled={loading}
                className="px-2 py-1 text-sm rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark disabled:opacity-50"
              >
                {t("generatePrompt")}
              </button>
            </div>
          </div>

          {/* 2) Géneros debajo del textarea */}
          <div className="w-full max-w-xl rounded-lg border border-black/30 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GENRES.map((genre) => {
                const selected = config.generos.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    aria-pressed={selected ? 'true' : 'false'}
                    onClick={() => toggleGenre(genre)}
                    title={selected ? 'Quitar género' : 'Agregar género'}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${
                      selected
                        ? 'bg-accent text-black border-black/40 shadow-inner'
                        : 'bg-white/40 hover:bg-white/70 border-black/20 hover:border-black/40'
                    }`}
                  >
                    <Image
                      src={GENRE_ICONS[genre] ?? '/icons/generico.svg'}
                      alt=""
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                    <span className="truncate">{genre}</span>
                    {selected && (
                      <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/30">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={clearGenres}
                className="px-2 py-1 text-sm rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={randomizeConfig}
                className="px-2 py-1 text-sm rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark"
              >
                {t('randomize')}
              </button>
              <button
                type="button"
                data-testid="btn-configuracion"
                onClick={() => setOpen(true)}
                className="self-start px-2 py-1 text-sm rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark"
              >
                Configuración
              </button>
            </div>

            {/* Chips de géneros seleccionados */}
            {config.generos.length > 0 && (
              <div className="w-full max-w-xl mt-3 rounded-xl border border-black/20 bg-white/30 p-3">
                <p className="mb-2 text-sm text-gray-700">Géneros seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {config.generos.map((genre) => (
                    <button
                      key={`chip-${genre}`}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className="inline-flex items-center gap-2 rounded-full border border-black/30 bg-accent/90 px-3 py-1 text-sm text-black hover:bg-accent"
                      title="Quitar"
                    >
                      <Image
                        src={GENRE_ICONS[genre] ?? '/icons/generico.svg'}
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4"
                      />
                      <span>{genre}</span>
                      <span className="ml-1 leading-none">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3) Botón Crear historia */}
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || loading || tokenCount > TOKEN_LIMIT}
            className="px-4 py-2 rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            {loading ? t('sending') : t('createStory')}
          </button>

          {/* 4) Controles en una sola línea */}
          <div className="flex flex-wrap gap-4 items-end w-full max-w-xl">
            {/* Opciones por decisión */}
            <div className="flex items-center gap-2">
              <label htmlFor="numOptions">Opciones por decisión:</label>
              <input
                id="numOptions"
                type="number"
                min={2}
                max={6}
                value={numOptions}
                onChange={(e) => setNumOptions(clamp(Number(e.target.value) || 2, 2, 6))}
                className="w-20 p-1 border border-black/30 hover:border-black/60 rounded-lg focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Modalidad de final */}
            <div className="flex items-center gap-2">
              <label htmlFor="modality">Modalidad de final:</label>
              <select
                id="modality"
                value={modality}
                onChange={(e) => setModality(e.target.value as EndingMode)}
                className="p-2 border rounded-lg border-black/30 hover:border-black/60 focus:ring-2 focus:ring-accent"
              >
                <option value="capitulos">Capítulos</option>
                <option value="final_sorpresa">Final sorpresa</option>
                <option value="sin_final_definido">Sin final definido</option>
                <option value="infinita">Historia infinita</option>
              </select>
            </div>

            {/* Capítulos (si corresponde) */}
            {showChapters && (
              <div className="flex items-center gap-2">
                <label htmlFor="chapters">Capítulos:</label>
                <input
                  id="chapters"
                  type="number"
                  min={1}
                  required={modality === 'capitulos'}
                  value={chapters}
                  onChange={(e) => setChapters(e.target.value)}
                  className="w-20 p-1 border border-black/30 hover:border-black/60 rounded-lg focus:ring-2 focus:ring-accent"
                />
              </div>
            )}

            {/* Target words */}
            <div className="flex items-center gap-2">
              <label htmlFor="targetWords">Palabras objetivo:</label>
              <input
                id="targetWords"
                type="number"
                min={80}
                max={600}
                value={targetWords}
                onChange={(e) => updateTargetWords(Number(e.target.value) || defaults.ajustes.targetWords)}
                className="w-24 p-1 border border-black/30 hover:border-black/60 rounded-lg focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* 5) Ayudas/modos */}
          <div className="flex flex-col w-full max-w-xl gap-2">
            <p className="text-sm text-gray-600">{MODALITY_HELP[modality]}</p>
          </div>

          {(config.generos.length > 0 ||
            Object.values(config.estilo).some(isNonEmptyArray) ||
            Object.values(config.ajustes).some(isNonEmptyArray)) && (
            <div className="flex flex-wrap gap-2 max-w-xl">
              {config.generos.map((genre) => (
                <span key={`genero-${genre}`} className="px-2 py-1 text-sm rounded-full bg-accent text-black">
                  {genre}
                </span>
              ))}

              {Object.entries(config.estilo).flatMap(([key, values]) =>
                toArray(values as string[]).map((v) => (
                  <span key={`estilo-${key}-${v}`} className="px-2 py-1 text-sm rounded-full bg-accent text-black">
                    {v}
                  </span>
                )),
              )}

              {Object.entries(config.ajustes).flatMap(([key, values]) =>
                toArray(values as string[]).map((v) => (
                  <span key={`ajuste-${key}-${v}`} className="px-2 py-1 text-sm rounded-full bg-accent text-black">
                    {v}
                  </span>
                )),
              )}
            </div>
          )}
        </>
      )}

      {initialStory && storyConfig && (
        <Story
          userPrompt={userPrompt}
          initialStory={initialStory}
          initialOptions={initialOptions}
          optionsPerDecision={storyConfig.optionsPerDecision}
          endingMode={storyConfig.endingMode}
          chaptersCount={storyConfig.chaptersCount}
          genres={config.generos}
          estilo={config.estilo}
          ajustes={config.ajustes}
          onBack={resetStory}
        />
      )}

      {promptTruncated && (
        <p className="text-yellow-600">{t('promptTruncated', { limit: TOKEN_LIMIT })}</p>
      )}

      {error && (
        <p id="storyform-error" className="text-red-500" role="alert" aria-live="assertive">
          {error === 'GROQ_API_KEY no configurada'
            ? 'La clave de la API de Groq no está configurada.'
            : error}
        </p>
      )}

      <StorySettings
        open={open}
        config={config}
        onClose={() => setOpen(false)}
        onSave={(cfg) => {
          const normalized: ConfigGeneracion = {
            generos: Array.isArray(cfg.generos) ? cfg.generos : [],
            estilo: {
              tono: cfg.estilo.tono ?? [],
              ritmo: cfg.estilo.ritmo ?? [],
              voz: cfg.estilo.voz ?? [],
              tiempo: cfg.estilo.tiempo ?? [],
              formato: cfg.estilo.formato ?? [],
              descripcion: cfg.estilo.descripcion ?? [],
              dialogo: cfg.estilo.dialogo ?? [],
              matiz: cfg.estilo.matiz ?? [],
            },
            ajustes: {
              publico: cfg.ajustes.publico ?? [],
              epoca: cfg.ajustes.epoca ?? [],
              ambito: cfg.ajustes.ambito ?? [],
              estructura: cfg.ajustes.estructura ?? [],
              incluir: cfg.ajustes.incluir ?? [],
              evitar: cfg.ajustes.evitar ?? [],
              clasificacion: cfg.ajustes.clasificacion ?? [],
              idioma: cfg.ajustes.idioma ?? [],
              registro: cfg.ajustes.registro ?? [],
              opcionesPorCapitulo: cfg.ajustes.opcionesPorCapitulo ?? [],
              lugar: cfg.ajustes.lugar,
              longitudPalabras: cfg.ajustes.longitudPalabras,
              creatividad: cfg.ajustes.creatividad,
              topP: cfg.ajustes.topP,
              semilla: cfg.ajustes.semilla,
              consistenciaSaga: cfg.ajustes.consistenciaSaga,
              estiloVisual: cfg.ajustes.estiloVisual,
              paleta: cfg.ajustes.paleta,
              targetWords: cfg.ajustes.targetWords ?? 220,
            },
          };
          setConfig(normalized);
          setOpen(false);
        }}
      />
    </main>
  );
}
