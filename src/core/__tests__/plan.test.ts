import {
  AGE_BANDS, bandFor, buildPlan, nextItem, nextReference, nextStep, planFeedTimes, planIsOn, REFERENCE_DAYS, referenceFeedTimes,
} from '../plan';

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

describe('the reference day', () => {
  it('runs in order from the first feed to bed, with six feeds', () => {
    const day = REFERENCE_DAYS[0];
    const times = day.items.map((i) => i.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(referenceFeedTimes(day).map((t) => t / 60)).toEqual([6, 9, 12, 15, 18, 21]);
    expect(day.items[day.items.length - 1].kind).toBe('bedtime');
  });

  it('keeps a window open until it closes', () => {
    const day = REFERENCE_DAYS[0];
    expect(nextReference(day.items, 6 * 60 + 30)?.at).toBe(6 * 60);
    expect(nextReference(day.items, 9 * 60 + 50)?.kind).toBe('nap');
    expect(nextReference(day.items, 22 * 60)).toBeNull();
  });
});

describe('turning a plan on and off', () => {
  it('counts an older saved plan as on, and an explicitly stopped one as off', () => {
    const base = { dayStartMin: 420, bedtimeMin: 1140, gapMin: 180, awakeMin: 75 };
    expect(planIsOn(base)).toBe(true);
    expect(planIsOn({ ...base, on: false })).toBe(false);
    expect(planIsOn(undefined)).toBe(false);
  });

  it('gives feed times and the next step for either kind of plan', () => {
    const own = { dayStartMin: 420, bedtimeMin: 1140, gapMin: 180, awakeMin: 75 };
    expect(planFeedTimes(own).map((m) => m / 60)).toEqual([7, 10, 13, 16]);
    expect(nextStep(own, 8 * 60)).toEqual({ at: 8 * 60 + 15, label: 'Nap', feed: false });
    const ref = { ...own, referenceId: 'ref-2-4w' };
    expect(planFeedTimes(ref).map((m) => m / 60)).toEqual([6, 9, 12, 15, 18, 21]);
    expect(nextStep(ref, 9 * 60 + 10)).toEqual({ at: 9 * 60 + 45, label: 'Nap', feed: false });
  });
});
