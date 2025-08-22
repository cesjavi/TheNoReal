import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '../hooks/useColorScheme';
import { SettingsProvider } from '../context/SettingsContext';
import LanguageProvider from './providers/LanguageProvider';
import { Colors } from '../constants/Colors';

function LayoutInner() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Geist: require('../assets/fonts/Geist-Regular.ttf'),
    GeistMono: require('../assets/fonts/GeistMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  const gradientColors =
    colorScheme === 'dark'
      ? [Colors.dark.background, Colors.dark.accent]
      : [Colors.light.background, Colors.light.accent];

  const fallbackColor =
    colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, { backgroundColor: fallbackColor }]}
    >
      <SettingsProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ title: 'Home' }} />
            <Stack.Screen name="Story" options={{ title: 'Story' }} />
            <Stack.Screen name="StorySettings" options={{ title: 'Settings' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SettingsProvider>
    </LinearGradient>
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
  container: {
    flex: 1,
  },
});
