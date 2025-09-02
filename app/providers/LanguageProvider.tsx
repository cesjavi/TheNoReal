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

  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoaded(false);

      // Calculamos el "resolved" en base al locale actual
      // e intentamos cargar en orden: full -> base -> default
      const full = locale;
      const base = baseOf(locale);
      const candidates = Array.from(new Set([full, base as Locale, DEFAULT_LOCALE]));

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

          // Si candidate resolvió distinto al actual, actualizamos locale una sola vez
          if (candidate !== locale) {
            setLocale(candidate);
          }

          setMessages(data);
          setLoaded(true);
          return;
        } catch {
          // probar siguiente candidate
        }
      }

      // Si nada cargó, al menos marcamos como cargado para no bloquear el render
      if (!cancelled) {
        setMessages({});
        setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!loaded) return null;

  const timeZone =
    (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}
