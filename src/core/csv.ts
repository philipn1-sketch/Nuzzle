import { endSide, feedEnd, feedStart, isBottle, savedFeeds, sideMs } from './feeds';
import { milkWord, sideWord } from './format';
import type { Feed } from './types';

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
export function feedsToCsv(feeds: Feed[], now: number, nameOf: (f: Feed) => string = () => 'Baby'): string {
  const rows = ['baby,date,start,end,type,left minutes,right minutes,total minutes,ended on,bottle ml,milk,note'];
  for (const f of [...savedFeeds(feeds)].reverse()) {
    const l = sideMs(f, 'L', now);
    const r = sideMs(f, 'R', now);
    const bottle = isBottle(f);
    rows.push([
      quote(nameOf(f)), date(feedStart(f)), time(feedStart(f)), time(feedEnd(f, now)), bottle ? 'bottle' : 'breast',
      minutes(l), minutes(r), minutes(l + r), bottle ? '' : sideWord(endSide(f)),
      bottle ? String(f.bottle?.amountMl ?? 0) : '', bottle && f.bottle ? milkWord(f.bottle.milk) : '', quote(f.note ?? ''),
    ].join(','));
  }
  return rows.join('\n') + '\n';
}
