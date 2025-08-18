"use client";

import { useState } from "react";
import Story from "./components/Story";

type EndingMode =
  | "capitulos"
  | "sin_final_definido"
  | "final_sorpresa"
  | "infinita";

const MODALITY_HELP = {
  capitulos: "Divide la historia en capítulos.",
  final_sorpresa: "Añade un giro inesperado al final.",
  final_abierto: "La historia queda abierta a interpretación.",
  final_cerrado: "La historia tiene un desenlace definido.",
} as const;

type Modality = keyof typeof MODALITY_HELP;

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [numOptions, setNumOptions] = useState(2);
  const [modality, setModality] = useState<Modality>("capitulos");
  const [chapters, setChapters] = useState("");
  const [genres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialStory, setInitialStory] = useState<string | null>(null);
  const [initialOptions, setInitialOptions] = useState<string[]>([]);
  const [storyConfig, setStoryConfig] = useState<{
    optionsPerDecision: number;
    endingMode: EndingMode;
    chaptersCount?: number;
  } | null>(null);

  const showChapters =
    modality === "capitulos" || modality === "final_sorpresa";

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setInitialStory(null);
    setInitialOptions([]);
    try {
      // mapear la modalidad del select al valor que espera el backend
      const final: EndingMode = (() => {
        switch (modality) {
          case "final_abierto":
            return "sin_final_definido";
          case "final_cerrado":
            return chapters ? "capitulos" : "sin_final_definido";
          default:
            return modality; // 'capitulos' | 'final_sorpresa'
        }
      })();

      const payload: any = {
        prompt,
        opciones_por_decision: Number(numOptions),
        final,
        ...((final === "capitulos" || final === "final_sorpresa") && chapters
          ? { capitulos: Number(chapters) }
          : {}),
      };

      console.log("POST /api/stories payload =>", payload);      
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Error al crear la historia");
      } else {
        const storyRes = await fetch("/api/story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            story: prompt,
            option: "",
            optionsPerDecision: Number(numOptions),
            genres,
          }),
        });
        const storyData = await storyRes.json().catch(() => ({}));
        if (!storyRes.ok) {
          setError(storyData.error || "Error al obtener la historia inicial");
        } else {
          const text: string = storyData.text || "";
          const lines = text.split("\n").filter(Boolean);
          const [first, ...opts] = lines;
          setInitialStory(first || "");
          setInitialOptions(opts.slice(0, Number(numOptions)));
          setStoryConfig({
            optionsPerDecision: Number(numOptions),
            endingMode: final,
            chaptersCount:
              (final === "capitulos" || final === "final_sorpresa") && chapters
                ? Number(chapters)
                : undefined,
          });
          setPrompt("");
          setNumOptions(2);
          setModality("capitulos");
          setChapters("");
        }
      }
    } catch {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="flex flex-col items-center p-8 gap-4">
      {!initialStory && (
        <>
          <textarea
            className="w-full max-w-xl p-2 border border-black/30 hover:border-black/60 rounded-lg focus:ring-2 focus:ring-accent"
            placeholder="Escribe el inicio de la historia"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
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
                required={modality === "capitulos"}
                value={chapters}
                onChange={(e) => setChapters(e.target.value)}
                className="w-20 p-1 border border-black/30 hover:border-black/60 rounded-lg focus:ring-2 focus:ring-accent"
              />
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Crear historia"}
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
          genres={genres}
        />
      )}
      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}

