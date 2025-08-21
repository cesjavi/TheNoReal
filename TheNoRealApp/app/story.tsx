import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useSettings } from '../context/SettingsContext';
import { useStory } from '../context/StoryContext';
import { parseStoryResponse } from '../lib/parseStoryResponse';
import { generateImage } from '../lib/imageGenerator';

export default function StoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = useSettings();
  const { chapters, setChapters, choices, setChoices, setHistory } = useStory();

  const {
    initialStory = '',
    initialOptions = [],
    optionsPerDecision = 2,
    endingMode = 'infinita',
    chaptersCount,
    genres = [],
    estilo = {},
    ajustes = {},
  } = route.params || {};

  const [options, setOptions] = useState<string[]>(
    Array.from(new Set(initialOptions)).slice(0, optionsPerDecision)
  );
  const [loading, setLoading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(
    chapters.length || 1
  );
  const [finalized, setFinalized] = useState(false);

  useEffect(() => {
    if (chapters.length === 0 && initialStory) {
      setChapters([{ texto: initialStory, imageUrl: null }]);
    }
  }, [chapters.length, initialStory, setChapters]);

  const progress = useMemo(() => {
    const denom = chaptersCount ? chaptersCount : Math.max(chapters.length, 1);
    return Math.min(100, Math.round((chapters.length / denom) * 100));
  }, [chapters.length, chaptersCount]);

  const buildCurrentStory = () =>
    chapters
      .map((c, idx) => (idx === 0 ? c.texto : `> ${choices[idx - 1]}\n\n${c.texto}`))
      .join('\n\n');

  const backendUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const handleSelect = async (option: string) => {
    if (loading || finalized) return;
    setLoading(true);
    setHistory(prev => [
      ...prev,
      {
        chapters: chapters.map(c => ({ ...c })),
        options,
        currentChapter,
        choices: [...choices],
      },
    ]);

    const currentStory = buildCurrentStory();
    const nextStory = `${currentStory}\n> ${option}`;

    try {
      const nextChapter = currentChapter + 1;
      const { creatividad, topP, ...restAjustes } = ajustes;
      const ajustesPayload = { ...restAjustes, temperature: creatividad, top_p: topP };

      const res = await fetch(`${backendUrl}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: nextStory,
          option,
          optionsPerDecision,
          genres,
          estilo,
          ajustes: ajustesPayload,
          language,
        }),
      });
      const data = await res.json();
      const text = (data.text as string) || '';
      const { story: newStory, options: newOptions } = parseStoryResponse(
        text,
        optionsPerDecision
      );

      let imageUrl: string | null = null;
      try {
        const { url } = await generateImage(newStory, genres);
        imageUrl = url;
      } catch (err) {
        console.error('No se pudo generar la imagen', err);
      }

      setChapters(prev => [...prev, { texto: newStory, imageUrl }]);
      setChoices(prev => [...prev, option]);
      setCurrentChapter(nextChapter);

      let opts = Array.from(new Set(newOptions.filter(Boolean))).slice(
        0,
        optionsPerDecision
      );

      let end = false;
      if (endingMode === 'capitulos') {
        if (chaptersCount && nextChapter > chaptersCount) end = true;
      } else if (endingMode === 'final_sorpresa') {
        const surprise = 0.1;
        if ((chaptersCount && nextChapter > chaptersCount) || Math.random() < surprise) {
          end = true;
        }
      } else if (endingMode === 'sin_final_definido') {
        // respeta salida del modelo
      }

      if (end) {
        opts = [];
        setFinalized(true);
      }

      setOptions(opts);
    } catch (err) {
      console.error('Error al consultar el backend', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (loading || finalized) return;
    setLoading(true);
    const currentStory = buildCurrentStory();
    try {
      const { creatividad, topP, ...restAjustes } = ajustes;
      const ajustesPayload = { ...restAjustes, temperature: creatividad, top_p: topP };
      const res = await fetch(`${backendUrl}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: currentStory,
          option: '',
          optionsPerDecision: 0,
          finalize: true,
          genres,
          estilo,
          ajustes: ajustesPayload,
          language,
        }),
      });
      const data = await res.json();
      const text = (data.text as string) || '';
      const { story: newStory } = parseStoryResponse(text, 0);
      if (newStory) {
        setChapters(prev => [...prev, { texto: newStory, imageUrl: null }]);
      }
      setOptions([]);
      setFinalized(true);
    } catch (err) {
      console.error('Error al finalizar', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const storyText = buildCurrentStory();
    try {
      await Share.share({ message: storyText });
    } catch (err) {
      console.error('No se pudo compartir la historia', err);
      Alert.alert('Error', 'No se pudo compartir la historia');
    }
  };

  const handleBack = () => {
    setChapters([]);
    setChoices([]);
    setHistory([]);
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Story ({language})</Text>
      <Text style={styles.progress}>Progreso: {progress}%</Text>

      {chapters.map((c, idx) => (
        <View key={idx} style={styles.chapter}>
          {idx > 0 && (
            <Text style={styles.choice}>{`↳ ${choices[idx - 1]}`}</Text>
          )}
          {c.imageUrl && (
            <Image source={{ uri: c.imageUrl }} style={styles.image} />
          )}
          <Text style={styles.content}>{c.texto}</Text>
        </View>
      ))}

      {options.map((opt, idx) => (
        <View key={idx} style={styles.option}>
          <Button
            title={opt}
            onPress={() => handleSelect(opt)}
            disabled={loading || finalized}
          />
        </View>
      ))}

      {finalized && <Text style={styles.finalized}>Historia finalizada</Text>}

      <View style={styles.actions}>
        <Button title="Volver" onPress={handleBack} disabled={loading} />
        <Button title="Descargar" onPress={handleDownload} disabled={loading} />
        <Button
          title="Finalizar"
          onPress={handleFinalize}
          disabled={loading || finalized}
        />
      </View>

      {loading && <ActivityIndicator style={styles.loading} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  title: { fontSize: 24, marginBottom: 12 },
  progress: { marginBottom: 12 },
  chapter: { marginBottom: 16 },
  choice: { fontStyle: 'italic', marginBottom: 4 },
  image: { width: '100%', height: 200, borderRadius: 8, marginBottom: 8 },
  content: { marginBottom: 8 },
  option: { marginBottom: 8 },
  finalized: { marginTop: 8, fontStyle: 'italic' },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loading: { marginTop: 16 },
});

