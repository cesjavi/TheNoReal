import { validateOptions } from "./optionGuard";

export type ParseResult = {
  story: string;
  options: string[];
  isFinal: boolean;
};

// Split exacto por línea '---'.
function splitStoryAndOptions(text: string): { story: string; optionsBlock: string | null } {
  const lines = (text || "").split(/\r?\n/);
  const idx = lines.findIndex(l => l.trim() === "---");
  if (idx === -1) return { story: text.trim(), optionsBlock: null };
  const story = lines.slice(0, idx).join("\n").trim();
  const optionsBlock = lines.slice(idx + 1).join("\n");
  return { story, optionsBlock };
}

export function parseStoryResponse(text: string, optionsPerDecision: number): ParseResult {
  const raw = (text || "").trim();

  // Detecta final por palabra EXACTA al final
  const finalRegex = /FINALIZADO\s*$/i;
  const isFinal = finalRegex.test(raw);

  const { story, optionsBlock } = splitStoryAndOptions(raw);
  let options: string[] = [];

  if (!isFinal && optionsBlock) {
    const optLines = optionsBlock.split(/\r?\n/);
    const parsed = optLines
      .map(l => {
        const m = l.match(/^\s*\d+\.\s+(.+?)\s*$/);
        return m ? m[1] : null;
      })
      .filter(Boolean) as string[];

    const { valid } = validateOptions(parsed, optionsPerDecision);
    options = valid;
  }

  return { story, options, isFinal };
}
