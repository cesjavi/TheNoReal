import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '../hooks/useColorScheme';
import { SettingsProvider } from '../context/SettingsContext';
import LanguageProvider from './providers/LanguageProvider';
import { useIntl } from 'react-intl';
import { Colors } from '../constants/Colors';

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
    <View
      style={
        colorScheme === 'dark' ? styles.darkContainer : styles.lightContainer
      }
    >
      <SettingsProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ title: 'Home' }} />
            <Stack.Screen name="Story" options={{ title: 'Story' }} />
            <Stack.Screen name="story-settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SettingsProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <LayoutInner />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  lightContainer: {
    flex: 1,
    background: `linear-gradient(135deg, ${Colors.light.background}, ${Colors.light.accent})`,
  },
  darkContainer: {
    flex: 1,
    background: `linear-gradient(135deg, ${Colors.dark.background}, ${Colors.dark.accent})`,
  },
});
