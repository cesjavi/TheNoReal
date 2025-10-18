'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';

import type { AbstractIntlMessages } from 'use-intl';

type Messages = AbstractIntlMessages;

interface LangContext {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// Locales with available message bundles
export const SUPPORTED = [
  'es',
  'es-AR',
  'es-MX',
  'en',
  'en-US',
  'fr-FR',
  'neutral',
] as const;

type Locale = typeof SUPPORTED[number];
const DEFAULT_LOCALE: Locale = 'es';

const LanguageContext = createContext<LangContext>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

function baseOf(tag: string): string {
  return (tag || '').toLowerCase().split('-')[0];
}

function normalizeLocale(tag: string): Locale {
  const lower = (tag || '').toLowerCase();

  const full = SUPPORTED.find((l) => l.toLowerCase() === lower);
  if (full) return full;

  const base = baseOf(lower);
  const baseMatch = SUPPORTED.find((l) => l.toLowerCase() === base);
  return baseMatch || DEFAULT_LOCALE;
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  // Pedimos el idioma del navegador solo en cliente
  const initialRequested =
    typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE;

  const initialLocale = normalizeLocale(initialRequested);

  const [requestedLocale, setRequestedLocale] = useState<Locale>(initialLocale);
  const [resolvedLocale, setResolvedLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoaded(false);
      setLoadError(null);

      // Calculamos el "resolved" en base al locale actual
      // e intentamos cargar en orden: full -> base -> default
      const full = requestedLocale;
      const base = baseOf(requestedLocale);
      const candidates = Array.from(
        new Set<Locale>([
          full,
          SUPPORTED.find((l) => l.toLowerCase() === base) ?? DEFAULT_LOCALE,
          DEFAULT_LOCALE,
        ])
      );

      let lastError: unknown;

      async function tryFetch(loc: Locale): Promise<Messages> {
        const res = await fetch(`/locales/${loc}/messages.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Missing messages for ${loc}`);
        const json = (await res.json()) as unknown;
        return (json ?? {}) as Messages;
      }

      for (const candidate of candidates) {
        try {
          const data = await tryFetch(candidate);
          if (cancelled) return;

          setResolvedLocale(candidate);
          setMessages(data);
          setLoaded(true);
          return;
        } catch (err) {
          lastError = err;
          // probar siguiente candidate
        }
      }

      // Si nada cargó, al menos marcamos como cargado para no bloquear el render
      if (!cancelled) {
        setResolvedLocale(DEFAULT_LOCALE);
        setMessages({});
        setLoaded(true);
        setLoadError('No se pudieron cargar los mensajes de idioma. Se mostrarán textos por defecto.');
        if (lastError) {
          console.error('LanguageProvider: no se pudieron cargar los mensajes', lastError);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedLocale]);

  if (!loaded) return null;

  const timeZone =
    (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';

  const handleLocaleChange = (loc: Locale) => {
    setRequestedLocale(normalizeLocale(loc));
  };

  return (
    <LanguageContext.Provider value={{ locale: resolvedLocale, setLocale: handleLocaleChange }}>
      <NextIntlClientProvider locale={resolvedLocale} messages={messages} timeZone={timeZone}>
        {loadError && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-red-50 px-4 py-2 text-sm text-red-800"
          >
            {loadError}
          </div>
        )}
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}
