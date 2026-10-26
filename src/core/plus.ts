import type { Settings } from './types';
import { t, tk, tn } from '../i18n';

/**
 * Nuzzle Plus. Everything she needs during a feed stays free: the Left and Right timer, the next feed
 * countdown and reminder, the lock screen timer, logging and the full history. Plus adds the extras.
 */
export type PlusFeature = 'sharing' | 'plan' | 'insights' | 'widget' | 'babies';

export const PLUS_FEATURES: { id: PlusFeature; title: string; line: string }[] = [
  { id: 'sharing', title: tk('Share with a second phone'), line: tk('Both parents see the same feeds, with an online backup.') },
  { id: 'plan', title: tk('Daily plan'), line: tk('A gentle day for her age, with the next feed and reminder taken from it.') },
  { id: 'widget', title: tk('Home screen widget'), line: tk('The next side and a live countdown, without opening the app.') },
  { id: 'insights', title: tk('Week view and check up summary'), line: tk('Seven day charts, and a one page PDF to show your nurse or GP.') },
  { id: 'babies', title: tk('More than one baby'), line: tk('Twins, or a little one on the way.') },
];

export const TRIAL_DAYS = 7;
const DAY = 86_400_000;

/** Shown until the App Store's own prices are loaded. Australian dollars. */
export const PRICES = { monthly: tk('A$1.99 a month'), lifetime: tk('A$9.99 once') } as const;

export interface PlusState {
  /** When her free week started: the first time the app opened. */
  trialStartedAt?: number;
  /** What she bought, or 'gift' for families using Nuzzle before Plus existed. */
  owned?: 'monthly' | 'lifetime' | 'gift';
}

export const trialEndsAt = (s: Settings): number | null => (s.plus?.trialStartedAt ? s.plus.trialStartedAt + TRIAL_DAYS * DAY : null);

export const ownsPlus = (s: Settings): boolean => s.plus?.owned !== undefined;

export function hasPlus(s: Settings, now: number): boolean {
  if (ownsPlus(s)) return true;
  const end = trialEndsAt(s);
  return end !== null && now < end;
}

/** Whole days left in the free week, rounded up; 0 once it is over or when she owns Plus. */
export function trialDaysLeft(s: Settings, now: number): number {
  const end = trialEndsAt(s);
  if (ownsPlus(s) || end === null || now >= end) return 0;
  return Math.ceil((end - now) / DAY);
}

/** One line for Settings and the paywall. */
export function plusStatus(s: Settings, now: number): string {
  if (s.plus?.owned === 'gift') return t('Nuzzle Plus is free on this phone, as a thank you for being here first.');
  if (s.plus?.owned === 'lifetime') return t('You have Nuzzle Plus for life.');
  if (s.plus?.owned === 'monthly') return t('You have Nuzzle Plus.');
  const left = trialDaysLeft(s, now);
  if (left > 0) return tn('Free week of Nuzzle Plus: {n} day left.', 'Free week of Nuzzle Plus: {n} days left.', left);
  return t('Your free week has ended. Feeds, reminders and history stay free.');
}
