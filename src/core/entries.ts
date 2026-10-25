import { amount, span } from './format';
import type { Entry, EntryKind, Nappy, QuietHours, Settings, Units } from './types';

export const ENTRY_KINDS: EntryKind[] = ['nappy', 'pump', 'growth', 'sleep'];

export const liveEntries = (entries: Entry[]): Entry[] => entries.filter((e) => e.deletedAt === null);

/** One baby's entries. Pumping is hers, so it shows for every baby. Old entries belong to the first baby. */
export const entriesOf = (entries: Entry[], s: Settings, babyId: string): Entry[] => {
  const first = s.babies[0]?.id;
  return entries.filter((e) => e.kind === 'pump' || (e.babyId ?? first) === babyId);
};

/** Newest first. */
export const sortedEntries = (entries: Entry[]): Entry[] => [...liveEntries(entries)].sort((a, b) => b.at - a.at);

/** The sleep going on right now, if any. */
export const runningSleep = (entries: Entry[]): Entry | null =>
  liveEntries(entries).find((e) => e.kind === 'sleep' && (e.end ?? null) === null) ?? null;

export const startSleep = (now: number, id: string): Entry => ({ id, type: 'entry', kind: 'sleep', at: now, end: null, deletedAt: null });

export const wakeUp = (sleep: Entry, now: number): Entry => ({ ...sleep, end: Math.max(now, sleep.at) });

export const sleepMs = (e: Entry, now: number): number => Math.max(0, (e.end ?? now) - e.at);

export const nappyWord = (n: Nappy): string => (n === 'both' ? 'Wet and dirty' : n === 'wet' ? 'Wet' : 'Dirty');

const GRAMS_PER_OZ = 28.3495;

/** 4.21 kg, or 9 lb 4 oz. */
export function weightText(g: number, units: Units): string {
  if (units === 'ml') return `${(g / 1000).toFixed(2)} kg`;
  const oz = Math.round(g / GRAMS_PER_OZ);
  return `${Math.floor(oz / 16)} lb ${oz % 16} oz`;
}

/** 54.5 cm, or 21.5 in. */
export function lengthText(mm: number, units: Units): string {
  return units === 'ml' ? `${(mm / 10).toFixed(1).replace(/\.0$/, '')} cm` : `${(mm / 25.4).toFixed(1).replace(/\.0$/, '')} in`;
}

/** One line for a list: "Wet nappy", "Pumped 120 ml", "Weight 4.21 kg", "Slept 1h 20m". */
export function entryTitle(e: Entry, units: Units, now: number): string {
  switch (e.kind) {
    case 'nappy':
      return `${nappyWord(e.nappy ?? 'wet')} nappy`;
    case 'pump': {
      const total = (e.leftMl ?? 0) + (e.rightMl ?? 0);
      return `Pumped ${amount(total, units)}`;
    }
    case 'growth': {
      const parts = [e.weightG ? `Weight ${weightText(e.weightG, units)}` : '', e.lengthMm ? `length ${lengthText(e.lengthMm, units)}` : ''].filter(Boolean);
      const line = parts.join(', ');
      return line.charAt(0).toUpperCase() + line.slice(1);
    }
    case 'sleep':
      return (e.end ?? null) === null ? `Asleep for ${span(now - e.at)}` : `Slept ${span(sleepMs(e, now))}`;
  }
}

/** Extra detail for pumping: "Left 60 ml, right 50 ml, 15 min". */
export function entryDetail(e: Entry, units: Units): string {
  if (e.kind !== 'pump') return '';
  const parts = [`Left ${amount(e.leftMl ?? 0, units)}`, `right ${amount(e.rightMl ?? 0, units)}`];
  if (e.minutes) parts.push(`${e.minutes} min`);
  return parts.join(', ');
}

export interface NappyCount {
  /** Wet ones, counting wet and dirty ones too. */
  wet: number;
  /** Dirty ones, counting wet and dirty ones too. */
  dirty: number;
  total: number;
  /** Just wet, just dirty, and both. */
  wetOnly: number;
  dirtyOnly: number;
  both: number;
}

/** Nappies changed between two times. A wet and dirty one counts as both. */
export function nappyCount(entries: Entry[], from: number, to: number): NappyCount {
  const c = { wet: 0, dirty: 0, total: 0, wetOnly: 0, dirtyOnly: 0, both: 0 };
  for (const e of liveEntries(entries)) {
    if (e.kind !== 'nappy' || e.at < from || e.at >= to) continue;
    c.total += 1;
    if (e.nappy !== 'dirty') c.wet += 1;
    if (e.nappy !== 'wet') c.dirty += 1;
    if (e.nappy === 'both') c.both += 1;
    else if (e.nappy === 'dirty') c.dirtyOnly += 1;
    else c.wetOnly += 1;
  }
  return c;
}

/** "3 nappies today: 2 wet, 1 wet and dirty". Each nappy is counted once. */
export function nappyLine(c: NappyCount, when = 'today'): string {
  const parts = [c.wetOnly ? `${c.wetOnly} wet` : '', c.dirtyOnly ? `${c.dirtyOnly} dirty` : '', c.both ? `${c.both} wet and dirty` : ''].filter(Boolean);
  return `${c.total} ${c.total === 1 ? 'nappy' : 'nappies'}${when ? ` ${when}` : ''}: ${parts.join(', ')}`;
}

/** Sleep between two times, counting only the part inside the window. */
export function sleepWithin(entries: Entry[], from: number, to: number, now: number): number {
  let ms = 0;
  for (const e of liveEntries(entries)) {
    if (e.kind !== 'sleep') continue;
    const a = Math.max(e.at, from);
    const b = Math.min(e.end ?? now, to);
    if (b > a) ms += b - a;
  }
  return ms;
}

/** Whether a moment falls in her quiet hours, which may run past midnight. */
export function inQuiet(at: number, q: QuietHours): boolean {
  if (!q.on || q.fromMin === q.toMin) return false;
  const d = new Date(at);
  const m = d.getHours() * 60 + d.getMinutes();
  return q.fromMin < q.toMin ? m >= q.fromMin && m < q.toMin : m >= q.fromMin || m < q.toMin;
}

export type EntryProblem = 'empty' | 'future' | 'order';

/** Checks an entry before it is saved from the editor. */
export function checkEntry(e: Entry, now: number): EntryProblem | null {
  if (e.at > now + 60_000) return 'future';
  if (e.kind === 'pump' && (e.leftMl ?? 0) + (e.rightMl ?? 0) <= 0) return 'empty';
  if (e.kind === 'growth' && !e.weightG && !e.lengthMm) return 'empty';
  if (e.kind === 'sleep' && e.end != null && e.end < e.at) return 'order';
  if (e.kind === 'sleep' && e.end != null && e.end > now + 60_000) return 'future';
  return null;
}

/** Cleans the note, dropping it when blank. */
export function withNote<T extends { note?: string }>(x: T, note: string | undefined): T {
  const { note: _old, ...rest } = x;
  const t = (note ?? '').trim();
  return (t ? { ...rest, note: t } : rest) as T;
}
