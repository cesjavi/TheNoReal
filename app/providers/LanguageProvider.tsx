'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';

interface LangContext {
  locale: string;
  setLocale: (locale: string) => void;
}

const LanguageContext = createContext<LangContext>({ locale: 'es', setLocale: () => {} });
export const useLanguage = () => useContext(LanguageContext);

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('es');
  const [messages, setMessages] = useState<Record<string, any>>({});

  useEffect(() => {
    const initial = navigator.language?.split('-')[0] || 'es';
    setLocale(initial);
  }, []);

  useEffect(() => {
    fetch(`/locales/${locale}/messages.json`)
      .then(res => res.json())
      .then(setMessages)
      .catch(() => setMessages({}));
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}
