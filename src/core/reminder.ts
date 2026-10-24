import { activeFeed, endSide, feedStart, lastSaved } from './feeds';
import { sideWord, span } from './format';
import type { Feed, Settings } from './types';

export interface ReminderPlan {
  at: number;
  body: string;
}

/**
 * When the reminder should fire: the start of the saved feed with the latest start time plus her interval.
 * Nothing is scheduled while a feed is running, when reminders are off, or when that moment has passed.
 */
export function planReminder(feeds: Feed[], settings: Settings, now: number): ReminderPlan | null {
  if (!settings.remindersOn || activeFeed(feeds)) return null;
  const last = lastSaved(feeds);
  if (!last) return null;
  const interval = settings.intervalMin * 60_000;
  const at = feedStart(last) + interval;
  if (at <= now) return null;
  return {
    at,
    body: `It has been ${span(interval)} since ${babyName(settings)}'s last feed started. Ended on the ${sideWord(endSide(last))}.`,
  };
}

export const babyName = (s: Settings): string => s.babyName.trim() || 'Baby';
