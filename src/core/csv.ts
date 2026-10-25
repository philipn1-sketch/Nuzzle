import { entryDetail, lengthText, liveEntries, nappyWord, weightText } from './entries';
import { endSide, feedEnd, feedStart, isBottle, savedFeeds, sideMs } from './feeds';
import { milkWord, sideWord } from './format';
import type { Entry, Feed, Units } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const date = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
};
const time = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const minutes = (ms: number) => (ms / 60_000).toFixed(1);
const quote = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Every saved feed, oldest first, as a spreadsheet friendly CSV. `nameOf` gives the baby's name for a feed. */
export function feedsToCsv(
  feeds: Feed[],
  now: number,
  nameOf: (f: { babyId?: string }) => string = () => 'Baby',
  entries: Entry[] = [],
  units: Units = 'ml',
): string {
  const rows = ['baby,date,start,end,type,left minutes,right minutes,total minutes,ended on,bottle ml,milk,note,details'];
  const lines: { t: number; line: string }[] = [];
  for (const f of [...savedFeeds(feeds)].reverse()) {
    const l = sideMs(f, 'L', now);
    const r = sideMs(f, 'R', now);
    const bottle = isBottle(f);
    lines.push({ t: feedStart(f), line: [
      quote(nameOf(f)), date(feedStart(f)), time(feedStart(f)), time(feedEnd(f, now)), bottle ? 'bottle' : 'breast',
      minutes(l), minutes(r), minutes(l + r), bottle ? '' : sideWord(endSide(f)),
      bottle ? String(f.bottle?.amountMl ?? 0) : '', bottle && f.bottle ? milkWord(f.bottle.milk) : '', quote(f.note ?? ''), '',
    ].join(',') });
  }
  for (const e of liveEntries(entries)) {
    const end = e.kind === 'sleep' && e.end ? time(e.end) : '';
    const details =
      e.kind === 'nappy' ? nappyWord(e.nappy ?? 'wet')
      : e.kind === 'pump' ? entryDetail(e, units)
      : e.kind === 'growth' ? [e.weightG ? weightText(e.weightG, units) : '', e.lengthMm ? lengthText(e.lengthMm, units) : ''].filter(Boolean).join(' ')
      : '';
    lines.push({ t: e.at, line: [
      quote(e.kind === 'pump' ? '' : nameOf(e)), date(e.at), time(e.at), end, e.kind, '', '', '', '', '', '', quote(e.note ?? ''), quote(details),
    ].join(',') });
  }
  lines.sort((a, b) => a.t - b.t);
  return [...rows, ...lines.map((l) => l.line)].join('\n') + '\n';
}
