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
