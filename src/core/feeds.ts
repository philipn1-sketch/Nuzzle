import { MIN_FEED_MS } from '../config';
import type { Feed, Milk, Segment, Settings, Side } from './types';

export const other = (side: Side): Side => (side === 'L' ? 'R' : 'L');

export const isBottle = (f: Feed): boolean => f.kind === 'bottle';

export const feedStart = (f: Feed): number => (f.bottle ? f.bottle.at : f.segments[0].start);

export const feedEnd = (f: Feed, now: number): number => {
  if (f.bottle) return f.bottle.at;
  const last = f.segments[f.segments.length - 1];
  return last.end ?? now;
};

const segMs = (s: Segment, now: number) => Math.max(0, (s.end ?? now) - s.start);

/** Time fed on one side. Pauses are gaps between segments, so they never count. */
export const sideMs = (f: Feed, side: Side, now: number): number =>
  f.segments.filter((s) => s.side === side).reduce((n, s) => n + segMs(s, now), 0);

export const totalMs = (f: Feed, now: number): number => f.segments.reduce((n, s) => n + segMs(s, now), 0);

export const runningSide = (f: Feed): Side | null => {
  const last = f.segments[f.segments.length - 1];
  return f.status === 'running' && last && last.end === null ? last.side : null;
};

export const endSide = (f: Feed): Side => f.segments[f.segments.length - 1].side;

/** The sides in the order they were fed, joining back to back stretches on the same side. */
export const sideRuns = (f: Feed, now: number): { side: Side; ms: number }[] => {
  const runs: { side: Side; ms: number }[] = [];
  for (const s of f.segments) {
    const prev = runs[runs.length - 1];
    if (prev && prev.side === s.side) prev.ms += segMs(s, now);
    else runs.push({ side: s.side, ms: segMs(s, now) });
  }
  const real = runs.filter((r) => r.ms >= 30_000);
  return real.length ? real : runs.slice(-1);
};

const live = (feeds: Feed[]) => feeds.filter((f) => f.deletedAt === null);

/** The feed being timed right now, if any. */
export const activeFeed = (feeds: Feed[]): Feed | null =>
  live(feeds).find((f) => f.status === 'running' || f.status === 'paused') ?? null;

/** Saved feeds, newest start first. */
export const savedFeeds = (feeds: Feed[]): Feed[] =>
  live(feeds)
    .filter((f) => f.status === 'saved')
    .sort((a, b) => feedStart(b) - feedStart(a));

/** The saved feed with the latest start time, breast or bottle. */
export const lastSaved = (feeds: Feed[]): Feed | null => savedFeeds(feeds)[0] ?? null;

/** The latest saved breast feed, which is what the side suggestion follows. */
export const lastBreast = (feeds: Feed[]): Feed | null => savedFeeds(feeds).find((f) => !isBottle(f)) ?? null;

/** The side to offer next: the opposite of where the last breast feed ended. */
export const suggestedSide = (feeds: Feed[]): Side | null => {
  const last = lastBreast(feeds);
  return last ? other(endSide(last)) : null;
};

export const sinceLastStartMs = (feeds: Feed[], now: number): number | null => {
  const last = lastSaved(feeds);
  return last ? now - feedStart(last) : null;
};

/** Her interval has passed since the last feed started, and nothing is running. */
export const isDue = (feeds: Feed[], settings: Settings, now: number): boolean => {
  const since = sinceLastStartMs(feeds, now);
  return activeFeed(feeds) === null && since !== null && since >= settings.intervalMin * 60_000;
};

/** A feed has been going longer than her interval: she may have fallen asleep with it running. */
export const looksForgotten = (feeds: Feed[], settings: Settings, now: number): boolean => {
  const a = activeFeed(feeds);
  return a !== null && now - feedStart(a) > settings.intervalMin * 60_000;
};

// ---------- timing ----------

