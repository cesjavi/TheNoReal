const CAPITULO_TAGS = ['CAPITULO', 'CAPÍTULO'] as const;
const OPCIONES_TAGS = ['OPCIONES'] as const;

export type ParseResult = {
  story: string;
  options: string[];
  isFinal: boolean;
};

export type ParseStrictResult = ParseResult & {
  diagnostics: string[];
  errors: string[];
};

function normalizeRaw(raw: string): { text: string; trailingBlankLines: number } {
  const text = (raw || '').replace(/\r\n/g, '\n');
  const match = text.match(/\n+$/);
  const trailingBlankLines = match ? match[0].split(/\n/).length - 1 : 0;
  return { text: text.trimEnd(), trailingBlankLines };
}

function splitStoryAndOptionsNormalized(text: string): {
  story: string;
  optionsBlock: string | null;
  separatorLine: string | null;
} {
  const lines = (text || '').split(/\n/);
  const idx = lines.findIndex(l => l.trim() === '---');
  if (idx === -1) return { story: text.trim(), optionsBlock: null, separatorLine: null };
  const story = lines.slice(0, idx).join('\n').trimEnd();
  const optionsBlock = lines.slice(idx + 1).join('\n').trimEnd();
  return { story, optionsBlock, separatorLine: lines[idx] };
}

function buildTagPattern(tag: string): RegExp {
  return new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/\\s*${tag}\\]`, 'i');
}

function extractTaggedSection(text: string, tags: readonly string[]): string | null {
  for (const tag of tags) {
    const pattern = buildTagPattern(tag);
    const match = pattern.exec(text);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function cleanOptionLine(line: string): string {
  let stripped = line.trim();
  if (!stripped) return '';

  stripped = stripped.replace(/^[\-\*\u2022]+\s*/, '');

  const patterns = [
    /^(?:opci[oó]n|option)\s*\d+\s*[:.\-–]\s*/i,
    /^\d+\s*[:.\-–]\s*/,
    /^\d+\s*[)\]]\s*/,
    /^\d+\.\s*/,
  ];

  for (const pattern of patterns) {
    const cleaned = stripped.replace(pattern, '');
    if (cleaned !== stripped) {
      stripped = cleaned;
      break;
    }
  }

  return stripped.trim();
}

function extractOptions(block: string): { options: string[]; diagnostics: string[] } {
  const lines = block.split('\n');
  const options: string[] = [];
  const diagnostics: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    let matched = false;

    if (/^\s*(?:opci[oó]n|option)\s*\d+\s*[:.\-–]/i.test(trimmed)) {
      const cleaned = cleanOptionLine(rawLine);
      if (cleaned) {
        options.push(cleaned);
        matched = true;
      }
    } else if (/^\s*\d+\.\s+/.test(trimmed) || /^\s*\d+\s*[:.\-–]\s+/.test(trimmed) || /^\s*\d+\s*[)\]]\s+/.test(trimmed)) {
      const cleaned = cleanOptionLine(rawLine);
      if (cleaned) {
        options.push(cleaned);
        matched = true;
      }
    } else if (/^\s*[\-\*\u2022]\s+/.test(trimmed)) {
      const cleaned = cleanOptionLine(rawLine);
      if (cleaned) {
        options.push(cleaned);
        diagnostics.push('option line uses markdown bullet');
        matched = true;
      }
    }

    if (!matched) {
      diagnostics.push('unrecognized option line');
    }
  }

  return { options, diagnostics };
}

function countWords(text: string): number {
  return (text.trim().match(/\S+/g) || []).length;
}

export function parseStoryResponseStrict(
  raw: string,
  optionsPerDecision: number,
  optionMinWords?: number,
  optionMaxWords?: number,
): ParseStrictResult {
  const errors: string[] = [];
  const diagnostics: string[] = [];

  const { text: normalized, trailingBlankLines } = normalizeRaw(raw);
  if (trailingBlankLines) diagnostics.push('trailing blank lines');
  if (/`{3}|^\s*[-*#]/m.test(normalized)) diagnostics.push('markdown hints');

  let working = normalized;
  let isFinal = false;
  const lines = working.split(/\n/);
  if (lines.length && lines[lines.length - 1].trim().toUpperCase() === 'FINALIZADO') {
    isFinal = true;
    lines.pop();
    working = lines.join('\n').trimEnd();
  }

  const chapterTagged = extractTaggedSection(working, CAPITULO_TAGS);
  const optionsTagged = extractTaggedSection(working, OPCIONES_TAGS);
  const split = splitStoryAndOptionsNormalized(working);
  const hasSeparatorIntent = Boolean(split.separatorLine || /\n---/.test(working));
  const hasTaggedFormat = Boolean(chapterTagged || optionsTagged);
  const hasTagBlock = optionsTagged !== null;
  const hasSeparatorBlock = Boolean(split.optionsBlock);
  const hasOptionsSource = hasTagBlock || hasSeparatorBlock;

  let story = chapterTagged ?? split.story.trim();
  if (!story) {
    story = working.trim();
  }

  const { options: tagOptions, diagnostics: tagDiagnostics } = optionsTagged
    ? extractOptions(optionsTagged)
    : { options: [], diagnostics: [] };
  const { options: separatorOptions, diagnostics: separatorDiagnostics } = split.optionsBlock
    ? extractOptions(split.optionsBlock)
    : { options: [], diagnostics: [] };

  diagnostics.push(...tagDiagnostics);
  diagnostics.push(...separatorDiagnostics);

  let options = tagOptions.length ? tagOptions : separatorOptions;

  if (hasTaggedFormat) {
    if (!chapterTagged) {
      errors.push('missing chapter block');
    }

    if (!isFinal && optionsPerDecision > 0) {
      if (!optionsTagged) {
        errors.push('missing options block');
      }
    } else if (isFinal && optionsTagged && tagOptions.length > 0) {
      errors.push('final response should not contain options block');
    }
  } else if (hasSeparatorIntent) {
    if (!isFinal && optionsPerDecision > 0) {
      if (!split.optionsBlock) {
        errors.push('missing options separator');
      } else if (split.separatorLine !== '---') {
        errors.push('separator must be --- on its own line');
      }
    } else if (isFinal && split.optionsBlock) {
      errors.push('final response should not contain separator');
    }
  } else if (!isFinal && optionsPerDecision > 0) {
    errors.push('missing options block');
  }

  if (!isFinal && optionsPerDecision > 0) {
    if (hasOptionsSource && options.length !== optionsPerDecision) {
      errors.push(`expected ${optionsPerDecision} options but got ${options.length}`);
    }

    if (optionMinWords !== undefined || optionMaxWords !== undefined) {
      const min = optionMinWords ?? 0;
      const max = optionMaxWords ?? Infinity;
      options.forEach((opt, index) => {
        const words = countWords(opt);
        if (optionMinWords !== undefined && words < min) {
          errors.push(`option ${index + 1} has fewer than ${min} words`);
        }
        if (optionMaxWords !== undefined && words > max) {
          errors.push(`option ${index + 1} has more than ${max} words`);
        }
      });
    }
  } else {
    options = [];
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
