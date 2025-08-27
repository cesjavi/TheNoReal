"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLanguage } from "../providers/LanguageProvider";
import Story from "./Story";
import StorySettings, {
  ConfigGeneracion,
  ESTILO_SECTIONS,
  AJUSTES_SECTIONS,
  Ajustes,
} from "./StorySettings";
import { parseStoryResponse } from "@/lib/parseStoryResponse";

type EndingMode = "capitulos" | "sin_final_definido" | "final_sorpresa" | "infinita";

const MODALITY_HELP = {
  capitulos: "Divide la historia en capítulos.",
  final_sorpresa: "Añade un giro inesperado al final.",
  final_abierto: "La historia queda abierta a interpretación.",
  final_cerrado: "La historia tiene un desenlace definido.",
  sin_final_definido: "La historia no tiene un final predeterminado.",
  infinita: "La historia continúa indefinidamente.",
} as const;

type Modality = keyof typeof MODALITY_HELP;

const GENRES = [
  "Aventura",
  "Ciencia ficción",
  "Terror",
  "Fantasía",
  "Misterio",
  "Romance",
  "Comedia",
] as const;

const GENRE_ICONS: Record<string, string> = {
  Aventura: "/icons/aventura.svg",
  "Ciencia ficción": "/icons/ciencia-ficcion.svg",
  Terror: "/icons/terror.svg",
  Fantasía: "/icons/fantasia.svg",
  Misterio: "/icons/misterio.svg",
  Romance: "/icons/romance.svg",
  Comedia: "/icons/comedia.svg",
};

const TOKEN_LIMIT = 500;

