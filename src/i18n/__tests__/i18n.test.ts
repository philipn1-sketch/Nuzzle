import { currentLanguage, languageFor, setLanguageForTests, t, tn, type Dictionary } from '..';
import de from '../locales/de';
import es from '../locales/es';
import fr from '../locales/fr';
import italian from '../locales/it';
import ja from '../locales/ja';
import ko from '../locales/ko';
import nl from '../locales/nl';
import pt from '../locales/pt';
import zh from '../locales/zh';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { keys } = require('../../../scripts/i18n-keys') as { keys: () => string[] };

const ALL: Record<string, Dictionary> = { de, es, fr, it: italian, ja, ko, nl, pt, zh };
const used = keys();
const holes = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join();

describe.each(Object.entries(ALL))('%s', (_lang, dict) => {
  it('translates every text in the app', () => {
    expect(used.filter((k) => !(k in dict))).toEqual([]);
  });
  it('has nothing the app no longer uses', () => {
    expect(Object.keys(dict).filter((k) => !used.includes(k))).toEqual([]);
  });
  it('keeps every placeholder', () => {
    expect(Object.entries(dict).filter(([k, v]) => holes(k) !== holes(v)).map(([k]) => k)).toEqual([]);
  });
  it('uses no long dashes', () => {
    expect(Object.values(dict).filter((v) => /[–—]/.test(v))).toEqual([]);
  });
});

describe('looking up', () => {
  afterEach(() => setLanguageForTests('en'));

  it('picks the language from the phone', () => {
    expect(languageFor('fr-CA')).toBe('fr');
    expect(languageFor('pt-BR')).toBe('pt');
    expect(languageFor('zh-Hans-CN', 'Hans')).toBe('zh');
    expect(languageFor('zh-Hant-TW', 'Hant')).toBe('en');
    expect(languageFor('sv-SE')).toBe('en');
  });

  it('fills placeholders and falls back to English', () => {
    setLanguageForTests('fr');
    expect(currentLanguage()).toBe('fr');
    expect(t('Start on the {side}', { side: t('left') })).toBe('Commencer à gauche');
    expect(t('Not in any dictionary')).toBe('Not in any dictionary');
    expect(tn('{n} feed', '{n} feeds', 1)).toBe('1 tétée');
    expect(tn('{n} feed', '{n} feeds', 3)).toBe('3 tétées');
  });
});
