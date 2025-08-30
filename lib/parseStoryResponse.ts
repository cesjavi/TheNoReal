export type ParseResult = {
  story: string;
  options: string[];
  isFinal: boolean;
};

export type ParseResultStrict = ParseResult & {
  errors: string[];
  diagnostics: string[];
};

function countWords(s: string): number {
  const m = s.match(/[\p{L}\p{N}]+/gu);
  return m ? m.length : 0;
}

function normalizeRaw(raw: string): { text: string; trailingBlankLines: boolean } {
  const replaced = (raw || "").replace(/\r\n?/g, "\n");
  const trailingBlankLines = /\n\s*$/.test(replaced);
  return { text: replaced.trimEnd(), trailingBlankLines };
}

function splitStoryAndOptionsNormalized(
  text: string,
): {
  story: string;
  optionsBlock: string | null;
  separatorLine: string | null;
} {
  const lines = text.split("\n");
  const idx = lines.findIndex(l => l.trim() === "---");
  if (idx === -1) return { story: text.trim(), optionsBlock: null, separatorLine: null };
  const story = lines.slice(0, idx).join("\n").trimEnd();
  const optionsBlock = lines.slice(idx + 1).join("\n").trimEnd();
  return { story, optionsBlock, separatorLine: lines[idx] };
}

function extractOptions(block: string): {
  options: string[];
  diagnostics: string[];
} {
  const lines = block.split("\n");
  const options: string[] = [];
  const diagnostics: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      options.push(numbered[1].trim());
      continue;
    }
    if (/^\s*[-*]/.test(line)) {
      diagnostics.push("option line uses markdown bullet");
    } else {
      diagnostics.push("unrecognized option line");
    }
  }
  return { options, diagnostics };
}

export function parseStoryResponseStrict(
  raw: string,
  optionsPerDecision: number,
  optionMinWords?: number,
  optionMaxWords?: number,
): ParseResultStrict {
  const errors: string[] = [];
  const diagnostics: string[] = [];

  const { text: normalized, trailingBlankLines } = normalizeRaw(raw);
  if (trailingBlankLines) diagnostics.push("trailing blank lines");
  if (/`{3}|^\s*[-*#]/m.test(normalized)) diagnostics.push("markdown hints");

  if (!isFinal && optionsBlock) {
    const optLines = optionsBlock.split(/\r?\n/);
    const { valid } = validateOptions(optLines, optionsPerDecision);
    options = valid;
  }

  const { story, optionsBlock, separatorLine } = splitStoryAndOptionsNormalized(working);

  let options: string[] = [];
  if (!isFinal && optionsPerDecision > 0) {
    if (!optionsBlock) {
      errors.push("missing options separator");
    } else {
      if (separatorLine !== "---") {
        errors.push("separator must be --- on its own line");
      }
      const { options: extracted, diagnostics: optDiag } = extractOptions(optionsBlock);
      options = extracted;
      diagnostics.push(...optDiag);
      if (options.length !== optionsPerDecision) {
        errors.push(`expected ${optionsPerDecision} options but got ${options.length}`);
      }
      if (optionMinWords !== undefined || optionMaxWords !== undefined) {
        const min = optionMinWords ?? 0;
        const max = optionMaxWords ?? Infinity;
        options.forEach((opt, i) => {
          const words = countWords(opt);
          if (optionMinWords !== undefined && words < min) {
            errors.push(`option ${i + 1} has fewer than ${min} words`);
          }
          if (optionMaxWords !== undefined && words > max) {
            errors.push(`option ${i + 1} has more than ${max} words`);
          }
        });
      }
    }
  } else if (isFinal && optionsBlock) {
    errors.push("final response should not contain separator");
  }

  return {
    story: story.trim(),
    options: options.map(o => o.trim()),
    isFinal,
    errors,
    diagnostics,
  };
}

export function parseStoryResponse(
  text: string,
  optionsPerDecision: number,
): ParseResult;
export function parseStoryResponse(
  text: string,
  optionsPerDecision: number,
  optionMinWords?: number,
  optionMaxWords?: number,
): ParseResult;
export function parseStoryResponse(
  text: string,
  optionsPerDecision: number,
  optionMinWords?: number,
  optionMaxWords?: number,
): ParseResult {
  const { story, options, isFinal } = parseStoryResponseStrict(
    text,
    optionsPerDecision,
    optionMinWords,
    optionMaxWords,
  );
  return { story, options, isFinal };
}

