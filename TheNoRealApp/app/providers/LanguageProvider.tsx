import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import en from '../../../public/locales/en/messages.json';
import es from '../../../public/locales/es/messages.json';
import en from '../locales/en/messages.json';
import es from '../locales/es/messages.json';

const MESSAGES: Record<string, any> = { en, es };

type Locale = 'en' | 'es';
type Messages = Record<string, string>;

const flattenMessages = (nestedMessages: Record<string, any>, prefix = ''): Messages => {
  return Object.keys(nestedMessages).reduce((messages: Messages, key) => {
    const value = nestedMessages[key];
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      messages[prefixedKey] = value;
    } else {
      Object.assign(messages, flattenMessages(value, prefixedKey));
    }
    return messages;
  }, {});
};

const translations: Record<Locale, Messages> = {
  en: flattenMessages(en),
  es: flattenMessages(es),
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>('en');
  const messages = useMemo(() => translations[locale], [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <IntlProvider locale={locale} messages={messages}>
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;
