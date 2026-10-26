import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Stepper } from '../components/Stepper';
import { Card, Choice, PillButton, QuietButton, Screen, SecondaryButton, SnackbarSlot, T, TopBar } from '../components/ui';
import { ageText, clockTime, span } from '../core/format';
import {
  AGE_BANDS, bandFor, buildPlan, defaultPlan, nextItem, nextReference, FLEXIBILITY_TIPS, REFERENCE_DAYS, referenceFeedTimes, referenceFor, type PlanSettings,
} from '../core/plan';
import { babyName } from '../core/reminder';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { line, radius, space, type, wash } from '../theme';

const wrap = (m: number) => ((m % 1440) + 1440) % 1440;
const at = (m: number) => clockTime(Math.floor(m / 60), m % 60);

/**
 * Example rhythms for her baby's age, and a day plan she can shape from them. The examples come from
 * common published guides and are a starting point only.
 */
export default function Plan() {
  const { baby, settings, updateSettings, updateBaby, permission, askNotifications } = useApp();
  const now = useNow(60_000);
  const p = usePalette();
  const name = babyName(baby);
  const ownBand = bandFor(baby.birthday, now);
  const [bandIndex, setBandIndex] = useState(AGE_BANDS.indexOf(ownBand));
  const band = AGE_BANDS[bandIndex];
  const saved = baby.plan;
  const plan: PlanSettings = saved ?? defaultPlan(ownBand);
  // a plan made just by looking at the examples stays off until she turns it on
  const setPlan = (patch: Partial<PlanSettings & { on: boolean }>) =>
    updateBaby(baby.id, { plan: { on: saved?.on ?? false, ...saved, ...plan, ...patch, updatedAt: Date.now() } });
  const items = buildPlan(plan);
  const d = new Date(now);
  const next = nextItem(items, d.getHours() * 60 + d.getMinutes());
  const ref = plan.referenceId ? REFERENCE_DAYS.find((r) => r.id === plan.referenceId) ?? null : null;
  const gapMin = ref ? ref.gapMin : plan.gapMin;
  const usingGap = settings.intervalMin === gapMin;
  const nowMin = d.getHours() * 60 + d.getMinutes();
  const nextRef = ref ? nextReference(ref.items, nowMin) : null;
  const feedTimes = ref ? referenceFeedTimes(ref) : [];
  const on = saved ? saved.on !== false : false;
  const planReminders = settings.planReminders?.includes(baby.id) === true;
  const forAge = referenceFor(baby.birthday, now);
  const refIndex = ref ? REFERENCE_DAYS.indexOf(ref) : -1;
  const ageWord = (r: { label: string }) => r.label.replace('Reference day, ', '');

  const rows: [string, string][] = [
    ['Feeds', band.feedsPerDay],
    ['Between feeds', band.gap],
    ['Awake between sleeps', band.awake],
    ['Naps', band.naps],
    ['Sleep', band.sleep],
  ];

  return (
    <Screen>
      <TopBar left={<PillButton label="Back" onPress={() => router.back()} testID="back" />} title="Daily plan" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={{ gap: space.m }}>
          <T style={type.body} accessibilityRole="header">Follow a daily plan</T>
          <T tone="muted" style={type.label}>When it is on, Home shows what is next in the plan. Turn it off any time; the plan stays saved.</T>
          <Choice<'on' | 'off'>
            label="Follow a daily plan"
            value={on ? 'on' : 'off'}
            onChange={(v) => setPlan({ on: v === 'on' })}
            options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
          />
          {on && (
            <>
              <T tone="muted" style={type.label} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                Remind me at the plan&apos;s feed times
              </T>
              <Choice<'on' | 'off'>
                label="Remind me at the plan's feed times"
                value={planReminders ? 'on' : 'off'}
                onChange={(v) => {
                  const others = (settings.planReminders ?? []).filter((id) => id !== baby.id);
                  updateSettings({ planReminders: v === 'on' ? [...others, baby.id] : others });
                  if (v === 'on' && permission === 'undetermined') askNotifications();
                }}
                options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
              />
            </>
          )}
        </Card>

        <Card style={{ gap: space.m }}>
          <T tone="muted" style={type.label}>
            {baby.birthday !== null ? `${name}, ${ageText(baby.birthday, now).toLowerCase()}. ` : ''}Typical for this age
          </T>
          <Stepper
            label="Age"
            testID="plan-age"
            display={band.label}
            onStep={(dir) => setBandIndex((i) => Math.max(0, Math.min(AGE_BANDS.length - 1, i + dir)))}
          />
          {rows.map(([k, v]) => (
            <View key={k} style={[styles.fact, { borderBottomColor: line(p) }]}>
              <T tone="muted" style={[type.label, { width: 120 }]}>{k}</T>
              <T style={[type.body, { flex: 1 }]}>{v}</T>
            </View>
          ))}
          <T tone="muted" style={type.label}>{band.note}</T>
        </Card>

        <T tone="muted" style={type.label}>
          These are examples from common baby care guides, not advice for {name}. Every baby is different, and feeding when {name} shows hunger comes first. Your midwife, child health nurse or GP can help with what suits {name}.
        </T>

        <Choice<'own' | 'ref'>
          label="Plan"
          value={ref ? 'ref' : 'own'}
          onChange={(v) => setPlan({ referenceId: v === 'ref' ? forAge.id : undefined })}
          options={[{ value: 'own', label: 'Build my own' }, { value: 'ref', label: 'Reference day' }]}
        />

        {ref ? (
          <>
            <Row label="Reference day for">
              <Stepper
                label="Reference day for age"
                testID="ref-age"
                display={ageWord(ref)}
                onStep={(dir) => {
                  const nextRef = REFERENCE_DAYS[refIndex + dir];
                  if (nextRef) setPlan({ referenceId: nextRef.id });
                }}
              />
            </Row>
            {ref !== forAge && baby.birthday !== null && (
              <QuietButton
                label={`${name} is ${ageText(baby.birthday, now)} now. Switch to the ${ageWord(forAge)} day ›`}
                tone="ink"
                style={styles.left}
                onPress={() => setPlan({ referenceId: forAge.id })}
                testID="ref-switch"
              />
            )}
            <T tone="muted" style={type.label}>{ref.intro}</T>
            <View style={{ gap: space.s }}>
              {ref.items.map((i, k) => {
                const isNext = nextRef === i;
                // a feed window runs from one time to the other; a nap starts at either time
                const time = i.until ? `${at(i.at)} ${i.kind === 'nap' ? 'or' : 'to'} ${at(i.until)}` : at(i.at);
                return (
                  <View
                    key={k}
                    testID={`ref-item-${k}`}
                    accessible
                    accessibilityLabel={`${time}, ${i.note}${isNext ? ', next' : ''}`}
                    style={[
                      styles.refItem,
                      { backgroundColor: i.kind === 'feed' ? p.surface : wash(p.muted, '1F') },
                      isNext && { borderWidth: 2, borderColor: p.accent },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
                      <T style={[type.body, { flex: 1, fontVariant: ['tabular-nums'] }]}>{time}</T>
                      {isNext && <T tone="accent" style={type.small}>Next</T>}
                    </View>
                    <T tone={i.kind === 'feed' ? 'ink' : 'muted'} style={type.label}>{i.note}</T>
                  </View>
                );
              })}
            </View>
            <T tone="muted" style={type.label}>{ref.night}</T>
            <T style={type.title} accessibilityRole="header">Bending the day</T>
            <View style={{ gap: space.s }}>
              {FLEXIBILITY_TIPS.map((t) => (
                <T key={t} tone="muted" style={type.label}>{t}</T>
              ))}
            </View>
          </>
        ) : (
          <>
        <T style={type.title} accessibilityRole="header">Shape your day</T>
        <Row label="Day starts">
          <Stepper label="Day starts" testID="plan-start" display={at(plan.dayStartMin)} onStep={(dir) => setPlan({ dayStartMin: wrap(plan.dayStartMin + dir * 15) })} />
        </Row>
        <Row label="Bedtime">
          <Stepper label="Bedtime" testID="plan-bed" display={at(plan.bedtimeMin)} onStep={(dir) => setPlan({ bedtimeMin: wrap(plan.bedtimeMin + dir * 15) })} />
        </Row>
        <Row label="Feed every">
          <Stepper label="Time between feeds" testID="plan-gap" display={span(plan.gapMin * 60_000)}
            onStep={(dir) => setPlan({ gapMin: Math.max(60, Math.min(360, plan.gapMin + dir * 15)) })} />
        </Row>
        <Row label="Awake before a nap">
          <Stepper label="Awake time before a nap" testID="plan-awake" display={span(plan.awakeMin * 60_000)}
            onStep={(dir) => setPlan({ awakeMin: Math.max(30, Math.min(300, plan.awakeMin + dir * 15)) })} />
        </Row>
        <QuietButton
          label={`Start from the ${band.label.toLowerCase()} examples ›`}
          tone="ink"
          style={styles.left}
          onPress={() => setPlan({ gapMin: band.gapMin, awakeMin: band.awakeMin })}
          testID="plan-reset"
        />

        <T style={type.title} accessibilityRole="header">Your day</T>
        <View style={{ gap: space.s }}>
          {items.map((i, k) => {
            const isNext = next === i;
            const what = i.kind === 'feed' ? 'Feed' : i.kind === 'nap' ? `Nap until ${at(i.untilMin ?? i.at)}` : 'Bedtime';
            return (
              <View
                key={k}
                testID={`plan-item-${k}`}
                accessible
                accessibilityLabel={`${at(i.at)}, ${what}${isNext ? ', next' : ''}`}
                style={[
                  styles.item,
                  { backgroundColor: i.kind === 'feed' ? p.surface : wash(p.muted, '1F') },
                  isNext && { borderWidth: 2, borderColor: p.accent },
                ]}
              >
                <T style={[type.body, styles.time]}>{at(i.at)}</T>
                <T style={[type.body, { flex: 1 }]} tone={i.kind === 'feed' ? 'ink' : 'muted'}>{what}</T>
                {isNext && <T tone="accent" style={type.small}>Next</T>}
              </View>
            );
          })}
          <T tone="muted" style={type.label}>Night feeds happen as {name} needs them, so the plan stops at bedtime.</T>
        </View>
          </>
        )}

        {!usingGap && (
          <SecondaryButton
            strong
            label={`Use ${span(gapMin * 60_000)} for the countdown and reminder`}
            onPress={() => updateSettings({ intervalMin: gapMin })}
            testID="plan-use-gap"
          />
        )}
        {usingGap && (
          <T tone="muted" style={type.label}>The countdown and reminder use this {span(gapMin * 60_000)} gap.</T>
        )}
      </ScrollView>
      <View style={styles.bottom}>
        <SnackbarSlot />
      </View>
    </Screen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={[styles.row, { borderBottomColor: line(p) }]}>
      <T tone="muted" style={type.label}>{label}</T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingBottom: space.xxl, gap: space.l },
  fact: { flexDirection: 'row', gap: space.m, paddingVertical: space.s, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  row: { gap: space.s, paddingVertical: space.s, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 52, paddingHorizontal: space.l, borderRadius: radius.row },
  time: { width: 96, fontVariant: ['tabular-nums'] },
  refItem: { gap: 2, paddingHorizontal: space.l, paddingVertical: space.m, borderRadius: radius.row },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  bottom: { paddingHorizontal: space.side },
});
