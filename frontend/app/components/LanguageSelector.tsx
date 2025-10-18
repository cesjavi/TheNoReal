'use client';

import { useLanguage, SUPPORTED } from '../providers/LanguageProvider';

// Derivamos el tipo Locale desde SUPPORTED
type Locale = typeof SUPPORTED[number];

const LANGS = SUPPORTED.map((code) => ({ code, label: code }));

function isLocale(v: string): v is Locale {
  return (SUPPORTED as readonly string[]).includes(v);
}

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const selectId = 'language-select';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.currentTarget.value;
    if (isLocale(v)) setLocale(v);
  };

  return (
    <div className="inline-flex items-center gap-2">
      {/* Label visible o oculto: cualquiera sirve para accesibilidad */}
      <label htmlFor={selectId} className="sr-only">
        Idioma
      </label>
      <select
        id={selectId}
        name="language"
        aria-label="Idioma"        // con esto ya cumple, aunque el label también lo hace
        value={locale}
        onChange={handleChange}
        className="p-2 border rounded"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
