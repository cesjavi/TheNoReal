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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const initial = navigator.language?.split('-')[0] || 'es';
    setLocale(initial);
  }, []);

  useEffect(() => {
    setLoaded(false);
    fetch(`/locales/${locale}/messages.json`)
      .then(res => res.json())
      .then(setMessages)
      .catch(() => setMessages({}))
      .finally(() => setLoaded(true));
  }, [locale]);

  if (!loaded || Object.keys(messages).length === 0) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone={timeZone}
      >
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}
