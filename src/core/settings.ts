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
  // plans used to be kept apart from the babies; they now travel with them so a second phone gets them
  if (s.plans) {
    const old = s.plans;
    s.babies = s.babies.map((b) => (b.plan || !old[b.id] ? b : { ...b, plan: { ...old[b.id], updatedAt: old[b.id].updatedAt ?? 1 } }));
    delete s.plans;
    // so the moved plans go up to the backup on the next sync
    s.babiesUpdatedAt = Date.now();
  }
  // plan reminders are each phone's own choice
  if (s.planReminders === undefined) {
    s.planReminders = s.babies.filter((b) => b.plan?.reminders).map((b) => b.id);
  }
  // families here before Nuzzle Plus keep everything; a new install starts its free week now
  if (raw.plus === undefined) s.plus = Object.keys(raw).length > 0 ? { owned: 'gift' } : { trialStartedAt: Date.now() };
  // anyone who already had settings saved was using the app before the welcome questions existed
  if (raw.onboarded === undefined) s.onboarded = Object.keys(raw).length > 0;
  return s;
}
