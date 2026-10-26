import { migrateSettings } from '../settings';

describe('the first launch questions', () => {
  it('show on a fresh install', () => {
    expect(migrateSettings({}).onboarded).toBe(false);
  });
  it('are skipped for anyone already using the app', () => {
    expect(migrateSettings({ units: 'oz' }).onboarded).toBe(true);
  });
  it('keep a saved answer', () => {
    expect(migrateSettings({ units: 'ml', onboarded: false }).onboarded).toBe(false);
  });
});

describe('plans saved before they moved onto the babies', () => {
  it('move onto the baby they belong to', () => {
    const plan = { dayStartMin: 420, bedtimeMin: 1140, gapMin: 180, awakeMin: 60 };
    const s = migrateSettings({ babies: [{ id: 'b1', name: 'Daphne', birthday: null }], activeBabyId: 'b1', plans: { b1: plan } });
    expect(s.babies[0].plan).toEqual(plan);
    expect(s.plans).toBeUndefined();
  });
});
