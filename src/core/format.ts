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

/** 1h 40m, 40m, 2h, or "under a minute". */
export function span(ms: number): string {
  const m = Math.floor(Math.abs(ms) / 60_000);
  if (m < 1) return 'under a minute';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

/** Whole minutes, rounded, for feed lengths. */
export const mins = (ms: number): number => Math.round(ms / 60_000);

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
