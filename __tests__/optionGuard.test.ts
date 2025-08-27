import { validateOptions } from '../lib/optionGuard';

describe('validateOptions', () => {
  it('provides reason for discarded options', () => {
    const { valid, discarded } = validateOptions(
      ['Correr', 'Ir al parque con mis amigos en la mañana'],
      2,
    );
    expect(valid).toEqual(['Ir al parque con mis amigos en la mañana']);
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
      'Correr hacia la montaña lejana durante la tormenta eléctrica que se aproxima rápidamente y nos amenaza con su furia incontrolable';
    const { valid } = validateOptions([longOption], 1, 2, 25);
    expect(valid).toEqual([longOption]);
  });

  it('recognizes common imperative endings', () => {
    const options = [
      'Descifra… el código',
      'Come la comida',
      'Apagad las luces',
      'Proceded con cautela',
      'Salid de aquí',
      'Callaos ya',
      'Caminemos juntos',
      'Revivamos el momento',
    ];
    const { valid, discarded } = validateOptions(options, options.length, 1);
    expect(valid).toEqual(options);
    expect(discarded).toEqual([]);
  });
});
