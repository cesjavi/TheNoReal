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
import { useIntl } from 'react-intl';

import { useLanguage } from './providers/LanguageProvider';
import { useSettings } from '../context/SettingsContext';
import { useStory } from '../context/StoryContext';
import { parseStoryResponse } from '../lib/parseStoryResponse';
import { generateImage } from '../lib/imageGenerator';

export default function StoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tokenCount } = useSettings();
  const { locale } = useLanguage();
  const intl = useIntl();
  const { initialStory = '', initialOptions = [] } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story ({locale})</Text>
      <Text style={styles.content}>{initialStory}</Text>
      {initialOptions.map((opt: string, idx: number) => (
        <Text key={idx}>{opt}</Text>
      ))}
      <Text style={styles.tokens}>Tokens: {tokenCount}</Text>
      <Button
        title={intl.formatMessage({ id: 'Story.back' })}
        onPress={() => navigation.goBack()}
      />
    </View>
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

