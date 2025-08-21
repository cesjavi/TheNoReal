import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useIntl } from 'react-intl';

import { useSettings } from '../context/SettingsContext';
import LanguageSelector from './components/LanguageSelector';

export default function StoryForm() {
  const navigation = useNavigation<any>();
  const { tokenCount } = useSettings();
  const intl = useIntl();
  const [story, setStory] = useState('');

  return (
    <View style={styles.container}>
      <LanguageSelector />
      <Text style={styles.title}>{intl.formatMessage({ id: 'StoryForm.title' })}</Text>
      <TextInput
        style={styles.input}
        placeholder={intl.formatMessage({ id: 'StoryForm.placeholder' })}
        value={story}
        onChangeText={setStory}
      />
      <Button
        title="Go to Story"
        onPress={() => navigation.navigate('Story', { content: story })}
      />
      <Button
        title={intl.formatMessage({ id: 'StoryForm.settings' })}
        onPress={() => navigation.navigate('story-settings')}
      />
      <Text style={styles.tokens}>
        {intl.formatMessage({ id: 'StoryForm.tokens' }, { count: tokenCount })}
      </Text>
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
