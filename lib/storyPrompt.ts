import { loadApiLocale } from "./apiLocale";

export async function buildSystemPrompt(language: string): Promise<string> {
  const { system } = await loadApiLocale(language);
  return Object.values(system).join("\n");
}

export type BuildUserMessageArgs = {
  text: string;
  chosenOption?: string | number | null;
  optionsCount: number;
  targetWords?: number;
  metaBlock?: string | null;
  language: string;
  genres?: string[];
};

export async function buildUserMessage({
  text,
  chosenOption,
  optionsCount,
  targetWords,
  metaBlock,
  language,
  genres,
}: BuildUserMessageArgs): Promise<string> {
  const locale = await loadApiLocale(language);
  const chosen = (chosenOption ?? "") + "";
  const lines: string[] = [text.trim()];
  if (genres && genres.length > 0 && locale.genreLine) {
    lines.push("", locale.genreLine.replace("{genres}", genres.join(", ")));
  }
  const userLine = locale.user.continue
    .replace("{option}", chosen)
    .replace("{options}", optionsCount + "");
  lines.push("", userLine);
  if (typeof targetWords === "number") {
    // Sugerencia suave al modelo; el SYSTEM dicta cómo usarlo vía [META].
  }
  let content = lines.join("\n");
  if (metaBlock && metaBlock.trim().length > 0) {
    content += `\n\n[META]\n${metaBlock}\n[/META]`;
  }
  return content;
}
