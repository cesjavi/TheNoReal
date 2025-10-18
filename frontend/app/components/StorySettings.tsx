'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

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
  targetWords?: number;
}

export interface ConfigGeneracion {
  generos: string[];
  estilo: Estilo;
  ajustes: Ajustes;
}

interface StorySettingsProps {
  open: boolean;
  config: ConfigGeneracion;
  onClose: () => void;
  onSave: (cfg: ConfigGeneracion) => void;
}

/** Claves de Ajustes que son arrays de string (aplicables a checkboxes) */
type AjustesArrayKeys =
  | 'publico'
  | 'epoca'
  | 'ambito'
  | 'estructura'
  | 'incluir'
  | 'evitar'
  | 'clasificacion'
  | 'idioma'
  | 'registro'
  | 'opcionesPorCapitulo';

const TONOS = ['ligero', 'oscuro', 'melancólico', 'esperanzador', 'satírico', 'absurdo'];
const RITMOS = ['rápido', 'medio', 'pausado'];
const VOCES = ['1ª persona', '2ª persona', '3ª limitada', '3ª omnisciente', 'narrador no fiable'];
const TIEMPOS = ['pasado', 'presente'];
const FORMATOS = [
  'relato clásico',
  'microcuento',
  'epistolar',
  'diario',
  'guion cinematográfico',
  'monólogo interior',
  'elige tu aventura',
];
const DENSIDADES = ['baja', 'media', 'alta'];
const DIALOGO = ['poco', 'equilibrado', 'mucho'];
const MATICES = ['poético', 'minimalista', 'pulp/noir', 'realismo mágico', 'cyberpunk', 'slice-of-life', 'humorístico'];

const PUBLICO = ['infantil', 'middle-grade', 'juvenil', 'adulto'];
const EPOCAS = ['prehistoria', 'medieval', 'victoriana', 'contemporánea', 'futurista'];
const AMBITOS = ['urbano', 'rural'];
const ESTRUCTURAS = ['3 actos', 'en media res', 'viaje del héroe', 'con cliffhanger final'];
const CLASIFICACION = ['PG', '+13', '+16'];
export const IDIOMAS = ['es-AR', 'es-MX', 'en-US', 'fr-FR', 'neutral'];
const REGISTROS = ['formal', 'informal'];
const OPCIONES_POR_CAPITULO = ['2', '3', '4'];

type CreativeMode = 'classic' | 'creative' | 'crazy';

const CREATIVE_MODES: Record<CreativeMode, { label: string; temperature: number; topP: number }> = {
  classic: { label: 'Modo clásico', temperature: 0.7, topP: 0.7 },
  creative: { label: 'Modo creativo', temperature: 0.9, topP: 0.9 },
  crazy: { label: 'Modo loco', temperature: 1, topP: 1 },
};

/** Config de secciones fuertemente tipadas */
export const ESTILO_SECTIONS: { key: keyof Estilo; label: string; options: string[] }[] = [
  { key: 'tono', label: 'Tono', options: TONOS },
  { key: 'ritmo', label: 'Ritmo/Pacing', options: RITMOS },
  { key: 'voz', label: 'Voz/Punto de vista', options: VOCES },
  { key: 'tiempo', label: 'Tiempo verbal', options: TIEMPOS },
  { key: 'formato', label: 'Formato', options: FORMATOS },
  { key: 'descripcion', label: 'Densidad descriptiva', options: DENSIDADES },
  { key: 'dialogo', label: 'Diálogo vs. narración', options: DIALOGO },
  { key: 'matiz', label: 'Matiz estilístico', options: MATICES },
];

export const AJUSTES_SECTIONS: { key: AjustesArrayKeys; label: string; options: string[] }[] = [
  { key: 'publico', label: 'Público objetivo', options: PUBLICO },
  { key: 'epoca', label: 'Época', options: EPOCAS },
  { key: 'ambito', label: 'Ámbito', options: AMBITOS },
  { key: 'estructura', label: 'Estructura', options: ESTRUCTURAS },
  { key: 'clasificacion', label: 'Clasificación', options: CLASIFICACION },
  { key: 'idioma', label: 'Idioma', options: IDIOMAS },
  { key: 'registro', label: 'Registro', options: REGISTROS },
  { key: 'opcionesPorCapitulo', label: 'Interactividad: opciones por capítulo', options: OPCIONES_POR_CAPITULO },
];

