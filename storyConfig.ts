export interface StoryConfig {
  modalidad: string;
  opciones_por_decision: number;
  capitulos?: number;
}

export function validateStoryConfig(config: StoryConfig): boolean {
  if (config.opciones_por_decision <= 0) {
    throw new Error('opciones_por_decision inválido');
  }
  if (
    typeof config.capitulos === 'number' &&
    config.modalidad !== 'capitulos'
  ) {
    throw new Error('capitulos en modalidades no permitidas');
  }
  return true;
}
