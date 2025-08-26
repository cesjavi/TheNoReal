import { parseStoryResponse } from '../lib/parseStoryResponse';

describe('parseStoryResponse', () => {
  it('separates historia y opciones con ---', () => {
    const text = "Había una vez\n---\n1. Ir al bosque\n2. Regresar";
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('Había una vez');
    expect(options).toEqual(['Ir al bosque']);
  });

  it('maneja respuesta solo con opciones', () => {
    const text = "1. Explorar la cueva\n2. Volver a casa";
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('');
    expect(options).toEqual(['Explorar la cueva', 'Volver a casa']);
  });

  it('reconoce opciones con distintos formatos numerados', () => {
    const text = 'Historia\n---\n1) Ir al bosque\n2- Ir al mar\n3: Ir a la ciudad';
    const { story, options } = parseStoryResponse(text, 3);
    expect(story).toBe('Historia');
    expect(options).toEqual([
      'Ir al bosque',
      'Ir al mar',
      'Ir a la ciudad',
    ]);
  });

  it.each([
    ['1) Explorar la cueva\n2) Volver a casa', ['Explorar la cueva', 'Volver a casa']],
    ['1- Explorar la cueva\n2- Volver a casa', ['Explorar la cueva', 'Volver a casa']],
    ['1: Explorar la cueva\n2: Volver a casa', ['Explorar la cueva', 'Volver a casa']],
  ])('maneja respuesta solo con opciones con formato alternativo', (text, expected) => {
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('');
    expect(options).toEqual(expected);
  });
});
