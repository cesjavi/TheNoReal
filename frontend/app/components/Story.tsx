'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Estilo, Ajustes } from '@/types/story';
import { useLanguage } from '../providers/LanguageProvider';
import { resolveLanguagePreference } from '@/lib/language';
import { resolveApiUrl } from '@/utils/api';

interface StoryProps {
  userPrompt: string;
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

const OPTIONS_RETRY_TIMEOUT_MS = 15_000;

export default function Story({
  userPrompt,
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
  const initialChapters = useMemo(
    () => [
      { texto: userPrompt, imageUrl: null },
      { texto: initialStory, imageUrl: null },
    ],
    [initialStory, userPrompt]
  );
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [choices, setChoices] = useState<string[]>([]);
  const sanitizedInitialOptions = useMemo(
    () => Array.from(new Set(initialOptions)).slice(0, optionsPerDecision),
    [initialOptions, optionsPerDecision]
  );
  const [options, setOptions] = useState(sanitizedInitialOptions);
  const [loading, setLoading] = useState(false);
  const [regeneratingOptions, setRegeneratingOptions] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [isReading, setIsReading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setChapters(initialChapters);
    setChoices([]);
    setCurrentChapter(1);
    setFinalized(false);
    setError(null);
  }, [initialChapters]);

  useEffect(() => {
    setOptions(sanitizedInitialOptions);
  }, [sanitizedInitialOptions]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const language = useMemo(
    () => resolveLanguagePreference({ forced: ajustes.idioma, locale }),
    [ajustes.idioma, locale]
  );

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
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const snapshot: HistoryEntry = {
      chapters: chapters.map((c) => ({ ...c })),
      options: [...options],
      currentChapter,
      choices: [...choices],
    };

    const currentStory = chapters
      .map((c, idx) => (idx === 0 ? c.texto : `> ${choices[idx - 1]}\n\n${c.texto}`))
      .join('\n\n');
    const nextStory = `${currentStory}\n> ${option}`;

    try {
      const nextChapter = currentChapter + 1;
      const { creatividad, topP, ...restAjustes } = ajustes;
      const ajustesPayload = { ...restAjustes, temperature: creatividad, top_p: topP };

      const response = await fetch(resolveApiUrl('story'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: nextStory,
          option,
          optionsPerDecision,
          genres,
          estilo,
          ajustes: ajustesPayload,
          language,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        let message = 'Error al consultar la API de Groq';
        if (data && typeof (data as { error?: unknown }).error === 'string') {
          message = (data as { error: string }).error;
        }
        throw new Error(message);
      }

      const {
        story: newStory = '',
        options: newOptions = [],
        isFinal = false,
      } = data as { story?: string; options?: string[]; isFinal?: boolean };

      const imageUrl: string | null = null;
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

      if (!isFinal) {
        const MAX_RETRIES = 3;
        let attempts = 0;
        const deadline = Date.now() + OPTIONS_RETRY_TIMEOUT_MS;

        if (opts.length < optionsPerDecision) {
          setRegeneratingOptions(true);
          try {
            while (
              opts.length < optionsPerDecision &&
              attempts < MAX_RETRIES &&
              Date.now() < deadline
            ) {
              attempts++;
              const missing = optionsPerDecision - opts.length;
              const optRes = await fetch(resolveApiUrl('options'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: nextStory,
                  numOptions: missing,
                  temperature: ajustesPayload.temperature,
                  top_p: ajustesPayload.top_p,
                }),
                signal: controller.signal,
              });

              const optData = await optRes.json().catch(() => ({}));
              if (!optRes.ok) {
                let message = 'Error al regenerar opciones';
                if (optData && typeof (optData as { error?: unknown }).error === 'string') {
                  message = (optData as { error: string }).error;
                }
                throw new Error(message);
              }

              const extra = Array.from(
                new Set(((optData as { options?: string[] }).options ?? []).filter(Boolean))
              );
              opts = Array.from(new Set([...opts, ...extra]));
            }
          } finally {
            setRegeneratingOptions(false);
          }
        }

        if (opts.length < optionsPerDecision) {
          setError((prev) => prev ?? 'La API devolvió menos opciones de las esperadas');
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
          // depende del modelo
        }

        if (end) {
          setFinalized(true);
          setOptions([]);
        } else {
          setOptions(opts);
        }
      } else {
        setOptions([]);
        setFinalized(true);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error al consultar la API de Groq', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al continuar la historia. Inténtalo de nuevo.';
      setError(message);
      setChapters(snapshot.chapters);
      setChoices(snapshot.choices);
      setOptions(snapshot.options);
      setCurrentChapter(snapshot.currentChapter);
    } finally {
      setLoading(false);
      setRegeneratingOptions(false);
    }
  };

  const handleFinalize = async () => {
    if (loading || finalized) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const currentStory = chapters
      .map((c, idx) => (idx === 0 ? c.texto : `> ${choices[idx - 1]}\n\n${c.texto}`))
      .join('\n\n');

    try {
      const { creatividad, topP, ...restAjustes } = ajustes;
      const ajustesPayload = { ...restAjustes, temperature: creatividad, top_p: topP };

      const response = await fetch(resolveApiUrl('story'), {
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
          language,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        let message = 'Error al consultar la API de Groq';
        if (data && typeof (data as { error?: unknown }).error === 'string') {
          message = (data as { error: string }).error;
        }
        throw new Error(message);
      }
      const finalText = (data.story as string) || '';

      const imageUrl: string | null = null;
      /*try {
        const { url } = await generateImage(finalText, genres);
        imageUrl = url;
      } catch (err) {
        console.error('No se pudo generar la imagen', err);
      }*/

      setChapters((prev) => [...prev, { texto: finalText, imageUrl }]);
      setOptions([]);
      setFinalized(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error al consultar la API de Groq', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al finalizar la historia. Inténtalo de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    abortControllerRef.current?.abort();
    setChapters(initialChapters);
    setChoices([]);
    setOptions(sanitizedInitialOptions);
    setCurrentChapter(1);
    setFinalized(false);
    setError(null);
    setRegeneratingOptions(false);
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
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-accent/20 via-background to-background" />
      <div className="pointer-events-none absolute -right-10 top-32 -z-10 h-56 w-56 rounded-full bg-gradient-to-br from-accent/10 via-transparent to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-10 top-64 -z-10 h-60 w-60 rounded-full bg-gradient-to-br from-purple-300/30 via-transparent to-transparent blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 overflow-hidden rounded-3xl border bg-background/70 p-6 shadow-xl shadow-accent/10 backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t('immersiveExperience')}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Historia interactiva
              </h1>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border bg-card/60 p-4 shadow-inner">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <span className="text-2xl" aria-hidden>
                  ✨
                </span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('progress')}
                </p>
                <p className="text-lg font-semibold">
                  Cap. {chapters.length}
                  {chaptersCount ? ` / ${chaptersCount}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent via-accent/80 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Genres */}
          {genres?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-accent/40 bg-accent/5 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 rounded-2xl border border-red-200/70 bg-red-50/90 p-4 text-sm text-red-800 shadow-sm"
          >
            {error}
          </div>
        )}

        {/* Chapters */}
        <div className="relative space-y-8 pl-6">
          <div className="absolute left-2 top-4 bottom-6 w-px bg-gradient-to-b from-accent/60 via-muted-foreground/20 to-transparent" />
          {chapters.map(({ texto, imageUrl }, idx) => (
            <article
              key={idx}
              className="relative ml-4 overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-lg shadow-accent/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="absolute -left-8 top-8 flex h-8 w-8 items-center justify-center rounded-full border border-accent/40 bg-background text-sm font-semibold text-accent shadow-md">
                {idx + 1}
              </div>
              {imageUrl ? (
                <div className="overflow-hidden rounded-b-[2.2rem]">
                  <img
                    src={imageUrl}
                    alt={`Ilustración capítulo ${idx + 1}`}
                    className="h-56 w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="space-y-4 px-6 py-7">
                {idx > 0 && (
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 select-none text-lg text-accent/80">↳</span>
                    <span className="italic">“{choices[idx - 1]}”</span>
                  </p>
                )}

                {/* Texto del capítulo */}
                <div className="prose prose-invert max-w-none leading-relaxed">
                  <p className="whitespace-pre-line text-base text-foreground/90">{texto}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleSpeak(texto)}
                    className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-background/70 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    aria-label={isReading ? t('reading.stop') : t('reading.read')}
                  >
                    <span aria-hidden>🔊</span>
                    {isReading ? t('reading.stop') : t('reading.read')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Opciones */}
        {options.length > 0 && (
          <div className="mt-12 rounded-3xl border bg-background/80 p-6 shadow-lg shadow-accent/10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t('chooseContinuation')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((opt, idx) => (
                <button
                  key={`${idx}-${opt}`}
                  onClick={() => handleSelect(opt)}
                  disabled={loading || finalized}
                  className="group relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-background via-background to-accent/5 px-4 py-4 text-left text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg disabled:opacity-60"
                >
                  <span className="absolute right-4 top-4 text-xs font-semibold text-accent/70">
                    #{idx + 1}
                  </span>
                  <span className="block font-semibold text-foreground/90">{opt}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {t('suggestion', { index: idx + 1 })}
                  </span>
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent 55%)' }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estado finalizado */}
        {finalized && (
          <div className="mt-8 rounded-3xl border border-accent/30 bg-accent/10 p-5 text-sm text-accent shadow-inner">
            {t('finalized')}
          </div>
        )}

        {/* Barra de acciones sticky */}
        <div className="sticky bottom-6 mt-12">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-3xl border border-accent/20 bg-background/80 p-3 shadow-2xl shadow-accent/10 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <button
              onClick={handleBack}
              disabled={loading}
              className="rounded-2xl border border-border/60 px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              {t('back')}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={loading}
                className="rounded-2xl border border-border/60 px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                {t('download')}
              </button>
              <button
                onClick={handleFinalize}
                disabled={loading || finalized}
                className="rounded-2xl bg-gradient-to-r from-accent to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
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
            <div className="animate-pulse rounded-full border border-accent/30 bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              {regeneratingOptions ? t('regeneratingOptions') : t('generating')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
