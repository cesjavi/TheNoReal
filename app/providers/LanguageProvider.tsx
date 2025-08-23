'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';

interface LangContext {
  locale: string;
  setLocale: (locale: string) => void;
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

const DEFAULT_LOCALE = 'es';

const LanguageContext = createContext<LangContext>({ locale: DEFAULT_LOCALE, setLocale: () => {} });
export const useLanguage = () => useContext(LanguageContext);

function baseOf(tag: string) {
  return (tag || '').toLowerCase().split('-')[0];
}

function normalizeLocale(tag: string) {
  const lower = (tag || '').toLowerCase();
  const full = SUPPORTED.find(l => l.toLowerCase() === lower);
  if (full) return full;
  const base = baseOf(lower);
  const baseMatch = SUPPORTED.find(l => l.toLowerCase() === base);
  return baseMatch || DEFAULT_LOCALE;
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);

  // Pick initial locale from the browser but normalize it
  useEffect(() => {
    const initial = typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE;
    setLocale(normalizeLocale(initial));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoaded(false);

      // Try: full tag -> base -> default
      const full = locale;
      const base = baseOf(locale);
      const candidates = Array.from(new Set([full, base, DEFAULT_LOCALE]));

      async function tryFetch(loc: string) {
        const res = await fetch(`/locales/${loc}/messages.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Missing messages for ${loc}`);
        return res.json();
      }

      for (const candidate of candidates) {
        try {
          const data = await tryFetch(candidate);
          if (!cancelled) {
            setMessages(data);
            setLoaded(true);
            // keep user's selected locale
            if (!cancelled) setLocale(candidate);
          }
          return;
        } catch {
          // continue to next candidate
        }
      }

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
