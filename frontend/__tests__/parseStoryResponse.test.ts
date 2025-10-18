import {
  parseStoryResponse,
  parseStoryResponseStrict,
} from '@thenoreal/shared/lib/parseStoryResponse';

describe('parseStoryResponse', () => {
  it('separates historia y opciones con ---', () => {
    const text =
      'Había una vez\n---\n1. Explorar el misterioso bosque oscuro con gran cautela\n2. Investigar las antiguas ruinas de la ciudad perdida';
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('Había una vez');
    expect(options).toEqual([
      'Explorar el misterioso bosque oscuro con gran cautela',
      'Investigar las antiguas ruinas de la ciudad perdida',
    ]);
  });

  it('maneja respuesta solo con opciones', () => {
    const text =
      '---\n1. Explorar el misterioso bosque oscuro con gran cautela\n2. Investigar las antiguas ruinas de la ciudad perdida';
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('');
    expect(options).toEqual([
      'Explorar el misterioso bosque oscuro con gran cautela',
      'Investigar las antiguas ruinas de la ciudad perdida',
    ]);
  });

  it('detecta final solo con FINALIZADO exacto', () => {
    const text = 'El héroe ha cumplido su misión\nFINALIZADO';
    const { isFinal, options } = parseStoryResponse(text, 2);
    expect(isFinal).toBe(true);
    expect(options).toEqual([]);
  });
});

describe('parseStoryResponseStrict', () => {
  it('emite error cuando falta separador', () => {
    const text = 'Historia sin separador\n1. Opción inválida';
    const result = parseStoryResponseStrict(text, 1);
    expect(result.errors).toContain('missing options separator');
  });
});
