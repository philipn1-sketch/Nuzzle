import { AGE_BANDS, bandFor, buildPlan, nextItem } from '../plan';

const DAY = 86_400_000;
const born = new Date(2026, 9, 8).getTime();

describe('example rhythms by age', () => {
  it('picks the band for her age, and newborn when there is no birthday', () => {
    expect(bandFor(null, born).id).toBe('newborn');
    expect(bandFor(born, born + 17 * DAY).id).toBe('newborn');
    expect(bandFor(born, born + 50 * DAY).id).toBe('6w');
    expect(bandFor(born, born + 100 * DAY).id).toBe('3m');
    expect(bandFor(born, born + 400 * DAY).id).toBe('9m');
  });

  it('covers the whole first year with no gaps', () => {
    AGE_BANDS.slice(1).forEach((b, i) => expect(b.fromDay).toBe(AGE_BANDS[i].toDay));
  });
});

describe('the day plan', () => {
  it('lays out feed, awake time, then a nap until the next feed, up to bedtime', () => {
    const plan = buildPlan({ dayStartMin: 7 * 60, bedtimeMin: 19 * 60, gapMin: 180, awakeMin: 75 });
    const feeds = plan.filter((i) => i.kind === 'feed').map((i) => i.at / 60);
    expect(feeds).toEqual([7, 10, 13, 16]);
    expect(plan.find((i) => i.kind === 'nap')).toEqual({ kind: 'nap', at: 8 * 60 + 15, untilMin: 10 * 60 });
    expect(plan[plan.length - 1]).toEqual({ kind: 'bedtime', at: 19 * 60 });
    expect(nextItem(plan, 8 * 60)?.kind).toBe('nap');
    expect(nextItem(plan, 9 * 60)?.at).toBe(10 * 60);
    expect(nextItem(plan, 20 * 60)).toBeNull();
  });

  it('leaves out a nap with no real time before the next feed', () => {
    const plan = buildPlan({ dayStartMin: 7 * 60, bedtimeMin: 10 * 60, gapMin: 120, awakeMin: 110 });
    expect(plan.filter((i) => i.kind === 'nap')).toHaveLength(0);
  });
});
