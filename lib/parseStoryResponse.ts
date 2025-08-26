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

export function parseStoryResponse(
  text: string,
  optionsPerDecision: number
): ParseResult {
  const raw = (text || '').trim();

  // Detecta "finalizado" al final, ignorando mayúsculas y minúsculas
  const finalRegex = /FINALIZADO\s*$/i;
  const isFinal = finalRegex.test(raw);

  let { story, optionsBlock } = splitStoryAndOptions(raw);
  let options: string[] = [];

  if (!isFinal) {
    const optionRegex = /^\s*\d+[.\-:)]\s+(.+?)\s*$/;
    if (!optionsBlock) {
      const lines = raw.split(/\r?\n/);
      if (lines.every(l => optionRegex.test(l))) {
        // Solo opciones, sin historia
        story = '';
        optionsBlock = raw;
      } else if (lines.length > 1 && lines.slice(1).every(l => optionRegex.test(l))) {
        // Primera línea como historia, resto opciones
        story = lines[0].trim();
        optionsBlock = lines.slice(1).join('\n');
      }
    }

    if (optionsBlock) {
      const optLines = optionsBlock.split(/\r?\n/);
      const parsed = optLines
        .map(l => {
          const m = l.match(optionRegex);
          return m ? m[1] : null;
        })
        .filter(Boolean) as string[];

      const { valid } = validateOptions(parsed, optionsPerDecision);
      options = valid;
    }
  }

  return { story, options, isFinal };
}
