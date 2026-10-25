import { useColorScheme } from 'react-native';

import type { ThemeName } from '../core/types';
import { palettes, type Palette } from '../theme';
import { useApp } from './AppState';

/** Night or Day; System follows the phone's own dark mode setting. */
export function useThemeName(): ThemeName {
  const chosen = useApp().settings.theme;
  const phone = useColorScheme();
  if (chosen !== 'system') return chosen;
  return phone === 'light' ? 'day' : 'night';
}

export const usePalette = (): Palette => palettes[useThemeName()];
