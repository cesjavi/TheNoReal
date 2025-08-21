import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Button,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIntl } from 'react-intl';
// OJO: este archivo está en TheNoRealApp/components, no en app/components
import LanguageSelector from '../components/LanguageSelector';

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
  generos: string[];
  estilo: Estilo;
  ajustes: Ajustes;
}

interface StorySettingsProps {
  config?: ConfigGeneracion | undefined;   // puede venir undefined
  onSave?: (cfg: ConfigGeneracion) => void;
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

/** Defaults fuertes */
const DEFAULT_CONFIG: ConfigGeneracion = {
  generos: [],
  estilo: {
    tono: [],
    ritmo: [],
    voz: [],
    tiempo: [],
    formato: [],
    descripcion: [],
    dialogo: [],
    matiz: [],
  },
  ajustes: {
    publico: [],
    epoca: [],
    ambito: [],
    estructura: [],
    incluir: [],
    evitar: [],
    clasificacion: ['G'],
    idioma: ['es'],
    registro: ['neutral'],
    opcionesPorCapitulo: ['3'],
    consistenciaSaga: false,
    estiloVisual: '',
    paleta: '',
  },
};

/** Normaliza cualquier config parcialmente definida */
function normalizeConfig(cfg?: Partial<ConfigGeneracion>): ConfigGeneracion {
  return {
    generos: cfg?.generos ?? DEFAULT_CONFIG.generos,
    estilo: {
      tono: cfg?.estilo?.tono ?? [],
      ritmo: cfg?.estilo?.ritmo ?? [],
      voz: cfg?.estilo?.voz ?? [],
      tiempo: cfg?.estilo?.tiempo ?? [],
      formato: cfg?.estilo?.formato ?? [],
      descripcion: cfg?.estilo?.descripcion ?? [],
      dialogo: cfg?.estilo?.dialogo ?? [],
      matiz: cfg?.estilo?.matiz ?? [],
    },
    ajustes: {
      publico: cfg?.ajustes?.publico ?? [],
      epoca: cfg?.ajustes?.epoca ?? [],
      ambito: cfg?.ajustes?.ambito ?? [],
      estructura: cfg?.ajustes?.estructura ?? [],
      incluir: cfg?.ajustes?.incluir ?? [],
      evitar: cfg?.ajustes?.evitar ?? [],
      clasificacion: cfg?.ajustes?.clasificacion ?? ['G'],
      idioma: cfg?.ajustes?.idioma ?? ['es'],
      registro: cfg?.ajustes?.registro ?? ['neutral'],
      opcionesPorCapitulo: cfg?.ajustes?.opcionesPorCapitulo ?? ['3'],
      creatividad: cfg?.ajustes?.creatividad,
      topP: cfg?.ajustes?.topP,
      semilla: cfg?.ajustes?.semilla,
      consistenciaSaga: cfg?.ajustes?.consistenciaSaga ?? false,
      estiloVisual: cfg?.ajustes?.estiloVisual ?? '',
      paleta: cfg?.ajustes?.paleta ?? '',
      lugar: cfg?.ajustes?.lugar,
      longitudPalabras: cfg?.ajustes?.longitudPalabras,
    },
  };
}

/** Config de secciones fuertemente tipadas */
export const ESTILO_SECTIONS: { key: keyof Estilo; label: string; options: string[] }[] = [
  { key: 'tono', label: 'tono', options: TONOS },
  { key: 'ritmo', label: 'ritmo', options: RITMOS },
  { key: 'voz', label: 'voz', options: VOCES },
  { key: 'tiempo', label: 'tiempo', options: TIEMPOS },
  { key: 'formato', label: 'formato', options: FORMATOS },
  { key: 'descripcion', label: 'descripcion', options: DENSIDADES },
  { key: 'dialogo', label: 'dialogo', options: DIALOGO },
  { key: 'matiz', label: 'matiz', options: MATICES },
];

export const AJUSTES_SECTIONS: { key: AjustesArrayKeys; label: string; options: string[] }[] = [
  { key: 'publico', label: 'publico', options: PUBLICO },
  { key: 'epoca', label: 'epoca', options: EPOCAS },
  { key: 'ambito', label: 'ambito', options: AMBITOS },
  { key: 'estructura', label: 'estructura', options: ESTRUCTURAS },
  { key: 'clasificacion', label: 'clasificacion', options: CLASIFICACION },
  { key: 'idioma', label: 'idioma', options: IDIOMAS },
  { key: 'registro', label: 'registro', options: REGISTROS },
  { key: 'opcionesPorCapitulo', label: 'opcionesPorCapitulo', options: OPCIONES_POR_CAPITULO },
];

export default function StorySettings({ config: initialConfig, onSave }: StorySettingsProps) {
  const router = useRouter();
  const intl = useIntl();

  // Siempre arrancá normalizado
  const [config, setConfig] = useState<ConfigGeneracion>(normalizeConfig(initialConfig));

  useEffect(() => {
    setConfig(normalizeConfig(initialConfig));
  }, [initialConfig]);

  function toggleItem(section: 'estilo', key: keyof Estilo, value: string): void;
  function toggleItem(section: 'ajustes', key: AjustesArrayKeys, value: string): void;
  function toggleItem(
    section: 'estilo' | 'ajustes',
    key: keyof Estilo | AjustesArrayKeys,
    value: string
  ) {
    setConfig(prev => {
      if (section === 'estilo') {
        const estiloKey = key as keyof Estilo;
        const prevArr = prev.estilo[estiloKey] ?? [];
        const newArr = prevArr.includes(value) ? prevArr.filter(v => v !== value) : [...prevArr, value];
        return { ...prev, estilo: { ...prev.estilo, [estiloKey]: newArr } };
      }
      const ajustesKey = key as AjustesArrayKeys;
      const prevArr = (prev.ajustes[ajustesKey] as string[]) ?? [];
      const newArr = prevArr.includes(value) ? prevArr.filter(v => v !== value) : [...prevArr, value];
      return { ...prev, ajustes: { ...prev.ajustes, [ajustesKey]: newArr } };
    });
  }

  const addTag = (key: 'incluir' | 'evitar', value: string) => {
    if (!value) return;
    setConfig(prev => {
      const arr = prev.ajustes[key] ?? [];
      return { ...prev, ajustes: { ...prev.ajustes, [key]: [...arr, value] } };
    });
  };

  const removeTag = (key: 'incluir' | 'evitar', value: string) => {
    setConfig(prev => {
      const arr = prev.ajustes[key] ?? [];
      return { ...prev, ajustes: { ...prev.ajustes, [key]: arr.filter(v => v !== value) } };
    });
  };

  type Mode = CreativeMode;
  const currentMode: Mode =
    (Object.keys(CREATIVE_MODES) as Mode[]).find(
      m =>
        CREATIVE_MODES[m].temperature === (config.ajustes.creatividad ?? CREATIVE_MODES.creative.temperature) &&
        CREATIVE_MODES[m].topP === (config.ajustes.topP ?? CREATIVE_MODES.creative.topP)
    ) ?? 'creative';

  const setCreativeMode = (mode: Mode) => {
    const cfg = CREATIVE_MODES[mode];
    setConfig(prev => ({
      ...prev,
      ajustes: { ...prev.ajustes, creatividad: cfg.temperature, topP: cfg.topP },
    }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {intl.formatMessage({ id: 'StorySettings.languageSection' })}
        </Text>
        <LanguageSelector />
      </View>

      {ESTILO_SECTIONS.map(section => (
        <View key={section.key} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {intl.formatMessage({ id: `StorySettings.sections.${section.label}` })}
          </Text>
          <View style={styles.options}>
            {section.options.map(opt => (
              <Pressable
                key={opt}
                onPress={() => toggleItem('estilo', section.key, opt)}
                style={[
                  styles.option,
                  (config.estilo[section.key] ?? []).includes(opt) && styles.optionSelected,
                ]}
              >
                <Text>{intl.formatMessage({ id: `StorySettingsOptions.${opt}` })}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {AJUSTES_SECTIONS.map(section => (
        <View key={section.key} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {intl.formatMessage({ id: `StorySettings.sections.${section.label}` })}
          </Text>
          <View style={styles.options}>
            {section.options.map(opt => (
              <Pressable
                key={opt}
                onPress={() => toggleItem('ajustes', section.key, opt)}
                style={[
                  styles.option,
                  ((config.ajustes[section.key] as string[]) ?? []).includes(opt) && styles.optionSelected,
                ]}
              >
                <Text>{intl.formatMessage({ id: `StorySettingsOptions.${opt}` })}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {intl.formatMessage({ id: 'StorySettings.includeTopics' })}
        </Text>
        <View style={styles.tags}>
          {(config.ajustes.incluir ?? []).map(tag => (
            <Pressable key={tag} onPress={() => removeTag('incluir', tag)} style={styles.tag}>
              <Text>{tag}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={''}
          onChangeText={() => {}}
          onSubmitEditing={() => {}}
          placeholder={intl.formatMessage({ id: 'StorySettings.addTopic' })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {intl.formatMessage({ id: 'StorySettings.avoidTopics' })}
        </Text>
        <View style={styles.tags}>
          {(config.ajustes.evitar ?? []).map(tag => (
            <Pressable key={tag} onPress={() => removeTag('evitar', tag)} style={styles.tag}>
              <Text>{tag}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={''}
          onChangeText={() => {}}
          onSubmitEditing={() => {}}
          placeholder={intl.formatMessage({ id: 'StorySettings.addTopic' })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {intl.formatMessage({ id: 'StorySettings.creativeMode' })}
        </Text>
        <View style={styles.options}>
          {(Object.keys(CREATIVE_MODES) as CreativeMode[]).map(mode => (
            <Pressable
              key={mode}
              onPress={() => setCreativeMode(mode)}
              style={[styles.option, currentMode === mode && styles.optionSelected]}
            >
              <Text>{CREATIVE_MODES[mode].label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {intl.formatMessage({ id: 'StorySettings.randomSeed' })}
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={config.ajustes.semilla?.toString() ?? ''}
          onChangeText={v =>
            setConfig(prev => ({
              ...prev,
              ajustes: { ...prev.ajustes, semilla: Number(v) || undefined },
            }))
          }
          placeholder={intl.formatMessage({ id: 'StorySettings.randomSeedPlaceholder' })}
        />
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {intl.formatMessage({ id: 'StorySettings.worldConsistency' })}
        </Text>
        <Switch
          value={config.ajustes.consistenciaSaga ?? false}
          onValueChange={v =>
            setConfig(prev => ({
              ...prev,
              ajustes: { ...prev.ajustes, consistenciaSaga: v },
            }))
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {intl.formatMessage({ id: 'StorySettings.visualStyle' })}
        </Text>
        <TextInput
          style={styles.input}
          value={config.ajustes.estiloVisual ?? ''}
          onChangeText={v =>
            setConfig(prev => ({
              ...prev,
              ajustes: { ...prev.ajustes, estiloVisual: v },
            }))
          }
          placeholder={intl.formatMessage({ id: 'StorySettings.visualStylePlaceholder' })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {intl.formatMessage({ id: 'StorySettings.palette' })}
        </Text>
        <TextInput
          style={styles.input}
          value={config.ajustes.paleta ?? ''}
          onChangeText={v =>
            setConfig(prev => ({
              ...prev,
              ajustes: { ...prev.ajustes, paleta: v },
            }))
          }
          placeholder={intl.formatMessage({ id: 'StorySettings.palettePlaceholder' })}
        />
      </View>

      <View style={styles.buttons}>
        <Button title={intl.formatMessage({ id: 'StorySettings.cancel' })} onPress={() => router.back()} />
        <Button
          title={intl.formatMessage({ id: 'StorySettings.save' })}
          onPress={() => {
            if (onSave) {
              onSave?.(config);
            }
            router.back();
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  section: { marginBottom: 16 },
  sectionRow: { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: 'bold', marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  optionSelected: { backgroundColor: '#e5e5e5' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  tag: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#e5e5e5', borderRadius: 12, marginRight: 6, marginBottom: 6 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 32 },
});
