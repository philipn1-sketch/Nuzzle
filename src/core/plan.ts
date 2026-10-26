import type { BabyPlan } from './types';
import { tk } from '../i18n';

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
 * Example days to follow, one per age band, written for Nuzzle from public guidance (Raising
 * Children Network, the NHS, and Red Nose for safe sleep). Times are minutes after midnight.
 */
export interface ReferenceItem {
  kind: 'feed' | 'play' | 'nap' | 'solids' | 'bath' | 'bedtime';
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
  /** Ages this day suits, in days from birth. */
  fromDay: number;
  toDay: number;
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

const SAFE_SLEEP = 'on her back, in her own cot, face and head uncovered';

export const REFERENCE_DAYS: ReferenceDay[] = [
  {
    id: 'day-0-6w',
    label: 'Example day, 0 to 6 weeks',
    fromDay: 0, toDay: 42,
    intro: tk('Newborns feed on cue, often 8 to 12 times in 24 hours, so treat this as a loose shape to hang feeds on rather than a timetable. Awake times are short: 45 minutes to an hour, including the feed.'),
    gapMin: 180,
    night: tk('Night feeds whenever she wakes hungry, often every 2 to 4 hours. Keep the light low and talk to a minimum, so night slowly becomes different from day.'),
    items: [
      { kind: 'feed', at: h(7), note: 'Start the day with a feed and open the curtains' },
      { kind: 'nap', at: h(8), note: 'Sleep once she has been awake about 45 minutes to an hour' },
      { kind: 'feed', at: h(10), note: 'Feed when she stirs, around now' },
      { kind: 'play', at: h(10, 30), note: 'A little awake time: nappy change, cuddles, tummy time on your chest' },
      { kind: 'nap', at: h(11), note: 'Sleep' },
      { kind: 'feed', at: h(13), note: 'Feed' },
      { kind: 'nap', at: h(14), note: 'Sleep, in the pram or a carrier if you are out' },
      { kind: 'feed', at: h(16), note: 'Feed' },
      { kind: 'nap', at: h(17), note: 'A short sleep if she will take one' },
      { kind: 'feed', at: h(18), note: 'Evening feeds often bunch together; that is normal at this age' },
      { kind: 'bath', at: h(19, 30), note: 'Bath or a warm wash, then low light from here' },
      { kind: 'feed', at: h(20), note: 'Feed in a dim, quiet room' },
      { kind: 'bedtime', at: h(20, 30), note: `Down for the night ${SAFE_SLEEP}, in your room` },
    ],
  },
  {
    id: 'day-6-12w',
    label: 'Example day, 6 to 12 weeks',
    fromDay: 42, toDay: 84,
    intro: tk('Feeds start to space out to roughly every 3 hours in the day. Awake times stretch to about an hour to an hour and a half, and a longer first stretch of night sleep often appears.'),
    gapMin: 180,
    night: tk('Usually one to three night feeds. Feed when she wakes hungry; there is no need to wake her at night unless your nurse has asked you to.'),
    items: [
      { kind: 'feed', at: h(7), note: 'Wake up and feed' },
      { kind: 'play', at: h(7, 30), note: 'Awake time: chat, songs, a few minutes on her tummy' },
      { kind: 'nap', at: h(8, 30), note: 'Morning nap' },
      { kind: 'feed', at: h(10), note: 'Feed' },
      { kind: 'play', at: h(10, 30), note: 'Awake time; a walk outside helps set her body clock' },
      { kind: 'nap', at: h(11, 30), note: 'Midday nap, often the longest of the day' },
      { kind: 'feed', at: h(13), note: 'Feed' },
      { kind: 'nap', at: h(14, 30), note: 'Afternoon nap' },
      { kind: 'feed', at: h(16), note: 'Feed' },
      { kind: 'nap', at: h(17), note: 'A short catnap to make it to bedtime' },
      { kind: 'bath', at: h(18), note: 'Bath, then a quiet, dim wind down' },
      { kind: 'feed', at: h(18, 30), note: 'Bedtime feed' },
      { kind: 'bedtime', at: h(19), note: `Down for the night ${SAFE_SLEEP}` },
    ],
  },
  {
    id: 'day-3-4m',
    label: 'Example day, 3 to 4 months',
    fromDay: 84, toDay: 122,
    intro: tk('Feeds are often about 3 to 4 hours apart in the day, and she can stay happily awake for an hour and a half to two hours. Sleep can get unsettled around 4 months for a few weeks; it passes.'),
    gapMin: 210,
    night: tk('Many babies have one or two night feeds now, and some none. Feed when she is hungry.'),
    items: [
      { kind: 'feed', at: h(7), note: 'Wake up and feed' },
      { kind: 'play', at: h(7, 30), note: 'Play: floor time, looking at faces and books' },
      { kind: 'nap', at: h(8, 45), note: 'Morning nap' },
      { kind: 'feed', at: h(10, 30), note: 'Feed' },
      { kind: 'nap', at: h(12, 15), note: 'Midday nap' },
      { kind: 'feed', at: h(14), note: 'Feed' },
      { kind: 'nap', at: h(15, 45), note: 'A short late afternoon nap' },
      { kind: 'feed', at: h(17, 30), note: 'Feed' },
      { kind: 'bath', at: h(18, 30), note: 'Bath and a quiet wind down' },
      { kind: 'feed', at: h(19), note: 'Bedtime feed' },
      { kind: 'bedtime', at: h(19, 15), note: `Down for the night ${SAFE_SLEEP}` },
    ],
  },
  {
    id: 'day-4-6m',
    label: 'Example day, 4 to 6 months',
    fromDay: 122, toDay: 183,
    intro: tk('Milk feeds are often about 4 hours apart, with two to three naps. Solids usually start at around 6 months, when she can sit with support and shows interest in food; milk stays her main food.'),
    gapMin: 240,
    night: tk('Some babies sleep through by now and some still wake once or twice to feed. Both are normal.'),
    items: [
      { kind: 'feed', at: h(7), note: 'Wake up and feed' },
      { kind: 'play', at: h(7, 30), note: 'Play time; she can stay awake about two hours now' },
      { kind: 'nap', at: h(9), note: 'Morning nap' },
      { kind: 'feed', at: h(11), note: 'Feed' },
      { kind: 'nap', at: h(13), note: 'Afternoon nap' },
      { kind: 'feed', at: h(15), note: 'Feed' },
      { kind: 'nap', at: h(16, 30), note: 'A short catnap, if she needs one' },
      { kind: 'solids', at: h(17, 30), note: 'If solids have started: a few spoons of a first food, after a milk feed' },
      { kind: 'bath', at: h(18, 15), note: 'Bath and wind down' },
      { kind: 'feed', at: h(18, 45), note: 'Bedtime feed' },
      { kind: 'bedtime', at: h(19, 15), note: `Down for the night ${SAFE_SLEEP}` },
    ],
  },
];

/** Days saved before these example days were written point at the closest new one. */
const RENAMED: Record<string, string> = {
  'ref-2-4w': 'day-0-6w',
  'ref-4-8w': 'day-6-12w',
  'ref-8-16w': 'day-3-4m',
  'ref-4-6m': 'day-4-6m',
};

/** The reference day a plan follows, also for ids saved by an older version. */
export const referenceById = (id: string | undefined): ReferenceDay | null =>
  id ? REFERENCE_DAYS.find((r) => r.id === (RENAMED[id] ?? id)) ?? null : null;

/** The reference day that suits a baby's age, or the first one when the birthday isn't set. */
export function referenceFor(birthday: number | null, now: number): ReferenceDay {
  if (birthday === null) return REFERENCE_DAYS[0];
  const days = Math.floor((now - birthday) / 86_400_000);
  return REFERENCE_DAYS.find((r) => days >= r.fromDay && days < r.toDay) ?? REFERENCE_DAYS[REFERENCE_DAYS.length - 1];
}

/** Ways to keep a plan useful on real days. */
export const FLEXIBILITY_TIPS: string[] = [
  tk('These times are a guide. If she shows hunger cues, feed her, whatever the plan says.'),
  tk('Keeping the first feed and bedtime about the same each day matters more than any single time in between.'),
  tk('A short nap or an early feed is fine: pick the plan up again at the next feed.'),
  tk('Days out and visitors happen. Feed and sleep wherever you are, and start fresh tomorrow.'),
  tk('Safe sleep, every sleep: on her back, in her own cot, face and head uncovered, in a smoke free home.'),
  tk('Worried about feeds, weight or wet nappies? Your child health nurse or GP can help.'),
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
  const ref = referenceById(p.referenceId);
  if (ref) {
    const word = { feed: tk('Feed'), play: tk('Awake time'), nap: tk('Nap'), solids: tk('Solids'), bath: tk('Bath'), bedtime: tk('Bed') } as const;
    return ref.items.map((i) => ({ at: i.at, label: word[i.kind], feed: i.kind === 'feed' }));
  }
  return buildPlan(p).map((i) => ({ at: i.at, label: i.kind === 'feed' ? 'Feed' : i.kind === 'nap' ? 'Nap' : 'Bed', feed: i.kind === 'feed' }));
}

/** The plan's feed times, for reminders. */
export const planFeedTimes = (p: PlanSettings): number[] => planSteps(p).filter((s) => s.feed).map((s) => s.at);

/** A plan feed time this soon after a feed started is skipped: she has just fed. */
export const PLAN_SKIP_MIN = 60;

/**
 * When to ring for the plan's feeds over the next `days` days, as times in ms. They are booked again
 * every time the app opens or a feed changes, so only a phone left unopened for days runs out. A plan time is
 * skipped when the last feed started within an hour before it, so a feed that came a little early
 * doesn't get a second reminder.
 */
export function planFeedAlerts(p: PlanSettings, now: number, lastStart: number | null, days = 3): number[] {
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
