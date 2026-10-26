import { getLocales } from 'expo-localization';

import de from './locales/de';
import es from './locales/es';
import fr from './locales/fr';
import it from './locales/it';
import ja from './locales/ja';
import ko from './locales/ko';
import nl from './locales/nl';
import pt from './locales/pt';
import zh from './locales/zh';

/**
 * Nuzzle in the phone's own language. Text is written in English in the code and looked up by its
 * English wording, so anything not translated yet shows in English rather than as a key.
 */
export type Dictionary = Record<string, string>;

const DICTIONARIES: Record<string, Dictionary> = { de, es, fr, it, ja, ko, nl, pt, zh };
export const LANGUAGES = ['en', ...Object.keys(DICTIONARIES)];

/** "fr-CA" → "fr"; Simplified Chinese only (Traditional readers get English until it is translated). */
export function languageFor(tag: string, script?: string | null): string {
  const [lang, ...rest] = tag.toLowerCase().split(/[-_]/);
  if (lang === 'zh') {
    const traditional = script === 'Hant' || rest.some((p) => ['hant', 'tw', 'hk', 'mo'].includes(p));
    return traditional ? 'en' : 'zh';
  }
  return LANGUAGES.includes(lang) ? lang : 'en';
}

function phoneLanguage(): string {
  try {
    for (const l of getLocales()) {
      const lang = languageFor(l.languageTag, l.languageScriptCode);
      if (lang !== 'en' || l.languageCode === 'en') return lang;
    }
  } catch {
    // no native module (tests): English
  }
  return 'en';
}

let language = phoneLanguage();
let dict: Dictionary | null = DICTIONARIES[language] ?? null;

/** The language Nuzzle is showing, such as "fr". */
export const currentLanguage = (): string => language;

/** For tests: show Nuzzle in another language. */
export function setLanguageForTests(lang: string): void {
  language = lang;
  dict = DICTIONARIES[lang] ?? null;
}

const fill = (s: string, vars?: Record<string, string | number>) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;

/** Translate English text, filling {placeholders}: t('Next feed {time}', { time }). */
export function t(english: string, vars?: Record<string, string | number>): string {
  return fill(dict?.[english] ?? english, vars);
}

let rules: Intl.PluralRules | null = null;
let rulesFor = '';
function isOne(n: number): boolean {
  try {
    if (rulesFor !== language) {
      rules = new Intl.PluralRules(language);
      rulesFor = language;
    }
    return rules!.select(n) === 'one';
  } catch {
    return n === 1;
  }
}

/** Singular or plural by the language's own rule; {n} is filled in: tn('{n} feed', '{n} feeds', 3). */
export function tn(one: string, other: string, n: number, vars?: Record<string, string | number>): string {
  return t(isOne(n) ? one : other, { n, ...vars });
}

/** Marks English text kept as data, such as a plan's notes, so it is translated where it is shown with t(). */
export const tk = (english: string): string => english;
