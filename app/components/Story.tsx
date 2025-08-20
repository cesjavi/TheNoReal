'use client';

import { useState } from 'react';
import { generateImage } from '@/lib/imageGenerator';
import type { Estilo, Ajustes } from '@/types/story';
//import { useRouter } from 'next/router';

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
  /** Estilo deseado para la historia */
  estilo: Estilo;
  /** Ajustes adicionales de generación */
  ajustes: Ajustes;
  /** Acción a ejecutar al volver al formulario inicial */
  onBack: () => void;
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
  estilo,
  ajustes,
  onBack,
}: StoryProps) {
  const [chapters, setChapters] = useState<Chapter[]>([
    { texto: initialStory, imageUrl: null },
  ]);
  const [choices, setChoices] = useState<string[]>([]);
  const [options, setOptions] = useState(
    Array.from(new Set(initialOptions)).slice(0, optionsPerDecision)
  );
  const [loading, setLoading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  //const router = useRouter();
  const [isReading, setIsReading] = useState(false);

  const handleSpeak = (text: string) => {
    if (isReading || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
      setIsReading(true);
    }
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
      const { creatividad, topP, ...restAjustes } = ajustes;
      const ajustesPayload = {
        ...restAjustes,
        temperature: creatividad,
        top_p: topP,
      };
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story: nextStory,
          option,
          optionsPerDecision,
          genres,
          estilo,
          ajustes: ajustesPayload,
        }),
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

      let opts = Array.from(new Set(newOptions.filter(Boolean)))
        .slice(0, optionsPerDecision);
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

      setOptions(opts as string[]);
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
    onBack();
  };

  const handleDownload = () => {
    const fullStory = chapters
      .map((c, idx) =>
        idx === 0 ? c.texto : `> ${choices[idx - 1]}\n\n${c.texto}`
      )
      .join('\n\n');
    const blob = new Blob([fullStory], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historia.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {chapters.map(({ texto, imageUrl }, idx) => (
        <div key={idx} className="space-y-4">
          {idx > 0 && (
            <p className="whitespace-pre-line">&gt; {choices[idx - 1]}</p>
          )}
          <p className="whitespace-pre-line">{texto}</p>
          <button
            onClick={() => handleSpeak(texto)}
            className="rounded-lg bg-accent text-white px-4 py-2 hover:bg-accent-dark transition-colors"
          >
            {isReading ? 'Parar' : 'Leer'}
          </button>          
        </div>
      ))}
      <div className="flex flex-col gap-2 rounded-lg">
        <div className="flex gap-2">
          <button
            onClick={handleBack}
            disabled={loading}
            className="rounded-lg bg-accent text-white px-4 py-2 disabled:opacity-50 hover:bg-accent-dark transition-colors"
          >
            Finalizar
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="rounded-lg bg-accent text-white px-4 py-2 disabled:opacity-50 hover:bg-accent-dark transition-colors"
          >
            Descargar historia
          </button>
        </div>
        {options.map((opt, idx) => (
          <button
            key={`${idx}-${opt}`} // <- clave única
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

