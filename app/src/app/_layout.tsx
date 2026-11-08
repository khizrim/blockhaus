import { DelaGothicOne_400Regular } from '@expo-google-fonts/dela-gothic-one';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold } from '@expo-google-fonts/onest';
import { Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/design/theme';
import { GameProvider } from '@/game/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // Poster identity: Dela Gothic One for display, Onest for text. Both have Cyrillic.
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    DelaGothicOne_400Regular,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
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
        <GameProvider>
          <Navigator />
        </GameProvider>
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
        {/* The board takes swipes from every edge, so the iOS back swipe would steal them. */}
        <Stack.Screen name="game" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="howto" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="pause" options={overlay} />
        <Stack.Screen name="win" options={overlay} />
        <Stack.Screen name="over" options={overlay} />
      </Stack>
    </>
  );
}
