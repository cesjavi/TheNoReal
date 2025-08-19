'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateImage } from '@/lib/imageGenerator';

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
  /** Géneros seleccionados para la historia */
  genres: string[];
}

interface Chapter {
  texto: string;
  imageUrl: string | null;
}

interface HistoryEntry {
  chapters: Chapter[];
  options: string[];
  currentChapter: number;
  choices: string[];
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
  genres,
}: StoryProps) {
  const [chapters, setChapters] = useState<Chapter[]>([
    { texto: initialStory, imageUrl: null },
  ]);
  const [choices, setChoices] = useState<string[]>([]);
  const [options, setOptions] = useState(
    initialOptions.slice(0, optionsPerDecision)
  );
  const [loading, setLoading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const router = useRouter();
  const [isReading, setIsReading] = useState(false);

  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSelect = async (option: string) => {
    setLoading(true);
    setHistory((prev) => [
      ...prev,
      {
        chapters: chapters.map((c) => ({ ...c })),
        options,
        currentChapter,
        choices: [...choices],
      },
    ]);

    const currentStory = chapters
      .map((c, idx) =>
        idx === 0 ? c.texto : `> ${choices[idx - 1]}\n\n${c.texto}`
      )
      .join('\n\n');
    const nextStory = `${currentStory}\n> ${option}`;

    try {
      const nextChapter = currentChapter + 1;
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ story: nextStory, option, optionsPerDecision, genres }),
      });
      const data = await response.json();
      const text = data.text || '';
      const lines = text.split('\n').filter(Boolean);
      const [newStory, ...newOptions] = lines;

      let imageUrl: string | null = null;
      let promptTruncated = false;
      try {
        const { url, truncated } = await generateImage(newStory, genres);
        imageUrl = url;
        promptTruncated = truncated;
        if (promptTruncated) {
          console.warn('El prompt para la imagen fue truncado a 77 tokens');
        }
      } catch (err) {
        console.error('Error al generar la imagen, No se pudo generar la imagen', err);
      }

      setChapters((prev) => [...prev, { texto: newStory, imageUrl }]);
      setChoices((prev) => [...prev, option]);
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
    // Limpieza de estado antes de redirigir
    setChapters([{ texto: initialStory, imageUrl: null }]);
    setChoices([]);
    setOptions(initialOptions.slice(0, optionsPerDecision));
    setCurrentChapter(1);
    setHistory([]);
    router.push('/');
  };

  return (
    <div className="space-y-4">
      {chapters.map(({ texto, imageUrl }, idx) => (
        <div key={idx} className="space-y-4">
          <p className="whitespace-pre-line">{texto}</p>
          <button
            onClick={() => handleSpeak(texto)}
            className="rounded-lg bg-accent text-white px-4 py-2 hover:bg-accent-dark transition-colors"
          >
            Leer
          </button>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={`Imagen generada ${idx + 1}`}
              className="mt-4 rounded-lg border border-black/30"
            />
          )}
        </div>
      ))}
      <div className="flex flex-col gap-2 rounded-lg">
        <button
          onClick={handleBack}
          disabled={loading}
          className="rounded-lg bg-accent text-white px-4 py-2 disabled:opacity-50 hover:bg-accent-dark transition-colors"
        >
          Volver al inicio
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

