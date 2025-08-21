// ajustá el import del tipo si difiere
import type { ConfigGeneracion } from '../app/StorySettings';

export const DEFAULT_CONFIG: ConfigGeneracion = {
  generos: [],
  estilo: {
    tono: [], ritmo: [], voz: [], tiempo: [],
    formato: [], descripcion: [], dialogo: [], matiz: []
  },
  ajustes: {
    publico: [], epoca: [], ambito: [],
    estructura: [],
    opcionesPorCapitulo: ['3'],
    clasificacion: ['G'],
    idioma: ['es'],
    registro: ['neutral']
  },
};
