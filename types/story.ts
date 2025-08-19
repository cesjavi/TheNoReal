export type Genero =
  | 'Aventura'
  | 'Ciencia ficción'
  | 'Terror'
  | 'Fantasía'
  | 'Misterio'
  | 'Romance'
  | 'Comedia';

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
}

export interface ConfigGeneracion {
  generos: Genero[];
  estilo: Estilo;
  ajustes: Ajustes;
}

export type { Genero as Género, Estilo as EstiloHistoria, Ajustes as AjustesGeneracion, ConfigGeneracion as ConfiguracionGeneracion };
