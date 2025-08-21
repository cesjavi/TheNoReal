import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useSettings } from '../context/SettingsContext';

export default function StoryForm() {
  const navigation = useNavigation<any>();
  const { tokenCount } = useSettings();
  const [story, setStory] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story Form</Text>
      <TextInput
        style={styles.input}
        placeholder="Write a story..."
        value={story}
        onChangeText={setStory}
      />
      <Button
        title="Go to Story"
        onPress={() => navigation.navigate('Story', { content: story })}
      />
      <Button
        title="Settings"
        onPress={() => navigation.navigate('story-settings')}
      />
      <Text style={styles.tokens}>Tokens: {tokenCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 12,
  },
  tokens: { marginTop: 12 },
});