/** Helpers */
function countTokens(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const toArray = <T,>(v: T | T[] | undefined | null): T[] =>
  Array.isArray(v) ? v : v == null ? [] : [v];
const isNonEmptyArray = (v: unknown): v is unknown[] =>
  Array.isArray(v) && v.length > 0;
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const normalizeLocale = (loc: string) =>
  (loc || "es").toLowerCase().split("-")[0];

const defaults: ConfigGeneracion = {
  generos: [],
  estilo: { tono: [], ritmo: [], voz: [], tiempo: [], formato: [], descripcion: [], dialogo: [], matiz: [] },
  ajustes: {
    publico: [], epoca: [], ambito: [], estructura: [], incluir: [], evitar: [], clasificacion: [], idioma: [], registro: [],
    creatividad: 0.75, topP: 0.9, opcionesPorCapitulo: [],
    targetWords: 220,
  },
};

export default function StoryForm() {
  const t = useTranslations("StoryForm");
  const { locale } = useLanguage();

  const [userPrompt, setUserPrompt] = useState<string>("");  
  const [prompt, setPrompt] = useState("");
  const [tokenCount, setTokenCount] = useState(0);
  const [numOptions, setNumOptions] = useState(2);
  const [modality, setModality] = useState<Modality>("capitulos");
  const [chapters, setChapters] = useState("3");
  const [targetWords, setTargetWords] = useState<number>(220);
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

  const showChapters = modality === "capitulos" || modality === "final_sorpresa";

  const toggleGenre = (genre: string) => {
    setConfig((prev) => ({
      ...prev,
      generos: prev.generos.includes(genre)
        ? prev.generos.filter((g) => g !== genre)
        : [...prev.generos, genre],
    }));
  };

  const clearGenres = () => setConfig((prev) => ({ ...prev, generos: [] }));

  const randomizeConfig = () => {
    const genero = randomPick([...GENRES]);
    const estilo = ESTILO_SECTIONS.reduce(
      (acc, { key, options }) => {
        acc[key] = [randomPick(options)];
        return acc;
      },
      {} as ConfigGeneracion["estilo"]
    );
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

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setInitialStory(null);
    setInitialOptions([]);

    try {
      const trimmed = prompt.trim();
      if (!trimmed) {
        setError("El inicio no puede estar vacío");
        setLoading(false);
        return;
      }

      // Permitir que el usuario fije N opciones desde Configuración (ajustes.opcionesPorCapitulo)
      const opcionesCfg = Number((config.ajustes as any)?.opcionesPorCapitulo?.[0]);
      const optionsPerDecision = clamp(opcionesCfg || (Number(numOptions) || 2), 2, 6);

      const requiresChapters = modality === "capitulos" || modality === "final_sorpresa";
      const chaptersNum = requiresChapters ? Number(chapters) : undefined;

      if (requiresChapters && (!chaptersNum || chaptersNum < 1)) {
        setError("Ingresá un número de capítulos válido (>= 1)");
        setLoading(false);
        return;
      }

      let effectivePrompt = trimmed;
      if (tokenCount > TOKEN_LIMIT) {
        const words = trimmed.split(/\s+/).filter(Boolean).slice(0, TOKEN_LIMIT);
        effectivePrompt = words.join(" ");
        setPromptTruncated(true);
      }
      setUserPrompt(effectivePrompt);

      const final: EndingMode = (() => {
        switch (modality) {
          case "final_abierto":
            return "sin_final_definido";
          case "final_cerrado":
            return chaptersNum ? "capitulos" : "sin_final_definido";
          case "sin_final_definido":
          case "infinita":
          case "capitulos":
          case "final_sorpresa":
          default:
            return modality;
        }
      })();

      const { creatividad, topP, ...restAjustes } = config.ajustes;
      const ajustesPayload: any = {
        ...restAjustes,
        temperature: typeof creatividad === "number" ? creatividad : 0.75,
        top_p: typeof topP === "number" ? topP : 0.9,
        targetWords: targetWords,
      };

      // Si el usuario eligió un idioma en ajustes, priorizarlo (ej: "es-AR")
      const langFromCfg = toArray(config.ajustes.idioma as any)[0] as string | undefined;
      const lang = normalizeLocale(langFromCfg || locale);

      const payload = {
        story: effectivePrompt,
        option: "",
        optionsPerDecision,
        genres: config.generos,
        estilo: config.estilo,
        ajustes: ajustesPayload,
        language: lang,
        endingMode: final,
        chaptersCount: (final === "capitulos" || final === "final_sorpresa") ? chaptersNum : undefined,
        finalize: false, // dejar explícito para la API
      } as const;

      // Útil para depurar en Network tab y en logs del server
      // eslint-disable-next-line no-console
      console.log("/api/story payload", payload);

      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError((data?.error as string) || "Error al obtener la historia inicial");
      } else {
        // ✅ Compatibilidad: nueva API ({story, options}) o vieja API ({text})
        let firstChapter = "";
        let firstOptions: string[] = [];

        if (typeof data?.story === "string") {
          firstChapter = data.story || "";

          // Tipado explícito para evitar 'any'
          const rawOptsUnknown: unknown[] = Array.isArray(data.options) ? data.options : [];
          const normalized: string[] = rawOptsUnknown
            .filter((o: unknown): o is string => typeof o === "string")
            .map((o: string) => o.trim())
            .filter(Boolean);

          firstOptions = Array.from(new Set(normalized));
        } else {
          const raw: string = (data?.text as string) || "";
          const parsed = parseStoryResponse(raw, optionsPerDecision);
          firstChapter = parsed.story;
          firstOptions = parsed.options;
        }

        setInitialStory(firstChapter);
        setInitialOptions(firstOptions);
        setStoryConfig({
          optionsPerDecision,
          endingMode: final,
          chaptersCount:
            final === "capitulos" || final === "final_sorpresa" ? chaptersNum : undefined,
        });

        setPrompt("");
        setTokenCount(0);
        setNumOptions(2);
        setModality("capitulos");
        setChapters("");
      }
    } catch {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center p-8 gap-4">      
      <div className="absolute top-0 center h-160 w-150 pointer-events-auto opacity-30">
    <img src="/bg-nubes1.svg" alt="Tormenta animada" className="w-full h-full object-cover opacity-20" />
  </div>
       <div className="absolute bottom-0 left-0 w-full h-40 z-0 pointer-events-none">
    <img src="/bg-wave5.svg" alt="Barquito animado" className="w-full h-full" />
  </div>
      {!initialStory && (
        <>
          {/* 1) Texto inicial */}
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
              <span>{tokenCount}/{TOKEN_LIMIT} tokens</span>
              {tokenCount >= TOKEN_LIMIT && (<span className="text-red-600">Límite alcanzado</span>)}
            </div>
          </div>

          {/* 2) Géneros debajo del textarea */}
          <div className="w-full max-w-xl rounded-lg border border-black/30 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GENRES.map((genre) => {
                const selected = config.generos.includes(genre as any);
                return (
                  <button
                    key={genre as any}
                    type="button"
                    aria-pressed={selected ? "true" : "false"}
                    onClick={() => toggleGenre(genre as any)}
                    title={selected ? "Quitar género" : "Agregar género"}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${
                      selected ? "bg-accent text-black border-black/40 shadow-inner"
                              : "bg-white/40 hover:bg-white/70 border-black/20 hover:border-black/40"}`}
                  >
                    <img src={GENRE_ICONS[genre as any] ?? "/icons/generico.svg"} alt="" className="w-6 h-6" />
                    <span className="truncate">{genre as any}</span>
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
                {t("randomize")}
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
                      onClick={() => toggleGenre(genre as any)}
                      className="inline-flex items-center gap-2 rounded-full border border-black/30 bg-accent/90 px-3 py-1 text-sm text-black hover:bg-accent"
                      title="Quitar"
                    >
                      <img src={GENRE_ICONS[genre] ?? "/icons/generico.svg"} alt="" className="h-4 w-4" />
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
            {loading ? t("sending") : t("createStory")}
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
                onChange={(e) => setModality(e.target.value as Modality)}
                className="p-2 border rounded-lg border-black/30 hover:border-black/60 focus:ring-2 focus:ring-accent"
              >
                <option value="capitulos">Capítulos</option>
                <option value="final_sorpresa">Final sorpresa</option>
                <option value="final_abierto">Final abierto</option>
                <option value="final_cerrado">Final cerrado</option>
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
                  required={modality === "capitulos"}
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
                onChange={(e) => setTargetWords(Math.max(80, Math.min(600, Number(e.target.value) || 220)))}
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
                <span key={`genero-${genre}`} className="px-2 py-1 text-sm rounded-full bg-accent text-black">{genre}</span>
              ))}

              {Object.entries(config.estilo).flatMap(([key, values]) =>
                toArray(values as string[]).map((v) => (
                  <span key={`estilo-${key}-${v}`} className="px-2 py-1 text-sm rounded-full bg-accent text-black">{v}</span>
                )),
              )}

              {Object.entries(config.ajustes).flatMap(([key, values]) =>
                toArray(values as string[]).map((v) => (
                  <span key={`ajuste-${key}-${v}`} className="px-2 py-1 text-sm rounded-full bg-accent text-black">{v}</span>
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

      {promptTruncated && <p className="text-yellow-600">{t("promptTruncated", { limit: TOKEN_LIMIT })}</p>}

      {error && (
        <p className="text-red-500">
          {error === "GROQ_API_KEY no configurada" ? "La clave de la API de Groq no está configurada." : error}
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
          setTargetWords(normalized.ajustes.targetWords ?? 220);
          setOpen(false);
        }}
      />
    </main>
  );
}
