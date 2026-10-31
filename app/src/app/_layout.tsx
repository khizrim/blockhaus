import { DelaGothicOne_400Regular } from '@expo-google-fonts/dela-gothic-one';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold } from '@expo-google-fonts/onest';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/design/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // Poster identity: Dela Gothic One for display, Onest for text. Both have Cyrillic.
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    DelaGothicOne_400Regular,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      {/* Every animation follows the system's reduced-motion setting. */}
      <ReducedMotionConfig mode={ReduceMotion.System} />
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
        <Stack.Screen name="sounds" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pause" options={overlay} />
        <Stack.Screen name="win" options={overlay} />
        <Stack.Screen name="over" options={overlay} />
      </Stack>
    </>
  );
}
