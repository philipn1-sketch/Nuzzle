import { migrateSettings, unitsForRegion } from '../settings';
import { withNewerPlans } from '../sync';

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
    expect(s.babies[0].plan).toEqual({ ...plan, updatedAt: 1 });
    expect(s.plans).toBeUndefined();
  });
});

describe('plans on two phones', () => {
  const plan = (updatedAt: number) => ({ dayStartMin: 420, bedtimeMin: 1140, gapMin: 180, awakeMin: 60, updatedAt });
  it('keep the plan changed most recently, whichever phone it was on', () => {
    const remote = [{ id: 'b1', name: 'Daphne', birthday: 1, plan: plan(5) }];
    expect(withNewerPlans(remote, [{ id: 'b1', name: '', birthday: null, plan: plan(9) }])).toEqual({
      list: [{ id: 'b1', name: 'Daphne', birthday: 1, plan: plan(9) }], kept: true,
    });
    expect(withNewerPlans(remote, [{ id: 'b1', name: '', birthday: null, plan: plan(2) }]).kept).toBe(false);
  });
  it('keep plan reminders on the phone that chose them', () => {
    const s = migrateSettings({ babies: [{ id: 'b1', name: '', birthday: null, plan: { ...plan(1), reminders: true } }], activeBabyId: 'b1' });
    expect(s.planReminders).toEqual(['b1']);
  });
  it('send a moved plan up to the backup', () => {
    const s = migrateSettings({ babies: [{ id: 'b1', name: '', birthday: null }], activeBabyId: 'b1', babiesUpdatedAt: 5, plans: { b1: plan(1) } });
    expect(s.babiesUpdatedAt).toBeGreaterThan(5);
  });
});

describe('units from the region', () => {
  it('uses ounces in the US and millilitres elsewhere', () => {
    expect(unitsForRegion('en-US')).toBe('oz');
    expect(unitsForRegion('en-AU')).toBe('ml');
    expect(unitsForRegion('en')).toBe('ml');
  });
});
