import { Week, type Feed } from 'nuzzle-design';

const NOW = new Date(2026, 9, 26, 16, 30).getTime();
const MIN = 60_000;
const H = 60 * MIN;

/** Three days of feeds, alternating sides every two and a half to three and a half hours. */
function sample(): Feed[] {
  const out: Feed[] = [];
  let t = NOW - 6.5 * 24 * H;
  let side: 'L' | 'R' = 'L';
  for (let n = 1; t < NOW - 2 * H; n++) {
    if (n % 7 === 0) {
      out.push({ id: `b${n}`, status: 'saved', kind: 'bottle', segments: [], deletedAt: null, bottle: { at: t, amountMl: 90, milk: 'breast' } });
    } else {
      const a = 8 + (n % 5) * 2;
      const b = 6 + (n % 4) * 2;
      const other = side === 'L' ? 'R' : 'L';
      out.push({
        id: `f${n}`, status: 'saved', kind: 'breast', deletedAt: null,
        segments: [{ side, start: t, end: t + a * MIN }, { side: other, start: t + (a + 1) * MIN, end: t + (a + b + 1) * MIN }],
      });
      side = other;
    }
    t += (2.5 + (n % 3) * 0.5) * H;
  }
  return out;
}

/** The week view from History. */
export const LastSevenDays = () => (
  <div style={{ display: 'flex', flexDirection: 'column', padding: 20, width: 390 }}>
    <Week feeds={sample()} now={NOW} units="ml" />
  </div>
);
