const DEFAULT_LANGUAGE = 'es';

const toArray = <T,>(value: T | T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : value == null ? [] : [value];

/**
 * Normalizes any BCP-47-ish locale string to its lowercase base language code.
 */
export function normalizeLocale(locale: string | null | undefined): string {
  const raw = (locale ?? DEFAULT_LANGUAGE).trim();
  if (!raw) return DEFAULT_LANGUAGE;
  const primary = raw.toLowerCase().split('-')[0];
  return primary || DEFAULT_LANGUAGE;
}

/**
 * Resolves the language that should be sent to the API taking into account
 * explicit overrides and the UI locale as fallback.
 */
export function resolveLanguagePreference(options: {
  forced?: string | string[] | null;
  locale?: string | null;
  fallbackLanguage?: string | null;
}): string {
  const { forced, locale, fallbackLanguage } = options;
  const candidates = [
    ...toArray(forced).filter((value) => typeof value === 'string' && value.trim().length > 0),
    locale,
    fallbackLanguage,
    DEFAULT_LANGUAGE,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized) return normalized;
  }

  return DEFAULT_LANGUAGE;
}

export { DEFAULT_LANGUAGE };
