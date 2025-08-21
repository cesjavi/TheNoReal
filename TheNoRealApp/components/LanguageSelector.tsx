import React from 'react';
import { View, Button, Text } from 'react-native';
import { useIntl } from 'react-intl';
import { useLanguage } from '@/app/providers/LanguageProvider';

const LanguageSelector = () => {
  const { locale, setLocale } = useLanguage();
  const intl = useIntl();

  return (
    <View style={{ gap: 8 }}>
      <Text>{intl.formatMessage({ id: 'LanguageSelector.selectLanguage' })}</Text>
      <Button
        title={intl.formatMessage({ id: 'LanguageSelector.english' })}
        onPress={() => setLocale('en')}
        disabled={locale === 'en'}
      />
      <Button
        title={intl.formatMessage({ id: 'LanguageSelector.spanish' })}
        onPress={() => setLocale('es')}
        disabled={locale === 'es'}
      />
    </View>
  );
};

export default LanguageSelector;
