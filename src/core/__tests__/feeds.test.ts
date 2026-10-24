import {
  activeFeed, applyDraft, checkDraft, draftFrom, endSide, feedFromDraft, finishFeed, groupByDay, isDue,
  lastSaved, looksForgotten, sideMs, sideRuns, sinceLastStartMs, suggestedSide, tapSide, totalMs,
} from '../feeds';
import type { Feed, Settings } from '../types';

const MIN = 60_000;
const T0 = new Date(2026, 9, 24, 3, 0, 0).getTime(); // 3:00 am local
let n = 0;
const id = () => `f${++n}`;
const settings: Settings = { babyName: '', remindersOn: true, intervalMin: 120, theme: 'night', reminderAsked: true };

describe('timer', () => {
  it('starts a feed on one tap and counts from the stored start time', () => {
    const f = tapSide(null, 'L', T0, id);
    expect(f.status).toBe('running');
    expect(sideMs(f, 'L', T0 + 7 * MIN)).toBe(7 * MIN);
    expect(totalMs(f, T0 + 7 * MIN)).toBe(7 * MIN);
  });

  it('pauses on the running side and leaves the pause out of the totals', () => {
    let f = tapSide(null, 'L', T0, id);
    f = tapSide(f, 'L', T0 + 5 * MIN, id); // pause
    expect(f.status).toBe('paused');
    expect(totalMs(f, T0 + 30 * MIN)).toBe(5 * MIN);
    f = tapSide(f, 'L', T0 + 10 * MIN, id); // carry on
    expect(totalMs(f, T0 + 12 * MIN)).toBe(7 * MIN);
  });

  it('switches sides and keeps a total per side', () => {
    let f = tapSide(null, 'L', T0, id);
    f = tapSide(f, 'R', T0 + 6 * MIN, id);
    expect(f.status).toBe('running');
    expect(sideMs(f, 'L', T0 + 10 * MIN)).toBe(6 * MIN);
    expect(sideMs(f, 'R', T0 + 10 * MIN)).toBe(4 * MIN);
  });

  it('is correct after the app is killed for an hour: nothing counts in memory', () => {
    const f = tapSide(null, 'R', T0, id);
    const stored: Feed = JSON.parse(JSON.stringify(f)); // what SQLite gives back on restart
    expect(totalMs(stored, T0 + 60 * MIN)).toBe(60 * MIN);
  });

  it('saves on Done, closing the running side', () => {
    let f = tapSide(null, 'L', T0, id);
    f = tapSide(f, 'R', T0 + 8 * MIN, id);
    const saved = finishFeed(f, T0 + 18 * MIN)!;
    expect(saved.status).toBe('saved');
    expect(endSide(saved)).toBe('R');
    expect(totalMs(saved, T0 + 99 * MIN)).toBe(18 * MIN);
  });

  it('drops a mistap shorter than five seconds', () => {
    const f = tapSide(null, 'L', T0, id);
    expect(finishFeed(f, T0 + 3000)).toBeNull();
  });

  it('lists the sides in the order they were fed', () => {
    let f = tapSide(null, 'L', T0, id);
    f = tapSide(f, 'R', T0 + 6 * MIN, id);
    f = tapSide(f, 'L', T0 + 10 * MIN, id);
    const saved = finishFeed(f, T0 + 13 * MIN)!;
    expect(sideRuns(saved, T0).map((r) => [r.side, r.ms / MIN])).toEqual([['L', 6], ['R', 4], ['L', 3]]);
  });
});

const saved = (startMin: number, l: number, r: number, endedOn: 'L' | 'R'): Feed =>
  feedFromDraft({ start: T0 + startMin * MIN, leftMin: l, rightMin: r, endedOn }, id());

