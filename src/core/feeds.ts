import { MIN_FEED_MS } from '../config';
import type { Feed, Segment, Settings, Side } from './types';

export const other = (side: Side): Side => (side === 'L' ? 'R' : 'L');

export const feedStart = (f: Feed): number => f.segments[0].start;

export const feedEnd = (f: Feed, now: number): number => {
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

/** The saved feed with the latest start time. */
export const lastSaved = (feeds: Feed[]): Feed | null => savedFeeds(feeds)[0] ?? null;

/** The side to offer next: the opposite of where the last feed ended. */
export const suggestedSide = (feeds: Feed[]): Side | null => {
  const last = lastSaved(feeds);
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
}

const editorMinutes = (ms: number) => (ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60_000)));

export const draftFrom = (f: Feed, now: number): FeedDraft => ({
  start: feedStart(f),
  leftMin: editorMinutes(sideMs(f, 'L', now)),
  rightMin: editorMinutes(sideMs(f, 'R', now)),
  endedOn: endSide(f),
});

/** The side it ended on, corrected when only one side has minutes. */
export const effectiveEndSide = (d: FeedDraft): Side => {
  if (d.leftMin > 0 && d.rightMin === 0) return 'L';
  if (d.rightMin > 0 && d.leftMin === 0) return 'R';
  return d.endedOn;
};

/** Builds a saved feed from typed in minutes: the other side first, then the side it ended on. */
export function feedFromDraft(d: FeedDraft, id: string): Feed {
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
  return { id, status: 'saved', segments, deletedAt: null };
}

/**
 * Applies an edit. If only the start time moved, the feed's real segments are kept and shifted,
 * so a Left, Right, Left feed keeps its order. Otherwise it is rebuilt from the minutes.
 */
export function applyDraft(original: Feed, d: FeedDraft, now: number): Feed {
  const before = draftFrom(original, now);
  const sameShape =
    before.leftMin === d.leftMin && before.rightMin === d.rightMin && before.endedOn === effectiveEndSide(d);
  if (sameShape) {
    const shift = d.start - before.start;
    return {
      ...original,
      segments: original.segments.map((s) => ({ ...s, start: s.start + shift, end: s.end === null ? null : s.end + shift })),
    };
  }
  return { ...feedFromDraft(d, original.id), deletedAt: original.deletedAt };
}

export type DraftProblem = 'empty' | 'future' | 'ends-later' | { overlaps: Feed };

/**
 * Checks a feed before it is saved from the editor. `candidate` is the feed as it would be stored,
 * so pauses inside it count. The feed being timed right now counts as running until now.
 */
export function checkDraft(d: FeedDraft, candidate: Feed, feeds: Feed[], now: number): DraftProblem | null {
  if (d.leftMin <= 0 && d.rightMin <= 0) return 'empty';
  if (d.start > now) return 'future';
  const start = feedStart(candidate);
  const end = feedEnd(candidate, now);
  if (end > now) return 'ends-later';
  const clash = live(feeds).find((f) => f.id !== candidate.id && feedStart(f) < end && feedEnd(f, now) > start);
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
}

/** Saved feeds grouped by the local day they started on, newest day first. */
export function groupByDay(feeds: Feed[], now: number): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const f of savedFeeds(feeds)) {
    const key = dayKey(feedStart(f));
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const d = new Date(feedStart(f));
      g = { key, dayStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), feeds: [], count: 0, leftMs: 0, rightMs: 0 };
      groups.push(g);
    }
    g.feeds.push(f);
    g.count += 1;
    g.leftMs += sideMs(f, 'L', now);
    g.rightMs += sideMs(f, 'R', now);
  }
  return groups;
}
