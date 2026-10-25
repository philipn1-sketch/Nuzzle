import { feedsToCsv } from '../csv';
import {
  applyDraft, checkDraft, draftFrom, feedFromDraft, lastBreast, lastSaved, suggestedSide, tapSide, weekDays,
} from '../feeds';
import { ageText, amount, fromOz, toOz } from '../format';
import { activeBaby, feedsOf, planReminder } from '../reminder';
import { DEFAULT_SETTINGS, migrateSettings } from '../settings';
import type { Feed } from '../types';

const MIN = 60_000;
const T0 = new Date(2026, 9, 24, 3, 0, 0).getTime();
const breast = (startMin: number, endedOn: 'L' | 'R', id = `s${startMin}`): Feed =>
  feedFromDraft({ start: T0 + startMin * MIN, leftMin: 10, rightMin: 8, endedOn }, id);
const bottle = (atMin: number, ml = 90, id = `b${atMin}`): Feed =>
  feedFromDraft({ start: T0 + atMin * MIN, leftMin: 0, rightMin: 0, endedOn: 'L', kind: 'bottle', amountMl: ml, milk: 'formula' }, id);

describe('bottle feeds', () => {
  it('count as the last feed but leave the side suggestion to the last breast feed', () => {
    const feeds = [breast(0, 'L'), bottle(90)];
    expect(lastSaved(feeds)!.id).toBe('b90');
    expect(lastBreast(feeds)!.id).toBe('s0');
    expect(suggestedSide(feeds)).toBe('R');
  });

  it('start the reminder from the bottle and still name the last side', () => {
    const plan = planReminder([breast(0, 'L'), bottle(90)], DEFAULT_SETTINGS, T0 + 100 * MIN, 'Daphne')!;
    expect(plan.at).toBe(T0 + 210 * MIN);
    expect(plan.body).toBe("It has been 2h since Daphne's last feed started. It was a bottle. The last breast feed ended on the left.");
    expect(planReminder([bottle(0)], DEFAULT_SETTINGS, T0)!.body).toBe("It has been 2h since Baby's last feed started. It was a bottle.");
  });

  it('need an amount, cannot be in the future, and may sit next to a breast feed', () => {
    const feeds = [breast(0, 'L')];
    const d = { ...draftFrom(bottle(5), T0), start: T0 + 5 * MIN };
    expect(checkDraft(d, feedFromDraft(d, 'x'), feeds, T0 + 60 * MIN)).toBeNull();
    expect(checkDraft({ ...d, amountMl: 0 }, feedFromDraft(d, 'x'), feeds, T0 + 60 * MIN)).toBe('empty');
    expect(checkDraft(d, feedFromDraft(d, 'x'), feeds, T0)).toBe('future');
  });

  it('edit in place, keeping the baby', () => {
    const b = { ...bottle(0), babyId: 'b2' };
    const edited = applyDraft(b, { ...draftFrom(b, T0), amountMl: 120, note: ' spat up a little ' }, T0);
    expect(edited.bottle).toEqual({ at: T0, amountMl: 120, milk: 'formula' });
    expect(edited.babyId).toBe('b2');
    expect(edited.note).toBe('spat up a little');
  });

  it('show in ml or ounces', () => {
    expect(amount(90, 'ml')).toBe('90 ml');
    expect(amount(90, 'oz')).toBe('3 oz');
    expect(toOz(fromOz(4.5))).toBe(4.5);
  });
});

describe('notes', () => {
  it('are kept when only the start time moves, and blank notes are dropped', () => {
    const f = { ...breast(0, 'R'), note: 'sleepy' };
    const moved = applyDraft(f, { ...draftFrom(f, T0), start: T0 + 10 * MIN }, T0 + 60 * MIN);
    expect(moved.note).toBe('sleepy');
    expect(moved.segments[0].start).toBe(T0 + 10 * MIN);
    expect(applyDraft(f, { ...draftFrom(f, T0), note: '  ' }, T0).note).toBeUndefined();
  });

  it('go in the CSV, quoted when they hold a comma', () => {
    const f = { ...bottle(5), note: 'fussy, then fine' };
    expect(feedsToCsv([f], T0).split('\n')[1]).toBe('Baby,2026/10/24,03:05,03:05,bottle,0.0,0.0,0.0,,90,formula,"fussy, then fine",');
  });
});

describe('babies', () => {
  it('moves an old single name into the first baby', () => {
    const s = migrateSettings({ babyName: 'Daphne', intervalMin: 150, theme: 'day' });
    expect(s.babies).toEqual([{ id: 'b1', name: 'Daphne', birthday: null }]);
    expect(s.activeBabyId).toBe('b1');
    expect(s.intervalMin).toBe(150);
    expect('babyName' in s).toBe(false);
  });

  it('gives feeds from before babies existed to the first baby', () => {
    const s = { ...DEFAULT_SETTINGS, babies: [{ id: 'b1', name: '', birthday: null }, { id: 'b2', name: 'Ivy', birthday: null }], activeBabyId: 'b2' };
    const feeds = [breast(0, 'L'), { ...breast(60, 'R'), babyId: 'b2' }];
    expect(feedsOf(feeds, s, 'b1').map((f) => f.id)).toEqual(['s0']);
    expect(feedsOf(feeds, s, 'b2').map((f) => f.id)).toEqual(['s60']);
    expect(activeBaby(s).name).toBe('Ivy');
  });

  it('shows the age in days, weeks, then months', () => {
    const born = new Date(2026, 9, 8).getTime();
    expect(ageText(born, new Date(2026, 9, 8, 23).getTime())).toBe('Born today');
    expect(ageText(born, new Date(2026, 9, 9).getTime())).toBe('1 day old');
    expect(ageText(born, new Date(2026, 9, 25).getTime())).toBe('2 weeks 3 days old');
    expect(ageText(born, new Date(2026, 9, 29).getTime())).toBe('3 weeks old');
    expect(ageText(born, new Date(2027, 0, 20).getTime())).toBe('3 months 1 week old');
    expect(ageText(born, new Date(2028, 10, 1).getTime())).toBe('2 years old');
  });
});

describe('week view', () => {
  it('lays feeds on each day and splits one that crosses midnight', () => {
    const late = new Date(2026, 9, 23, 23, 50).getTime();
    const f = feedFromDraft({ start: late, leftMin: 10, rightMin: 10, endedOn: 'R' }, 'late');
    const now = new Date(2026, 9, 24, 12, 0).getTime();
    const days = weekDays([f, bottle(0)], now);
    expect(days).toHaveLength(7);
    const [yesterday, today] = days.slice(5);
    expect(yesterday.count).toBe(1);
    expect(yesterday.breastMs).toBe(20 * MIN);
    expect(yesterday.blocks).toHaveLength(1);
    expect(yesterday.blocks[0].to).toBeCloseTo(1);
    expect(today.count).toBe(1);
    expect(today.bottleMl).toBe(90);
    expect(today.blocks.map((b) => b.what)).toEqual(['R', 'bottle']);
  });

  it('shows a running feed up to now', () => {
    const now = T0 + 30 * MIN;
    const running = tapSide(null, 'L', T0, () => 'r');
    const today = weekDays([running], now)[6];
    expect(today.breastMs).toBe(30 * MIN);
    expect(today.blocks[0].to - today.blocks[0].from).toBeCloseTo(30 / 1440);
  });
});
