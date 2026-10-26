import { hasPlus, plusStatus, trialDaysLeft } from '../plus';
import { migrateSettings } from '../settings';

const DAY = 86_400_000;

describe('Nuzzle Plus', () => {
  it('gives a new phone a free week from first launch', () => {
    const s = migrateSettings({});
    const start = s.plus!.trialStartedAt!;
    expect(hasPlus(s, start + 6 * DAY)).toBe(true);
    expect(trialDaysLeft(s, start + 6.5 * DAY)).toBe(1);
    expect(hasPlus(s, start + 7 * DAY)).toBe(false);
    expect(plusStatus(s, start + 8 * DAY)).toMatch(/free week has ended/);
  });
  it('keeps everything for families here before Plus', () => {
    const s = migrateSettings({ units: 'ml' });
    expect(s.plus).toEqual({ owned: 'gift' });
    expect(hasPlus(s, Date.now() + 400 * DAY)).toBe(true);
  });
  it('keeps a purchase after the free week', () => {
    const s = migrateSettings({ plus: { trialStartedAt: 1, owned: 'lifetime' } });
    expect(hasPlus(s, 1 + 30 * DAY)).toBe(true);
    expect(trialDaysLeft(s, 2)).toBe(0);
  });
});
