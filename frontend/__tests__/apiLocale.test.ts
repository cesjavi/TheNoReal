/**
 * @jest-environment node
 */
import fs from 'fs/promises';
import path from 'path';

import { loadApiLocale } from '@thenoreal/shared/lib/apiLocale';

describe('loadApiLocale', () => {
  it('falls back to neutral for invalid locale input', async () => {
    const spy = jest.spyOn(fs, 'readFile');
    const result = await loadApiLocale('../../etc/passwd');
    expect(spy).toHaveBeenCalledTimes(1);
    const [filePath] = spy.mock.calls[0];
    const neutralPath = path.join('public', 'locales', 'neutral', 'api.json');
    expect(filePath).toContain(neutralPath);
    expect(filePath).not.toMatch(/\.\./);
    const neutral = await loadApiLocale('neutral');
    expect(result).toEqual(neutral);
    spy.mockRestore();
  });
});

