import React, { useState } from 'react';
import { View, Text, TextInput, Button, Switch, StyleSheet } from 'react-native';

const GENRES = [
  'Aventura',
  'Ciencia ficción',
  'Terror',
  'Fantasía',
  'Misterio',
  'Romance',
  'Comedia',
];

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
const IDIOMAS = ['es-AR', 'es-MX', 'en-US', 'fr-FR', 'neutral'];
const REGISTROS = ['formal', 'informal'];
const OPCIONES_POR_CAPITULO = ['2', '3', '4'];

const ESTILO_SECTIONS = [
  { key: 'tono', options: TONOS },
  { key: 'ritmo', options: RITMOS },
  { key: 'voz', options: VOCES },
  { key: 'tiempo', options: TIEMPOS },
  { key: 'formato', options: FORMATOS },
  { key: 'descripcion', options: DENSIDADES },
  { key: 'dialogo', options: DIALOGO },
  { key: 'matiz', options: MATICES },
];

const AJUSTES_SECTIONS = [
  { key: 'publico', options: PUBLICO },
  { key: 'epoca', options: EPOCAS },
  { key: 'ambito', options: AMBITOS },
  { key: 'estructura', options: ESTRUCTURAS },
  { key: 'clasificacion', options: CLASIFICACION },
  { key: 'idioma', options: IDIOMAS },
  { key: 'registro', options: REGISTROS },
  { key: 'opcionesPorCapitulo', options: OPCIONES_POR_CAPITULO },
];

type Estilo = {
  tono: string[];
  ritmo: string[];
  voz: string[];
  tiempo: string[];
  formato: string[];
  descripcion: string[];
  dialogo: string[];
  matiz: string[];
};

type Ajustes = {
  publico: string[];
  epoca: string[];
  ambito: string[];
  estructura: string[];
  incluir: string[];
  evitar: string[];
  clasificacion: string[];
  idioma: string[];
  registro: string[];
  creatividad: number;
  topP: number;
  opcionesPorCapitulo: string[];
};

type ConfigGeneracion = {
  generos: string[];
  estilo: Estilo;
  ajustes: Ajustes;
};

const TOKEN_LIMIT = 500;

function countTokens(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const defaults: ConfigGeneracion = {
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
    clasificacion: [],
    idioma: [],
    registro: [],
    creatividad: 0.9,
    topP: 0.95,
    opcionesPorCapitulo: [],
  },
};

export default function StoryForm() {
  const [prompt, setPrompt] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [numOptions, setNumOptions] = useState('2');
  const [modality, setModality] = useState('capitulos');
  const [chapters, setChapters] = useState('3');
  const [config, setConfig] = useState<ConfigGeneracion>(defaults);
  const [loading, setLoading] = useState(false);

  const showChapters = modality === 'capitulos' || modality === 'final_sorpresa';

  const toggleGenre = (genre: string) => {
    setConfig(prev => ({
      ...prev,
      generos: prev.generos.includes(genre)
        ? prev.generos.filter(g => g !== genre)
        : [...prev.generos, genre],
    }));
  };

  const clearGenres = () =>
    setConfig(prev => ({
      ...prev,
      generos: [],
    }));

  const randomizeConfig = () => {
    const genero = randomPick(GENRES);
    const estilo = ESTILO_SECTIONS.reduce((acc, { key, options }) => {
      acc[key as keyof Estilo] = [randomPick(options)];
      return acc;
    }, {} as Estilo);

    const ajustes = AJUSTES_SECTIONS.reduce(
      (acc, { key, options }) => {
        (acc as any)[key] = [randomPick(options)];
        return acc;
      },
      {
        incluir: [],
        evitar: [],
        creatividad: 0.9,
        topP: 0.95,
        publico: [],
        epoca: [],
        ambito: [],
        estructura: [],
        clasificacion: [],
        idioma: [],
        registro: [],
        opcionesPorCapitulo: [],
      } as Ajustes,
    );

    setConfig({ generos: [genero], estilo, ajustes });
  };

  const handleSubmit = async () => {
    if (tokenCount > TOKEN_LIMIT) return;
    setLoading(true);
    try {
      const final = (() => {
        switch (modality) {
          case 'final_abierto':
            return 'sin_final_definido';
          case 'final_cerrado':
            return chapters ? 'capitulos' : 'sin_final_definido';
          default:
            return modality; // 'capitulos' | 'final_sorpresa'
        }
      })();

      const { creatividad, topP, ...restAjustes } = config.ajustes;
      const payload: Record<string, unknown> = {
        prompt,
        opciones_por_decision: Number(numOptions),
        final,
        genres: config.generos,
        estilo: config.estilo,
        ajustes: { ...restAjustes, temperature: creatividad, top_p: topP },
        ...((final === 'capitulos' || final === 'final_sorpresa') && chapters
          ? { capitulos: Number(chapters) }
          : {}),
      };

      const backendUrl =
        process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('Story response', await res.json());
    } catch (err) {
      console.error('Error al enviar la historia', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textarea}
        multiline
        placeholder="Escribe el inicio de la historia"
        value={prompt}
        onChangeText={text => {
          setPrompt(text);
          setTokenCount(countTokens(text));
        }}
      />
      <Text style={styles.counter}>
        {tokenCount}/{TOKEN_LIMIT} tokens
        {tokenCount >= TOKEN_LIMIT ? ' - Límite alcanzado' : ''}
      </Text>

      <View style={styles.row}>
        <Text>Opciones por decisión:</Text>
        <TextInput
          style={styles.inputSmall}
          value={numOptions}
          onChangeText={setNumOptions}
          keyboardType="numeric"
        />
      </View>

      <Text style={styles.label}>Modalidad de final:</Text>
      <View style={styles.rowWrap}>
        {[
          { key: 'capitulos', label: 'Capítulos' },
          { key: 'final_sorpresa', label: 'Final sorpresa' },
          { key: 'final_abierto', label: 'Final abierto' },
          { key: 'final_cerrado', label: 'Final cerrado' },
        ].map(m => (
          <View style={styles.modalityButton} key={m.key}>
            <Button
              title={m.label}
              onPress={() => setModality(m.key)}
              color={modality === m.key ? '#2563eb' : undefined}
            />
          </View>
        ))}
      </View>

      {showChapters && (
        <View style={styles.row}>
          <Text>Capítulos:</Text>
          <TextInput
            style={styles.inputSmall}
            value={chapters}
            onChangeText={setChapters}
            keyboardType="numeric"
          />
        </View>
      )}

      <View style={styles.genresContainer}>
        {GENRES.map(g => (
          <View key={g} style={styles.genreItem}>
            <Switch
              value={config.generos.includes(g)}
              onValueChange={() => toggleGenre(g)}
            />
            <Text style={styles.genreLabel}>{g}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <Button title="Limpiar" onPress={clearGenres} />
          <View style={styles.spacer} />
          <Button title="Aleatorio" onPress={randomizeConfig} />
        </View>
      </View>

      <Button
        title={loading ? 'Enviando...' : 'Crear historia'}
        onPress={handleSubmit}
        disabled={loading || tokenCount > TOKEN_LIMIT}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  textarea: {
    height: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  counter: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  modalityButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  inputSmall: {
    width: 60,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 4,
    marginLeft: 8,
  },
  label: {
    marginBottom: 4,
  },
  genresContainer: {
    marginVertical: 16,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  genreLabel: {
    marginLeft: 8,
  },
  spacer: {
    width: 8,
  },
});

