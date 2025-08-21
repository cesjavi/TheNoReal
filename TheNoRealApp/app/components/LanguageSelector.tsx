import React from 'react';
import { Button, View } from 'react-native';
import { useIntl } from 'react-intl';
import { useLanguage } from '../providers/LanguageProvider';

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const intl = useIntl();

  const toggle = () => setLocale(locale === 'en' ? 'es' : 'en');

  return (
    <View>
      <Button
        title={intl.formatMessage({
          id: locale === 'en' ? 'LanguageSelector.spanish' : 'LanguageSelector.english',
        })}
        onPress={toggle}
      />
    </View>
  );
}
