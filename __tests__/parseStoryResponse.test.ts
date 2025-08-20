import { parseStoryResponse } from '../lib/parseStoryResponse';

describe('parseStoryResponse', () => {
  it('separates historia y opciones con ---', () => {
    const text = "Había una vez\n---\n1. Ir al bosque\n2. Ir al mar";
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('Había una vez');
    expect(options).toEqual(['1. Ir al bosque', '2. Ir al mar']);
  });

  it('maneja respuesta solo con opciones', () => {
    const text = "1. Explorar la cueva\n2. Regresar";
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('');
    expect(options).toEqual(['1. Explorar la cueva', '2. Regresar']);
  });

  it('reconoce opciones con distintos formatos numerados', () => {
    const text = 'Historia\n---\n1) Ir al bosque\n2- Ir al mar\n3: Ir a la ciudad';
    const { story, options } = parseStoryResponse(text, 3);
    expect(story).toBe('Historia');
    expect(options).toEqual([
      '1) Ir al bosque',
      '2- Ir al mar',
      '3: Ir a la ciudad',
    ]);
  });

  it.each([
    ['1) Explorar la cueva\n2) Regresar', ['1) Explorar la cueva', '2) Regresar']],
    ['1- Explorar la cueva\n2- Regresar', ['1- Explorar la cueva', '2- Regresar']],
    ['1: Explorar la cueva\n2: Regresar', ['1: Explorar la cueva', '2: Regresar']],
  ])('maneja respuesta solo con opciones con formato alternativo', (text, expected) => {
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('');
    expect(options).toEqual(expected);
  });
});
