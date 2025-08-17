"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [numOptions, setNumOptions] = useState(1);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, numOptions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error generating options");
        setOptions([]);
        return;
      }
      setOptions(data.options || []);
    } catch (err) {
      console.error(err);
      setError("Error connecting to the API");
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center p-8 gap-4">
      <textarea
        className="border p-2 w-full max-w-xl"
        placeholder="Escribe tu pregunta"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <label htmlFor="numOptions">Número de opciones:</label>
        <input
          id="numOptions"
          type="number"
          min={1}
          max={5}
          value={numOptions}
          onChange={(e) => setNumOptions(Number(e.target.value))}
          className="border p-1 w-20"
        />
      </div>
      <button
        onClick={generate}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {loading ? "Generando..." : "Generar"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
      <ul className="list-disc mt-4">
        {options.map((o, i) => (
          <li key={i}>{o}</li>
        ))}
      </ul>
    </main>
  );
}