/** One tap on a side: start a feed, pause it, carry on, or switch. */
export function tapSide(active: Feed | null, side: Side, now: number, newId: () => string): Feed {
  if (!active) {
    return { id: newId(), status: 'running', segments: [{ side, start: now, end: null }], deletedAt: null };
  }
  const segments = active.segments.map((s) => ({ ...s }));
  const last = segments[segments.length - 1];
  if (active.status === 'running' && last.end === null) {
    last.end = now;
    if (last.side === side) return { ...active, status: 'paused', segments };
  }
  segments.push({ side, start: now, end: null });
  return { ...active, status: 'running', segments };
}

/** Stop and save. Returns null for a mistap that is too short to keep. */
export function finishFeed(active: Feed, now: number): Feed | null {
  const segments = active.segments.map((s) => (s.end === null ? { ...s, end: now } : { ...s }));
  const feed: Feed = { ...active, status: 'saved', segments };
  return totalMs(feed, now) < MIN_FEED_MS ? null : feed;
}

// ---------- editing ----------

export interface FeedDraft {
  start: number;
  leftMin: number;
  rightMin: number;
  endedOn: Side;
  /** Breast unless set. */
  kind?: 'breast' | 'bottle';
  amountMl?: number;
  milk?: Milk;
  note?: string;
}

const cleanNote = (n: string | undefined) => {
  const t = (n ?? '').trim();
  return t ? { note: t } : {};
};

const editorMinutes = (ms: number) => (ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60_000)));

export const draftFrom = (f: Feed, now: number): FeedDraft =>
  f.bottle
    ? { start: f.bottle.at, leftMin: 0, rightMin: 0, endedOn: 'L', kind: 'bottle', amountMl: f.bottle.amountMl, milk: f.bottle.milk, note: f.note ?? '' }
    : {
        start: feedStart(f),
        leftMin: editorMinutes(sideMs(f, 'L', now)),
        rightMin: editorMinutes(sideMs(f, 'R', now)),
        endedOn: endSide(f),
        kind: 'breast',
        note: f.note ?? '',
      };

/** The side it ended on, corrected when only one side has minutes. */
export const effectiveEndSide = (d: FeedDraft): Side => {
  if (d.leftMin > 0 && d.rightMin === 0) return 'L';
  if (d.rightMin > 0 && d.leftMin === 0) return 'R';
  return d.endedOn;
};

/** Builds a saved feed from typed in minutes: the other side first, then the side it ended on. */
export function feedFromDraft(d: FeedDraft, id: string): Feed {
  if (d.kind === 'bottle') {
    return {
      id, status: 'saved', segments: [], deletedAt: null, kind: 'bottle',
      bottle: { at: d.start, amountMl: d.amountMl ?? 0, milk: d.milk ?? 'breast' }, ...cleanNote(d.note),
    };
  }
  const ended = effectiveEndSide(d);
  const first = other(ended);
  const ms = { L: d.leftMin * 60_000, R: d.rightMin * 60_000 };
  const segments: Segment[] = [];
  let t = d.start;
  if (ms[first] > 0) {
    segments.push({ side: first, start: t, end: t + ms[first] });
    t += ms[first];
  }
  segments.push({ side: ended, start: t, end: t + ms[ended] });
  return { id, status: 'saved', segments, deletedAt: null, ...cleanNote(d.note) };
}

/**
 * Applies an edit. If only the start time moved, the feed's real segments are kept and shifted,
 * so a Left, Right, Left feed keeps its order. Otherwise it is rebuilt from the minutes.
 */
export function applyDraft(original: Feed, d: FeedDraft, now: number): Feed {
  const keep = { deletedAt: original.deletedAt, ...(original.babyId ? { babyId: original.babyId } : {}) };
  if (isBottle(original) || d.kind === 'bottle') return { ...feedFromDraft(d, original.id), ...keep };
  const before = draftFrom(original, now);
  const sameShape =
    before.leftMin === d.leftMin && before.rightMin === d.rightMin && before.endedOn === effectiveEndSide(d);
  if (sameShape) {
    const shift = d.start - before.start;
    const { note: _old, ...rest } = original;
    return {
      ...rest,
      ...cleanNote(d.note),
      segments: original.segments.map((s) => ({ ...s, start: s.start + shift, end: s.end === null ? null : s.end + shift })),
    };
  }
  return { ...feedFromDraft(d, original.id), ...keep };
}

