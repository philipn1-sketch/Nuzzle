import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CalendarSheet } from '../components/CalendarSheet';
import { Stepper } from '../components/Stepper';
import { SyncSection } from '../components/SyncSection';
import { Choice, PillButton, PrimaryButton, QuietButton, Screen, SecondaryButton, T, TopBar } from '../components/ui';
import { APP_NAME, REMINDER_MAX_MIN, REMINDER_MIN_MIN, REMINDER_STEP_MIN } from '../config';
import { dayStartOf } from '../core/feeds';
import { ageText, span } from '../core/format';
import { bandFor, defaultPlan, REFERENCE_DAYS } from '../core/plan';
import type { Units } from '../core/types';
import { useApp } from '../state/AppState';
import { usePalette } from '../state/theme';
import { radius, space, TAP, type, wash } from '../theme';

type Step = 'hello' | 'baby' | 'units' | 'reminders' | 'sharing' | 'plan' | 'done';
const STEPS: Step[] = ['hello', 'baby', 'units', 'reminders', 'sharing', 'plan', 'done'];
type PlanPick = 'ref' | 'own' | 'none';

/**
 * The first launch questions: the baby, units, reminders, a second phone and a daily plan. Every
 * answer is saved as she goes and can be changed later in Settings, and any step can be skipped.
 */
