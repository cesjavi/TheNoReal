import fs from "fs/promises";
import path from "path";

export type ApiLocale = {
  system: Record<string, string>;
  user: Record<string, string>;
  genreLine?: string;
};

const cache = new Map<string, ApiLocale>();

export async function loadApiLocale(language: string): Promise<ApiLocale> {
  const parts = typeof language === "string" ? language.split("-") : [];
  const candidates = [language, parts[0], "neutral"].filter(Boolean) as string[];
  for (const loc of candidates) {
    if (cache.has(loc)) {
      return cache.get(loc)!;
    }
    const file = path.join(process.cwd(), "public", "locales", loc, "api.json");
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
