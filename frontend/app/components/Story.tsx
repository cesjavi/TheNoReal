'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Estilo, Ajustes } from '@thenoreal/shared'
import { useLanguage } from '../providers/LanguageProvider';
import { resolveLanguagePreference } from '@thenoreal/shared'
import { resolveApiUrl } from '@/utils/api';
import { coerceStoryPayload } from '@/utils/storyPayload';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

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

// Helper function para manejar peticiones en web y nativo
async function apiRequest(url: string, options: {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}) {
  // Si estamos en plataforma nativa (Android/iOS), usar CapacitorHttp
  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.request({
        url,
        method: options.method,
        headers: options.headers,
        data: options.body ? JSON.parse(options.body) : undefined,
      });
      
      // Simular la interfaz de fetch Response
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => {
          const { data } = response;
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (error) {
              console.warn('CapacitorHttp JSON parse error:', error);
              return data;
            }
          }
          return data;
        },
      };
    } catch (error) {
      console.error('CapacitorHttp error:', error);
      throw error;
    }
  } else {
    // En web, usar fetch normal
    const response = await fetch(url, options);
    return response;
  }
}

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

  const actualChapters = useMemo(
    () => Math.max(chapters.length - 1, 0),
    [chapters.length]
  );

  const progress = useMemo(() => {
    const denom = chaptersCount ?? Math.max(actualChapters, 1);
    if (denom === 0) return 0;
    return Math.min(100, Math.round((actualChapters / denom) * 100));
  }, [actualChapters, chaptersCount]);

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
    const shouldFinalizeNext =
      typeof chaptersCount === 'number' && chaptersCount > 0 && currentChapter + 1 >= chaptersCount;
    const optionsLimit = shouldFinalizeNext ? 0 : optionsPerDecision;

    try {
      const nextChapter = currentChapter + 1;
      const { creatividad, topP, ...restAjustes } = ajustes;
      const ajustesPayload = { ...restAjustes, temperature: creatividad, top_p: topP };

      const response = await apiRequest(resolveApiUrl('story'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: nextStory,
          option,
          optionsPerDecision: optionsLimit,
          genres,
          estilo,
          ajustes: ajustesPayload,
          language,
          endingMode,
          chaptersCount,
          chapterIndex: nextChapter,
          ...(shouldFinalizeNext ? { finalize: true } : {}),
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

      const { story: newStory, options: newOptions, isFinal } = coerceStoryPayload(data, optionsLimit);

      const imageUrl: string | null = null;

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
              const optRes = await apiRequest(resolveApiUrl('options'), {
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
          if (chaptersCount && nextChapter >= chaptersCount) end = true;
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

      const response = await apiRequest(resolveApiUrl('story'), {
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
          endingMode,
          chaptersCount,
          chapterIndex: currentChapter + 1,
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
      const { story: finalText } = coerceStoryPayload(data, 0);

      const imageUrl: string | null = null;

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
    <div className="relative overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-accent/10 via-white to-white" />
      <div className="pointer-events-none absolute -right-14 top-32 -z-10 h-48 w-48 rounded-full bg-gradient-to-br from-accent/20 via-transparent to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-64 -z-10 h-52 w-52 rounded-full bg-gradient-to-br from-purple-200/30 via-transparent to-transparent blur-3xl" />

      <div className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-accent/10 sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-600">
                {t('immersiveExperience')}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Historia interactiva
              </h1>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-inner sm:p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent sm:h-14 sm:w-14">
                <span className="text-2xl" aria-hidden>
                  ✨
                </span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  {t('progress')}
                </p>
                <p className="text-lg font-semibold">
                  Cap. {actualChapters}
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
                  className="rounded-full border border-accent/40 bg-accent/5 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
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
        <div className="relative space-y-6 pl-5 sm:space-y-8 sm:pl-7">
          <div className="absolute left-2 top-4 bottom-6 w-px bg-gradient-to-b from-accent/60 via-slate-300/50 to-transparent sm:left-3" />
          {chapters.map(({ texto, imageUrl }, idx) => {
            const isPrompt = idx === 0;
            const displayLabel = isPrompt ? t('promptLabel') : idx;

            return (
              <article
                key={idx}
                className="relative ml-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-accent/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:ml-8"
              >
                <div className="absolute left-0 top-8 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-accent/40 bg-white text-sm font-semibold text-accent shadow-md sm:-left-8 sm:translate-x-0">
                  {displayLabel}
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

                <div className="space-y-4 px-5 py-6 sm:px-6 sm:py-7">
                  {idx > 0 && (
                    <p className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-0.5 select-none text-lg text-accent/80">↳</span>
                      <span className="italic text-slate-700">&ldquo;{choices[idx - 1]}&rdquo;</span>
                    </p>
                  )}

                  {/* Texto del capítulo */}
                  <div className="prose max-w-none leading-relaxed">
                    <p className="whitespace-pre-line text-base text-slate-900">{texto}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {(() => {
                      const speakLabel = isReading ? t('reading.stop') : t('reading.read');
                      return (
                        <button
                          type="button"
                          onClick={() => handleSpeak(texto)}
                          className={`group inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${
                            isReading
                              ? 'border-transparent text-white shadow-lg hover:brightness-105 focus-visible:ring-accent/60'
                              : 'border-accent/40 bg-white text-slate-900 hover:border-accent/60 hover:bg-accent/10 focus-visible:ring-accent/30'
                          }`}
                          style={
                            isReading
                              ? {
                                  backgroundColor: 'var(--accent-dark)',
                                  borderColor: 'var(--accent-dark)',
                                }
                              : undefined
                          }
                          aria-label={speakLabel}
                          aria-pressed={isReading}
                        >
                          <span
                            aria-hidden
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-colors ${
                              isReading ? 'bg-white/20 text-white' : 'bg-accent/10 text-accent'
                            }`}
                          >
                            {isReading ? '⏹️' : '🔊'}
                          </span>
                          <span className="tracking-wide">{speakLabel}</span>
                        </button>
                      );
                    })()}
                </div>
              </div>
            </article>
          );
          })}
        </div>

        {/* Opciones */}
        {options.length > 0 && (
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-accent/10 sm:mt-12 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
              {t('chooseContinuation')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {options.map((opt, idx) => (
                <button
                  key={`${idx}-${opt}`}
                  onClick={() => handleSelect(opt)}
                  disabled={loading || finalized}
                  className="group relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-white via-slate-50 to-accent/10 px-4 py-4 text-left text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg disabled:opacity-60"
                >
                  <span className="absolute right-4 top-4 text-xs font-semibold text-accent/70">
                    #{idx + 1}
                  </span>
                  <span className="block font-semibold text-slate-900">{opt}</span>
                  <span className="mt-2 block text-xs text-slate-600">
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
          <div className="mt-8 rounded-3xl border border-accent/60 bg-white p-5 text-sm font-semibold text-slate-900 shadow-lg shadow-accent/15">
            {t('finalized')}
          </div>
        )}

        {/* Barra de acciones sticky */}
        <div className="sticky bottom-6 mt-10">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-3xl border border-accent/20 bg-white/90 p-3 shadow-2xl shadow-accent/10 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:flex-nowrap">
            <button
              onClick={handleBack}
              disabled={loading}
              className="flex-1 rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 sm:flex-none"
            >
              {t('back')}
            </button>
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-none">
              <button
                onClick={handleDownload}
                disabled={loading}
                className="flex-1 rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 sm:flex-none"
              >
                {t('download')}
              </button>
              <button
                onClick={handleFinalize}
                disabled={loading || finalized}
                className="flex-1 rounded-2xl border border-accent/40 bg-white px-5 py-2 text-sm font-semibold text-gray-900 shadow-md transition-transform hover:-translate-y-0.5 hover:border-accent/70 hover:bg-accent/10 hover:shadow-lg disabled:opacity-60 sm:flex-none"
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
            <div className="animate-pulse rounded-full border border-accent/30 bg-white/90 px-3 py-1 text-xs text-slate-700 backdrop-blur">
              {regeneratingOptions ? t('regeneratingOptions') : t('generating')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
