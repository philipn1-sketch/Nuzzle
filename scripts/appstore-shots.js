// App Store screenshots for the 6.9 inch iPhone (1320 x 2868), in every language, with a caption.
// Run: npx expo export --platform web, node scripts/serve-web.js 8811, then node scripts/appstore-shots.js
// Optionally pass languages to make: node scripts/appstore-shots.js fr de
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'docs', 'appstore', 'screenshots');
const MIN = 60000, H = 60 * MIN;

const LANGS = {
  en: { locale: 'en-AU', captions: ['One tap to start. Nuzzle remembers the side.', 'See the time since the last feed', 'Every feed, bottle and nappy', 'The whole week at a glance', 'A gentle plan for her age', 'Log anything in two taps'] },
  fr: { locale: 'fr-FR', captions: ['Un geste pour commencer. Nuzzle retient le côté.', 'Le temps depuis la dernière tétée', 'Chaque tétée, biberon et couche', 'Toute la semaine en un coup d’œil', 'Un programme doux pour son âge', 'Tout noter en deux gestes'] },
  de: { locale: 'de-DE', captions: ['Ein Tippen zum Start. Nuzzle merkt sich die Seite.', 'Die Zeit seit der letzten Mahlzeit', 'Jede Mahlzeit, jedes Fläschchen, jede Windel', 'Die ganze Woche auf einen Blick', 'Ein sanfter Plan fürs Alter', 'Alles in zwei Tipps eintragen'] },
  es: { locale: 'es-ES', captions: ['Un toque para empezar. Nuzzle recuerda el lado.', 'El tiempo desde la última toma', 'Cada toma, biberón y pañal', 'Toda la semana de un vistazo', 'Un plan tranquilo para su edad', 'Anota lo que sea en dos toques'] },
  it: { locale: 'it-IT', captions: ['Un tocco per iniziare. Nuzzle ricorda il lato.', 'Il tempo dall’ultima poppata', 'Ogni poppata, biberon e pannolino', 'Tutta la settimana a colpo d’occhio', 'Un programma sereno per la sua età', 'Annota tutto in due tocchi'] },
  pt: { locale: 'pt-BR', captions: ['Um toque para começar. O Nuzzle lembra o lado.', 'O tempo desde a última mamada', 'Cada mamada, mamadeira e fralda', 'A semana inteira de relance', 'Uma rotina tranquila para a idade', 'Registre tudo em dois toques'] },
  nl: { locale: 'nl-NL', captions: ['Eén tik om te beginnen. Nuzzle onthoudt de kant.', 'De tijd sinds de laatste voeding', 'Elke voeding, fles en luier', 'De hele week in één oogopslag', 'Een rustig schema voor de leeftijd', 'Alles noteren in twee tikken'] },
  ja: { locale: 'ja-JP', captions: ['タップひとつで開始。次の側を覚えます。', '前回の授乳からの時間がすぐわかる', '授乳、ミルク、おむつをまとめて記録', '1週間をひと目で', '月齢に合わせたおだやかなプラン', '何でも2タップで記録'] },
  ko: { locale: 'ko-KR', captions: ['탭 한 번으로 시작. 다음 쪽을 기억해요.', '지난 수유 후 시간을 한눈에', '수유, 젖병, 기저귀를 모두 기록', '한 주를 한눈에', '월령에 맞춘 편안한 계획', '무엇이든 두 번 탭으로 기록'] },
  zh: { locale: 'zh-CN', captions: ['轻点即开始，记住下一侧', '一眼看到距上次喂奶多久', '每次喂奶、奶瓶和尿布', '一周情况一目了然', '适合月龄的温和计划', '两下轻点，记录一切'] },
};

