// Every screen with three days of sample feeds, for design reviews. Run: npx expo export --platform web, node scripts/serve-web.js 8811, then node scripts/design-screens.js docs/screenshots/design night (or day), optionally followed by a phone language such as de-DE.
const { chromium } = require('playwright');
const out = process.argv[2];
const theme = process.argv[3] || 'night';
const locale = process.argv[4] || 'en-AU'; // a phone language such as de-DE or ja-JP
const MIN = 60000, H = 60 * MIN;
(async () => {
  const now = Date.now();
  const feeds = []; const entries = [];
  let t = now - 3 * 24 * H; let side = 'L'; let n = 0;
  while (t < now - 2.2 * H) {
    n++;
    if (n % 7 === 0) feeds.push({ id: 'f' + n, status: 'saved', kind: 'bottle', segments: [], deletedAt: null, bottle: { at: t, amountMl: 90, milk: 'breast' }, updatedAt: t });
    else {
      const a = 8 + (n % 5) * 2, b = 6 + (n % 4) * 2, other = side === 'L' ? 'R' : 'L';
      feeds.push({ id: 'f' + n, status: 'saved', kind: 'breast', deletedAt: null, updatedAt: t, ...(n % 9 === 0 ? { note: 'Very sleepy, needed waking' } : {}),
        segments: [{ side, start: t, end: t + a * MIN }, { side: other, start: t + a * MIN + MIN, end: t + (a + b + 1) * MIN }] });
      side = other;
    }
    entries.push({ id: 'n' + n, type: 'entry', kind: 'nappy', babyId: 'b1', at: t + 25 * MIN, nappy: n % 3 === 0 ? 'both' : 'wet', deletedAt: null });
    if (n % 2 === 0) entries.push({ id: 's' + n, type: 'entry', kind: 'sleep', babyId: 'b1', at: t + 50 * MIN, end: t + 140 * MIN, deletedAt: null });
    t += (2.5 + (n % 3) * 0.5) * H;
  }
  entries.push({ id: 'g1', type: 'entry', kind: 'growth', babyId: 'b1', at: now - 2 * 24 * H, weightG: 3720, lengthMm: 525, deletedAt: null });
  entries.push({ id: 'p1', type: 'entry', kind: 'pump', at: now - 30 * H, leftMl: 60, rightMl: 50, minutes: 15, deletedAt: null });
  const settings = {
    babies: [{ id: 'b1', name: 'Daphne', birthday: new Date(2026, 9, 8).getTime(),
      plan: { dayStartMin: 420, bedtimeMin: 1140, gapMin: 150, awakeMin: 50, referenceId: 'ref-2-4w', on: true, updatedAt: 1 } }],
    activeBabyId: 'b1', onboarded: true, theme, reminderAsked: true, remindersOn: true, intervalMin: 180, units: 'ml',
    clockReminders: [{ hour: 21, minute: 0 }], quiet: { on: true, fromMin: 1320, toMin: 360 }, planReminders: ['b1'],
  };
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  const seed = async (s = settings, f = feeds, e = entries) => {
    await pg.goto('http://localhost:8811/'); await pg.evaluate(([s, f, e]) => {
      localStorage.clear();
      localStorage.setItem('nuzzle.settings', JSON.stringify(s));
      localStorage.setItem('nuzzle.feeds', JSON.stringify(f));
      localStorage.setItem('nuzzle.entries', JSON.stringify(e));
    }, [s, f, e]);
  };
  const go = async (path) => { await pg.goto('http://localhost:8811' + path); await pg.waitForTimeout(1500); };
  const tap = async (id) => { await pg.click(`[data-testid="${id}"]`); await pg.waitForTimeout(600); };
  let k = 0;
  const snap = async (name) => { k++; await pg.screenshot({ path: `${out}/${theme}-${String(k).padStart(2, '0')}-${name}.png` }); };
  const scrollSnaps = async (name, pages) => {
    await snap(name);
    for (let i = 2; i <= pages; i++) { await pg.mouse.move(200, 450); await pg.mouse.wheel(0, 700); await pg.waitForTimeout(500); await snap(`${name}-${i}`); }
  };

  if (theme === 'night') {
    // first launch
    await seed({}, [], []); await go('/');
    await pg.fill('[data-testid="welcome-name"]', 'Daphne'); await snap('welcome-1-baby'); await tap('welcome-next');
    await snap('welcome-2-reminders'); await tap('welcome-next');
    await snap('welcome-3-plan'); await tap('welcome-finish'); await pg.waitForTimeout(500);
    await snap('home-first-feed');
  }
  await seed(); await go('/');
  await snap('home-idle');
  await tap('side-L'); await pg.waitForTimeout(3000); await snap('home-feeding-left');
  await tap('side-R'); await pg.waitForTimeout(2000); await snap('home-switched-right');
  await tap('side-R'); await pg.waitForTimeout(800); await snap('home-paused');
  await tap('done'); await pg.waitForTimeout(800); await snap('home-just-saved');
  await seed(); await go('/'); await tap('log'); await snap('home-log');
  await seed(); await go('/'); await tap('log'); await tap('log-sleep'); await pg.waitForTimeout(800); await snap('home-asleep');
  await seed(); await go('/history'); await scrollSnaps('history-list', 3);
  await go('/history'); await tap('choice-week'); await snap('history-week');
  await go('/history'); await tap('choice-summary'); await snap('history-summary');
  await go('/feed/f2'); await snap('edit-feed'); await tap('when'); await snap('edit-feed-when');
  await go('/feed/new'); await snap('add-feed');
  await go('/feed/new?kind=bottle'); await snap('log-bottle');
  await go('/entry/new?kind=nappy'); await snap('log-nappy');
  await go('/entry/new?kind=pump'); await snap('log-pumping');
  await go('/entry/new?kind=growth'); await snap('log-weight');
  await go('/entry/s2'); await snap('edit-sleep');
  await go('/plan'); await scrollSnaps('plan', 2); await tap('plan-flexible'); await snap('plan-flexible');
  await go('/settings'); await scrollSnaps('settings', 2);
  await go('/sharing'); await snap('sharing');
  await go('/plus'); await snap('plus');
  console.log(theme, k, 'errors', errs);
  await b.close();
})();
