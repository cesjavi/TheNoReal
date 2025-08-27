export type Genero =
  | 'Aventura'
  | 'Ciencia ficción'
  | 'Terror'
  | 'Fantasía'
  | 'Misterio'
  | 'Romance'
  | 'Comedia';

/**
 * Preferencias estilísticas para la historia.
 * Cada propiedad es una lista de etiquetas seleccionadas por el usuario.
 */
export interface Estilo {
  tono: string[];
  ritmo: string[];
  voz: string[];
  tiempo: string[];
  formato: string[];
  descripcion: string[];
  dialogo: string[];
  matiz: string[];
}

/**
 * Ajustes que controlan la generación de la historia.  Los campos de tipo
 * `string[]` representan listas de opciones elegidas por el usuario y los
 * numéricos modifican el comportamiento del modelo.
 */
export interface Ajustes {
  publico: string[];
  epoca: string[];
  ambito: string[];
  lugar?: string;
  longitudPalabras?: number;
  estructura: string[];
  incluir?: string[];
  evitar?: string[];
  clasificacion: string[];
  idioma: string[];
  registro: string[];
  creatividad?: number;
  topP?: number;
  semilla?: number;
  opcionesPorCapitulo: string[];
  consistenciaSaga?: boolean;
  estiloVisual?: string;
  paleta?: string;
  /** Número objetivo de palabras por capítulo */
  targetWords?: number;
}

export interface ConfigGeneracion {
  generos: Genero[];
  estilo: Estilo;
  ajustes: Ajustes;
}

export type { Genero as Género, Estilo as EstiloHistoria, Ajustes as AjustesGeneracion, ConfigGeneracion as ConfiguracionGeneracion };
