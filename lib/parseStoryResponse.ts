import { validateOptions, OptionDiscard } from "./optionGuard";

export type ParseResult = {
  story: string;
  options: string[];
  isFinal: boolean;
};

export type ParseStrictResult = ParseResult & {
  diagnostics: string[];
  errors: string[];
  discarded: OptionDiscard[];
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

export function parseStoryResponseStrict(
  text: string,
  optionsPerDecision: number,
  optionMinWords = 8,
  optionMaxWords = 56,
): ParseStrictResult {
  const diagnostics: string[] = [];
  const errors: string[] = [];

  const raw = text || "";

  if (/\n\s*$/.test(raw)) diagnostics.push("trailing blank lines");
  if (/#/.test(raw)) diagnostics.push("contains #");
  if (/```/.test(raw)) diagnostics.push("contains ```");
  if (/\*\*/.test(raw) || /_/.test(raw))
    diagnostics.push("contains markdown formatting");

  const linesAll = raw.split(/\r?\n/);
  const finalIdx = linesAll.findIndex(l => l.trim().toUpperCase() === "FINALIZADO");
  if (finalIdx !== -1 && linesAll.slice(finalIdx + 1).every(l => !l.trim())) {
    const story = linesAll.slice(0, finalIdx).join("\n").trim();
    return {
      story,
      options: [],
      isFinal: true,
      diagnostics,
      errors: [],
      discarded: [],
    };
  }

  let bodyLines = linesAll;
  let sepIdx = bodyLines.findIndex(l => l.includes("---"));
  if (sepIdx !== -1 && bodyLines[sepIdx].trim() !== "---") {
    diagnostics.push("separator with extra text");
    sepIdx = -1;
  }

  let storyLines: string[];
  let optionLines: string[];

  if (sepIdx === -1) {
    storyLines = bodyLines;
    optionLines = [];
  } else {
    storyLines = bodyLines.slice(0, sepIdx);
    optionLines = bodyLines.slice(sepIdx + 1);
  }

  const story = storyLines.join("\n").trim();
  const parsedOptions: string[] = [];
  optionLines.forEach((line, i) => {
    if (!line.trim()) return;
    const m = line.match(/^\s*\d+\.\s+(.+?)\s*$/);
    if (m) parsedOptions.push(m[1]);
    else diagnostics.push(`invalid option line ${i + 1}`);
  });

  const { valid, discarded } = validateOptions(
    parsedOptions,
    optionsPerDecision,
    optionMinWords,
    optionMaxWords,
  );

  discarded.forEach(d => errors.push(`${d.option}: ${d.reason}`));

  if (valid.length < optionsPerDecision)
    errors.push(`expected ${optionsPerDecision} options, got ${valid.length}`);
  if (parsedOptions.length > optionsPerDecision)
    errors.push(`too many options (${parsedOptions.length})`);

  return {
    story,
    options: valid,
    isFinal: false,
    diagnostics,
    errors,
    discarded,
  };
}
