import type { Side } from './types';

/** 4:05 or 1:04:05, for timers. */
export function clock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** 1h 40m, 40m, 2h, or "just now". */
export function span(ms: number): string {
  const m = Math.floor(Math.abs(ms) / 60_000);
  if (m < 1) return 'just now';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

/** The same as span, in full words for screen readers: "1 hour 40 minutes". */
export function spanWords(ms: number): string {
  const m = Math.floor(Math.abs(ms) / 60_000);
  if (m < 1) return 'just now';
  const h = Math.floor(m / 60);
  const r = m % 60;
  const hours = h === 1 ? '1 hour' : `${h} hours`;
  const minutes = r === 1 ? '1 minute' : `${r} minutes`;
  if (h === 0) return minutes;
  return r === 0 ? hours : `${hours} ${minutes}`;
}

/** Whole minutes, rounded, for feed lengths. */
export const mins = (ms: number): number => (ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60_000)));

/** Clock time in her phone's own format, for example 3:02 AM or 03:02. */
export const timeOf = (t: number): string =>
  new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const sideWord = (s: Side): string => (s === 'L' ? 'left' : 'right');
export const sideName = (s: Side): string => (s === 'L' ? 'Left' : 'Right');

/** Today, Yesterday, or a short date such as Tue 21 Oct. */
export function dayLabel(dayStart: number, now: number): string {
  const today = new Date(now);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const y0 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime();
  if (dayStart === t0) return 'Today';
  if (dayStart === y0) return 'Yesterday';
  return new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Born today", "12 days old", "3 weeks 2 days old", "2 months 1 week old", "2 years old". Counted in calendar days. */
export function ageText(birthday: number, now: number): string {
  const b = new Date(birthday);
  const n = new Date(now);
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const n0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const days = Math.round((n0.getTime() - b0.getTime()) / 86_400_000);
  if (days < 0) return '';
  if (days === 0) return 'Born today';
  if (days < 14) return `${plural(days, 'day')} old`;
  if (days < 56) {
    const d = days % 7;
    return `${plural(Math.floor(days / 7), 'week')}${d ? ` ${plural(d, 'day')}` : ''} old`;
  }
  let months = (n0.getFullYear() - b0.getFullYear()) * 12 + n0.getMonth() - b0.getMonth();
  if (n0.getDate() < b0.getDate()) months -= 1;
  if (months >= 24) return `${plural(Math.floor(months / 12), 'year')} old`;
  const monthDay = new Date(b0.getFullYear(), b0.getMonth() + months, b0.getDate());
  const weeks = Math.floor(Math.round((n0.getTime() - monthDay.getTime()) / 86_400_000) / 7);
  return `${plural(months, 'month')}${weeks ? ` ${plural(weeks, 'week')}` : ''} old`;
}

const ML_PER_OZ = 29.5735;
/** Amounts are stored in millilitres; ounces show to the nearest half. */
export const toOz = (ml: number): number => Math.round((ml / ML_PER_OZ) * 2) / 2;
export const fromOz = (oz: number): number => Math.round(oz * ML_PER_OZ);
export const amount = (ml: number, units: 'ml' | 'oz'): string => (units === 'oz' ? `${toOz(ml)} oz` : `${ml} ml`);
export const milkWord = (m: 'breast' | 'formula'): string => (m === 'formula' ? 'formula' : 'breast milk');

/** A clock time of day, such as 9:00 PM, in her phone's own format. */
export const clockTime = (hour: number, minute: number): string => timeOf(new Date(2000, 0, 1, hour, minute).getTime());
