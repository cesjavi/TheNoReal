import {
  parseStoryResponse,
  parseStoryResponseStrict,
} from '@thenoreal/shared'
import { coerceStoryPayload } from '@/utils/storyPayload'

describe('parseStoryResponse', () => {
  it('extrae capítulo y opciones etiquetadas', () => {
    const text = [
      '[CAPITULO]',
      'La ciudad olvidada permanecía en silencio.',
      '[/CAPITULO]',
      '',
      '[OPCIONES]',
      'Opción 1: Explorar la plaza central cubierta de niebla',
      'Opción 2: Investigar las luces extrañas del bosque cercano',
      '[/OPCIONES]',
    ].join('\n');
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('La ciudad olvidada permanecía en silencio.');
    expect(options).toEqual([
      'Explorar la plaza central cubierta de niebla',
      'Investigar las luces extrañas del bosque cercano',
    ]);
  });

  it('mantiene compatibilidad con separador ---', () => {
    const text =
      'Había una vez\n---\n1. Explorar el misterioso bosque oscuro con gran cautela\n2. Investigar las antiguas ruinas de la ciudad perdida';
    const { story, options } = parseStoryResponse(text, 2);
    expect(story).toBe('Había una vez');
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

describe('coerceStoryPayload', () => {
  it('normaliza respuestas estructuradas con story', () => {
    const payload = {
      story: 'Capítulo limpio',
      options: [' Opción A  ', 'Opción B', 'Opción A'],
      isFinal: false,
    };
    expect(coerceStoryPayload(payload, 2)).toEqual({
      story: 'Capítulo limpio',
      options: ['Opción A', 'Opción B'],
      isFinal: false,
    });
  });

  it('acepta respuestas estilo chapter.text', () => {
    const payload = {
      chapter: {
        text: 'Capítulo parseado',
        options: ['Opción A', 'Opción B'],
      },
    };
    expect(coerceStoryPayload(payload, 2)).toEqual({
      story: 'Capítulo parseado',
      options: ['Opción A', 'Opción B'],
      isFinal: false,
    });
  });

  it('parsea respuestas de texto plano', () => {
    const text = [
      '[CAPÍTULO]',
      'Historia etiquetada',
      '[/CAPÍTULO]',
      '',
      '[OPCIONES]',
      'Opción 1: Seguir explorando',
      'Opción 2: Regresar al pueblo',
      '[/OPCIONES]',
    ].join('\n');
    expect(coerceStoryPayload({ text }, 2)).toEqual({
      story: 'Historia etiquetada',
      options: ['Seguir explorando', 'Regresar al pueblo'],
      isFinal: false,
    });
  });
});
