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
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            { role: 'system', content: 'Eres un generador de historias ramificadas.' },
            { role: 'user', content: `${story}\n\nOpción elegida: ${option}` },
          ],
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
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