export type DraftProblem = 'empty' | 'future' | 'ends-later' | { overlaps: Feed };

/**
 * Checks a feed before it is saved from the editor. `candidate` is the feed as it would be stored,
 * so pauses inside it count. The feed being timed right now counts as running until now.
 */
export function checkDraft(d: FeedDraft, candidate: Feed, feeds: Feed[], now: number): DraftProblem | null {
  if (d.kind === 'bottle') {
    // a bottle is one moment, so it can sit right next to a breast feed
    if ((d.amountMl ?? 0) <= 0) return 'empty';
    return d.start > now ? 'future' : null;
  }
  if (d.leftMin <= 0 && d.rightMin <= 0) return 'empty';
  if (d.start > now) return 'future';
  const start = feedStart(candidate);
  const end = feedEnd(candidate, now);
  if (end > now) return 'ends-later';
  const clash = live(feeds).find((f) => f.id !== candidate.id && !isBottle(f) && feedStart(f) < end && feedEnd(f, now) > start);
  return clash ? { overlaps: clash } : null;
}

// ---------- history ----------

export const dayKey = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export interface DayGroup {
  key: string;
  dayStart: number;
  feeds: Feed[];
  count: number;
  leftMs: number;
  rightMs: number;
  bottleMl: number;
}

/** Saved feeds grouped by the local day they started on, newest day first. */
export function groupByDay(feeds: Feed[], now: number): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const f of savedFeeds(feeds)) {
    const key = dayKey(feedStart(f));
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const d = new Date(feedStart(f));
      g = { key, dayStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), feeds: [], count: 0, leftMs: 0, rightMs: 0, bottleMl: 0 };
      groups.push(g);
    }
    g.feeds.push(f);
    g.count += 1;
    g.leftMs += sideMs(f, 'L', now);
    g.rightMs += sideMs(f, 'R', now);
    g.bottleMl += f.bottle?.amountMl ?? 0;
  }
  return groups;
}

// ---------- week view ----------

const DAY = 86_400_000;

/** A coloured stretch on a day's 24 hour strip, as fractions of that day. */
export interface Block {
  from: number;
  to: number;
  what: Side | 'bottle';
}

export interface WeekDay {
  dayStart: number;
  count: number;
  /** Time on the breast that day, pauses excluded. */
  breastMs: number;
  bottleMl: number;
  blocks: Block[];
}

/** Local midnight `back` calendar days before the day of `t`. Daylight saving safe. */
export const dayStartOf = (t: number, back = 0): number => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
};

/**
 * The last seven days, oldest first, each with its feeds laid on a 24 hour strip. Feeding that runs
 * past midnight shows on both days' strips, but the feed counts on the day it started.
 */
export function weekDays(feeds: Feed[], now: number): WeekDay[] {
  const all = live(feeds);
  const days: WeekDay[] = [];
  for (let back = 6; back >= 0; back -= 1) {
    const d0 = dayStartOf(now, back);
    const d1 = dayStartOf(now, back - 1);
    const len = d1 - d0 || DAY;
    const day: WeekDay = { dayStart: d0, count: 0, breastMs: 0, bottleMl: 0, blocks: [] };
    for (const f of all) {
      const starts = feedStart(f);
      if (starts >= d0 && starts < d1) {
        day.count += 1;
        day.breastMs += totalMs(f, now);
        day.bottleMl += f.bottle?.amountMl ?? 0;
      }
      if (f.bottle) {
        if (starts >= d0 && starts < d1) {
          const at = (starts - d0) / len;
          day.blocks.push({ from: at, to: Math.min(1, at + 0.008), what: 'bottle' });
        }
        continue;
      }
      for (const s of f.segments) {
        const a = Math.max(s.start, d0);
        const b = Math.min(s.end ?? now, d1);
        if (b > a) day.blocks.push({ from: (a - d0) / len, to: (b - d0) / len, what: s.side });
      }
    }
    days.push(day);
  }
  return days;
}
