import { endSide, feedEnd, feedStart, savedFeeds, sideMs } from './feeds';
import { sideWord } from './format';
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

/** Every saved feed, oldest first, as a spreadsheet friendly CSV. */
export function feedsToCsv(feeds: Feed[], now: number): string {
  const rows = ['date,start,end,left minutes,right minutes,total minutes,ended on'];
  for (const f of [...savedFeeds(feeds)].reverse()) {
    const l = sideMs(f, 'L', now);
    const r = sideMs(f, 'R', now);
    rows.push([date(feedStart(f)), time(feedStart(f)), time(feedEnd(f, now)), minutes(l), minutes(r), minutes(l + r), sideWord(endSide(f))].join(','));
  }
  return rows.join('\n') + '\n';
}
