export type Side = 'L' | 'R';

/** running and paused feeds are still being timed; saved feeds are finished. */
export type FeedStatus = 'running' | 'paused' | 'saved';

/** A stretch of feeding on one side. `end` is null while that side is running. */
export interface Segment {
  side: Side;
  start: number;
  end: number | null;
}

/**
 * A feed is stored as its segments, never as a running count, so every time on screen
 * can be worked out again from timestamps after the app is closed or the phone restarts.
 */
export interface Feed {
  id: string;
  status: FeedStatus;
  segments: Segment[];
  /** Set when deleted; kept for a while so Undo can bring it back. */
  deletedAt: number | null;
  /** Missing on feeds saved before bottles existed, which are all breast feeds. */
  kind?: FeedKind;
  /** Missing on feeds saved before there could be more than one baby: they belong to the first baby. */
  babyId?: string;
  note?: string;
  /** Only on bottle feeds, which have no segments. */
  bottle?: Bottle;
  /** When this feed was last changed on this phone, for syncing later. */
  updatedAt?: number;
}

export type FeedKind = 'breast' | 'bottle';
export type Milk = 'breast' | 'formula';

/** A bottle is logged as one moment and an amount, always stored in millilitres. */
export interface Bottle {
  at: number;
  amountMl: number;
  milk: Milk;
}

export type EntryKind = 'nappy' | 'pump' | 'growth' | 'sleep';
export type Nappy = 'wet' | 'dirty' | 'both';

/**
 * Everything logged that isn't a feed. Stored and synced the same way as feeds: by timestamp,
 * never lost, deleted softly so Undo works.
 */
export interface Entry {
  id: string;
  /** Marks an entry apart from a feed when both travel through sync together. */
  type: 'entry';
  kind: EntryKind;
  /** Missing for pumping, which is hers, not the baby's. */
  babyId?: string;
  at: number;
  /** Sleep only: when she woke; null while asleep. */
  end?: number | null;
  nappy?: Nappy;
  /** Pumping, in millilitres per side, and how long it took. */
  leftMl?: number;
  rightMl?: number;
  minutes?: number;
  /** Growth, in grams and millimetres. */
  weightG?: number;
  lengthMm?: number;
  note?: string;
  deletedAt: number | null;
  updatedAt?: number;
}

/** Reminders arrive without sound between these clock times, for example 22:00 to 06:00. */
export interface QuietHours {
  on: boolean;
  fromMin: number;
  toMin: number;
}

export interface Baby {
  id: string;
  name: string;
  /** Local midnight of the day she was born, or null until it is set. */
  birthday: number | null;
}

/** A reminder that rings every day at the same clock time. */
export interface ClockReminder {
  hour: number;
  minute: number;
}

export type ThemeName = 'night' | 'day';
export type ThemeChoice = ThemeName | 'system';
export type Units = 'ml' | 'oz';

export interface Settings {
  babies: Baby[];
  activeBabyId: string;
  units: Units;
  /** When the babies list last changed, so the newer list wins between two phones. */
  babiesUpdatedAt?: number;
  clockReminders: ClockReminder[];
  quiet: QuietHours;
  /** Each baby's daily plan, by baby id. */
  plans?: Record<string, { dayStartMin: number; bedtimeMin: number; gapMin: number; awakeMin: number; referenceId?: string }>;
  remindersOn: boolean;
  intervalMin: number;
  theme: ThemeChoice;
  /** The reminder card after the first feed has been answered (either way). */
  reminderAsked: boolean;
}
