export type Genero =
  | 'Aventura'
  | 'Ciencia ficción'
  | 'Terror'
  | 'Fantasía'
  | 'Misterio'
  | 'Romance'
  | 'Comedia';

export interface Estilo {
  /** Estilo narrativo opcional */
  narrativo?: 'serio' | 'cómico' | 'dramático' | 'infantil';
  /** Estilo visual opcional para las ilustraciones */
  visual?:
    | 'tinta_minimalista'
    | 'realista'
    | 'acuarela'
    | 'pixel_art'
    | 'cómic';
}

export interface Ajustes {
  /** Número de opciones que se generan por decisión */
  opcionesPorDecision: number;
  /** Modalidad de finalización de la historia */
  final: 'capitulos' | 'final_sorpresa' | 'sin_final_definido' | 'infinita';
  /** Número de capítulos, requerido en algunas modalidades */
  capitulos?: number;
}

export interface ConfigGeneracion {
  /** Prompt inicial de la historia */
  prompt: string;
  /** Géneros seleccionados */
  generos: Genero[];
  /** Estilo opcional de la narración e ilustraciones */
  estilo?: Estilo;
  /** Ajustes de generación de la historia */
  ajustes?: Ajustes;
}

export type { Genero as Género, Estilo as EstiloHistoria, Ajustes as AjustesGeneracion, ConfigGeneracion as ConfiguracionGeneracion };
