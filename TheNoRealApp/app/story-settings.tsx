import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useSettings } from '../context/SettingsContext';

export default function StorySettings() {
  const navigation = useNavigation<any>();
  const { language, setLanguage, tokenCount, setTokenCount } = useSettings();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text>Language: {language}</Text>
      <Button
        title="Toggle Language"
        onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
      />
      <Text style={styles.spacer}>Tokens: {tokenCount}</Text>
      <Button title="Add Token" onPress={() => setTokenCount(tokenCount + 1)} />
      <Button title="Done" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 12 },
  spacer: { marginVertical: 12 },
});
