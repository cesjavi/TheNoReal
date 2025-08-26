import { validateOptions } from '../lib/optionGuard';

describe('validateOptions', () => {
  it('provides reason for discarded options', () => {
    const { valid, discarded } = validateOptions(
      ['Correr', 'Ir al parque'],
      2
    );
    expect(valid).toEqual(['Ir al parque']);
    expect(discarded).toEqual([
      expect.objectContaining({ option: 'Correr' }),
    ]);
    expect(discarded[0].reason).toMatch(/menos de/);
  });

  it('allows shorter options when lowering min', () => {
    const { valid } = validateOptions(['Regresar'], 1, 1);
    expect(valid).toEqual(['Regresar']);
  });

  it('allows longer options when increasing max', () => {
    const longOption =
      'Correr hacia la montaña lejana durante la tormenta eléctrica que se aproxima rápidamente';
    const { valid } = validateOptions([longOption], 1, 2, 25);
    expect(valid).toEqual([longOption]);
  });
});
