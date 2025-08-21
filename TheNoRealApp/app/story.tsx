import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Speech from 'expo-speech';

import { useSettings } from '../context/SettingsContext';
import { generateImage } from '../lib/imageGenerator';

export default function StoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language, tokenCount } = useSettings();
  const content = route.params?.content ?? '';
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (content) {
      generateImage(content)
        .then(({ url }) => {
          if (active) setImageUrl(url);
        })
        .catch((err) => console.error(err));
    }
    return () => {
      active = false;
      Speech.stop();
    };
  }, [content]);

  const handleSpeak = () => {
    if (content) {
      Speech.stop();
      Speech.speak(content, { language });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story ({language})</Text>
      {imageUrl && <Image source={{ uri: imageUrl }} style={styles.image} />}
      <Text style={styles.content}>{content}</Text>
      <Text style={styles.tokens}>Tokens: {tokenCount}</Text>
      <Button title="Listen" onPress={handleSpeak} />
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 12 },
  image: { width: '100%', height: 200, marginBottom: 12 },
  content: { marginBottom: 12 },
  tokens: { marginBottom: 12 },
});
