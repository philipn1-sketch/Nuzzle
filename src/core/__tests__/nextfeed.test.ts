import { nextFeedAt, planReminder } from '../reminder';
import { migrateSettings } from '../settings';
import type { Baby, Feed } from '../types';

const at = (h: number, m = 0) => new Date(2026, 9, 20, h, m).getTime();
const feed = (start: number): Feed => ({ id: 'f', status: 'saved', deletedAt: null, segments: [{ side: 'L', start, end: start + 15 * 60_000 }] });
const settings = migrateSettings({ intervalMin: 180, remindersOn: true });
const withPlan: Baby = { id: 'b1', name: 'Daphne', birthday: null, plan: { dayStartMin: 420, bedtimeMin: 1140, gapMin: 180, awakeMin: 60, referenceId: 'day-0-6w', on: true } };

describe('one rule for the next feed', () => {
  it('counts the gap from the last feed start without a plan', () => {
    expect(nextFeedAt([feed(at(9))], settings, { ...withPlan, plan: undefined }, true)).toBe(at(12));
  });
  it('takes the plan time at least an hour after the last feed when the plan is on', () => {
    // the newborn day feeds at 7, 10, 13, 16, 18 and 20
    expect(nextFeedAt([feed(at(9, 30))], settings, withPlan, true)).toBe(at(13));
    expect(nextFeedAt([feed(at(8, 50))], settings, withPlan, true)).toBe(at(10));
  });
  it('falls back to the gap without Nuzzle Plus', () => {
    expect(nextFeedAt([feed(at(9))], settings, withPlan, false)).toBe(at(12));
  });
  it('words the reminder from the rule in use', () => {
    expect(planReminder([feed(at(9, 30))], settings, at(10), 'Daphne', withPlan, true)?.body).toBe("Feed time in Daphne's plan.");
    expect(planReminder([feed(at(9, 30))], settings, at(10), 'Daphne', withPlan, false)?.body).toMatch(/since Daphne's last feed started/);
  });
});
