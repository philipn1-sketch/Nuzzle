// Screenshots every screen and state of the web preview, in night and day themes.
// Usage: node scripts/shots-web.js <out dir> [only theme]
const { chromium } = require('playwright');

const MIN = 60_000;
const URL = 'http://localhost:8790/';

function sampleFeeds(now) {
  const feeds = [];
  let t = now - 95 * MIN;
  const shapes = [[9, 7, 'R'], [12, 0, 'L'], [8, 10, 'L'], [0, 14, 'R'], [11, 9, 'R'], [10, 6, 'L'], [7, 12, 'R'], [13, 8, 'L'], [9, 9, 'R'], [6, 11, 'L']];
  shapes.forEach(([l, r, ended], i) => {
    const first = ended === 'L' ? 'R' : 'L';
    const ms = { L: l * MIN, R: r * MIN };
    const segs = [];
    let s = t;
    if (ms[first] > 0) { segs.push({ side: first, start: s, end: s + ms[first] }); s += ms[first]; }
    segs.push({ side: ended, start: s, end: s + ms[ended] });
    feeds.push({ id: `sample${i}`, status: 'saved', segments: segs, deletedAt: null });
    t -= (130 + ((i * 37) % 60)) * MIN;
  });
  return feeds;
}

async function main() {
  const out = process.argv[2];
  const only = process.argv[3];
  const b = await chromium.launch();
  const errors = [];
  for (const theme of only ? [only] : ['night', 'day']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme === 'night' ? 'dark' : 'light' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
    const settings = (extra = {}) => ({ babyName: '', remindersOn: true, intervalMin: 120, theme, reminderAsked: true, ...extra });
    const load = async (feeds, extra) => {
      await p.goto(URL);
      await p.evaluate(([f, s]) => {
        localStorage.setItem('nuzzle.feeds', JSON.stringify(f));
        localStorage.setItem('nuzzle.settings', JSON.stringify(s));
      }, [feeds, settings(extra)]);
      await p.goto(URL);
      await p.waitForSelector('[data-testid="side-L"]');
      await p.evaluate(() => document.fonts && document.fonts.ready);
      await p.waitForTimeout(400);
    };
    const shot = async (name) => p.screenshot({ path: `${out}/${theme}-${name}.png` });
    const now = Date.now();

    await load([], { reminderAsked: false });
    await shot('01-home-first-launch');

    await load(sampleFeeds(now));
    await shot('02-home-idle');

    await p.click('[data-testid="side-L"]');
    await p.waitForTimeout(300);
    await shot('03-home-started-snackbar');
    await p.waitForTimeout(2200);
    await p.click('[data-testid="side-R"]');
    await p.waitForTimeout(1300);
    await shot('04-home-running');
    await p.click('[data-testid="side-R"]');
    await p.waitForTimeout(400);
    await shot('05-home-paused');
    await p.click('[data-testid="side-L"]');
    await p.waitForTimeout(3000);
    await p.click('[data-testid="done"]');
    await p.waitForTimeout(400);
    await shot('06-home-just-saved');

    const old = sampleFeeds(now - 70 * MIN);
    await load(old);
    await shot('07-home-reminder-due');

    await load(sampleFeeds(now), { reminderAsked: false });
    await shot('08-home-ask-reminders');

    const long = [...sampleFeeds(now - 200 * MIN), { id: 'running', status: 'running', segments: [{ side: 'L', start: now - 160 * MIN, end: null }], deletedAt: null }];
    await load(long);
    await shot('09-home-still-feeding');

    await load(sampleFeeds(now));
    await p.click('[data-testid="open-history"]');
    await p.waitForTimeout(400);
    await shot('10-history');
    await p.click('[data-testid="feed-row-sample1"]');
    await p.waitForTimeout(400);
    await shot('11-edit-feed');
    await p.click('[data-testid="cancel"]');
    await p.waitForTimeout(300);
    await p.click('[data-testid="add-feed"]');
    await p.waitForTimeout(400);
    await shot('12-add-feed');
    await p.click('[data-testid="save-feed"]');
    await p.waitForTimeout(300);
    await shot('13-add-feed-problem');

    await load([]);
    await p.click('[data-testid="open-history"]');
    await p.waitForTimeout(400);
    await shot('14-history-empty');

    await load(sampleFeeds(now), { babyName: 'Daphne' });
    await p.click('[data-testid="open-settings"]');
    await p.waitForTimeout(400);
    await shot('15-settings');

    // Phase 1: bottles, notes, babies, week view
    const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
    const born = new Date(day0); born.setDate(born.getDate() - 17);
    const twoBabies = { babies: [{ id: 'b1', name: 'Daphne', birthday: born.getTime() }, { id: 'b2', name: 'Ivy', birthday: born.getTime() }], activeBabyId: 'b1', units: 'ml', clockReminders: [{ hour: 21, minute: 0 }] };
    const withBottle = [
      ...sampleFeeds(now - 40 * MIN).map((f, i) => (i === 1 ? { ...f, note: 'Sleepy, woke for the second side' } : f)),
      { id: 'bottle1', status: 'saved', segments: [], deletedAt: null, kind: 'bottle', bottle: { at: now - 25 * MIN, amountMl: 90, milk: 'breast' }, note: 'Dad did this one' },
    ];
    const daphne = { babies: [twoBabies.babies[0]], activeBabyId: 'b1', units: 'ml', clockReminders: [] };
    await load(withBottle, daphne);
    await shot('16-home-after-bottle');
    await p.click('[data-testid="open-history"]');
    await p.waitForTimeout(400);
    await shot('17-history-bottle-note');
    await p.click('[data-testid="choice-week"]:visible');
    await p.waitForTimeout(400);
    await shot('18-week');
    await p.click('[data-testid="back"]');
    await p.waitForTimeout(300);
    await p.click('[data-testid="log-bottle"]');
    await p.waitForTimeout(400);
    await shot('19-log-bottle');
    await load(withBottle, twoBabies);
    await shot('20-home-two-babies');
    await p.click('[data-testid="open-settings"]');
    await p.waitForTimeout(400);
    await shot('21-settings-babies');
    await p.mouse.move(195, 500);
    await p.mouse.wheel(0, 900);
    await p.waitForTimeout(300);
    await shot('22-settings-more');

    // nappies, pumping, growth, sleep, summary, quiet hours
    const ent = (x) => ({ type: 'entry', deletedAt: null, ...x });
    const extras = [
      ent({ id: 'n1', kind: 'nappy', nappy: 'wet', at: now - 30 * MIN }),
      ent({ id: 'n2', kind: 'nappy', nappy: 'both', at: now - 200 * MIN }),
      ent({ id: 'n3', kind: 'nappy', nappy: 'dirty', at: now - 26 * 60 * MIN }),
      ent({ id: 'p1', kind: 'pump', leftMl: 60, rightMl: 50, minutes: 15, at: now - 120 * MIN }),
      ent({ id: 'g1', kind: 'growth', weightG: 4210, lengthMm: 545, at: now - 28 * 60 * MIN, note: 'Health visitor' }),
      ent({ id: 's1', kind: 'sleep', at: now - 42 * MIN, end: null }),
    ];
    await p.goto(URL);
    await p.evaluate((x) => localStorage.setItem('nuzzle.entries', JSON.stringify(x)), extras);
    await load(withBottle, daphne);
    await shot('23-home-asleep-nappies');
    await p.click('[data-testid="log-nappy"]');
    await p.waitForTimeout(400);
    await shot('24-nappy');
    await p.click('[data-testid="cancel"]');
    await p.waitForTimeout(300);
    await p.click('[data-testid="log-pump"]');
    await p.waitForTimeout(400);
    await shot('25-pump');
    await p.click('[data-testid="cancel"]');
    await p.waitForTimeout(300);
    await p.click('[data-testid="open-history"]');
    await p.waitForTimeout(400);
    await shot('26-history-everything');
    await p.click('[data-testid="add-growth"]');
    await p.waitForTimeout(400);
    await shot('27-growth');
    await p.click('[data-testid="cancel"]');
    await p.waitForTimeout(300);
    await p.click('[data-testid="open-summary"]');
    await p.waitForTimeout(400);
    await shot('28-summary');
    await load(withBottle, { ...daphne, quiet: { on: true, fromMin: 1320, toMin: 360 }, clockReminders: [{ hour: 21, minute: 0 }] });
    await p.click('[data-testid="open-settings"]');
    await p.waitForTimeout(400);
    await p.mouse.move(195, 500);
    await p.mouse.wheel(0, 700);
    await p.waitForTimeout(300);
    await shot('29-settings-quiet-hours');
    await ctx.close();
  }
  await b.close();
  console.log(errors.length ? errors.join('\n') : 'no page errors');
}
main();
