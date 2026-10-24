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

type FeedRow = { id: string; status: Feed['status']; segments: string; deleted_at: number | null };

export function loadFeeds(): Feed[] {
  // deleted feeds are kept a day so Undo works, then cleared out
  db.runSync('DELETE FROM feeds WHERE deleted_at IS NOT NULL AND deleted_at < ?', Date.now() - 86_400_000);
  return db
    .getAllSync<FeedRow>('SELECT id, status, segments, deleted_at FROM feeds')
    .map((r) => ({ id: r.id, status: r.status, segments: JSON.parse(r.segments), deletedAt: r.deleted_at }));
}

export function putFeed(f: Feed): void {
  db.runSync(
    'INSERT OR REPLACE INTO feeds (id, status, segments, deleted_at) VALUES (?, ?, ?, ?)',
    f.id, f.status, JSON.stringify(f.segments), f.deletedAt,
  );
}

export function removeFeed(id: string): void {
  db.runSync('DELETE FROM feeds WHERE id = ?', id);
}

export function loadSettings(): Partial<Settings> {
  const row = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'settings'");
  return row ? JSON.parse(row.value) : {};
}

export function putSettings(s: Settings): void {
  db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('settings', ?)", JSON.stringify(s));
}
