import { activeFeed, endSide, feedStart, isBottle, lastBreast, lastSaved } from './feeds';
import { sideWord, span } from './format';
import type { Baby, Feed, Settings } from './types';

export interface ReminderPlan {
  at: number;
  body: string;
}

/**
 * When the reminder should fire: the start of the saved feed with the latest start time plus her interval.
 * Nothing is scheduled while a feed is running, when reminders are off, or when that moment has passed.
 * `feeds` are one baby's feeds.
 */
export function planReminder(feeds: Feed[], settings: Settings, now: number, name = 'Baby'): ReminderPlan | null {
  if (!settings.remindersOn || activeFeed(feeds)) return null;
  const last = lastSaved(feeds);
  if (!last) return null;
  const interval = settings.intervalMin * 60_000;
  const at = feedStart(last) + interval;
  if (at <= now) return null;
  const breast = lastBreast(feeds);
  const side = !breast
    ? 'It was a bottle.'
    : isBottle(last)
      ? `It was a bottle. The last breast feed ended on the ${sideWord(endSide(breast))}.`
      : `Ended on the ${sideWord(endSide(last))}.`;
  return { at, body: `It has been ${span(interval)} since ${name}'s last feed started. ${side}` };
}

export const babyName = (b: Baby | undefined): string => b?.name.trim() || 'Baby';

/** The baby the app is showing, falling back to the first. */
export const activeBaby = (s: Settings): Baby => s.babies.find((b) => b.id === s.activeBabyId) ?? s.babies[0];

/** Feeds saved before there were babies belong to the first one. */
export const feedsOf = (feeds: Feed[], s: Settings, babyId: string): Feed[] => {
  const first = s.babies[0]?.id;
  return feeds.filter((f) => (f.babyId ?? first) === babyId);
};
