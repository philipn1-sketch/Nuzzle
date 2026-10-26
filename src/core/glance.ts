import { activeFeed, endSide, feedStart, lastBreast, lastSaved, suggestedSide, totalMs } from './feeds';
import { amount, sideName, sideWord, span, timeOf } from './format';
import type { Feed, Units } from './types';

/**
 * What the home screen widget shows. Plain values only: the widget runs on its own, outside the app,
 * and draws the live times itself from these timestamps.
 */
export interface GlanceProps {
  name: string;
  /** Start of the last feed, breast or bottle, in ms; 0 when there are none yet. */
  lastStart: number;
  /** "Ended on the left" or "Bottle, 90 ml". */
  lastLine: string;
  /** "Right": the side to start on next; empty before the first breast feed. */
  next: string;
  /** "L" or "R": the side feeding now, or else the side to start on next. */
  letter: string;
  /** Empty, or "Feeding on the left" or "Paused on the left". */
  feeding: string;
  /** The timer counts up from here, so it shows the time fed with pauses left out. */
  timerFrom: number;
  /** When paused, the moment the timer stopped; 0 while running. */
  pausedAt: number;
  /** The end of her window: the last feed's start plus her interval; 0 before the first feed. */
  dueAt: number;
  /** Her window in words, such as "2h". */
  windowText: string;
}

/** What the lock screen and Dynamic Island show while a feed is being timed. */
export interface ActivityProps {
  name: string;
  /** "L" or "R", for the small Dynamic Island. */
  letter: string;
  status: string;
  startedAt: string;
  timerFrom: number;
  pausedAt: number;
  /** 'waiting' between feeds: the lock screen counts up from the start of the last feed. */
  mode?: 'feeding' | 'waiting';
  /** Between feeds: the last feed's start, in ms. */
  lastStart?: number;
}

function timer(f: Feed, now: number) {
  const last = f.segments[f.segments.length - 1];
  const pausedAt = f.status === 'paused' && last.end !== null ? last.end : 0;
  const at = pausedAt || now;
  return { timerFrom: at - totalMs(f, at), pausedAt };
}

export function glanceProps(feeds: Feed[], name: string, units: Units, now: number, intervalMin = 120, dueAt?: number | null): GlanceProps {
  const last = lastSaved(feeds);
  const breast = lastBreast(feeds);
  const next = suggestedSide(feeds);
  const a = activeFeed(feeds);
  return {
    name,
    lastStart: last ? feedStart(last) : 0,
    lastLine: !last ? '' : last.bottle ? `Bottle, ${amount(last.bottle.amountMl, units)}` : `Ended on the ${sideWord(endSide(last))}`,
    next: next && breast ? sideName(next) : '',
    letter: a ? endSide(a) : next && breast ? next : '',
    feeding: a ? `${a.status === 'paused' ? 'Paused' : 'Feeding'} on the ${sideWord(endSide(a))}` : '',
    ...(a ? timer(a, now) : { timerFrom: 0, pausedAt: 0 }),
    dueAt: last ? dueAt ?? feedStart(last) + intervalMin * 60_000 : 0,
    windowText: span(intervalMin * 60_000),
  };
}

/** The lock screen between feeds: how long since the last feed started, and the side to start on. Null before the first feed. */
export function waitingProps(feeds: Feed[], name: string): ActivityProps | null {
  const last = lastSaved(feeds);
  if (!last || activeFeed(feeds)) return null;
  const next = lastBreast(feeds) ? suggestedSide(feeds) : null;
  return {
    name,
    mode: 'waiting',
    letter: next ?? '',
    status: next ? `Start on the ${sideWord(next)}` : 'Next feed',
    startedAt: `Last feed ${timeOf(feedStart(last))}`,
    timerFrom: 0,
    pausedAt: 0,
    lastStart: feedStart(last),
  };
}

export function activityProps(f: Feed, name: string, now: number): ActivityProps {
  const side = endSide(f);
  return {
    name,
    letter: side,
    status: `${f.status === 'paused' ? 'Paused' : 'Feeding'} on the ${sideWord(side)}`,
    startedAt: `Started at ${timeOf(feedStart(f))}`,
    mode: 'feeding',
    ...timer(f, now),
  };
}
