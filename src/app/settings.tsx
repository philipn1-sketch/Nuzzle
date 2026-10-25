import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { Stepper } from '../components/Stepper';
import { SyncSection } from '../components/SyncSection';
import { Choice, PillButton, QuietButton, Screen, T, TopBar } from '../components/ui';
import { APP_NAME, REMINDER_MAX_MIN, REMINDER_MIN_MIN, REMINDER_STEP_MIN } from '../config';
import { feedsToCsv } from '../core/csv';
import { dayStartOf, savedFeeds } from '../core/feeds';
import { ageText, clockTime, span } from '../core/format';
import { babyName, feedsOf } from '../core/reminder';
import type { ClockReminder, ThemeChoice, Units } from '../core/types';
import { useApp } from '../state/AppState';
import { usePalette } from '../state/theme';
import { line, radius, space, TAP, type } from '../theme';

const wrapMin = (m: number) => ((m % 1440) + 1440) % 1440;

export default function SettingsScreen() {
  const { settings, updateSettings, permission, askReminders, allFeeds, allEntries, addBaby, updateBaby, removeBaby, sync } = useApp();
  const p = usePalette();
  const now = Date.now();

  const exportCsv = () => {
    const first = settings.babies[0];
    const nameOf = (f: { babyId?: string }) => babyName(settings.babies.find((b) => b.id === (f.babyId ?? first.id)));
    Share.share({ title: `${APP_NAME} feeds`, message: feedsToCsv(allFeeds, Date.now(), nameOf, allEntries, settings.units) }).catch(() => {});
  };

  const setClock = (i: number, c: ClockReminder | null) => {
    const list = settings.clockReminders.slice();
    if (c) list[i] = c;
    else list.splice(i, 1);
    updateSettings({ clockReminders: list, reminderAsked: true });
  };
  const addClock = () => {
    const prev = settings.clockReminders[settings.clockReminders.length - 1];
    const hour = prev ? (prev.hour + 3) % 24 : 21;
    updateSettings({ clockReminders: [...settings.clockReminders, { hour, minute: prev?.minute ?? 0 }], reminderAsked: true });
  };
  const moveClock = (c: ClockReminder, by: number): ClockReminder => {
    const t = (((c.hour * 60 + c.minute + by) % 1440) + 1440) % 1440;
    return { hour: Math.floor(t / 60), minute: t % 60 };
  };

  return (
    <Screen>
      <TopBar left={<PillButton label="Back" onPress={() => router.back()} testID="back" />} title="Settings" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {settings.babies.map((b, i) => {
          const many = settings.babies.length > 1;
          const canRemove = many && feedsOf(allFeeds, settings, b.id).length === 0;
          return (
            <Section key={b.id} label={many ? `Baby ${i + 1}` : 'Baby'}>
              <TextInput
                testID={i === 0 ? 'baby-name' : `baby-name-${i}`}
                value={b.name}
                onChangeText={(t) => updateBaby(b.id, { name: t.slice(0, 30) })}
                placeholder="Baby"
                placeholderTextColor={p.muted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                accessibilityLabel={many ? `Name of baby ${i + 1}` : "Baby's name"}
                style={[type.body, styles.input, { color: p.ink, backgroundColor: p.surface }]}
              />
              <T tone="muted" style={type.label}>Birthday{b.birthday !== null ? ` · ${ageText(b.birthday, now)}` : ''}</T>
              <Stepper
                label="Birthday"
                testID={i === 0 ? 'birthday' : `birthday-${i}`}
                display={b.birthday === null ? 'Not set' : new Date(b.birthday).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                onStep={(dir, fast) => {
                  const today = dayStartOf(now);
                  // the first tap sets today; after that it moves by a day, or a week while held
                  const next = b.birthday === null ? today : dayStartOf(b.birthday, -dir * (fast ? 7 : 1));
                  if (next <= today) updateBaby(b.id, { birthday: next });
                }}
              />
              {canRemove && <QuietButton label="Remove this baby" onPress={() => removeBaby(b.id)} style={styles.left} />}
            </Section>
          );
        })}
        <View style={[styles.section, { borderBottomColor: line(p) }]}>
          <QuietButton label="Add another baby ›" tone="ink" onPress={addBaby} style={styles.left} testID="add-baby" />
        </View>

        <Section label="Reminder">
          <T>Remind me after a feed starts</T>
          <Choice<'on' | 'off'>
            label="Reminder"
            value={settings.remindersOn ? 'on' : 'off'}
            onChange={(v) => updateSettings({ remindersOn: v === 'on', reminderAsked: true })}
            options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
          />
          {settings.remindersOn && (
            <View style={{ gap: space.s }}>
              <T tone="muted" style={type.label}>After</T>
              <Stepper
                label="Reminder time"
                testID="interval"
                display={span(settings.intervalMin * 60_000)}
                onStep={(dir) =>
                  updateSettings({
                    intervalMin: Math.max(REMINDER_MIN_MIN, Math.min(REMINDER_MAX_MIN, settings.intervalMin + dir * REMINDER_STEP_MIN)),
                  })
                }
              />
            </View>
          )}
          <T style={{ marginTop: space.s }}>Also remind me every day at</T>
          {settings.clockReminders.map((c, i) => (
            <View key={i} style={styles.clockRow}>
              <View style={{ flex: 1 }}>
                <Stepper
                  label={`Daily reminder ${i + 1}`}
                  testID={`clock-${i}`}
                  display={clockTime(c.hour, c.minute)}
                  onStep={(dir, fast) => setClock(i, moveClock(c, dir * (fast ? 60 : 15)))}
                />
              </View>
              <QuietButton label="Remove" onPress={() => setClock(i, null)} />
            </View>
          ))}
          {settings.clockReminders.length < 4 && (
            <QuietButton label="Add a time ›" tone="ink" onPress={addClock} style={styles.left} testID="add-clock" />
          )}
          <T style={{ marginTop: space.s }}>Quiet hours</T>
          <T tone="muted" style={type.label}>Reminders in these hours still arrive, but without a sound.</T>
          <Choice<'on' | 'off'>
            label="Quiet hours"
            value={settings.quiet.on ? 'on' : 'off'}
            onChange={(v) => updateSettings({ quiet: { ...settings.quiet, on: v === 'on' } })}
            options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
          />
          {settings.quiet.on && (
            <View style={{ gap: space.s }}>
              <T tone="muted" style={type.label}>From</T>
              <Stepper
                label="Quiet hours start"
                testID="quiet-from"
                display={clockTime(Math.floor(settings.quiet.fromMin / 60), settings.quiet.fromMin % 60)}
                onStep={(dir, fast) => updateSettings({ quiet: { ...settings.quiet, fromMin: wrapMin(settings.quiet.fromMin + dir * (fast ? 60 : 15)) } })}
              />
              <T tone="muted" style={type.label}>Until</T>
              <Stepper
                label="Quiet hours end"
                testID="quiet-to"
                display={clockTime(Math.floor(settings.quiet.toMin / 60), settings.quiet.toMin % 60)}
                onStep={(dir, fast) => updateSettings({ quiet: { ...settings.quiet, toMin: wrapMin(settings.quiet.toMin + dir * (fast ? 60 : 15)) } })}
              />
            </View>
          )}
          {(settings.remindersOn || settings.clockReminders.length > 0) && permission === 'denied' && (
            <View style={{ gap: space.xs }}>
              <T tone="muted" style={type.label}>Notifications are off for {APP_NAME} in your phone settings.</T>
              <QuietButton label="Open settings" tone="ink" onPress={() => Linking.openSettings()} style={styles.left} />
            </View>
          )}
          {(settings.remindersOn || settings.clockReminders.length > 0) && permission === 'undetermined' && (
            <QuietButton label="Allow notifications ›" tone="ink" onPress={askReminders} style={styles.left} testID="allow" />
          )}
        </Section>

        <Section label="Units">
          <Choice<Units>
            label="Units"
            value={settings.units}
            onChange={(v) => updateSettings({ units: v })}
            options={[{ value: 'ml', label: 'ml, kg, cm' }, { value: 'oz', label: 'oz, lb, in' }]}
          />
        </Section>

        <Section label="Theme">
          <Choice<ThemeChoice>
            label="Theme"
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[{ value: 'night', label: 'Night' }, { value: 'day', label: 'Day' }, { value: 'system', label: 'Phone' }]}
          />
          {settings.theme === 'system' && <T tone="muted" style={type.label}>Follows your phone: Night when it is in dark mode.</T>}
        </Section>

        <Section label="Backup and second phone">
          <SyncSection />
        </Section>

        <Section label="Your data">
          <T tone="muted" style={type.label}>
            {sync.code ? 'Your feeds are on this phone and in the backup. Nothing else is sent anywhere.' : 'Everything stays on this phone. Nothing is sent anywhere.'}
          </T>
          <QuietButton
            label={`Export ${savedFeeds(allFeeds).length} feeds as a spreadsheet ›`}
            tone="ink"
            onPress={exportCsv}
            style={styles.left}
            testID="export"
          />
        </Section>

        <T tone="muted" style={[type.small, { textAlign: 'center', marginTop: space.xl }]}>
          {APP_NAME} {Constants.expoConfig?.version ?? ''}
        </T>
      </ScrollView>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={[styles.section, { borderBottomColor: line(p) }]}>
      <T tone="muted" style={type.label} accessibilityRole="header">{label}</T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingBottom: space.xxl },
  section: { gap: space.m, paddingVertical: space.l, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  input: { minHeight: TAP, borderRadius: radius.row, paddingHorizontal: space.l },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
});
