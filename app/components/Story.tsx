'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { generateImage } from '@/lib/imageGenerator';
import { parseStoryResponse } from '@/lib/parseStoryResponse';
import type { Estilo, Ajustes } from '@/types/story';
import { useLanguage } from '../providers/LanguageProvider';

interface StoryProps {
  initialStory: string;
  initialOptions: string[];
  optionsPerDecision: number;
  endingMode: 'capitulos' | 'final_sorpresa' | 'sin_final_definido' | 'infinita';
  chaptersCount?: number;
  genres: string[];
  estilo: Estilo;
  ajustes: Ajustes;
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
  const t = useTranslations('Story');
  const { locale } = useLanguage();
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
  const [isReading, setIsReading] = useState(false);
  const [finalized, setFinalized] = useState(false);

  const totalPlanned = chaptersCount ?? Math.max(chapters.length, 3);
  const progress = useMemo(() => {
    // Progreso aproximado (si no hay chaptersCount, usa longitud actual)
    const denom = chaptersCount ? chaptersCount : Math.max(chapters.length, 1);
    return Math.min(100, Math.round((chapters.length / denom) * 100));
  }, [chapters.length, chaptersCount]);

  const handleSpeak = (text: string) => {
    if (isReading || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.lang === locale) ?? voices[0];

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = locale;
      }

