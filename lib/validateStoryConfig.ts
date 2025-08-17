export enum EndingMode {
  REQUERIDO = 'requerido',
  PERMITIDO = 'permitido',
  PROHIBIDO = 'prohibido'
}

export interface StoryConfig {
  opciones_por_decision: number;
  final: EndingMode;
  capitulos?: unknown;
}

export function validateStoryConfig(config: StoryConfig): string | null {
  const { opciones_por_decision, final, capitulos } = config;

  if (!Number.isInteger(opciones_por_decision) || opciones_por_decision < 2) {
    return 'opciones_por_decision debe ser un entero mayor o igual a 2';
  }

  if (!Object.values(EndingMode).includes(final)) {
    return `final debe ser uno de los siguientes valores: ${Object.values(EndingMode).join(', ')}`;
  }

  if (final === EndingMode.REQUERIDO && capitulos === undefined) {
    return 'capitulos es requerido cuando final es "requerido"';
  }

  if (final === EndingMode.PROHIBIDO && capitulos !== undefined) {
    return 'capitulos está prohibido cuando final es "prohibido"';
  }

  return null;
}

export default validateStoryConfig;
