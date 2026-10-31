import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/design/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'ArchivoWide-ExtraBold': require('@/assets/fonts/ArchivoWide-ExtraBold.ttf'),
    'ArchivoWide-Black': require('@/assets/fonts/ArchivoWide-Black.ttf'),
    'ArchivoTile-ExtraBold': require('@/assets/fonts/ArchivoTile-ExtraBold.ttf'),
    'ArchivoNarrow-ExtraBold': require('@/assets/fonts/ArchivoNarrow-ExtraBold.ttf'),
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Navigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Navigator() {
  const { c, isDark } = useTheme();
  const overlay = { presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } } as const;
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="game" />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="howto" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="kit" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pause" options={overlay} />
        <Stack.Screen name="win" options={overlay} />
        <Stack.Screen name="over" options={overlay} />
      </Stack>
    </>
  );
}
