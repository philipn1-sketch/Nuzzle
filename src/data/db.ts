import { openDatabaseSync } from 'expo-sqlite';

import type { Feed, Settings } from '../core/types';

/**
 * Everything lives in one SQLite file on the phone. Writes happen the moment something changes,
 * so a running feed is already on disk before the app can be closed.
 */
const db = openDatabaseSync('nuzzle.db');

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS feeds (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    segments TEXT NOT NULL,
    deleted_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
`);

// Bottles, notes and babies came later. Their fields live in one JSON column added to older files.
if (!db.getAllSync<{ name: string }>('PRAGMA table_info(feeds)').some((c) => c.name === 'extra')) {
  db.execSync('ALTER TABLE feeds ADD COLUMN extra TEXT');
}

type FeedRow = { id: string; status: Feed['status']; segments: string; deleted_at: number | null; extra: string | null };
type Extra = Pick<Feed, 'kind' | 'babyId' | 'note' | 'bottle' | 'updatedAt'>;

export function loadFeeds(): Feed[] {
  // deleted feeds are kept 30 days, so Undo works and the delete reaches a second phone, then cleared out
  db.runSync('DELETE FROM feeds WHERE deleted_at IS NOT NULL AND deleted_at < ?', Date.now() - 30 * 86_400_000);
  return db
    .getAllSync<FeedRow>('SELECT id, status, segments, deleted_at, extra FROM feeds')
    .map((r) => ({
      ...(r.extra ? (JSON.parse(r.extra) as Extra) : {}),
      id: r.id, status: r.status, segments: JSON.parse(r.segments), deletedAt: r.deleted_at,
    }));
}

export function putFeed(f: Feed): void {
  const { id, status, segments, deletedAt, ...extra } = f;
  db.runSync(
    'INSERT OR REPLACE INTO feeds (id, status, segments, deleted_at, extra) VALUES (?, ?, ?, ?, ?)',
    id, status, JSON.stringify(segments), deletedAt, JSON.stringify(extra),
  );
}

export function removeFeed(id: string): void {
  db.runSync('DELETE FROM feeds WHERE id = ?', id);
}

export function loadSettings(): Record<string, unknown> {
  const row = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'settings'");
  return row ? JSON.parse(row.value) : {};
}

export function putSettings(s: Settings): void {
  db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('settings', ?)", JSON.stringify(s));
}

/** Small values kept apart from settings, such as how far sync has got. */
export function getValue<T>(key: string): T | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export function setValue(key: string, value: unknown): void {
  if (value === null) db.runSync('DELETE FROM settings WHERE key = ?', key);
  else db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}