function sample(now, feeding) {
  const feeds = []; const entries = [];
  let t = now - 7 * 24 * H; let side = 'L'; let n = 0;
  const end = now - (feeding ? 2.6 : 1.7) * H;
  while (t < end) {
    n++;
    if (n % 7 === 0) feeds.push({ id: 'f' + n, status: 'saved', kind: 'bottle', segments: [], deletedAt: null, bottle: { at: t, amountMl: 90, milk: 'breast' }, updatedAt: t });
    else {
      const a = 8 + (n % 5) * 2, b = 6 + (n % 4) * 2, other = side === 'L' ? 'R' : 'L';
      feeds.push({ id: 'f' + n, status: 'saved', kind: 'breast', deletedAt: null, updatedAt: t,
        segments: [{ side, start: t, end: t + a * MIN }, { side: other, start: t + a * MIN + MIN, end: t + (a + b + 1) * MIN }] });
      side = other;
    }
    entries.push({ id: 'n' + n, type: 'entry', kind: 'nappy', babyId: 'b1', at: t + 25 * MIN, nappy: n % 3 === 0 ? 'both' : 'wet', deletedAt: null });
    if (n % 2 === 0) entries.push({ id: 's' + n, type: 'entry', kind: 'sleep', babyId: 'b1', at: t + 50 * MIN, end: t + 140 * MIN, deletedAt: null });
    t = Math.min(t + (2.5 + (n % 3) * 0.5) * H, end);
    if (t === end) break;
  }
  if (feeding) feeds.push({ id: 'live', status: 'running', kind: 'breast', deletedAt: null, updatedAt: now, segments: [{ side: 'R', start: now - 9 * MIN - 24000, end: null }] });
  entries.push({ id: 'g1', type: 'entry', kind: 'growth', babyId: 'b1', at: now - 2 * 24 * H, weightG: 4210, lengthMm: 545, deletedAt: null });
  const birthday = new Date(now - 33 * 24 * H); birthday.setHours(0, 0, 0, 0);
  const settings = {
    babies: [{ id: 'b1', name: 'Olive', birthday: birthday.getTime(), plan: { dayStartMin: 420, bedtimeMin: 1140, gapMin: 180, awakeMin: 60, referenceId: 'day-0-6w', on: true, updatedAt: 1 } }],
    activeBabyId: 'b1', onboarded: true, theme: 'night', reminderAsked: true, remindersOn: true, intervalMin: 180, units: 'ml',
    codeSaved: true, plus: { trialStartedAt: now },
  };
  return { settings, feeds, entries };
}

const page = (caption, img, font) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@800&display=swap" rel="stylesheet">
<style>
html,body{margin:0;width:440px;height:956px;overflow:hidden;background:#1A1221}
body{display:flex;flex-direction:column;align-items:center;background:radial-gradient(120% 70% at 50% 0%,#3A2347 0%,#1A1221 70%)}
h1{font-family:${font};font-weight:800;color:#F4E9EF;font-size:31px;line-height:1.18;text-align:center;margin:52px 30px 26px;height:74px;display:flex;align-items:center;justify-content:center;letter-spacing:-0.3px}
.phone{width:356px;height:774px;border-radius:52px;background:#000;padding:10px;box-shadow:0 30px 70px rgba(0,0,0,.55),0 0 0 2px #3a2c44}
.phone img{width:100%;height:100%;border-radius:43px;display:block;object-fit:cover;object-position:top}
</style></head><body><h1>${caption}</h1><div class="phone"><img src="${img}"></div></body></html>`;

(async () => {
  const only = process.argv.slice(2);
  const b = await chromium.launch();
  for (const [lang, { locale, captions }] of Object.entries(LANGS)) {
    if (only.length && !only.includes(lang)) continue;
    const dir = path.join(OUT, lang);
    fs.mkdirSync(dir, { recursive: true });
    const pg = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, locale });
    const raw = [];
    const shoot = async () => raw.push(`data:image/png;base64,${(await pg.screenshot()).toString('base64')}`);
    const seed = async (feeding) => {
      const now = Date.now();
      const { settings, feeds, entries } = sample(now, feeding);
      await pg.goto('http://localhost:8811/');
      await pg.evaluate(([s, f, e]) => {
        localStorage.clear();
        localStorage.setItem('nuzzle.settings', JSON.stringify(s));
        localStorage.setItem('nuzzle.feeds', JSON.stringify(f));
        localStorage.setItem('nuzzle.entries', JSON.stringify(e));
      }, [settings, feeds, entries]);
    };
    const go = async (p) => { await pg.goto('http://localhost:8811' + p); await pg.waitForTimeout(1800); };
    const tap = async (id) => { await pg.click(`[data-testid="${id}"]`); await pg.waitForTimeout(700); };

    await seed(true); await go('/'); await shoot();
    await seed(false); await go('/'); await shoot();
    await go('/history'); await shoot();
    await tap('choice-week'); await shoot();
    await go('/plan'); await shoot();
    await go('/'); await tap('log'); await shoot();
    await pg.close();

    const font = lang === 'ja' || lang === 'zh' || lang === 'ko' ? "'Hiragino Sans','PingFang SC','Apple SD Gothic Neo','WenQuanYi Zen Hei',sans-serif" : 'Nunito,ui-rounded,sans-serif';
    const card = await b.newPage({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
    for (let i = 0; i < raw.length; i++) {
      await card.setContent(page(captions[i], raw[i], font), { waitUntil: 'networkidle' });
      await card.screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, "0")}.jpg`), type: "jpeg", quality: 90 });
    }
    await card.close();
    console.log(lang, raw.length, 'screenshots');
  }
  await b.close();
})();