export default function StorySettings({ open, config, onClose, onSave }: StorySettingsProps) {
  const t = useTranslations('StorySettings');
  const [local, setLocal] = useState<ConfigGeneracion>(config);
  const [incluirInput, setIncluirInput] = useState('');
  const [evitarInput, setEvitarInput] = useState('');

  useEffect(() => {
    if (open) setLocal(config);
  }, [open, config]);

  const currentMode: CreativeMode =
    (Object.keys(CREATIVE_MODES) as CreativeMode[]).find(
      m =>
        CREATIVE_MODES[m].temperature ===
          (local.ajustes.creatividad ?? CREATIVE_MODES.creative.temperature) &&
        CREATIVE_MODES[m].topP ===
          (local.ajustes.topP ?? CREATIVE_MODES.creative.topP)
    ) ?? 'creative';

  const setCreativeMode = (mode: CreativeMode) => {
    const cfg = CREATIVE_MODES[mode];
    setLocal(prev => ({
      ...prev,
      ajustes: { ...prev.ajustes, creatividad: cfg.temperature, topP: cfg.topP },
    }));
  };

  if (!open) return null;

  /** Overloads para tipado estricto */
  function toggleItem(section: 'estilo', key: keyof Estilo, value: string): void;
  function toggleItem(section: 'ajustes', key: AjustesArrayKeys, value: string): void;
  function toggleItem(
    section: 'estilo' | 'ajustes',
    key: keyof Estilo | AjustesArrayKeys,
    value: string
  ) {
    setLocal(prev => {
      if (section === 'estilo') {
        const estiloKey = key as keyof Estilo;
        const current = (prev.estilo[estiloKey] ?? []) as string[];
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        return { ...prev, estilo: { ...prev.estilo, [estiloKey]: next } };
      } else {
        const ajustesKey = key as AjustesArrayKeys;
        const current = prev.ajustes[ajustesKey] ?? [];
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        return { ...prev, ajustes: { ...prev.ajustes, [ajustesKey]: next } };
      }
    });
  }

  const handleField = <K extends keyof Ajustes>(key: K, value: Ajustes[K]) => {
    let v = value;
    if (key === 'longitudPalabras') {
      const num = Number(v);
      if (!Number.isFinite(num) || num <= 0 || num > 10000) return;
      v = num as Ajustes[K];
    }
    setLocal(prev => ({
      ...prev,
      ajustes: {
        ...prev.ajustes,
        [key]: v,
      },
    }));
  };

  const addTag = (key: 'incluir' | 'evitar', value: string) => {
    const v = value.trim();
    if (!v) return;
    setLocal(prev => ({
      ...prev,
      ajustes: {
        ...prev.ajustes,
        [key]: [ ...(prev.ajustes[key] || []), v ],
      },
    }));
  };

  const removeTag = (key: 'incluir' | 'evitar', value: string) => {
    setLocal(prev => ({
      ...prev,
      ajustes: {
        ...prev.ajustes,
        [key]: (prev.ajustes[key] || []).filter(t => t !== value),
      },
    }));
  };

  const handleSave = () => onSave(local);

  return (
    <div className="fixed inset-0 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-80 sm:w-96 h-full bg-white p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">Estilos (literarios)</h2>

        {ESTILO_SECTIONS.map(({ key, label, options }) => (
          <div key={String(key)} className="mb-4">
            <p className="font-semibold">{label}</p>
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(local.estilo[key] ?? []).includes(opt)}
                  onChange={() => toggleItem('estilo', key, opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        ))}

        <h2 className="text-lg font-bold mb-2">Ajustes extra</h2>

        {AJUSTES_SECTIONS.map(({ key, label, options }) => (
          <div key={String(key)} className="mb-4">
            <p className="font-semibold">{label}</p>
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={((local.ajustes[key] as unknown as string[] | undefined) ?? []).includes(opt)}
                  onChange={() => toggleItem('ajustes', key, opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        ))}

        <div className="mb-4">
          <p className="font-semibold">País/Ciudad</p>
          <input
            type="text"
            value={local.ajustes.lugar || ''}
            onChange={e => handleField('lugar', e.target.value)}
            className="w-full p-1 border border-black/30 rounded"
            title="Ingrese el país o ciudad"
            placeholder="Ingrese el país o ciudad"
          />
        </div>

        <div className="mb-4">
          <p className="font-semibold">Longitud objetivo (palabras)</p>
          <input
            type="number"
            list="sugerencias-longitud"
            value={local.ajustes.longitudPalabras ?? ''}
            onChange={e => handleField('longitudPalabras', Number(e.target.value))}
            className="w-full p-1 border border-black/30 rounded"
            title="Sugerencias: 200, 500, 1000; puedes ingresar otro valor"
            placeholder="Ej: 200, 500, 1000 o ingresa otro valor"
          />
          <datalist id="sugerencias-longitud">
            <option value="200" />
            <option value="500" />
            <option value="1000" />
          </datalist>
        </div>

        <div className="mb-4">
          <p className="font-semibold">Temas/elementos obligatorios</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {local.ajustes.incluir?.map(tag => (
              <span key={tag} className="px-2 py-1 bg-accent rounded-full text-sm flex items-center gap-1">
                {tag}
                <button type="button" onClick={() => removeTag('incluir', tag)} className="text-black">×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={incluirInput}
            onChange={e => setIncluirInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                addTag('incluir', incluirInput);
                setIncluirInput('');
                e.preventDefault();
              }
            }}
            className="w-full p-1 border border-black/30 rounded"
          />
        </div>

        <div className="mb-4">
          <p className="font-semibold">Evitar temas</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {local.ajustes.evitar?.map(tag => (
              <span key={tag} className="px-2 py-1 bg-accent rounded-full text-sm flex items-center gap-1">
                {tag}
                <button type="button" onClick={() => removeTag('evitar', tag)} className="text-black">×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={evitarInput}
            onChange={e => setEvitarInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                addTag('evitar', evitarInput);
                setEvitarInput('');
                e.preventDefault();
              }
            }}
            className="w-full p-1 border border-black/30 rounded"
          />
        </div>

        <div className="mb-4">
          <p className="font-semibold">Modo de creatividad</p>
          <select
            value={currentMode}
            onChange={e => setCreativeMode(e.target.value as CreativeMode)}
            className="w-full p-1 border border-black/30 rounded"
          >
            {Object.entries(CREATIVE_MODES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <p className="font-semibold">Semilla aleatoria</p>
          <input
            type="number"
            value={local.ajustes.semilla ?? ''}
            onChange={e => handleField('semilla', Number(e.target.value))}
            className="w-full p-1 border border-black/30 rounded"
            placeholder="Ingrese una semilla aleatoria"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.ajustes.consistenciaSaga || false}
              onChange={e => handleField('consistenciaSaga', e.target.checked)}
            />
            Consistencia de mundo (sagas)
          </label>
        </div>

        <div className="mb-4">
          <p className="font-semibold">Estilo visual</p>
          <input
            id="estiloVisual"
            name="estiloVisual"
            type="text"
            value={local.ajustes.estiloVisual || ''}
            onChange={e => handleField('estiloVisual', e.target.value)}
            className="w-full p-1 border border-black/30 rounded"
            placeholder="Ej: realista, cartoon, acuarela..."
          />
        </div>

        <div className="mb-6">
          <p className="font-semibold">Paleta</p>
          <input
            type="text"
            value={local.ajustes.paleta || ''}
            onChange={e => handleField('paleta', e.target.value)}
            className="w-full p-1 border border-black/30 rounded"
            placeholder="Ej: colores, tonos, etc."
          />
        </div>

        <div className="flex justify-end gap-2 pb-4">
          <button type="button" onClick={onClose} className="px-2 py-1 text-sm rounded-lg border border-black/30">
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-2 py-1 text-sm rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
