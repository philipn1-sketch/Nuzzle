// Stands in for src/state/theme.ts in the design build. The app picks Night or Day from its saved
// settings; here the theme comes from <NuzzleTheme>, so components render without the app's storage.
import { createContext, useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { ThemeName } from '../../src/core/types';
import { palettes, type Palette } from '../../src/theme';

const ThemeContext = createContext<ThemeName>('night');

export function useThemeName(): ThemeName {
  return useContext(ThemeContext);
}

export const usePalette = (): Palette => palettes[useThemeName()];

/**
 * The root every Nuzzle screen sits in. Sets Night (deep plum, the default) or Day (blush) for
 * every component inside, and paints the screen background unless `paint` is false.
 */
export function NuzzleTheme({ theme = 'night', paint = true, children }: { theme?: ThemeName; paint?: boolean; children?: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 402, height: 874 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <ThemeContext.Provider value={theme}>
        {paint ? <View style={{ flex: 1, backgroundColor: palettes[theme].bg }}>{children}</View> : children}
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
