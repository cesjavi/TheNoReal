import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useIntl } from 'react-intl';

import { useSettings } from '../context/SettingsContext';
import LanguageSelector from './components/LanguageSelector';
import { Colors } from '../constants/Colors';
import { postStory } from '../lib/api';
import { parseStoryResponse } from '../lib/parseStoryResponse';

export default function StoryForm() {
  const navigation = useNavigation<any>();
  const { tokenCount } = useSettings();
  const intl = useIntl();
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postStory({ story });
      const text = typeof data === 'string' ? data : data.text || '';
      const { story: parsedStory, options } = parseStoryResponse(text, 2);
      navigation.navigate('Story', { content: parsedStory, options });
    } catch (err: any) {
      console.error('Error sending story', err);
      setError(err.message || 'Error sending story');
    } finally {
      setLoading(false);
    }
  };

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
        title={
          loading
            ? intl.formatMessage({ id: 'StoryForm.sending', defaultMessage: 'Sending...' })
            : 'Go to Story'
        }
        onPress={handleSend}
        disabled={loading}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        title={intl.formatMessage({ id: 'StoryForm.settings' })}
        onPress={() => navigation.navigate('StorySettings')}
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
    borderColor: Colors.light.border,
    padding: 8,
    marginBottom: 12,
  },
  tokens: { marginTop: 12 },
  error: { color: 'red', marginTop: 8 },
});
