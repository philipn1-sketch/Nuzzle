import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CalendarSheet } from '../components/CalendarSheet';
import { Choice, PillButton, PrimaryButton, Screen, T, TopBar } from '../components/ui';
import { dayStartOf } from '../core/feeds';
import { span } from '../core/format';
import { planIsOn, referenceFor } from '../core/plan';
import { useApp } from '../state/AppState';
import { usePalette } from '../state/theme';
import { line, radius, space, TAP, type } from '../theme';

const TITLES = { 1: 'Who are we feeding?', 2: 'Remind you when the next feed is due?', 3: 'Use a daily plan?' } as const;
type Step = keyof typeof TITLES;

/**
 * Three first launch questions: the baby, reminders and a daily plan. Units come from the phone's
 * region and sharing lives in Settings. Every answer is saved as she goes, and Skip is always there.
 */
export default function Welcome() {
  const { settings, baby, updateSettings, updateBaby, askReminders, permission, plus } = useApp();
  const p = usePalette();
  const now = Date.now();
  const [step, setStep] = useState<Step>(1);
  const [calendar, setCalendar] = useState(false);
  const [plan, setPlan] = useState<'on' | 'off'>(planIsOn(baby.plan) ? 'on' : 'off');
  const day = referenceFor(baby.birthday, now);

  const finish = () => {
    updateSettings({ onboarded: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const next = async () => {
    if (step === 2 && settings.remindersOn && permission === 'undetermined') await askReminders();
    if (step < 3) {
      setStep((step + 1) as Step);
      return;
    }
    if (plan === 'on' || planIsOn(baby.plan)) {
      updateBaby(baby.id, {
        plan: { dayStartMin: 420, bedtimeMin: 1140, awakeMin: 60, ...baby.plan, gapMin: day.gapMin, referenceId: day.id, on: plan === 'on', updatedAt: Date.now() },
      });
    }
    finish();
  };
  const date = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Screen>
      <View>
        <TopBar
          left={step > 1 ? <PillButton label="Back" onPress={() => setStep((step - 1) as Step)} testID="welcome-back" /> : undefined}
          right={<PillButton label="Skip" onPress={finish} testID="welcome-skip" a11yLabel="Skip the questions" />}
        />
        <View style={styles.dots} pointerEvents="none" accessible accessibilityLabel={`Step ${step} of 3`}>
          {([1, 2, 3] as Step[]).map((n) => (
            <View key={n} style={[styles.dot, { width: n === step ? 24 : 8, backgroundColor: n <= step ? p.ink : line(p) }]} />
          ))}
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <T tone="muted" style={[type.label, { fontWeight: '700' }]}>Step {step} of 3</T>
          <T style={styles.title} accessibilityRole="header">{TITLES[step]}</T>

          {step === 1 && (
            <View style={{ gap: space.m }}>
              <TextInput
                testID="welcome-name"
                value={baby.name}
                onChangeText={(t) => updateBaby(baby.id, { name: t.slice(0, 30) })}
                placeholder="Baby's name"
                placeholderTextColor={p.muted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                accessibilityLabel="Baby's name"
                style={[type.title, styles.field, { color: p.ink, backgroundColor: p.surface }]}
              />
              <Pressable
                testID="welcome-birthday"
                accessibilityRole="button"
                accessibilityLabel={baby.birthday === null ? 'Birthday, not set' : `Birthday, ${date(baby.birthday)}`}
                accessibilityHint="Opens a calendar"
                onPress={() => setCalendar(true)}
                style={({ pressed }) => [styles.field, styles.row, { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 }]}
              >
                <T tone="muted">Birthday</T>
                <T style={{ fontWeight: '700' }}>{baby.birthday === null ? 'Pick ›' : `${date(baby.birthday)} ›`}</T>
              </Pressable>
              <CalendarSheet
                visible={calendar}
                title={`${baby.name.trim() || 'Baby'}'s birthday`}
                value={baby.birthday ?? dayStartOf(now)}
                max={dayStartOf(now)}
                onDone={(d) => {
                  updateBaby(baby.id, { birthday: dayStartOf(d) });
                  setCalendar(false);
                }}
                onCancel={() => setCalendar(false)}
              />
            </View>
          )}

          {step === 2 && (
            <View style={{ gap: space.m }}>
              <Choice<'on' | 'off'>
                label="Reminder"
                value={settings.remindersOn ? 'on' : 'off'}
                onChange={(v) => updateSettings({ remindersOn: v === 'on', reminderAsked: true })}
                options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
              />
              <T tone="muted" style={type.label}>
                We nudge you {span(settings.intervalMin * 60_000)} after a feed starts, or at the plan&apos;s times if you use one.
              </T>
            </View>
          )}

          {step === 3 && (
            <View style={{ gap: space.m }}>
              <Choice<'on' | 'off'>
                label="Daily plan"
                value={plan}
                onChange={setPlan}
                options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
              />
              <T tone="muted" style={type.label}>
                A gentle rhythm for her age. You can bend it any time.{plus ? '' : ' The daily plan is part of Nuzzle Plus.'}
              </T>
            </View>
          )}
        </ScrollView>
        <View style={styles.bottom}>
          <PrimaryButton label={step === 3 ? 'Start' : 'Next'} onPress={next} testID={step === 3 ? 'welcome-finish' : 'welcome-next'} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  body: { paddingHorizontal: space.side, paddingTop: space.xxl, paddingBottom: space.xl, gap: space.l + 4 },
  title: { fontFamily: type.title.fontFamily, fontSize: 34, fontWeight: '800', lineHeight: 39 },
  field: { minHeight: TAP + 4, borderRadius: radius.row, paddingHorizontal: space.side },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottom: { paddingHorizontal: space.side, paddingTop: space.s },
});
