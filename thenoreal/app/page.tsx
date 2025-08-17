"use client";

import { useState } from "react";

const MODALITY_HELP: Record<string, string> = {
  capitulos: "Divide la historia en capítulos.",
  final_sorpresa: "Añade un giro inesperado al final.",
  final_abierto: "La historia queda abierta a interpretación.",
  final_cerrado: "La historia tiene un desenlace definido.",
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [numOptions, setNumOptions] = useState(2);
  const [modality, setModality] = useState<keyof typeof MODALITY_HELP>("capitulos");
  const [chapters, setChapters] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const showChapters =
    modality === "capitulos" || modality === "final_sorpresa";

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          numOptions,
          modality,
          ...(showChapters && chapters
            ? { chapters: Number(chapters) }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Error al crear la historia");
      } else {
        setMessage("Historia creada correctamente");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center p-8 gap-4">
      <textarea
        className="border p-2 w-full max-w-xl"
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
          className="border p-1 w-20"
        />
      </div>
      <div className="flex flex-col w-full max-w-xl gap-2">
        <label htmlFor="modality">Modalidad de final:</label>
        <select
          id="modality"
          value={modality}
          onChange={(e) => setModality(e.target.value as keyof typeof MODALITY_HELP)}
          className="border p-2"
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
            className="border p-1 w-20"
          />
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {loading ? "Enviando..." : "Crear historia"}
      </button>
      {message && <p className="text-green-600">{message}</p>}
      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}

