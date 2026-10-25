import {
  checkEntry, entriesOf, entryDetail, entryTitle, inQuiet, lengthText, nappyCount, nappyLine, runningSleep, sleepWithin, startSleep, wakeUp, weightText,
} from '../entries';
import { feedFromDraft } from '../feeds';
import { DEFAULT_SETTINGS } from '../settings';
import { summaryDays, summaryHtml } from '../summary';
import type { Entry } from '../types';

const MIN = 60_000;
const T0 = new Date(2026, 9, 24, 3, 0).getTime();
const e = (x: Partial<Entry>): Entry => ({ id: `e${Math.random()}`, type: 'entry', kind: 'nappy', at: T0, deletedAt: null, ...x });

describe('nappies', () => {
  it('counts a wet and dirty nappy as both', () => {
    const list = [e({ nappy: 'wet' }), e({ nappy: 'dirty' }), e({ nappy: 'both' }), e({ nappy: 'wet', deletedAt: T0 })];
    expect(nappyCount(list, T0 - MIN, T0 + MIN)).toMatchObject({ wet: 2, dirty: 2, total: 3 });
    expect(nappyLine(nappyCount(list, T0 - MIN, T0 + MIN))).toBe('3 nappies today: 1 wet, 1 dirty, 1 wet and dirty');
    expect(entryTitle(list[2], 'ml', T0)).toBe('Wet and dirty nappy');
  });
});

describe('pumping and growth', () => {
  it('shows totals per side in her units', () => {
    const p = e({ kind: 'pump', leftMl: 60, rightMl: 50, minutes: 15 });
    expect(entryTitle(p, 'ml', T0)).toBe('Pumped 110 ml');
    expect(entryDetail(p, 'ml')).toBe('Left 60 ml, right 50 ml, 15 min');
  });

  it('shows weight and length in metric or imperial', () => {
    expect(weightText(4210, 'ml')).toBe('4.21 kg');
    expect(weightText(4210, 'oz')).toBe('9 lb 5 oz');
    expect(lengthText(545, 'ml')).toBe('54.5 cm');
    expect(lengthText(540, 'ml')).toBe('54 cm');
    expect(entryTitle(e({ kind: 'growth', weightG: 4210, lengthMm: 545 }), 'ml', T0)).toBe('Weight 4.21 kg, length 54.5 cm');
    expect(checkEntry(e({ kind: 'growth' }), T0)).toBe('empty');
  });

  it('shows pumping for every baby, the rest only for their own baby', () => {
    const s = { ...DEFAULT_SETTINGS, babies: [{ id: 'b1', name: '', birthday: null }, { id: 'b2', name: '', birthday: null }] };
    const list = [e({ kind: 'pump', leftMl: 10 }), e({ babyId: 'b2' }), e({})];
    expect(entriesOf(list, s, 'b1')).toHaveLength(2);
    expect(entriesOf(list, s, 'b2')).toHaveLength(2);
  });
});

describe('sleep', () => {
  it('runs until she wakes, and counts only the part inside a day', () => {
    const s = startSleep(T0 - 60 * MIN, 's');
    expect(runningSleep([s])?.id).toBe('s');
    expect(entryTitle(s, 'ml', T0)).toBe('Asleep for 1h');
    const woke = wakeUp(s, T0);
    expect(runningSleep([woke])).toBeNull();
    expect(entryTitle(woke, 'ml', T0 + 99 * MIN)).toBe('Slept 1h');
    expect(sleepWithin([woke], T0 - 30 * MIN, T0 + 30 * MIN, T0)).toBe(30 * MIN);
    expect(checkEntry({ ...woke, end: woke.at - 1 }, T0)).toBe('order');
  });
});

describe('quiet hours', () => {
  it('runs past midnight', () => {
    const q = { on: true, fromMin: 22 * 60, toMin: 6 * 60 };
    expect(inQuiet(new Date(2026, 9, 24, 23, 0).getTime(), q)).toBe(true);
    expect(inQuiet(new Date(2026, 9, 24, 3, 0).getTime(), q)).toBe(true);
    expect(inQuiet(new Date(2026, 9, 24, 6, 0).getTime(), q)).toBe(false);
    expect(inQuiet(new Date(2026, 9, 24, 14, 0).getTime(), q)).toBe(false);
    expect(inQuiet(new Date(2026, 9, 24, 23, 0).getTime(), { ...q, on: false })).toBe(false);
  });
});

describe('appointment summary', () => {
  it('gives one row a day with feeds, nappies and sleep, and lists weights', () => {
    const now = new Date(2026, 9, 24, 20, 0).getTime();
    const feeds = [feedFromDraft({ start: T0, leftMin: 10, rightMin: 5, endedOn: 'R' }, 'f')];
    const entries = [e({ nappy: 'both' }), e({ kind: 'growth', weightG: 4210, at: T0 })];
    const days = summaryDays(feeds, entries, 7, now);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ feeds: 1, leftMs: 10 * MIN, rightMs: 5 * MIN, wet: 1, dirty: 1 });
    const html = summaryHtml({ name: 'Daphne', age: '2 weeks old', feeds, entries, days: 7, units: 'ml', now });
    expect(html).toContain('<h1>Daphne</h1>');
    expect(html).toContain('4.21 kg');
    expect(html).not.toContain('Bottles');
  });
});