export default function Welcome() {
  const { settings, baby, updateSettings, updateBaby, askReminders, permission } = useApp();
  const p = usePalette();
  const now = Date.now();
  const [step, setStep] = useState<Step>('hello');
  const [calendar, setCalendar] = useState(false);
  const saved = settings.plans?.[baby.id];
  const [pick, setPick] = useState<PlanPick>(saved ? (saved.referenceId ? 'ref' : 'own') : 'none');
  const [planReminders, setPlanReminders] = useState(saved?.reminders === true);
  const name = baby.name.trim() || 'your baby';
  const i = STEPS.indexOf(step);

  const finish = () => {
    updateSettings({ onboarded: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const next = async () => {
    if (step === 'reminders' && settings.remindersOn && permission === 'undetermined') await askReminders();
    if (step === 'plan') {
      const plans = { ...settings.plans };
      if (pick === 'none') {
        if (plans[baby.id]) plans[baby.id] = { ...plans[baby.id], on: false };
      } else {
        const base = { ...defaultPlan(bandFor(baby.birthday, now)), ...plans[baby.id] };
        const { referenceId: _r, ...own } = base;
        plans[baby.id] = pick === 'ref'
          ? { ...base, referenceId: REFERENCE_DAYS[0].id, on: true, reminders: planReminders }
          : { ...own, on: true, reminders: planReminders };
      }
      updateSettings({ plans });
    }
    setStep(STEPS[i + 1]);
  };

  return (
    <Screen>
      <TopBar
        left={i > 0 && step !== 'done' ? <PillButton label="Back" onPress={() => setStep(STEPS[i - 1])} testID="welcome-back" /> : undefined}
        right={step !== 'done' ? <PillButton label="Skip" onPress={finish} testID="welcome-skip" a11yLabel="Skip the questions" /> : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.dots} accessible accessibilityLabel={`Step ${i + 1} of ${STEPS.length}`}>
            {STEPS.map((s, k) => (
              <View key={s} style={[styles.dot, { backgroundColor: k <= i ? p.accent : wash(p.muted, '40') }]} />
            ))}
          </View>

          {step === 'hello' && (
            <View style={styles.block}>
              <T style={type.side} accessibilityRole="header">Welcome to {APP_NAME}</T>
              <T tone="muted" style={type.body}>
                A few quick questions to set things up: your baby, reminders, sharing with a second phone and a daily plan.
                Everything can be changed later in Settings.
              </T>
            </View>
          )}

          {step === 'baby' && (
            <View style={styles.block}>
              <T style={type.title} accessibilityRole="header">Your baby</T>
              <T tone="muted" style={type.label}>Name</T>
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
                style={[type.body, styles.input, { color: p.ink, backgroundColor: p.surface }]}
              />
              <T tone="muted" style={type.label}>Birthday{baby.birthday !== null ? ` · ${ageText(baby.birthday, now)}` : ''}</T>
              <SecondaryButton
                label={baby.birthday === null ? 'Pick the birthday' : new Date(baby.birthday).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                onPress={() => setCalendar(true)}
                testID="welcome-birthday"
              />
              <T tone="muted" style={type.label}>The birthday sets the age shown on Home and the examples in the daily plan.</T>
              <CalendarSheet
                visible={calendar}
                title={`${baby.name.trim() || 'Baby'}'s birthday`}
                value={baby.birthday ?? dayStartOf(now)}
                max={dayStartOf(now)}
                onDone={(day) => {
                  updateBaby(baby.id, { birthday: dayStartOf(day) });
                  setCalendar(false);
                }}
                onCancel={() => setCalendar(false)}
              />
            </View>
          )}

          {step === 'units' && (
            <View style={styles.block}>
              <T style={type.title} accessibilityRole="header">Bottles and pumping</T>
              <T tone="muted" style={type.body}>Show amounts in</T>
              <Choice<Units>
                label="Units"
                value={settings.units}
                onChange={(v) => updateSettings({ units: v })}
                options={[{ value: 'ml', label: 'ml and kg' }, { value: 'oz', label: 'oz and lb' }]}
              />
            </View>
          )}

          {step === 'reminders' && (
            <View style={styles.block}>
              <T style={type.title} accessibilityRole="header">Reminders</T>
              <T tone="muted" style={type.body}>A gentle reminder when the next feed is due, counted from when the last feed started.</T>
              <Choice<'on' | 'off'>
                label="Feed reminder"
                value={settings.remindersOn ? 'on' : 'off'}
                onChange={(v) => updateSettings({ remindersOn: v === 'on', reminderAsked: true })}
                options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
              />
              {settings.remindersOn && (
                <>
                  <T tone="muted" style={type.label}>Remind me after</T>
                  <Stepper
                    label="Reminder time"
                    testID="welcome-interval"
                    display={span(settings.intervalMin * 60_000)}
                    onStep={(dir) =>
                      updateSettings({
                        intervalMin: Math.max(REMINDER_MIN_MIN, Math.min(REMINDER_MAX_MIN, settings.intervalMin + dir * REMINDER_STEP_MIN)),
                      })
                    }
                  />
                  {permission === 'undetermined' && (
                    <T tone="muted" style={type.label}>Next, your iPhone asks if {APP_NAME} may send notifications.</T>
                  )}
                </>
              )}
            </View>
          )}

          {step === 'sharing' && (
            <View style={styles.block}>
              <T style={type.title} accessibilityRole="header">Share with a second phone</T>
              <T tone="muted" style={type.body}>
                Partner or grandparent helping out? Both phones can keep the same feeds. Start sharing here, or join with a code from the
                other phone. You can do this later in Settings.
              </T>
              <SyncSection />
            </View>
          )}

          {step === 'plan' && (
            <View style={styles.block}>
              <T style={type.title} accessibilityRole="header">A daily plan</T>
              <T tone="muted" style={type.body}>
                Follow a day laid out for {name}, or keep it free and just track. You can turn the plan on and off any time.
              </T>
              <PlanOption label="Follow the reference day" detail="Feeds at 6 to 7, 9, 12, 3, 6 and 9, with naps between. Made for 2 to 4 weeks." on={pick === 'ref'} onPress={() => setPick('ref')} testID="welcome-plan-ref" />
              <PlanOption label="Build my own" detail="Set the first feed, bedtime and the time between feeds. Starts from typical times for the age." on={pick === 'own'} onPress={() => setPick('own')} testID="welcome-plan-own" />
              <PlanOption label="No plan for now" detail="Just track feeds. Turn a plan on later from Settings." on={pick === 'none'} onPress={() => setPick('none')} testID="welcome-plan-none" />
              {pick !== 'none' && (
                <>
                  <T tone="muted" style={type.label}>Remind me at the plan&apos;s feed times</T>
                  <Choice<'on' | 'off'>
                    label="Remind me at the plan's feed times"
                    value={planReminders ? 'on' : 'off'}
                    onChange={(v) => setPlanReminders(v === 'on')}
                    options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
                  />
                </>
              )}
            </View>
          )}

          {step === 'done' && (
            <View style={styles.block}>
              <T style={type.side} accessibilityRole="header">All set</T>
              <T tone="muted" style={type.body}>
                Tap Left or Right when a feed starts. {pick !== 'none' ? 'The plan and its examples are in Settings, under Daily plan. ' : ''}
                Everything you chose can be changed in Settings.
              </T>
            </View>
          )}
        </ScrollView>
        <View style={styles.bottom}>
          {step === 'done' ? (
            <PrimaryButton label="Start" onPress={finish} testID="welcome-finish" />
          ) : (
            <PrimaryButton label={step === 'hello' ? 'Get started' : 'Next'} onPress={next} testID="welcome-next" />
          )}
          {step === 'hello' && <QuietButton label="Skip, I'll set up later" onPress={finish} testID="welcome-later" />}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function PlanOption({ label, detail, on, onPress, testID }: { label: string; detail: string; on: boolean; onPress: () => void; testID: string }) {
  const p = usePalette();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, { backgroundColor: p.surface, borderColor: on ? p.accent : 'transparent', opacity: pressed ? 0.8 : 1 }]}
    >
      <T style={type.body}>{label}</T>
      <T tone="muted" style={type.label}>{detail}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingBottom: space.xl, gap: space.l },
  block: { gap: space.m },
  dots: { flexDirection: 'row', gap: space.xs, justifyContent: 'center', paddingVertical: space.s },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: { minHeight: TAP, borderRadius: radius.row, paddingHorizontal: space.l },
  bottom: { paddingHorizontal: space.side, gap: space.xs, paddingBottom: space.s },
  option: { borderRadius: radius.row, borderWidth: 2, paddingHorizontal: space.l, paddingVertical: space.m, gap: space.xs },
});