      utterance.rate = 1.0;
      utterance.onend = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
      setIsReading(true);
    }
  };

  const handleSelect = async (option: string) => {
    if (loading || finalized) return;
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
      .map((c, idx) => (idx === 0 ? c.texto : `> ${choices[idx - 1]}\n\n${c.texto}`))
      .join('\n\n');
    const nextStory = `${currentStory}\n> ${option}`;

    try {
      const nextChapter = currentChapter + 1;
      const { creatividad, topP, ...restAjustes } = ajustes;
      const ajustesPayload = { ...restAjustes, temperature: creatividad, top_p: topP };

      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: nextStory,
          option,
          optionsPerDecision,
          genres,
          estilo,
          ajustes: ajustesPayload,
          language: locale,
        }),
      });

      const data = await response.json();
      const text = (data.text as string) || '';
      const { story: newStory, options: newOptions } = parseStoryResponse(
        text,
        optionsPerDecision
      );

      let imageUrl: string | null = null;
      /*try {
        const { url } = await generateImage(newStory, genres);
        imageUrl = url;
      } catch (err) {
        console.error('No se pudo generar la imagen', err);
      }*/

      setChapters((prev) => [...prev, { texto: newStory, imageUrl }]);
      setChoices((prev) => [...prev, option]);
      setCurrentChapter(nextChapter);

      let opts = Array.from(new Set(newOptions.filter(Boolean)));
      if (opts.length < optionsPerDecision) {
        console.error(
          'La API devolvió menos opciones de las esperadas'
        );
      }
      opts = opts.slice(0, optionsPerDecision);

      let end = false;
      if (endingMode === 'capitulos') {
        if (chaptersCount && nextChapter > chaptersCount) end = true;
      } else if (endingMode === 'final_sorpresa') {
        const SURPRISE_ENDING_PROBABILITY = 0.1;
        if ((chaptersCount && nextChapter > chaptersCount) || Math.random() < SURPRISE_ENDING_PROBABILITY) {
          end = true;
        }
      } else if (endingMode === 'infinita') {
        // no termina por contador
      } else if (endingMode === 'sin_final_definido') {
        // termina de forma variable (se respeta la salida del modelo)
      }

      if (end) {
        opts = [];
        setFinalized(true);
      }

      setOptions(opts as string[]);
    } catch (error) {
      console.error('Error al consultar la API de Groq', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (loading || finalized) return;
    setLoading(true);

    const currentStory = chapters
      .map((c, idx) => (idx === 0 ? c.texto : `> ${choices[idx - 1]}\n\n${c.texto}`))
      .join('\n\n');

    try {
      const { creatividad, topP, ...restAjustes } = ajustes;
      const ajustesPayload = { ...restAjustes, temperature: creatividad, top_p: topP };

      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: currentStory,
          option: '',
          optionsPerDecision: 0,
          finalize: true,
          genres,
          estilo,
          ajustes: ajustesPayload,
        }),
      });
      const data = await response.json();
      const text = (data.text as string) || '';

      let imageUrl: string | null = null;
      try {
        const { url } = await generateImage(text, genres);
        imageUrl = url;
      } catch (err) {
        console.error('No se pudo generar la imagen', err);
      }

      setChapters((prev) => [...prev, { texto: text, imageUrl }]);
      setOptions([]);
      setFinalized(true);
    } catch (error) {
      console.error('Error al consultar la API de Groq', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setChapters([{ texto: initialStory, imageUrl: null }]);
    setChoices([]);
    setOptions(initialOptions.slice(0, optionsPerDecision));
    setCurrentChapter(1);
    setHistory([]);
    setFinalized(false);
    onBack();
  };

  const handleDownload = () => {
    const fullStory = chapters
      .map((c, idx) => (idx === 0 ? c.texto : `> ${choices[idx - 1]}\n\n${c.texto}`))
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
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">
            Historia interactiva
          </h1>
          <span className="text-xs text-muted-foreground">
            Cap. {chapters.length}{chaptersCount ? ` / ${chaptersCount}` : ''}
          </span>
        </div>

        {/* Progress */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Genres */}
        {genres?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <span
                key={g}
                className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/60"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chapters */}
      <div className="space-y-6">
        {chapters.map(({ texto, imageUrl }, idx) => (
          <article
            key={idx}
            className="rounded-2xl border bg-card transition-shadow hover:[box-shadow:0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]"
            style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
          >
            {imageUrl && (
              <div className="overflow-hidden rounded-t-2xl">
                <img
                  src={imageUrl}
                  alt={`Ilustración capítulo ${idx + 1}`}
                  className="h-56 w-full object-cover"
                />
              </div>
            )}

            <div className="space-y-4 p-5">
              {idx > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="mr-2 select-none text-muted-foreground/70">↳</span>
                  <span className="italic">“{choices[idx - 1]}”</span>
                </p>
              )}

              {/* Texto del capítulo */}
              <div className="leading-relaxed prose prose-invert max-w-none">
                <p className="whitespace-pre-line">{texto}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleSpeak(texto)}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  aria-label={isReading ? t('reading.stop') : t('reading.read')}
                >
                  {isReading ? t('reading.stop') : t('reading.read')}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Opciones */}
      {options.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('chooseContinuation')}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt, idx) => (
              <button
                key={`${idx}-${opt}`}
                onClick={() => handleSelect(opt)}
                disabled={loading || finalized}
                className="group rounded-xl border px-4 py-3 text-left text-sm transition-all hover:-translate-y-0.5 hover:[box-shadow:0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] disabled:opacity-50"
                style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
              >
                <span className="block font-medium">{opt}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t('suggestion', { index: idx + 1 })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado finalizado */}
      {finalized && (
        <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {t('finalized')}
        </div>
      )}

      {/* Barra de acciones sticky */}
      <div className="sticky bottom-4 mt-10">
        <div
          className="mx-auto flex max-w-2xl items-center justify-between gap-2 rounded-2xl border bg-background/80 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          style={{
            boxShadow:
              '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
          }}
        >
          <button
            onClick={handleBack}
            disabled={loading}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            {t('back')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
              {t('download')}
            </button>
            <button
              onClick={handleFinalize}
              disabled={loading || finalized}
              className="rounded-xl bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
              style={{
                boxShadow:
                  '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
              }}
            >
              {t('finalize')}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay de carga (sutil) */}
      {loading && (
        <div
          className="fixed inset-x-0 bottom-24 flex justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <div className="animate-pulse rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow backdrop-blur">
            {t('generating')}
          </div>
        </div>
      )}
    </div>
  );
}
