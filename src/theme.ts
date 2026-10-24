import type { ThemeName } from './core/types';

/** Six colours per theme. See docs/style.md for the reasoning and measured contrast. */
export const palettes = {
  night: {
    bg: '#16120F',
    surface: '#251E19',
    ink: '#EFE3D3',
    muted: '#B5A592',
    accent: '#E0B16B',
    onAccent: '#2A1C0C',
  },
  day: {
    bg: '#F4ECE1',
    surface: '#FBF5EC',
    ink: '#2C221B',
    muted: '#6B5C4F',
    accent: '#8A581A',
    onAccent: '#FBF5EC',
  },
} as const;

export type Palette = (typeof palettes)[ThemeName];

/** Dividers: muted at 25% opacity. */
export const line = (p: Palette) => `${p.muted}40`;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, side: 20 } as const;
export const radius = { row: 16, card: 24, big: 32 } as const;
export const TAP = 56;

export const type = {
  timer: { fontSize: 64, fontWeight: '600', fontVariant: ['tabular-nums'] },
  answer: { fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 17, fontWeight: '600' },
  label: { fontSize: 15, fontWeight: '500' },
  small: { fontSize: 13, fontWeight: '500' },
} as const;
