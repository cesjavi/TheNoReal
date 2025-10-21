'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { resolveLanguagePreference } from '@thenoreal/shared'
import { resolveApiUrl } from '@/utils/api';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { coerceStoryPayload } from '@/utils/storyPayload';

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
const DEFAULT_TARGET_WORDS = 220;

// Helper function para manejar peticiones en web y nativo
async function apiRequest(url: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}) {
  const method = options?.method || 'GET';
  const headers = options?.headers || {};
  
  // Si estamos en plataforma nativa (Android/iOS), usar CapacitorHttp
  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.request({
        url,
        method,
        headers,
        data: options?.body ? JSON.parse(options.body) : undefined,
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => {
          const { data } = response;
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (error) {
              console.warn('CapacitorHttp JSON parse error:', error);
              return data;
            }
          }
          return data;
        },
      };
    } catch (error) {
      console.error('CapacitorHttp error:', error);
      throw error;
    }
  } else {
    // En web, usar fetch normal
    return await fetch(url, options);
  }
}

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
    targetWords: DEFAULT_TARGET_WORDS,
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
  const [targetWords, setTargetWords] = useState<number>(DEFAULT_TARGET_WORDS);
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
  const promptRef = useRef<HTMLDivElement | null>(null);
  const genresRef = useRef<HTMLDivElement | null>(null);
  const structureRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  type SectionId = 'prompt' | 'genres' | 'structure' | 'summary';

  const sections = useMemo(
    () =>
      [
        {
          id: 'prompt' as SectionId,
          label: 'Inicio',
          description: 'Define el punto de partida de tu historia.',
          ref: promptRef,
        },
        {
          id: 'genres' as SectionId,
          label: 'Géneros',
          description: 'Elige tonos y referencias para la narración.',
          ref: genresRef,
        },
        {
          id: 'structure' as SectionId,
          label: 'Estructura',
          description: 'Configura ritmo, capítulos y longitud.',
          ref: structureRef,
        },
        {
          id: 'summary' as SectionId,
          label: 'Resumen',
          description: 'Revisa ajustes clave y abre la configuración.',
          ref: summaryRef,
        },
      ],
    [promptRef, genresRef, structureRef, summaryRef]
  );

  const [activeSection, setActiveSection] = useState<SectionId>('prompt');

  useEffect(() => {
    const nextTarget =
      typeof config.ajustes.targetWords === 'number' && Number.isFinite(config.ajustes.targetWords)
        ? config.ajustes.targetWords
        : DEFAULT_TARGET_WORDS;

    setTargetWords((prev) => (prev === nextTarget ? prev : nextTarget));
  }, [config.ajustes.targetWords]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiRequest(resolveApiUrl('backgrounds'));
        const data = (await res.json()) as unknown;
        setTopSvgs(Array.isArray((data as Record<string, unknown>)?.top) ? ((data as { top: string[] }).top) : []);
        setBottomSvgs(Array.isArray((data as Record<string, unknown>)?.bottom) ? ((data as { bottom: string[] }).bottom) : []);
      } catch (err) {
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);

        if (visible[0]) {
          setActiveSection(visible[0].target.id as SectionId);
        }
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: 0.25 }
    );

    sections.forEach(({ ref }) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => {
      sections.forEach(({ ref }) => {
        if (ref.current) observer.unobserve(ref.current);
      });
      observer.disconnect();
    };
  }, [sections]);

  const handleScrollTo = useCallback(
    (id: SectionId) => {
      const target = sections.find((section) => section.id === id)?.ref.current;
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    },
    [sections]
  );

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
      const res = await apiRequest(resolveApiUrl('prompt/improve'), {
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
      const res = await apiRequest(resolveApiUrl('prompt/generate'), {
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
        finalize: false,
      } as const;

      console.log('/api/story payload', payload);

      const response = await apiRequest(resolveApiUrl('story'), {
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

      let firstChapter = '';
      let firstOptions: string[] = [];

      if (isStoryAPI(data)) {
        firstChapter = data.story || '';
        firstOptions = Array.from(new Set(normalizeStringArray((data as { options?: unknown }).options)));
      } else {
        const normalized = coerceStoryPayload(data, optionsPerDecision);
        firstChapter = normalized.story;
        firstOptions = normalized.options;
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
    <main className="relative min-h-screen w-full overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      {topSvg && (
        <img
          src={topSvg}
          style={{ animationDelay: topDelay }}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[520px] -translate-x-1/2 opacity-40"
        />
      )}

      {bottomSvg && (
        <img
          src={bottomSvg}
          style={{ animationDelay: bottomDelay }}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-48 w-full opacity-60"
        />
      )}

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        {!initialStory ? (
          <>
            <header className="mb-10 rounded-3xl bg-white/70 p-6 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-600">Narrativa asistida</p>
                  <h1 className="text-3xl font-semibold text-gray-900">Diseña tu historia interactiva</h1>
                  <p className="max-w-2xl text-sm text-gray-700">
                    Sigue el recorrido guiado para definir el tono, la estructura y los ajustes finos de tu aventura.
                    Cada sección está pensada para ayudarte a decidir sin perderte entre paneles secundarios.
                  </p>
                </div>
                <ol className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                  <li className="flex items-center gap-2 rounded-full bg-accent/70 px-4 py-2 font-medium text-black">
                    1. Idea inicial
                  </li>
                  <li className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm">
                    2. Estilo y género
                  </li>
                  <li className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm">
                    3. Opciones narrativas
                  </li>
                </ol>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <div className="flex flex-col gap-8">
                <section
                  ref={promptRef}
                  id="prompt"
                  className="scroll-mt-28 rounded-3xl bg-white/75 p-6 shadow-md backdrop-blur-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Inicio de la historia</h2>
                      <p className="text-sm text-gray-600">
                        Describe la escena, los personajes o el conflicto con el que querés arrancar.
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/80 px-3 py-1 text-xs font-semibold text-black">
                      Paso 1
                    </span>
                  </div>
                  <div className="space-y-3">
                    <textarea
                      id="story-initial-prompt"
                      className="h-40 w-full resize-none rounded-2xl border border-black/20 bg-white/80 p-4 text-base text-gray-900 shadow-inner transition placeholder:text-gray-500 focus:border-accent-dark focus:outline-none focus:ring-2 focus:ring-accent"
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
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
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
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleImprovePrompt}
                        disabled={loading}
                        className="flex-1 min-w-[140px] rounded-xl border border-transparent bg-accent px-4 py-2 text-sm font-medium text-black shadow hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                      >
                        {t('improvePrompt')}
                      </button>
                      <button
                        type="button"
                        onClick={handleGeneratePrompt}
                        disabled={loading}
                        className="flex-1 min-w-[140px] rounded-xl border border-black/20 bg-white/70 px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-black/40 hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                      >
                        {t('generatePrompt')}
                      </button>
                    </div>
                  </div>
                </section>

                <section
                  ref={genresRef}
                  id="genres"
                  className="scroll-mt-28 rounded-3xl bg-white/75 p-6 shadow-md backdrop-blur-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Géneros e inspiración visual</h2>
                      <p className="text-sm text-gray-600">
                        Alterná entre géneros, inspírate con combinaciones aleatorias o guarda tus favoritos como chips.
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/60 px-3 py-1 text-xs font-semibold text-black">
                      Paso 2
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {GENRES.map((genre) => {
                        const selected = config.generos.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            aria-pressed={selected ? 'true' : 'false'}
                            onClick={() => toggleGenre(genre)}
                            title={selected ? 'Quitar género' : 'Agregar género'}
                            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
                              selected
                                ? 'border-transparent bg-accent text-black shadow-inner'
                                : 'border-black/20 bg-white/60 text-gray-800 hover:border-black/40 hover:bg-white'
                            }`}
                          >
                            <Image
                              src={GENRE_ICONS[genre] ?? '/icons/generico.svg'}
                              alt=""
                              width={24}
                              height={24}
                              className="h-6 w-6"
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

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={clearGenres}
                        className="rounded-xl border border-black/20 bg-white/70 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-black/40 hover:bg-white"
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        onClick={randomizeConfig}
                        className="rounded-xl border border-transparent bg-accent px-3 py-2 text-sm font-medium text-black shadow hover:bg-accent-dark"
                      >
                        {t('randomize')}
                      </button>
                      <button
                        type="button"
                        data-testid="btn-configuracion"
                        onClick={() => setOpen(true)}
                        className="rounded-xl border border-black/20 bg-white/70 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:border-black/40 hover:bg-white"
                      >
                        Configuración avanzada
                      </button>
                    </div>

                    {config.generos.length > 0 && (
                      <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
                        <p className="mb-2 text-sm font-medium text-gray-700">Géneros seleccionados</p>
                        <div className="flex flex-wrap gap-2">
                          {config.generos.map((genre) => (
                            <button
                              key={`chip-${genre}`}
                              type="button"
                              onClick={() => toggleGenre(genre)}
                              className="inline-flex items-center gap-2 rounded-full border border-transparent bg-accent/90 px-3 py-1 text-sm font-medium text-black shadow-sm transition hover:bg-accent"
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
                </section>

                <section
                  ref={structureRef}
                  id="structure"
                  className="scroll-mt-28 rounded-3xl bg-white/75 p-6 shadow-md backdrop-blur-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Estructura y decisiones</h2>
                      <p className="text-sm text-gray-600">
                        Ajustá cuántas elecciones querés por capítulo, el modo de finalización y la extensión sugerida.
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/60 px-3 py-1 text-xs font-semibold text-black">
                      Paso 3
                    </span>
                  </div>

                  <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-black/10 bg-white/60 p-4">
                    <button
                      onClick={handleSubmit}
                      disabled={!prompt.trim() || loading || tokenCount > TOKEN_LIMIT}
                      className="w-full rounded-2xl border border-transparent bg-accent px-4 py-3 text-base font-semibold text-black shadow-lg transition hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? t('sending') : t('createStory')}
                    </button>
                    <p className="text-xs text-gray-600">
                      Podés volver a este botón cuando ajustes cualquier parámetro. Guardamos automáticamente tus últimas selecciones.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Opciones por decisión</span>
                      <input
                        id="numOptions"
                        type="number"
                        min={2}
                        max={6}
                        value={numOptions}
                        onChange={(e) => setNumOptions(clamp(Number(e.target.value) || 2, 2, 6))}
                        className="rounded-xl border border-black/20 bg-white/80 p-2 text-base text-gray-900 placeholder:text-gray-500 focus:border-accent-dark focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </label>

                    <label className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Modalidad de final</span>
                      <select
                        id="modality"
                        value={modality}
                        onChange={(e) => setModality(e.target.value as EndingMode)}
                        className="rounded-xl border border-black/20 bg-white/80 p-2 text-base text-gray-900 focus:border-accent-dark focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="capitulos">Capítulos</option>
                        <option value="final_sorpresa">Final sorpresa</option>
                        <option value="sin_final_definido">Sin final definido</option>
                        <option value="infinita">Historia infinita</option>
                      </select>
                    </label>

                    {showChapters && (
                      <label className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-gray-700">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Capítulos</span>
                        <input
                          id="chapters"
                          type="number"
                          min={1}
                          required={modality === 'capitulos'}
                          value={chapters}
                          onChange={(e) => setChapters(e.target.value)}
                          className="rounded-xl border border-black/20 bg-white/80 p-2 text-base text-gray-900 placeholder:text-gray-500 focus:border-accent-dark focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </label>
                    )}

                    <label className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Palabras objetivo</span>
                      <input
                        id="targetWords"
                        type="number"
                        min={80}
                        max={600}
                        value={targetWords}
                        onChange={(e) => updateTargetWords(Number(e.target.value) || DEFAULT_TARGET_WORDS)}
                        className="rounded-xl border border-black/20 bg-white/80 p-2 text-base text-gray-900 placeholder:text-gray-500 focus:border-accent-dark focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </label>
                  </div>

                  <p className="mt-4 rounded-2xl border border-dashed border-accent/40 bg-accent/10 p-4 text-sm text-gray-700">
                    {MODALITY_HELP[modality]}
                  </p>
                </section>

                <section
                  ref={summaryRef}
                  id="summary"
                  className="scroll-mt-28 rounded-3xl bg-white/75 p-6 shadow-md backdrop-blur-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Resumen y ajustes rápidos</h2>
                      <p className="text-sm text-gray-600">
                        Visualiza los elementos activos y accedé a la configuración avanzada sin perder el contexto de la historia.
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/50 px-3 py-1 text-xs font-semibold text-black">
                      Paso 4
                    </span>
                  </div>

                  {(config.generos.length > 0 ||
                    Object.values(config.estilo).some(isNonEmptyArray) ||
                    Object.values(config.ajustes).some(isNonEmptyArray)) && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {config.generos.map((genre) => (
                        <span key={`genero-${genre}`} className="rounded-full bg-accent/80 px-3 py-1 text-sm font-medium text-black">
                          {genre}
                        </span>
                      ))}

                      {Object.entries(config.estilo).flatMap(([key, values]) =>
                        toArray(values as string[]).map((v) => (
                          <span key={`estilo-${key}-${v}`} className="rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-gray-800 shadow-sm">
                            {v}
                          </span>
                        )),
                      )}

                      {Object.entries(config.ajustes).flatMap(([key, values]) =>
                        toArray(values as string[]).map((v) => (
                          <span key={`ajuste-${key}-${v}`} className="rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-gray-800 shadow-sm">
                            {v}
                          </span>
                        )),
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-gray-700">
                    <p className="mb-3 font-medium text-gray-800">Consejos de navegación rápida</p>
                    <ul className="list-disc space-y-2 pl-5">
                      <li>Guardá tus combinaciones favoritas en la configuración y reutilizalas desde las chips destacadas.</li>
                      <li>Usá el generador automático como punto de partida y luego refiná el prompt con tus propias notas.</li>
                      <li>Si trabajás con capítulos largos, fijá las palabras objetivo para que el modelo mantenga una extensión equilibrada.</li>
                    </ul>
                  </div>
                </section>

                {promptTruncated && (
                  <p className="rounded-2xl border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    {t('promptTruncated', { limit: TOKEN_LIMIT })}
                  </p>
                )}

                {error && (
                  <p id="storyform-error" className="rounded-2xl border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="assertive">
                    {error === 'GROQ_API_KEY no configurada'
                      ? 'La clave de la API de Groq no está configurada.'
                      : error}
                  </p>
                )}
              </div>

              <aside className="flex flex-col gap-6">
                <nav
                  aria-label="Mapa de secciones"
                  className="sticky top-24 space-y-4 rounded-3xl bg-white/70 p-6 shadow-lg backdrop-blur"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Mapa interactivo</h2>
                    <p className="text-sm text-gray-600">
                      Saltá entre las secciones clave sin perder el foco en el contenido que ya completaste.
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {sections.map(({ id, label, description }) => (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => handleScrollTo(id)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            activeSection === id
                              ? 'border-transparent bg-accent text-black shadow'
                              : 'border-black/10 bg-white/80 text-gray-800 hover:border-black/30 hover:bg-white'
                          }`}
                        >
                          <span className="block text-sm font-semibold">{label}</span>
                          <span className="block text-xs text-gray-600">{description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="rounded-3xl bg-white/70 p-6 shadow-lg backdrop-blur">
                  <h3 className="text-lg font-semibold text-gray-900">Recomendaciones para simplificar</h3>
                  <ul className="mt-4 space-y-3 text-sm text-gray-700">
                    <li>
                      Anclá tu modo creativo favorito desde Configuración avanzada para no reconfigurarlo en cada sesión.
                    </li>
                    <li>
                      Divide los ajustes en dos pasadas: primero géneros y tono, luego estructura. Así mantenés cada decisión enfocada.
                    </li>
                    <li>
                      Activá el mapa interactivo cuando vuelvas a la página: conserva tu progreso y te deja retomar donde lo dejaste.
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="rounded-3xl bg-white/70 p-4 shadow-xl backdrop-blur">
            {storyConfig && (
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
          </div>
        )}
      </div>

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
              targetWords: cfg.ajustes.targetWords ?? DEFAULT_TARGET_WORDS,
            },
          };
          setConfig(normalized);
          setOpen(false);
        }}
      />
    </main>
  );
}