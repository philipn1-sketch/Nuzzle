import { feedFromDraft } from '../feeds';
import { cleanCode, isCode, makeCode, mergeBabies, mergeFeeds, showCode, unsent } from '../sync';
import type { Feed } from '../types';

const T0 = new Date(2026, 9, 24, 3, 0).getTime();
const feed = (id: string, updatedAt: number, leftMin = 10): Feed => ({
  ...feedFromDraft({ start: T0, leftMin, rightMin: 0, endedOn: 'L' }, id),
  updatedAt,
});

describe('family code', () => {
  it('is twelve easy to read characters, shown in groups of four', () => {
    const code = makeCode(Uint8Array.from({ length: 12 }, (_, i) => i * 21));
    expect(isCode(code)).toBe(true);
    expect(code).not.toMatch(/[01OI]/);
    expect(showCode('K7QM2XPAC4HW')).toBe('K7QM 2XPA C4HW');
  });

  it('accepts what she types with spaces and small letters', () => {
    expect(cleanCode('k7qm 2xpa c4hw')).toBe('K7QM2XPAC4HW');
    expect(isCode(cleanCode('k7qm 2xpa'))).toBe(false);
  });
});

describe('merging the other phone', () => {
  it('takes new feeds and newer edits, and keeps edits made here later', () => {
    const local = [feed('a', 100), feed('b', 300)];
    const remote = [feed('a', 200, 12), feed('b', 250, 5), feed('c', 50)];
    expect(mergeFeeds(local, remote).map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('carries a delete across', () => {
    const local = [feed('a', 100)];
    const gone = { ...feed('a', 150), deletedAt: 150 };
    expect(mergeFeeds(local, [gone])[0].deletedAt).toBe(150);
  });

  it('sends only what changed since the last send', () => {
    expect(unsent([feed('a', 100), feed('b', 300)], 200).map((f) => f.id)).toEqual(['b']);
    const old = { ...feed('old', 0), updatedAt: undefined };
    expect(unsent([old, feed('b', 300)], 0).map((f) => f.id)).toEqual(['old', 'b']);
  });

  it('takes the babies list only when it is newer', () => {
    const b = [{ id: 'b1', name: 'Daph', birthday: null }];
    expect(mergeBabies(100, b, 200)).toEqual(b);
    expect(mergeBabies(300, b, 200)).toBeNull();
    expect(mergeBabies(0, [], 200)).toBeNull();
  });
});
