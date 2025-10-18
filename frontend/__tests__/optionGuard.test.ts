import { validateOptions } from '@thenoreal/shared/lib/optionGuard';

describe('validateOptions', () => {
  it('extracts valid options and reports invalid lines', () => {
    const lines = [
      '1. First option',
      '',
      'Two',
      '2. Second option',
      '3. Third option'
    ];
    const { valid, invalid, tooMany, tooFew } = validateOptions(lines, 2);
    expect(valid).toEqual(['First option', 'Second option']);
    expect(invalid).toEqual(['', 'Two']);
    expect(tooMany).toBe(true);
    expect(tooFew).toBe(false);
  });

  it('flags when fewer options are provided than expected', () => {
    const { tooMany, tooFew } = validateOptions(['1. Only option'], 2);
    expect(tooMany).toBe(false);
    expect(tooFew).toBe(true);
  });
});
