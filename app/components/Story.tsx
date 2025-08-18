'use client';

import { useState } from 'react';

interface StoryProps {
  /** Texto inicial de la historia */
  initialStory: string;
  /** Opciones iniciales para continuar la historia */
  initialOptions: string[];
  /** Número de opciones a generar por decisión */
  optionsPerDecision: number;
  /** Modo de finalización de la historia */
  endingMode: 'capitulos' | 'final_sorpresa' | 'sin_final_definido' | 'infinita';
  /** Número máximo de capítulos (opcional) */
  chaptersCount?: number;
}

interface HistoryEntry {
  story: string;
  options: string[];
  currentChapter: number;
}

/**
 * Componente que renderiza una historia interactiva.
 * Muestra el texto actual y un conjunto de botones para continuarla.
 * Al seleccionar una opción se consulta la API de Groq y se actualiza el estado.
 */
export default function Story({
  initialStory,
  initialOptions,
  optionsPerDecision,
  endingMode,
  chaptersCount,
}: StoryProps) {
  const [story, setStory] = useState(initialStory);
  const [options, setOptions] = useState(
    initialOptions.slice(0, optionsPerDecision)
  );
  const [loading, setLoading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const handleSelect = async (option: string) => {
    setLoading(true);
    setHistory((prev) => [
      ...prev,
      { story, options, currentChapter },
    ]);
    setStory((prev) => `${prev}\n> ${option}`);
    try {
      const nextChapter = currentChapter + 1;
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ story, option, optionsPerDecision }),
      });
      const data = await response.json();
      const text = data.text || '';
      const lines = text.split('\n').filter(Boolean);
      const [newStory, ...newOptions] = lines;

      setStory((prev) => `${prev}\n\n${newStory}`);
      setCurrentChapter(nextChapter);

      let opts = newOptions.slice(0, optionsPerDecision);
      let end = false;
      if (endingMode === 'capitulos') {
        if (chaptersCount && nextChapter > chaptersCount) {
          end = true;
        }
      } else if (endingMode === 'final_sorpresa') {
        const SURPRISE_ENDING_PROBABILITY = 0.1;
        if (
          (chaptersCount && nextChapter > chaptersCount) ||
          Math.random() < SURPRISE_ENDING_PROBABILITY
        ) {
          end = true;
        }
      } else if (endingMode === 'infinita') {
        // nunca termina por contador
      } else if (endingMode === 'sin_final_definido') {
        // se permite que la historia termine de forma variable
      }

      if (end) {
        opts = [];
      }

      setOptions(opts);
    } catch (error) {
      console.error('Error al consultar la API de Groq', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      setStory(last.story);
      setOptions(last.options);
      setCurrentChapter(last.currentChapter);
      return prev.slice(0, -1);
    });
  };

  return (
    <div className="space-y-4">
      <p className="whitespace-pre-line">{story}</p>
      <div className="flex flex-col gap-2 rounded-lg">
        {imageSrc && (
        <img
          src={imageSrc}
          alt="Imagen generada"
          className="mt-4 rounded-lg border border-black/30"
        />
      )}
        <button
          onClick={handleBack}
          disabled={history.length === 0 || loading}
          className="rounded-lg bg-accent text-white px-4 py-2 disabled:opacity-50 hover:bg-accent-dark transition-colors"
        >
          Volver
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={loading}
            className="rounded-lg bg-accent text-white px-4 py-2 disabled:opacity-50 hover:bg-accent-dark transition-colors"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

