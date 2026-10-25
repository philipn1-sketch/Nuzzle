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
  remindersOn: boolean;
  intervalMin: number;
  theme: ThemeChoice;
  /** The reminder card after the first feed has been answered (either way). */
  reminderAsked: boolean;
}
