import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PlusCard } from '../components/PlusGate';
import { Card, Choice, PillButton, PrimaryButton, QuietButton, Screen, T, TopBar } from '../components/ui';
import { ageText, clockTime } from '../core/format';
import { FLEXIBILITY_TIPS, planIsOn, planSteps, referenceFor } from '../core/plan';
import { useApp, useNow } from '../state/AppState';
import { space, type } from '../theme';

const at = (m: number) => clockTime(Math.floor(m / 60), m % 60);

/**
 * A gentle day for her age, taken from her birthday. While it is on, the next feed and the reminder
 * follow its feed times. The examples are written from public guidance and are a starting point only.
 */
export default function Plan() {
  const { baby, updateBaby, plus } = useApp();
  const now = useNow(60_000);
  const [flexible, setFlexible] = useState(false);
  const day = referenceFor(baby.birthday, now);
  const on = planIsOn(baby.plan);
  const steps = planSteps({ ...(baby.plan ?? { dayStartMin: 420, bedtimeMin: 1140, gapMin: day.gapMin, awakeMin: 60 }), referenceId: day.id })
    .filter((s) => s.label !== 'Awake time');
  const forWhom = baby.birthday !== null ? `${ageText(baby.birthday, now)} old` : 'a newborn';

  const setOn = (v: boolean) =>
    updateBaby(baby.id, {
      plan: { dayStartMin: 420, bedtimeMin: 1140, awakeMin: 60, ...baby.plan, gapMin: day.gapMin, referenceId: day.id, on: v, updatedAt: Date.now() },
    });

  if (!plus) {
    return (
      <Screen>
        <TopBar left={<PillButton label="Back" onPress={() => router.back()} testID="back" />} title="Daily plan" />
        <View style={{ paddingHorizontal: space.side }}><PlusCard feature="plan" /></View>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar left={<PillButton label="Back" onPress={() => router.back()} testID="back" />} title="Daily plan" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={{ gap: space.m }}>
          <T tone="muted" style={type.label}>A gentle day for {forWhom}</T>
          <Choice<'on' | 'off'>
            label="Daily plan"
            value={on ? 'on' : 'off'}
            onChange={(v) => setOn(v === 'on')}
            options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
          />
          <T tone="muted" style={type.small}>
            {on ? 'Home and the reminder use these feed times.' : 'Home and the reminder count from when each feed starts.'}
          </T>
        </Card>
        <View style={{ gap: 6 }}>
          {steps.map((s, k) => (
            <View key={k} style={styles.step} testID={`plan-item-${k}`} accessible accessibilityLabel={`${at(s.at)}, ${s.label}`}>
              <T style={styles.time}>{at(s.at)}</T>
              <T tone="muted">{s.label}</T>
            </View>
          ))}
        </View>
        <QuietButton label={flexible ? 'How flexible is this? ⌄' : 'How flexible is this? ›'} tone="ink" onPress={() => setFlexible((f) => !f)} style={styles.left} testID="plan-flexible" />
        {flexible && (
          <View style={{ gap: space.s }}>
            <T tone="muted" style={type.label}>{day.intro}</T>
            <T tone="muted" style={type.label}>{day.night}</T>
            {FLEXIBILITY_TIPS.map((t) => (
              <T key={t} tone="muted" style={type.label}>{t}</T>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={styles.bottom}>
        <PrimaryButton label="Done" onPress={() => router.back()} testID="plan-done" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingTop: space.s, paddingBottom: space.xl, gap: space.l },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, paddingHorizontal: space.xs },
  time: { width: 82, fontWeight: '700', fontVariant: ['tabular-nums'] },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  bottom: { paddingHorizontal: space.side, paddingTop: space.s },
});
