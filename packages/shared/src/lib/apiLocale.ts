import fs from "fs/promises";
import path from "path";

export type ApiLocale = {
  system: Record<string, string>;
  user: Record<string, string>;
  genreLine?: string;
};

const cache = new Map<string, ApiLocale>();

export async function loadApiLocale(language: string): Promise<ApiLocale> {
  const localePattern = /^[A-Za-z0-9_-]+$/;
  const parts = typeof language === "string" ? language.split("-") : [];
  const rawCandidates = [language, parts[0], "neutral"];
  const candidates = rawCandidates.filter(
    (loc): loc is string => !!loc && localePattern.test(loc)
  );
  for (const loc of candidates) {
    if (cache.has(loc)) {
      return cache.get(loc)!;
    }
    const file = path.join(
      process.cwd(),
      "public",
      "locales",
      loc,
      "api.json"
    );
    try {
      const data = await fs.readFile(file, "utf8");
      const json = JSON.parse(data) as ApiLocale;
      cache.set(loc, json);
      return json;
    } catch {
      // ignore and try next
    }
  }
  throw new Error("API locale not found");
}
