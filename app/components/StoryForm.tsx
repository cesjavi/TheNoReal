'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLanguage } from '../providers/LanguageProvider';
import Story from './Story';
import StorySettings, {
  ConfigGeneracion,
  ESTILO_SECTIONS,
  AJUSTES_SECTIONS,
} from './StorySettings';
import { parseStoryResponse } from '@/lib/parseStoryResponse';

type EndingMode = 'capitulos' | 'sin_final_definido' | 'final_sorpresa' | 'infinita';

const MODALITY_HELP = {
  capitulos: 'Divide la historia en capítulos.',
  final_sorpresa: 'Añade un giro inesperado al final.',
  final_abierto: 'La historia queda abierta a interpretación.',
  final_cerrado: 'La historia tiene un desenlace definido.',
} as const;

type Modality = keyof typeof MODALITY_HELP;

const GENRES = [
  'Aventura',
  'Ciencia ficción',
  'Terror',
  'Fantasía',
  'Misterio',
  'Romance',
  'Comedia',
];

const TOKEN_LIMIT = 500;

function countTokens(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Helpers seguros */
const toArray = <T,>(v: T | T[] | undefined | null): T[] =>
  Array.isArray(v) ? v : v == null ? [] : [v];

const isNonEmptyArray = (v: unknown): v is unknown[] => Array.isArray(v) && v.length > 0;

const defaults: ConfigGeneracion = {
  generos: [],
  estilo: {
    tono: [],
    ritmo: [],
    voz: [],
    tiempo: [],
    formato: [],
    descripcion: [],
    dialogo: [],
    matiz: [],
  },
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
    creatividad: 0.9,
    topP: 0.95,
    opcionesPorCapitulo: [],
  },
};

