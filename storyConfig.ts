export type Modalidad = 'lineal' | 'capitulos';

export interface StoryConfig {
  modalidad: Modalidad;
  opciones_por_decision: number;
  capitulos?: number;
}

const MODALIDAD_CON_CAPITULOS: Modalidad = 'capitulos';

export function validateStoryConfig(config: StoryConfig): true {
  if (
    !Number.isInteger(config.opciones_por_decision) ||
    config.opciones_por_decision <= 0
  ) {
    throw new Error('opciones_por_decision inválido');
  }

  if (
    config.capitulos !== undefined &&
    config.modalidad !== MODALIDAD_CON_CAPITULOS
  ) {
    throw new Error('capitulos en modalidades no permitidas');
  }

  return true;
}
