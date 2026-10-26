import type { BabyPlan } from './types';

/**
 * Example rhythms by age, from common published baby care guides (child health services, NHS and
 * similar). They are typical ranges to start from, not advice for any one baby: newborns are fed
 * whenever they show hunger cues, and every baby is different.
 */
export interface AgeBand {
  id: string;
  label: string;
  /** Ages this band covers, in days from birth. */
  fromDay: number;
  toDay: number;
  feedsPerDay: string;
  /** Time between feeds, counted from the start of one to the start of the next. */
  gap: string;
  awake: string;
  naps: string;
  sleep: string;
  note: string;
  /** Starting values for the plan builder, in minutes. */
  gapMin: number;
  awakeMin: number;
}

export const AGE_BANDS: AgeBand[] = [
  {
    id: 'newborn', label: 'Newborn, 0 to 6 weeks', fromDay: 0, toDay: 42,
    feedsPerDay: '8 to 12 feeds in 24 hours', gap: 'about every 2 to 3 hours', awake: '45 to 60 minutes',
    naps: 'many short sleeps through the day and night', sleep: '14 to 17 hours in 24',
    note: 'Most newborns feed on cue rather than by the clock, including through the night.',
    gapMin: 150, awakeMin: 50,
  },
  {
    id: '6w', label: '6 to 12 weeks', fromDay: 42, toDay: 84,
    feedsPerDay: '7 to 9 feeds', gap: 'about every 2.5 to 3.5 hours', awake: '1 to 1.5 hours',
    naps: '4 to 5 naps', sleep: '14 to 16 hours in 24',
    note: 'A longer stretch of night sleep often starts to appear around now.',
    gapMin: 180, awakeMin: 75,
  },
  {
    id: '3m', label: '3 to 4 months', fromDay: 84, toDay: 122,
    feedsPerDay: '6 to 8 feeds', gap: 'about every 3 to 4 hours', awake: '1.25 to 2 hours',
    naps: '3 to 4 naps', sleep: '13 to 15 hours in 24',
    note: 'Sleep often changes around 4 months; it usually settles again.',
    gapMin: 210, awakeMin: 100,
  },
  {
    id: '4m', label: '4 to 6 months', fromDay: 122, toDay: 183,
    feedsPerDay: '5 to 7 milk feeds', gap: 'about every 3 to 4 hours', awake: '1.5 to 2.5 hours',
    naps: '3 naps', sleep: '12 to 15 hours in 24',
    note: 'Solids usually start at around 6 months, alongside milk.',
    gapMin: 225, awakeMin: 120,
  },
  {
    id: '6m', label: '6 to 9 months', fromDay: 183, toDay: 274,
    feedsPerDay: '4 to 6 milk feeds, plus solids', gap: 'about every 3.5 to 4.5 hours', awake: '2.5 to 3.5 hours',
    naps: '2 to 3 naps', sleep: '12 to 15 hours in 24',
    note: 'Milk is still the main food; solids are added gradually.',
    gapMin: 240, awakeMin: 165,
  },
  {
    id: '9m', label: '9 to 12 months', fromDay: 274, toDay: 366,
    feedsPerDay: '3 to 5 milk feeds, plus meals', gap: 'around meals and naps', awake: '3 to 4 hours',
    naps: '2 naps', sleep: '12 to 14 hours in 24',
    note: 'Meals and milk feeds often settle into a routine around the day.',
    gapMin: 240, awakeMin: 210,
  },
];

/** The band for a baby's age, or the newborn band when the birthday isn't set. */
export function bandFor(birthday: number | null, now: number): AgeBand {
  if (birthday === null) return AGE_BANDS[0];
  const days = Math.floor((now - birthday) / 86_400_000);
  return AGE_BANDS.find((b) => days >= b.fromDay && days < b.toDay) ?? AGE_BANDS[AGE_BANDS.length - 1];
}

export interface PlanSettings {
  /** Minutes after midnight. */
  dayStartMin: number;
  bedtimeMin: number;
  gapMin: number;
  awakeMin: number;
  /** Set when she follows a reference day instead of building her own. */
  referenceId?: string;
}

export interface PlanItem {
  kind: 'feed' | 'nap' | 'bedtime';
  /** Minutes after midnight. */
  at: number;
  /** For naps: until the next feed. */
  untilMin?: number;
}

/**
 * A day laid out as feed, awake time, then a nap until the next feed, from the first feed of the
 * morning to bedtime. Night feeds are left to her baby, so the plan stops at bedtime.
 */
export function buildPlan(p: PlanSettings): PlanItem[] {
  const out: PlanItem[] = [];
  const end = p.bedtimeMin > p.dayStartMin ? p.bedtimeMin : p.bedtimeMin + 1440;
  const gap = Math.max(60, p.gapMin);
  for (let t = p.dayStartMin; t < end; t += gap) {
    out.push({ kind: 'feed', at: t });
    const napAt = t + p.awakeMin;
    const next = Math.min(t + gap, end);
    // a nap only when there is real time for one before the next feed or bedtime
    if (napAt + 20 <= next) out.push({ kind: 'nap', at: napAt, untilMin: next });
  }
  out.push({ kind: 'bedtime', at: end });
  return out.map((i) => ({ ...i, at: i.at % 1440, ...(i.untilMin !== undefined ? { untilMin: i.untilMin % 1440 } : {}) }));
}

/** The first item still to come today, given the minutes after midnight now. */
export function nextItem(items: PlanItem[], nowMin: number): PlanItem | null {
  return items.find((i) => i.at >= nowMin) ?? null;
}

export const defaultPlan = (band: AgeBand): PlanSettings => ({ dayStartMin: 7 * 60, bedtimeMin: 19 * 60, gapMin: band.gapMin, awakeMin: band.awakeMin });

