import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useIntl } from 'react-intl';

import { useSettings } from '../context/SettingsContext';
import { useLanguage } from './providers/LanguageProvider';

export default function StoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tokenCount } = useSettings();
  const { locale } = useLanguage();
  const intl = useIntl();
  const content = route.params?.content ?? '';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {intl.formatMessage({ id: 'Story.title' }, { language: locale })}
      </Text>
      <Text style={styles.content}>{content}</Text>
      <Text style={styles.tokens}>
        {intl.formatMessage({ id: 'Story.tokens' }, { count: tokenCount })}
      </Text>
      <Button
        title={intl.formatMessage({ id: 'Story.back' })}
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 12 },
  content: { marginBottom: 12 },
  tokens: { marginBottom: 12 },
});
