import { REMINDER_DEFAULT_MIN } from '../config';
import type { Settings } from './types';

export const FIRST_BABY = 'b1';

export const DEFAULT_SETTINGS: Settings = {
  babies: [{ id: FIRST_BABY, name: '', birthday: null }],
  activeBabyId: FIRST_BABY,
  units: 'ml',
  clockReminders: [],
  quiet: { on: false, fromMin: 22 * 60, toMin: 6 * 60 },
  remindersOn: true,
  intervalMin: REMINDER_DEFAULT_MIN,
  theme: 'night',
  reminderAsked: false,
};

/** Reads settings saved by any earlier version. The old single `babyName` becomes the first baby. */
export function migrateSettings(raw: Record<string, unknown>): Settings {
  const { babyName, ...rest } = raw as Partial<Settings> & { babyName?: string };
  const s: Settings = { ...DEFAULT_SETTINGS, ...rest };
  if (!Array.isArray(raw.babies) || raw.babies.length === 0) {
    s.babies = [{ id: FIRST_BABY, name: typeof babyName === 'string' ? babyName : '', birthday: null }];
  }
  if (!s.babies.some((b) => b.id === s.activeBabyId)) s.activeBabyId = s.babies[0].id;
  return s;
}
