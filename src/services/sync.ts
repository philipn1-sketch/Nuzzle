import type { Baby, Entry, Feed } from '../core/types';

/**
 * The online copy, through one database function (see supabase/migrations). The address and the
 * publishable key come from environment variables, set in .env. Without them sync stays off.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export const syncAvailable = URL !== '' && KEY !== '';

export interface SyncReply {
  seq: number;
  /** Feeds and entries travel together; entries carry type 'entry'. */
  feeds: (Feed | Entry)[];
  babies: Baby[] | null;
  babiesUpdated: number;
}

export async function syncWithServer(
  code: string,
  feeds: (Feed | Entry)[],
  babies: Baby[] | null,
  babiesUpdated: number,
  since: number,
): Promise<SyncReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/nuzzle_sync`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, feeds, babies, babies_updated: babiesUpdated, since }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`sync ${res.status}`);
    const r = (await res.json()) as SyncReply;
    return { seq: Number(r.seq) || 0, feeds: r.feeds ?? [], babies: r.babies ?? null, babiesUpdated: Number(r.babiesUpdated) || 0 };
  } finally {
    clearTimeout(timer);
  }
}

/** Deletes the family's online copy for good. Resolves true when there was one to delete. */
export async function deleteBackup(code: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/nuzzle_delete`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`delete ${res.status}`);
    return (await res.json()) === true;
  } finally {
    clearTimeout(timer);
  }
}
