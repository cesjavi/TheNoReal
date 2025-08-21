import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '../hooks/useColorScheme';
import { SettingsProvider } from '../context/SettingsContext';
import LanguageProvider from './providers/LanguageProvider';
import { useIntl } from 'react-intl';

function LayoutInner() {
  const colorScheme = useColorScheme();
  const intl = useIntl();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <SettingsProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ title: intl.formatMessage({ id: 'Navigation.home' }) }} />
          <Stack.Screen
            name="story"
            options={{ title: intl.formatMessage({ id: 'Navigation.story' }) }}
          />
          <Stack.Screen
            name="story-settings"
            options={{ title: intl.formatMessage({ id: 'Navigation.settings' }) }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SettingsProvider>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <LayoutInner />
    </LanguageProvider>
  );
}