describe('side suggestion and time since last feed', () => {
  it('suggests nothing before the first feed', () => {
    expect(suggestedSide([])).toBeNull();
    expect(sinceLastStartMs([], T0)).toBeNull();
  });

  it('suggests the other side from the feed with the latest start, even if added later', () => {
    const late = saved(120, 10, 5, 'R');
    const forgotten = saved(30, 8, 0, 'L'); // logged afterwards, but it started earlier
    expect(suggestedSide([late, forgotten])).toBe('L');
    expect(lastSaved([late, forgotten])!.id).toBe(late.id);
  });

  it('counts time since the last feed from its start, not its end', () => {
    const f = saved(0, 10, 10, 'R');
    expect(sinceLastStartMs([f], T0 + 100 * MIN)).toBe(100 * MIN);
  });

  it('ignores deleted feeds', () => {
    const a = saved(0, 10, 0, 'L');
    const b = { ...saved(60, 0, 10, 'R'), deletedAt: T0 + 70 * MIN };
    expect(suggestedSide([a, b])).toBe('R');
  });

  it('marks the feed as due once her interval has passed and nothing is running', () => {
    const f = saved(0, 10, 10, 'R');
    expect(isDue([f], settings, T0 + 119 * MIN)).toBe(false);
    expect(isDue([f], settings, T0 + 120 * MIN)).toBe(true);
    const running = tapSide(null, 'L', T0 + 121 * MIN, id);
    expect(isDue([f, running], settings, T0 + 122 * MIN)).toBe(false);
  });

  it('notices a feed left running past her interval', () => {
    const running = tapSide(null, 'L', T0, id);
    expect(looksForgotten([running], settings, T0 + 60 * MIN)).toBe(false);
    expect(looksForgotten([running], settings, T0 + 150 * MIN)).toBe(true);
    expect(activeFeed([running])!.id).toBe(running.id);
  });
});

describe('editing', () => {
  it('keeps the real side order when only the start time moves', () => {
    let f = tapSide(null, 'L', T0, id);
    f = tapSide(f, 'R', T0 + 6 * MIN, id);
    f = tapSide(f, 'L', T0 + 10 * MIN, id);
    const done = finishFeed(f, T0 + 13 * MIN)!;
    const d = { ...draftFrom(done, T0), start: T0 - 30 * MIN };
    const moved = applyDraft(done, d, T0 + 60 * MIN);
    expect(moved.segments.map((s) => s.side)).toEqual(['L', 'R', 'L']);
    expect(moved.segments[0].start).toBe(T0 - 30 * MIN);
    expect(totalMs(moved, T0)).toBe(13 * MIN);
  });

  it('rebuilds the feed when the minutes change, ending on the chosen side', () => {
    const f = saved(0, 10, 5, 'R');
    const edited = applyDraft(f, { start: T0, leftMin: 12, rightMin: 7, endedOn: 'L' }, T0 + 99 * MIN);
    expect(endSide(edited)).toBe('L');
    expect(sideMs(edited, 'L', T0) / MIN).toBe(12);
    expect(edited.id).toBe(f.id);
  });

  it('uses the only side with minutes as the side it ended on', () => {
    const f = feedFromDraft({ start: T0, leftMin: 0, rightMin: 9, endedOn: 'L' }, 'x');
    expect(endSide(f)).toBe('R');
    expect(f.segments).toHaveLength(1);
  });

  it('refuses empty, future and overlapping feeds', () => {
    const a = saved(0, 10, 10, 'R');
    expect(checkDraft({ start: T0, leftMin: 0, rightMin: 0, endedOn: 'L' }, [a], null, T0 + MIN)).toBe('empty');
    expect(checkDraft({ start: T0 + 5 * MIN, leftMin: 5, rightMin: 0, endedOn: 'L' }, [a], null, T0)).toBe('future');
    expect(checkDraft({ start: T0 + 15 * MIN, leftMin: 5, rightMin: 0, endedOn: 'L' }, [a], null, T0 + 99 * MIN)).toEqual({ overlaps: a });
    expect(checkDraft({ start: T0 + 15 * MIN, leftMin: 5, rightMin: 0, endedOn: 'L' }, [a], a.id, T0 + 99 * MIN)).toBeNull();
    expect(checkDraft({ start: T0 + 20 * MIN, leftMin: 5, rightMin: 0, endedOn: 'L' }, [a], null, T0 + 99 * MIN)).toBeNull();
  });
});

describe('history totals', () => {
  it('groups by the local day a feed started and totals each side', () => {
    const lateNight = saved(-200, 10, 6, 'R'); // 11:40 pm the day before, runs past midnight
    const a = saved(0, 8, 7, 'L');
    const b = saved(150, 0, 12, 'R');
    const groups = groupByDay([a, lateNight, b], T0 + 300 * MIN);
    expect(groups).toHaveLength(2);
    expect(groups[0].count).toBe(2);
    expect(groups[0].leftMs / MIN).toBe(8);
    expect(groups[0].rightMs / MIN).toBe(19);
    expect(groups[1].feeds[0].id).toBe(lateNight.id);
  });

  it('leaves running feeds out of history', () => {
    const running = tapSide(null, 'L', T0, id);
    expect(groupByDay([running], T0 + MIN)).toHaveLength(0);
  });
});
