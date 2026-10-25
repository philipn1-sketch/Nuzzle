import { dayStartOf, feedStart, isBottle, liveFeedsOnly, sideMs } from './feeds';
import { lengthText, liveEntries, nappyCount, sleepWithin, weightText } from './entries';
import { amount, mins, span } from './format';
import type { Entry, Feed, Units } from './types';

export interface SummaryDay {
  dayStart: number;
  feeds: number;
  leftMs: number;
  rightMs: number;
  bottles: number;
  bottleMl: number;
  wet: number;
  dirty: number;
  sleepMs: number;
}

/** One row per day for the last `days` days, oldest first. */
export function summaryDays(feeds: Feed[], entries: Entry[], days: number, now: number): SummaryDay[] {
  const out: SummaryDay[] = [];
  const saved = liveFeedsOnly(feeds).filter((f) => f.status === 'saved');
  for (let back = days - 1; back >= 0; back -= 1) {
    const d0 = dayStartOf(now, back);
    const d1 = dayStartOf(now, back - 1);
    const today = saved.filter((f) => feedStart(f) >= d0 && feedStart(f) < d1);
    const n = nappyCount(entries, d0, d1);
    out.push({
      dayStart: d0,
      feeds: today.length,
      leftMs: today.reduce((t, f) => t + sideMs(f, 'L', now), 0),
      rightMs: today.reduce((t, f) => t + sideMs(f, 'R', now), 0),
      bottles: today.filter(isBottle).length,
      bottleMl: today.reduce((t, f) => t + (f.bottle?.amountMl ?? 0), 0),
      wet: n.wet,
      dirty: n.dirty,
      sleepMs: sleepWithin(entries, d0, d1, now),
    });
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const date = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * A one page summary to show at a check up: what was logged, day by day, and any weights.
 * Only what was recorded. No targets, ranges or advice.
 */
export function summaryHtml(o: { name: string; age: string; feeds: Feed[]; entries: Entry[]; days: number; units: Units; now: number }): string {
  const rows = summaryDays(o.feeds, o.entries, o.days, o.now);
  const any = (k: keyof SummaryDay) => rows.some((r) => (r[k] as number) > 0);
  const showBottles = any('bottles');
  const showNappies = any('wet') || any('dirty');
  const showSleep = any('sleepMs');
  const growth = liveEntries(o.entries).filter((e) => e.kind === 'growth').sort((a, b) => b.at - a.at).slice(0, 6);
  const first = rows[0]?.dayStart ?? o.now;
  const cell = (s: string) => `<td>${s}</td>`;
  const head = ['Day', 'Feeds', 'Left', 'Right', ...(showBottles ? ['Bottles'] : []), ...(showNappies ? ['Wet', 'Dirty'] : []), ...(showSleep ? ['Sleep'] : [])];
  const body = rows
    .map((r) =>
      `<tr>${[
        date(r.dayStart),
        String(r.feeds),
        `${mins(r.leftMs)} min`,
        `${mins(r.rightMs)} min`,
        ...(showBottles ? [r.bottles ? `${r.bottles} · ${amount(r.bottleMl, o.units)}` : '0'] : []),
        ...(showNappies ? [String(r.wet), String(r.dirty)] : []),
        ...(showSleep ? [r.sleepMs ? span(r.sleepMs) : '0'] : []),
      ].map(cell).join('')}</tr>`,
    )
    .join('');
  const growthRows = growth
    .map((g) => `<tr>${cell(date(g.at))}${cell(g.weightG ? weightText(g.weightG, o.units) : '')}${cell(g.lengthMm ? lengthText(g.lengthMm, o.units) : '')}${cell(esc(g.note ?? ''))}</tr>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#2D1E33;margin:32px;font-size:12pt}
h1{font-size:20pt;margin:0}p{margin:4px 0 16px;color:#6B5872}
table{border-collapse:collapse;width:100%;margin-bottom:20px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #E5DAE2;font-size:11pt}
th{color:#6B5872;font-weight:600}h2{font-size:13pt;margin:16px 0 6px}
</style></head><body>
<h1>${esc(o.name)}</h1>
<p>${o.age ? `${esc(o.age)} · ` : ''}${date(first)} to ${date(o.now)} · from Nuzzle</p>
<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
${growthRows ? `<h2>Weight and length</h2><table><thead><tr><th>Day</th><th>Weight</th><th>Length</th><th>Note</th></tr></thead><tbody>${growthRows}</tbody></table>` : ''}
<p>Left and Right are minutes on each side. Times are from the phone, as logged.</p>
</body></html>`;
}
