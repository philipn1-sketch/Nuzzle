import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadFonts } from '../services/fonts';
import { AppStateProvider } from '../state/AppState';
import { useThemeName } from '../state/theme';
import { palettes } from '../theme';

function Themed() {
  const theme = useThemeName();
  const p = palettes[theme];
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(p.bg).catch(() => {});
  }, [p.bg]);
  return (
    <>
      <StatusBar style={theme === 'night' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: 'fade', animationDuration: 200 }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="action" options={{ animation: 'none' }} />
        <Stack.Screen name="feed/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

loadFonts();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Themed />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
