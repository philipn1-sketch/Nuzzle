import { activeFeed, endSide, feedStart, isBottle, lastBreast, lastSaved } from './feeds';
import { sideWord, span } from './format';
import { PLAN_SKIP_MIN, planFeedAlerts, planIsOn } from './plan';
import type { Baby, Feed, Settings } from './types';

export interface ReminderPlan {
  at: number;
  body: string;
}

/**
 * The one rule for when the next feed is due. With a daily plan on, it is the plan's first feed time
 * at least an hour after the last feed started; otherwise the last feed's start plus her gap.
 * `feeds` are one baby's feeds; `usePlan` is false when the plan isn't available (no Nuzzle Plus).
 */
export function nextFeedAt(feeds: Feed[], settings: Settings, baby: Baby | undefined, usePlan: boolean): number | null {
  const last = lastSaved(feeds);
  if (!last) return null;
  const start = feedStart(last);
  const plan = baby?.plan;
  if (usePlan && planIsOn(plan)) {
    const t = planFeedAlerts(plan, start + PLAN_SKIP_MIN * 60_000 - 1, null, 2)[0];
    if (t !== undefined) return t;
  }
  return start + settings.intervalMin * 60_000;
}

/** True when the next feed comes from the daily plan rather than the gap. */
export const followsPlan = (baby: Baby | undefined, usePlan: boolean): boolean => usePlan && planIsOn(baby?.plan);

/**
 * When the reminder should fire: when the next feed is due. Nothing is scheduled while a feed is
 * running, when reminders are off, or when that moment has passed. `feeds` are one baby's feeds.
 */
export function planReminder(feeds: Feed[], settings: Settings, now: number, name = 'Baby', baby?: Baby, usePlan = false): ReminderPlan | null {
  if (!settings.remindersOn || activeFeed(feeds)) return null;
  const last = lastSaved(feeds);
  const at = nextFeedAt(feeds, settings, baby, usePlan);
  if (!last || at === null || at <= now) return null;
  if (followsPlan(baby, usePlan)) return { at, body: `Feed time in ${name}'s plan.` };
  const interval = settings.intervalMin * 60_000;
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
