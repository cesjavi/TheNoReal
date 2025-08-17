'use client';

import { useState } from 'react';

interface StoryProps {
  /** Texto inicial de la historia */
  initialStory: string;
  /** Opciones iniciales para continuar la historia */
  initialOptions: string[];
}

/**
 * Componente que renderiza una historia interactiva.
 * Muestra el texto actual y un conjunto de botones para continuarla.
 * Al seleccionar una opción se consulta la API de Groq y se actualiza el estado.
 */
export default function Story({ initialStory, initialOptions }: StoryProps) {
  const [story, setStory] = useState(initialStory);
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (option: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ story, option }),
      });
      const data = await response.json();
      const text = data.text || '';
      const lines = text.split('\n').filter(Boolean);
      const [newStory, ...newOptions] = lines;

      setStory((prev) => `${prev}\n\n${newStory}`);
      setOptions(newOptions.length > 0 ? newOptions : []);
    } catch (error) {
      console.error('Error al consultar la API de Groq', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="whitespace-pre-line">{story}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={loading}
            className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

