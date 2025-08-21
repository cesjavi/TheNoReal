import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useSettings } from '../context/SettingsContext';

export default function StoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language, tokenCount } = useSettings();
  const content = route.params?.content ?? '';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story ({language})</Text>
      <Text style={styles.content}>{content}</Text>
      <Text style={styles.tokens}>Tokens: {tokenCount}</Text>
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 12 },
  content: { marginBottom: 12 },
  tokens: { marginBottom: 12 },
});
