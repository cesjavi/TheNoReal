'use client';

import { useLanguage } from '../providers/LanguageProvider';
import { IDIOMAS } from './StorySettings';

const LANGS = IDIOMAS.map(code => ({ code, label: code }));

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value.slice(0, 2))}
      className="p-2 border rounded"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code.slice(0, 2)}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
