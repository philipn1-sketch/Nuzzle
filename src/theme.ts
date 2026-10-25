import { Platform } from 'react-native';

import type { ThemeName } from './core/types';

/**
 * Six colours per theme: soft midnight plum at night, blush in the day.
 * Rose marks what is happening now; peach is the main action. See docs/style.md for measured contrast.
 */
export const palettes = {
  night: {
    bg: '#1A1221',
    surface: '#2A1E33',
    ink: '#F4E9EF',
    muted: '#BBA9C2',
    accent: '#EBA3B9',
    peach: '#F4BC9C',
    onAccent: '#1A1221',
  },
  day: {
    bg: '#F6EEF3',
    surface: '#FFF9FB',
    ink: '#2D1E33',
    muted: '#6B5872',
    accent: '#A8456A',
    peach: '#A9532B',
    onAccent: '#F6EEF3',
  },
} as const;

export type Palette = (typeof palettes)[ThemeName];

/** Each side keeps its own colour everywhere: Left is rose, Right is peach. */
export const sideColor = (p: Palette, side: 'L' | 'R') => (side === 'L' ? p.accent : p.peach);

/** Dividers and quiet outlines: muted at 25% opacity. */
export const line = (p: Palette) => `${p.muted}40`;
/** A soft wash of a colour, for tints behind chips and the ring track. */
export const wash = (hex: string, alpha = '26') => `${hex}${alpha}`;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, side: 20 } as const;
export const radius = { row: 18, card: 28, big: 36 } as const;
export const TAP = 56;

/** Apple's rounded system font on iPhone; a close match in the web preview. */
const rounded = Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, Nunito, system-ui, sans-serif', default: undefined });

export const type = {
  timer: { fontFamily: rounded, fontSize: 56, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  answer: { fontFamily: rounded, fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  side: { fontFamily: rounded, fontSize: 30, fontWeight: '700' },
  title: { fontFamily: rounded, fontSize: 21, fontWeight: '700' },
  body: { fontFamily: rounded, fontSize: 17, fontWeight: '600' },
  label: { fontFamily: rounded, fontSize: 15, fontWeight: '500' },
  small: { fontFamily: rounded, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
} as const;
