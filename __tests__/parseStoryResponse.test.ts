import { parseStoryResponse } from '../lib/parseStoryResponse';

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
});
