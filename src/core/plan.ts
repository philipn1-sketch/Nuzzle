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
