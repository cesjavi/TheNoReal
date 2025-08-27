jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: class {
    chat = { completions: { create: jest.fn() } };
  },
}));

import { filterSensitive } from '../lib/groqClient';

describe('filterSensitive', () => {
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('redacts secrets containing special regex characters', () => {
    const secret = 'ab.*+?^${}()|[]\\c';
    process.env.GROQ_API_KEY = secret;
    const input = `before${secret}after`;
    const result = filterSensitive(input) as string;
    expect(result).toBe('before[REDACTED]after');
  });
});