/**
 * A fixed day to follow, from a reference schedule the family follows (2 to 4 weeks), summarised in
 * our own words. Times are minutes after midnight.
 */
export interface ReferenceItem {
  kind: 'feed' | 'play' | 'nap' | 'bath' | 'bedtime';
  at: number;
  /** For a window such as "between 6 and 7". */
  until?: number;
  note: string;
}

export interface ReferenceDay {
  id: string;
  label: string;
  intro: string;
  items: ReferenceItem[];
  night: string;
  /** The usual gap between daytime feeds, in minutes. */
  gapMin: number;
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export const REFERENCE_DAYS: ReferenceDay[] = [
  {
    id: 'ref-2-4w',
    label: 'Reference day, 2 to 4 weeks',
    intro: 'Feeds take about 30 minutes start to finish. Bottles are usually 3 to 4 oz (90 to 120 ml) of breast milk or formula.',
    gapMin: 180,
    night: 'Night feeds on demand, often around midnight to 2 am, and in the first weeks sometimes again around 3 am. Keep night feeds quiet and dim.',
    items: [
      { kind: 'feed', at: h(6), until: h(7), note: 'First feed of the day, any time between 6 and 7, then back to sleep' },
      { kind: 'feed', at: h(9), note: 'Feed at 9 whenever the last feed was' },
      { kind: 'play', at: h(9, 30), note: 'Awake time, 10 to 30 minutes: cuddles and a nappy change' },
      { kind: 'nap', at: h(9, 45), until: h(10), note: 'Nap, as close to two hours as possible' },
      { kind: 'feed', at: h(12), note: 'Feed, waking the baby if needed' },
      { kind: 'play', at: h(12, 30), note: 'Awake time, 10 to 30 minutes' },
      { kind: 'nap', at: h(12, 45), until: h(13), note: 'Nap, as close to two hours as possible' },
      { kind: 'feed', at: h(15), note: 'Feed, waking the baby if needed; often more alert and unsettled now' },
      { kind: 'play', at: h(15, 30), note: 'Awake time, 10 to 30 minutes' },
      { kind: 'nap', at: h(15, 45), until: h(16), note: 'Nap, as close to two hours as possible' },
      { kind: 'feed', at: h(18), note: 'Supper feed, then the next feed is the bedtime feed at 9' },
      { kind: 'play', at: h(18, 30), note: 'Awake time: a few minutes each of bouncer, tummy time and swing' },
      { kind: 'nap', at: h(18, 45), until: h(19), note: 'Short sleep, about an hour to an hour and a half' },
      { kind: 'bath', at: h(20, 30), note: 'Bath time' },
      { kind: 'feed', at: h(21), note: 'Bedtime feed' },
      { kind: 'bedtime', at: h(21, 30), note: 'Into bed: swaddled, dark room, white noise on' },
    ],
  },
];

/** The first item still to come, given the minutes after midnight now. A window counts until it closes. */
export function nextReference(items: ReferenceItem[], nowMin: number): ReferenceItem | null {
  return items.find((i) => (i.until ?? i.at) >= nowMin) ?? null;
}

/** The daytime feed times, for reminders: the start of each feed window. */
export const referenceFeedTimes = (day: ReferenceDay): number[] => day.items.filter((i) => i.kind === 'feed').map((i) => i.at);

/** A plan as saved for a baby. */
export type SavedPlan = BabyPlan;

export const planIsOn = (p: SavedPlan | undefined): p is SavedPlan => !!p && p.on !== false;

/** One line per thing in the day, whichever kind of plan it is. */
export interface DayStep {
  at: number;
  label: string;
  feed: boolean;
}

export function planSteps(p: PlanSettings): DayStep[] {
  const ref = p.referenceId ? REFERENCE_DAYS.find((r) => r.id === p.referenceId) : undefined;
  if (ref) {
    const word = { feed: 'Feed', play: 'Awake time', nap: 'Nap', bath: 'Bath', bedtime: 'Bed' } as const;
    return ref.items.map((i) => ({ at: i.at, label: word[i.kind], feed: i.kind === 'feed' }));
  }
  return buildPlan(p).map((i) => ({ at: i.at, label: i.kind === 'feed' ? 'Feed' : i.kind === 'nap' ? 'Nap' : 'Bed', feed: i.kind === 'feed' }));
}

/** The plan's feed times, for reminders. */
export const planFeedTimes = (p: PlanSettings): number[] => planSteps(p).filter((s) => s.feed).map((s) => s.at);

/** A plan feed time this soon after a feed started is skipped: she has just fed. */
export const PLAN_SKIP_MIN = 60;

/**
 * When to ring for the plan's feeds over the next `days` days, as times in ms. A plan time is
 * skipped when the last feed started within an hour before it, so a feed that came a little early
 * doesn't get a second reminder.
 */
export function planFeedAlerts(p: PlanSettings, now: number, lastStart: number | null, days = 2): number[] {
  const out: number[] = [];
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  for (let d = 0; d < days; d += 1) {
    for (const m of planFeedTimes(p)) {
      const day = new Date(midnight);
      day.setDate(day.getDate() + d);
      day.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const t = day.getTime();
      if (t <= now) continue;
      if (lastStart !== null && t >= lastStart && t - lastStart < PLAN_SKIP_MIN * 60_000) continue;
      out.push(t);
    }
  }
  return out;
}

/** The next thing in the plan today, skipping awake time. */
export const nextStep = (p: PlanSettings, nowMin: number): DayStep | null =>
  planSteps(p).find((s) => s.at >= nowMin && s.label !== 'Awake time') ?? null;
