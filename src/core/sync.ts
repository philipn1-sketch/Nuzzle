import type { Baby } from './types';

/** Letters and digits that can't be misread for each other: no O and 0, no I and 1. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 12;

/** A new family code from random bytes, such as "K7QM2XPAC4HW". */
export function makeCode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** What she types or pastes, cleaned up: spaces gone, capitals. */
export const cleanCode = (typed: string): string => typed.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isCode = (c: string): boolean => c.length === CODE_LENGTH && [...c].every((ch) => ALPHABET.includes(ch));

/** Shown in groups of four so it is easy to read out: "K7QM 2XPA C4HW". */
export const showCode = (c: string): string => c.replace(/(.{4})(?=.)/g, '$1 ');

/**
 * Takes in feeds from the other phone. A feed is replaced only by a newer change of itself, so the
 * latest edit wins whichever phone made it. Returns just the feeds that changed here.
 */
export function mergeFeeds<T extends { id: string; updatedAt?: number }>(local: T[], remote: T[]): T[] {
  const mine = new Map(local.map((f) => [f.id, f]));
  const changed: T[] = [];
  for (const r of remote) {
    const l = mine.get(r.id);
    if (!l || (r.updatedAt ?? 0) > (l.updatedAt ?? 0)) changed.push(r);
  }
  return changed;
}

/** Feeds changed on this phone since the last successful send. The first send is everything, including feeds saved before sync existed. */
export const unsent = <T extends { updatedAt?: number }>(feeds: T[], sentAt: number): T[] =>
  sentAt <= 0 ? feeds : feeds.filter((f) => (f.updatedAt ?? 0) > sentAt);

/**
 * The babies from the other phone, keeping this phone's plan for a baby when it was changed more
 * recently, since the plan and the name can be edited on different phones. `kept` says a plan from
 * here survived, so the list should go back up.
 */
export function withNewerPlans(remote: Baby[], local: Baby[]): { list: Baby[]; kept: boolean } {
  let kept = false;
  const list = remote.map((r) => {
    const mine = local.find((b) => b.id === r.id)?.plan;
    if (mine && (mine.updatedAt ?? 0) > (r.plan?.updatedAt ?? 0)) {
      kept = true;
      return { ...r, plan: mine };
    }
    return r;
  });
  return { list, kept };
}

/** The babies list from the other phone, when it is newer. */
export function mergeBabies(localAt: number, remote: Baby[] | null, remoteAt: number): Baby[] | null {
  if (!remote || remote.length === 0 || remoteAt <= localAt) return null;
  return remote;
}