export default function StoryForm() {
  const t = useTranslations('StoryForm');
  const { locale } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [numOptions, setNumOptions] = useState(2);
  const [modality, setModality] = useState<Modality>('capitulos');
  const [chapters, setChapters] = useState('3');
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

  const resetStory = () => {
    setInitialStory(null);
    setInitialOptions([]);
    setStoryConfig(null);
  };

  const showChapters = modality === 'capitulos' || modality === 'final_sorpresa';

  const toggleGenre = (genre: string) => {
    setConfig((prev) => ({
      ...prev,
      generos: prev.generos.includes(genre)
        ? prev.generos.filter((g) => g !== genre)
        : [...prev.generos, genre],
    }));
  };

  const clearGenres = () =>
    setConfig((prev) => ({
      ...prev,
      generos: [],
    }));

  const randomizeConfig = () => {
    const genero = randomPick(GENRES);
    const estilo = ESTILO_SECTIONS.reduce((acc, { key, options }) => {
      acc[key] = [randomPick(options)];
      return acc;
    }, {} as ConfigGeneracion['estilo']);

    const ajustes = AJUSTES_SECTIONS.reduce((acc, { key, options }) => {
      (acc as any)[key] = [randomPick(options)];
      return acc;
    }, {} as ConfigGeneracion['ajustes']);

    setConfig({ generos: [genero], estilo, ajustes });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setInitialStory(null);
    setInitialOptions([]);
    try {
      if (tokenCount > TOKEN_LIMIT) {
        setError(`El prompt supera el límite de ${TOKEN_LIMIT} tokens`);
        return;
      }
      // mapear la modalidad del select al valor que espera el backend
      const final: EndingMode = (() => {
        switch (modality) {
          case 'final_abierto':
            return 'sin_final_definido';
          case 'final_cerrado':
            return chapters ? 'capitulos' : 'sin_final_definido';
          default:
            return modality; // 'capitulos' | 'final_sorpresa'
        }
      })();

      const ajustesPayload = (() => {
        const { creatividad, topP, ...rest } = config.ajustes;
        return { ...rest, temperature: creatividad, top_p: topP };
      })();

      const payload: Record<string, unknown> = {
        prompt,
        opciones_por_decision: Number(numOptions),
        final,
        genres: config.generos,
        estilo: config.estilo,
        ajustes: ajustesPayload,
        ...((final === 'capitulos' || final === 'final_sorpresa') && chapters
          ? { capitulos: Number(chapters) }
          : {}),
      };

      console.log('POST /api/stories payload =>', payload);
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if ((data as { truncated?: boolean }).truncated) setPromptTruncated(true);
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Error al crear la historia');
      } else {
        const storyRes = await fetch('/api/story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            story: prompt,
            option: '',
            optionsPerDecision: Number(numOptions),
            genres: config.generos,
            estilo: config.estilo,
            ajustes: ajustesPayload,
            language: locale,
          }),
        });
        const storyData = await storyRes.json().catch(() => ({}));
        if ((storyData as { truncated?: boolean }).truncated) setPromptTruncated(true);
        if (!storyRes.ok) {
          setError((storyData as { error?: string }).error || 'Error al obtener la historia inicial');
        } else {
          const text: string = (storyData as { text?: string }).text || '';
          const { story, options } = parseStoryResponse(text, Number(numOptions));
          setInitialStory(story);
          setInitialOptions(options);
          setStoryConfig({
            optionsPerDecision: Number(numOptions),
            endingMode: final,
            chaptersCount:
              (final === 'capitulos' || final === 'final_sorpresa') && chapters
                ? Number(chapters)
                : undefined,
          });
          setPrompt('');
          setTokenCount(0);
          setNumOptions(2);
          setModality('capitulos');
          setChapters('');
        }
      }
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center p-8 gap-4">
      {!initialStory && (
        <>
          <div className="flex flex-col w-full max-w-xl">
            <textarea
              className="w-full p-2 border border-black/30 hover:border-black/60 rounded-lg focus:ring-2 focus:ring-accent"
              placeholder="Escribe el inicio de la historia"
              value={prompt}
              onChange={(e) => {
                const value = e.target.value;
                setPrompt(value);
                setTokenCount(countTokens(value));
                setPromptTruncated(false);
              }}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {tokenCount}/{TOKEN_LIMIT} tokens
              </span>
              {tokenCount >= TOKEN_LIMIT && (
                <span className="text-red-600">Límite alcanzado</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="numOptions">Opciones por decisión:</label>
            <input
              id="numOptions"
              type="number"
              min={2}
              value={numOptions}
              onChange={(e) => setNumOptions(Number(e.target.value))}
              className="w-20 p-1 border border-black/30 hover:border-black/60 rounded-lg focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col w-full max-w-xl gap-2">
            <label htmlFor="modality">Modalidad de final:</label>
            <select
              id="modality"
              value={modality}
              onChange={(e) => setModality(e.target.value as Modality)}
              className="p-2 border rounded-lg border-black/30 hover:border-black/60 focus:ring-2 focus:ring-accent"
            >
              <option value="capitulos">Capítulos</option>
              <option value="final_sorpresa">Final sorpresa</option>
              <option value="final_abierto">Final abierto</option>
              <option value="final_cerrado">Final cerrado</option>
            </select>
            <p className="text-sm text-gray-600">{MODALITY_HELP[modality]}</p>
          </div>

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

          <button
            type="button"
            data-testid="btn-configuracion"
            onClick={() => setOpen(true)}
            className="self-start px-2 py-1 text-sm rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark"
          >
            Configuración
          </button>

          <div className="flex flex-wrap gap-2 max-w-xl" />

          <div className="flex flex-col gap-2 p-4 border border-black/30 rounded-lg max-w-xl w-full">
            {GENRES.map((genre) => (
              <label key={genre} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.generos.includes(genre)}
                  onChange={() => toggleGenre(genre)}
                />
                {genre}
              </label>
            ))}
            <div className="flex gap-2 mt-2">
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
            </div>
          </div>

          {(config.generos.length > 0 ||
            Object.values(config.estilo).some(isNonEmptyArray) ||
            Object.values(config.ajustes).some(isNonEmptyArray)) && (
            <div className="flex flex-wrap gap-2 max-w-xl">
              {config.generos.map((genre) => (
                <span
                  key={`genero-${genre}`}
                  className="px-2 py-1 text-sm rounded-full bg-accent text-black"
                >
                  {genre}
                </span>
              ))}

              {Object.entries(config.estilo).flatMap(([key, values]) =>
                toArray(values as string[]).map((v) => (
                  <span
                    key={`estilo-${key}-${v}`}
                    className="px-2 py-1 text-sm rounded-full bg-accent text-black"
                  >
                    {v}
                  </span>
                )),
              )}

              {Object.entries(config.ajustes).flatMap(([key, values]) =>
                toArray(values as string[]).map((v) => (
                  <span
                    key={`ajuste-${key}-${v}`}
                    className="px-2 py-1 text-sm rounded-full bg-accent text-black"
                  >
                    {v}
                  </span>
                )),
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || tokenCount > TOKEN_LIMIT}
            className="px-4 py-2 rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            {loading ? t('sending') : t('createStory')}
          </button>
        </>
      )}

      {initialStory && storyConfig && (
        <Story
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
        <p className="text-yellow-600">
          {t('promptTruncated', { limit: TOKEN_LIMIT })}
        </p>
      )}

      {error && (
        <p className="text-red-500">
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
          // Normalización al guardar: arrays garantizados donde corresponde
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
              // Escalares se copian tal cual:
              lugar: cfg.ajustes.lugar,
              longitudPalabras: cfg.ajustes.longitudPalabras,
              creatividad: cfg.ajustes.creatividad,
              topP: cfg.ajustes.topP,
              semilla: cfg.ajustes.semilla,
              consistenciaSaga: cfg.ajustes.consistenciaSaga,
              estiloVisual: cfg.ajustes.estiloVisual,
              paleta: cfg.ajustes.paleta,
            },
          };
          setConfig(normalized);
          setOpen(false);
        }}
      />
    </main>
  );
}
