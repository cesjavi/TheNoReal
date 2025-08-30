export function validateOptions(
  options: string[],
  expected: number
): {
  valid: string[];
  invalid: string[];
  tooMany: boolean;
  tooFew: boolean;
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const line of options) {
    const trimmed = line.trim();
    if (!trimmed) {
      invalid.push(line);
      continue;
    }
    const match = trimmed.match(/^\d+\.\s+(.+)$/);
    if (match) {
      valid.push(match[1].trim());
    } else {
      invalid.push(line);
    }
  }

  const tooMany = valid.length > expected;
  const tooFew = valid.length < expected;

  return {
    valid: valid.slice(0, expected),
    invalid,
    tooMany,
    tooFew,
  };
}
