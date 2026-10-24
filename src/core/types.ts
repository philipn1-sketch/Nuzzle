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
}

export type ThemeName = 'night' | 'day';

export interface Settings {
  babyName: string;
  remindersOn: boolean;
  intervalMin: number;
  theme: ThemeName;
  /** The reminder card after the first feed has been answered (either way). */
  reminderAsked: boolean;
}
