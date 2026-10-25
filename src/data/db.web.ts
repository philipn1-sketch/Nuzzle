// Stand in for the web preview used to design and screenshot the screens. Phone builds use db.ts.
import type { Feed, Settings } from '../core/types';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {}
};

export const loadFeeds = (): Feed[] => read<Feed[]>('nuzzle.feeds', []);
export const putFeed = (f: Feed): void => write('nuzzle.feeds', [...loadFeeds().filter((x) => x.id !== f.id), f]);
export const removeFeed = (id: string): void => write('nuzzle.feeds', loadFeeds().filter((x) => x.id !== id));
export const loadSettings = (): Record<string, unknown> => read('nuzzle.settings', {});
export const putSettings = (s: Settings): void => write('nuzzle.settings', s);
