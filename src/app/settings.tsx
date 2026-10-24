import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, ScrollView, Share, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Stepper } from '../components/Stepper';
import { Choice, PillButton, QuietButton, Screen, T, TopBar } from '../components/ui';
import { APP_NAME, REMINDER_MAX_MIN, REMINDER_MIN_MIN, REMINDER_STEP_MIN } from '../config';
import { feedsToCsv } from '../core/csv';
import { savedFeeds } from '../core/feeds';
import { span } from '../core/format';
import type { ThemeName } from '../core/types';
import { useApp } from '../state/AppState';
import { usePalette } from '../state/theme';
import { line, radius, space, TAP, type } from '../theme';

export default function SettingsScreen() {
  const { settings, updateSettings, permission, askReminders, feeds } = useApp();
  const p = usePalette();

  const exportCsv = () => {
    Share.share({ title: `${APP_NAME} feeds`, message: feedsToCsv(feeds, Date.now()) }).catch(() => {});
  };

  return (
    <Screen>
      <TopBar left={<PillButton label="Back" onPress={() => router.back()} testID="back" />} title="Settings" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Section label="Baby's name">
          <TextInput
            testID="baby-name"
            value={settings.babyName}
            onChangeText={(t) => updateSettings({ babyName: t.slice(0, 30) })}
            placeholder="Baby"
            placeholderTextColor={p.muted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Baby's name"
            style={[type.body, styles.input, { color: p.ink, backgroundColor: p.surface }]}
          />
        </Section>

        <Section label="Reminder">
          <View style={styles.line}>
            <T style={{ flex: 1 }}>Remind me after a feed starts</T>
            <Switch
              testID="reminders-switch"
              value={settings.remindersOn}
              onValueChange={(v) => updateSettings({ remindersOn: v, reminderAsked: true })}
              trackColor={{ true: p.accent, false: line(p) }}
              thumbColor={p.ink}
              accessibilityLabel="Remind me after a feed starts"
            />
          </View>
          {settings.remindersOn && (
            <View style={{ gap: space.s }}>
              <T tone="muted" style={type.label}>Remind me this long after a feed starts</T>
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
          {settings.remindersOn && permission === 'denied' && (
            <View style={{ gap: space.xs }}>
              <T tone="muted" style={type.label}>Notifications are off for {APP_NAME} in your phone settings.</T>
              <QuietButton label="Open settings" tone="accent" onPress={() => Linking.openSettings()} style={styles.left} />
            </View>
          )}
          {settings.remindersOn && permission === 'undetermined' && (
            <QuietButton label="Allow notifications" tone="accent" onPress={askReminders} style={styles.left} testID="allow" />
          )}
        </Section>

        <Section label="Theme">
          <Choice<ThemeName>
            label="Theme"
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[{ value: 'night', label: 'Night' }, { value: 'day', label: 'Day' }]}
          />
        </Section>

        <Section label="Your data">
          <T tone="muted" style={type.label}>Everything stays on this phone. Nothing is sent anywhere.</T>
          <QuietButton
            label={`Export ${savedFeeds(feeds).length} feeds as a spreadsheet`}
            tone="accent"
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
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: TAP },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
});
