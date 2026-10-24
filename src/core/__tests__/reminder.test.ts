import { applyDraft, feedFromDraft, tapSide } from '../feeds';
import { planReminder } from '../reminder';
import type { Feed, Settings } from '../types';

const MIN = 60_000;
const T0 = new Date(2026, 9, 24, 3, 0, 0).getTime();
const settings: Settings = { babyName: '', remindersOn: true, intervalMin: 120, theme: 'night', reminderAsked: true };
const saved = (startMin: number, endedOn: 'L' | 'R', id = `s${startMin}`): Feed =>
  feedFromDraft({ start: T0 + startMin * MIN, leftMin: 10, rightMin: 8, endedOn }, id);

describe('reminder scheduling', () => {
  it('is set her interval after the last feed started', () => {
    const plan = planReminder([saved(0, 'R')], settings, T0 + 20 * MIN)!;
    expect(plan.at).toBe(T0 + 120 * MIN);
    expect(plan.body).toBe("It has been 2h since Baby's last feed started. Last side: right.");
  });

  it('uses her own interval and the baby name', () => {
    const plan = planReminder([saved(0, 'L')], { ...settings, intervalMin: 165, babyName: 'Daphne' }, T0)!;
    expect(plan.at).toBe(T0 + 165 * MIN);
    expect(plan.body).toBe("It has been 2h 45m since Daphne's last feed started. Last side: left.");
  });

  it('moves when a feed is edited', () => {
    const f = saved(0, 'R');
    const moved = applyDraft(f, { start: T0 + 30 * MIN, leftMin: 10, rightMin: 8, endedOn: 'R' }, T0 + 60 * MIN);
    expect(planReminder([moved], settings, T0 + 60 * MIN)!.at).toBe(T0 + 150 * MIN);
  });

  it('falls back to the earlier feed when the latest is deleted', () => {
    const a = saved(0, 'L', 'a');
    const b = { ...saved(90, 'R', 'b'), deletedAt: T0 + 100 * MIN };
    expect(planReminder([a, b], settings, T0 + 100 * MIN)!.at).toBe(T0 + 120 * MIN);
  });

  it('is not scheduled while a feed runs, when off, before any feed, or once passed', () => {
    const f = saved(0, 'R');
    expect(planReminder([f, tapSide(null, 'L', T0 + 60 * MIN, () => 'r')], settings, T0 + 61 * MIN)).toBeNull();
    expect(planReminder([f], { ...settings, remindersOn: false }, T0)).toBeNull();
    expect(planReminder([], settings, T0)).toBeNull();
    expect(planReminder([f], settings, T0 + 121 * MIN)).toBeNull();
  });

  it('keeps the right moment across a daylight saving change because it adds real elapsed time', () => {
    // 2026 US clocks go back at 2:00 am on 1 Nov; two real hours after 1:00 am is still 120 minutes later
    const start = new Date(2026, 10, 1, 1, 0, 0).getTime();
    const f = feedFromDraft({ start, leftMin: 10, rightMin: 0, endedOn: 'L' }, 'd');
    expect(planReminder([f], settings, start)!.at - start).toBe(120 * MIN);
  });
});
