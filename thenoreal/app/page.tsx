'use client';

import { useState } from "react";

type Option = {
  text: string;
  next: string;
};

type Scene = {
  text: string;
  options?: Option[];
};

const story: Record<string, Scene> = {
  start: {
    text: "Te despiertas en un bosque misterioso. ¿Qué haces?",
    options: [
      { text: "Caminar hacia la luz", next: "light" },
      { text: "Explorar la oscuridad", next: "dark" },
    ],
  },
  light: {
    text: "Encuentras un pueblo tranquilo.",
    options: [
      { text: "Hablar con los aldeanos", next: "end" },
      { text: "Continuar tu viaje", next: "end" },
    ],
  },
  dark: {
    text: "Una criatura aparece y te asusta.",
    options: [
      { text: "Huir", next: "end" },
      { text: "Enfrentarte a la criatura", next: "end" },
    ],
  },
  end: {
    text: "La aventura termina aquí.",
  },
};

const initialScene = story.start;

export default function Home() {
  const [history, setHistory] = useState<string[]>([initialScene.text]);
  const [options, setOptions] = useState<Option[]>(initialScene.options ?? []);

  const handleOption = (option: Option) => {
    const nextScene = story[option.next];
    setHistory((h) => [...h, option.text, nextScene.text]);
    setOptions(nextScene.options ?? []);
  };

  const resetAdventure = () => {
    setHistory([initialScene.text]);
    setOptions(initialScene.options ?? []);
  };

  return (
    <main className="p-8">
      <section className="mb-4 space-y-2">
        {history.map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </section>

      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt.text}
            onClick={() => handleOption(opt)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {opt.text}
          </button>
        ))}
        {options.length === 0 && (
          <p className="italic">No hay más opciones.</p>
        )}
      </div>

      <button
        onClick={resetAdventure}
        className="mt-6 underline text-sm text-blue-700"
      >
        Reiniciar
      </button>
    </main>
  );
}

