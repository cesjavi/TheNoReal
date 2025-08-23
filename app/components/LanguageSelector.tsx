'use client';

import { useLanguage, SUPPORTED } from '../providers/LanguageProvider';

const LANGS = SUPPORTED.map(code => ({ code, label: code }));

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className="p-2 border rounded"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
