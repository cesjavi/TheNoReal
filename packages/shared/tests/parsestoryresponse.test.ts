import { parseStoryResponse, parseStoryResponseStrict } from '@thenoreal/shared'

describe('parseStoryResponseStrict compatibility', () => {
  const N = 2;
  test('detects final with FINALIZADO and no options', () => {
    const text = 'El fin de la historia\nFINALIZADO';
    const legacy = parseStoryResponse(text, N);
    const strict = parseStoryResponseStrict(text, N);
    expect(strict).toMatchObject({
      story: 'El fin de la historia',
      options: [],
      isFinal: true,
    });
    expect(legacy.isFinal).toBe(true);
    expect(legacy.options).toEqual([]);
    expect(strict.errors).toHaveLength(0);
  });

  test('non-final text with standalone separator and N options', () => {
    const text = [
      'Un relato épico',
      '---',
      '1. Explorar el oscuro bosque lleno de misterios ocultos',
      '2. Investigar las ruinas antiguas que guardan secretos olvidados',
    ].join('\n');
    const legacy = parseStoryResponse(text, N);
    const strict = parseStoryResponseStrict(text, N);
    expect(strict.story).toBe('Un relato épico');
    expect(strict.options.length).toBe(2);
    expect(strict.errors).toHaveLength(0);
    expect(strict.diagnostics).toEqual(['markdown hints']);
    expect(legacy).toEqual({
      story: 'Un relato épico',
      options: [
        'Explorar el oscuro bosque lleno de misterios ocultos',
        'Investigar las ruinas antiguas que guardan secretos olvidados',
      ],
      isFinal: false,
    });
  });

  test('option line not matching pattern is diagnostic', () => {
    const text = [
      'Historia inicial',
      '---',
      '1 Opción mal formateada',
      '2. Seguir caminando en silencio por el camino estrecho',
    ].join('\n');
    const legacy = parseStoryResponse(text, N);
    const strict = parseStoryResponseStrict(text, N);
    expect(strict.diagnostics).toEqual(
      expect.arrayContaining(['unrecognized option line']),
    );
    expect(strict.errors).toEqual(
      expect.arrayContaining(['expected 2 options but got 1']),
    );
    expect(legacy.options).toEqual(['Seguir caminando en silencio por el camino estrecho']);
  });

  test('too few options produces error', () => {
    const text = [
      'Solo una opción',
      '---',
      '1. Adentrarse en la cueva misteriosa con mucha cautela',
    ].join('\n');
    const legacy = parseStoryResponse(text, N);
    const strict = parseStoryResponseStrict(text, N);
    expect(strict.errors).toEqual(
      expect.arrayContaining(['expected 2 options but got 1']),
    );
    expect(legacy.options.length).toBe(1);
  });

  test('too many options produces error', () => {
    const text = [
      'Varias opciones',
      '---',
      '1. Explorar el bosque oscuro buscando nuevas aventuras peligrosas',
      '2. Investigar el castillo abandonado en la distante colina solitaria',
      '3. Preguntar al sabio anciano sobre el destino incierto del viajero',
    ].join('\n');
    const legacy = parseStoryResponse(text, N);
    const strict = parseStoryResponseStrict(text, N);
    expect(strict.errors).toEqual(
      expect.arrayContaining(['expected 2 options but got 3']),
    );
    expect(strict.options.length).toBe(3);
    expect(legacy.options.length).toBe(3);
  });

  test('markdown artifacts are reported in diagnostics', () => {
    const text = [
      '# Encabezado extraño',
      '```code```',
      '---',
      '1. Seguir el camino **oscuro** entre los árboles _susurrantes_ atentos',
      '2. Tomar la ruta alternativa para evitar los peligros nocturnos',
    ].join('\n');
    const strict = parseStoryResponseStrict(text, N);
    expect(strict.diagnostics).toEqual(
      expect.arrayContaining(['markdown hints']),
    );
  });

  test('trailing blank lines trigger diagnostic', () => {
    const text = [
      'Narración interesante',
      '---',
      '1. Continuar hacia la montaña en búsqueda de respuestas antiguas',
      '2. Esperar pacientemente junto al río observando las estrellas brillantes',
      '',
      '',
    ].join('\n');
    const strict = parseStoryResponseStrict(text, N);
    expect(strict.diagnostics).toEqual(expect.arrayContaining(['trailing blank lines']));
  });

  test('separator with extra text produces diagnostic and missing options error', () => {
    const text = [
      'Cuento corto',
      '--- opc',
      '1. Investigar el bosque silencioso en la noche estrellada',
    ].join('\n');
    const legacy = parseStoryResponse(text, 1);
    const strict = parseStoryResponseStrict(text, 1);
    expect(strict.diagnostics).toEqual(
      expect.arrayContaining(['markdown hints']),
    );
    expect(strict.errors).toEqual(
      expect.arrayContaining(['missing options separator']),
    );
    expect(legacy.options).toEqual([]);
  });

  test('word-count bounds enforce min and max', () => {
    const text = [
      'Historia',
      '---',
      '1. Ir rápido',
      '2. Caminar lentamente por el sendero serpenteante bajo la luz de la luna y las estrellas brillantes del cielo nocturno',
    ].join('\n');
    const strict = parseStoryResponseStrict(text, N, 8, 16);
    expect(strict.errors).toEqual(
      expect.arrayContaining([
        'option 1 has fewer than 8 words',
        'option 2 has more than 16 words',
      ]),
    );
  });
});
