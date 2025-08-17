import { validateStoryConfig, StoryConfig } from '../storyConfig';

describe('storyConfig', () => {
  test('Config válida', () => {
    const config: StoryConfig = { modalidad: 'capitulos', opciones_por_decision: 2, capitulos: 5 };
    expect(validateStoryConfig(config)).toBe(true);
  });

  test('opciones_por_decision inválido', () => {
    const config: StoryConfig = { modalidad: 'capitulos', opciones_por_decision: 0 };
    expect(() => validateStoryConfig(config)).toThrow('opciones_por_decision inválido');
  });

  test('capitulos en modalidades no permitidas', () => {
    const config: StoryConfig = { modalidad: 'lineal', opciones_por_decision: 2, capitulos: 3 };
    expect(() => validateStoryConfig(config)).toThrow('capitulos en modalidades no permitidas');
  });
});
