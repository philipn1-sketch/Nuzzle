import { useApp } from './AppState';
import { palettes, type Palette } from '../theme';

export const usePalette = (): Palette => palettes[useApp().settings.theme];
