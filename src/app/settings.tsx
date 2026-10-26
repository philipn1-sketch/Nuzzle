import Constants from 'expo-constants';
import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CalendarSheet } from '../components/CalendarSheet';
import { Stepper } from '../components/Stepper';
import { Card, Choice, PillButton, QuietButton, Screen, T, TopBar } from '../components/ui';
import { APP_NAME, REMINDER_MAX_MIN, REMINDER_MIN_MIN, REMINDER_STEP_MIN } from '../config';
import { dayStartOf } from '../core/feeds';
import { span, spanWords } from '../core/format';
import { planIsOn } from '../core/plan';
import { trialDaysLeft } from '../core/plus';
import type { ThemeChoice } from '../core/types';
import { hasData, useApp } from '../state/AppState';
import { usePalette } from '../state/theme';
import { space, TAP, type } from '../theme';
import { t, tn } from '../i18n';

export default function SettingsScreen() {
  const { settings, baby, updateSettings, permission, askReminders, allFeeds, allEntries, addBaby, updateBaby, removeBaby, sync, plus } = useApp();
  const p = usePalette();
  const now = Date.now();
  const [calendarFor, setCalendarFor] = useState<string | null>(null);
  const planOn = plus && planIsOn(baby.plan);
  const remindNote = !settings.remindersOn
    ? t('No reminders.')
    : planOn
      ? t('Uses the daily plan times while the plan is on.')
      : cap(t('{time} after a feed starts.', { time: spanWords(settings.intervalMin * 60_000) }));
  const date = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Screen>
      <TopBar left={<PillButton label={t('Back')} onPress={() => router.back()} testID="back" />} title={t('Settings')} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {settings.babies.map((b, i) => {
          const many = settings.babies.length > 1;
          const canRemove = many && !hasData(allFeeds, allEntries, settings, b.id);
          return (
            <Card key={b.id} style={{ gap: space.s }}>
              <View style={styles.pair}>
                <T tone="muted">{t('Name')}</T>
                <TextInput
                  testID={i === 0 ? 'baby-name' : `baby-name-${i}`}
                  value={b.name}
                  onChangeText={(t) => updateBaby(b.id, { name: t.slice(0, 30) })}
                  placeholder={t('Baby')}
                  placeholderTextColor={p.muted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  accessibilityLabel={many ? t('Name of baby {n}', { n: i + 1 }) : t("Baby's name")}
                  style={[type.body, styles.name, { color: p.ink }]}
                />
              </View>
              <Pressable
                testID={i === 0 ? 'birthday' : `birthday-${i}`}
                accessibilityRole="button"
                accessibilityLabel={b.birthday === null ? t('Birthday, not set') : t('Birthday, {date}', { date: date(b.birthday) })}
                accessibilityHint={t('Opens a calendar')}
                onPress={() => setCalendarFor(b.id)}
                style={styles.pair}
              >
                <T tone="muted">{t('Birthday')}</T>
                <T style={styles.value}>{b.birthday === null ? t('Set ›') : `${date(b.birthday)} ›`}</T>
              </Pressable>
              <CalendarSheet
                visible={calendarFor === b.id}
                title={t("{name}'s birthday", { name: b.name.trim() || t('Baby') })}
                value={b.birthday ?? dayStartOf(now)}
                max={dayStartOf(now)}
                onDone={(day) => {
                  updateBaby(b.id, { birthday: dayStartOf(day) });
                  setCalendarFor(null);
                }}
                onCancel={() => setCalendarFor(null)}
              />
              {canRemove && <QuietButton label={t('Remove this baby')} onPress={() => removeBaby(b.id)} style={styles.left} />}
            </Card>
          );
        })}

        <Card style={{ gap: space.m }}>
          <T tone="muted" style={type.label}>{t('Remind me when the next feed is due')}</T>
          <Choice<'on' | 'off'>
            label={t('Reminder')}
            value={settings.remindersOn ? 'on' : 'off'}
            onChange={(v) => {
              updateSettings({ remindersOn: v === 'on', reminderAsked: true });
              if (v === 'on' && permission === 'undetermined') askReminders();
            }}
            options={[{ value: 'on', label: t('On') }, { value: 'off', label: t('Off') }]}
          />
          <T tone="muted" style={type.small} testID="remind-note">{remindNote}</T>
          {settings.remindersOn && !planOn && (
            <Stepper
              label={t('Time between feeds')}
              testID="interval"
              display={span(settings.intervalMin * 60_000)}
              onStep={(dir) =>
                updateSettings({
                  intervalMin: Math.max(REMINDER_MIN_MIN, Math.min(REMINDER_MAX_MIN, settings.intervalMin + dir * REMINDER_STEP_MIN)),
                })
              }
            />
          )}
          {settings.remindersOn && permission === 'denied' && (
            <View style={{ gap: space.xs }}>
              <T tone="muted" style={type.label}>{t('Notifications are off for {app} in your phone settings.', { app: APP_NAME })}</T>
              <QuietButton label={t('Open settings')} tone="ink" onPress={() => Linking.openSettings()} style={styles.left} />
            </View>
          )}
        </Card>

        <Card style={{ gap: space.m }}>
          <T tone="muted" style={type.label}>{t('Look')}</T>
          <Choice<ThemeChoice>
            label={t('Theme')}
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[{ value: 'night', label: t('Night') }, { value: 'day', label: t('Day') }, { value: 'system', label: t('Auto') }]}
          />
        </Card>

        <Card style={{ gap: space.xs }}>
          <LinkRow
            label={t('Units')}
            value={settings.units === 'oz' ? 'oz, lb, in' : 'ml, kg, cm'}
            testID="units"
            onPress={() => updateSettings({ units: settings.units === 'oz' ? 'ml' : 'oz' })}
          />
          <LinkRow label={t('Backup and sharing')} value={sync.code ? t('On') : t('Off')} testID="open-sharing" onPress={() => router.push('/sharing')} />
          <LinkRow label={t('Daily plan')} value={planOn ? t('On') : t('Off')} testID="open-plan" onPress={() => router.push('/plan')} />
          <LinkRow
            label={t('Nuzzle Plus')}
            value={settings.plus?.owned ? t('On') : plus ? tn('{n} day free', '{n} days free', trialDaysLeft(settings, now)) : t('Off')}
            testID="open-plus"
            onPress={() => router.push('/plus')}
          />
          <LinkRow label={t('Another baby')} value={t('Add')} testID="add-baby" onPress={plus ? addBaby : () => router.push('/plus?feature=babies')} />
        </Card>

        <T tone="muted" style={[type.small, { textAlign: 'center', marginTop: space.l }]}>
          {APP_NAME} {Constants.expoConfig?.version ?? ''}
        </T>
      </ScrollView>
    </Screen>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A row that opens or changes one thing: the name on the left, its value and a chevron on the right. */
function LinkRow({ label, value, onPress, testID }: { label: string; value: string; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      style={({ pressed }) => [styles.pair, styles.link, { opacity: pressed ? 0.7 : 1 }]}
    >
      <T tone="muted">{label}</T>
      <T style={styles.value}>{value} ›</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingTop: space.s, paddingBottom: space.xxl, gap: space.l },
  pair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m, minHeight: 44 },
  link: { minHeight: TAP - 8 },
  name: { flex: 1, textAlign: 'right', fontWeight: '700', minHeight: 44 },
  value: { fontWeight: '700' },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
});
