import { parseStoryResponse, type ParseResult } from '@thenoreal/shared';

export type StoryPayload = {
  story: string;
  options: string[];
  isFinal: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeOptions = (value: unknown, limit: number): string[] => {
  if (!Array.isArray(value) || limit <= 0) {
    return [];
  }

  const normalized: string[] = [];
  for (const option of value) {
    if (typeof option !== 'string') continue;
    const trimmed = option.trim();
    if (!trimmed) continue;
    if (!normalized.includes(trimmed)) {
      normalized.push(trimmed);
      if (normalized.length === limit) break;
    }
  }
  return normalized;
};

export function coerceStoryPayload(data: unknown, optionsPerDecision: number): StoryPayload {
  if (isRecord(data)) {
    if (typeof data.story === 'string') {
      const isFinalValue = (data as { isFinal?: unknown }).isFinal;
      const isFinal = typeof isFinalValue === 'boolean' ? isFinalValue : optionsPerDecision <= 0;
      const options = isFinal
        ? []
        : normalizeOptions((data as { options?: unknown }).options, optionsPerDecision);
      return {
        story: data.story.trim(),
        options,
        isFinal,
      };
    }

    if ('chapter' in data && isRecord((data as { chapter?: unknown }).chapter)) {
      const chapter = (data as { chapter: Record<string, unknown> }).chapter;
      const textValue = chapter.text ?? chapter.story;
      if (typeof textValue === 'string') {
        const chapterIsFinal = (chapter as { isFinal?: unknown }).isFinal;
        const topIsFinal = (data as { isFinal?: unknown }).isFinal;
        const isFinal =
          typeof chapterIsFinal === 'boolean'
            ? chapterIsFinal
            : typeof topIsFinal === 'boolean'
              ? topIsFinal
              : optionsPerDecision <= 0;
        const options = isFinal
          ? []
          : normalizeOptions(
              chapter.options ?? (data as { options?: unknown }).options,
              optionsPerDecision,
            );
        return {
          story: textValue.trim(),
          options,
          isFinal,
        };
      }
    }

    if (typeof (data as { text?: unknown }).text === 'string') {
      return sanitizeParseResult(
        parseStoryResponse((data as { text: string }).text, optionsPerDecision),
        optionsPerDecision,
      );
    }
  }

  if (typeof data === 'string') {
    return sanitizeParseResult(parseStoryResponse(data, optionsPerDecision), optionsPerDecision);
  }

  throw new Error('Unrecognized story payload');
}

const sanitizeParseResult = (result: ParseResult, limit: number): StoryPayload => ({
  story: result.story.trim(),
  options:
    result.isFinal || limit <= 0
      ? []
      : result.options.reduce<string[]>((acc, option) => {
          const trimmed = option.trim();
          if (!trimmed || acc.includes(trimmed) || acc.length >= limit) return acc;
          acc.push(trimmed);
          return acc;
        }, []),
  isFinal: result.isFinal || limit <= 0,
});
