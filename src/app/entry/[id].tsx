import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Stepper } from '../../components/Stepper';
import { Choice, PillButton, PrimaryButton, QuietButton, Screen, T, TopBar } from '../../components/ui';
import { ENTRY_KINDS, lengthText, liveEntries, nappyWord, sleepMs, weightText, withNote } from '../../core/entries';
import { amount, dayLabel, fromOz, span, timeOf, toOz } from '../../core/format';
import type { Entry, EntryKind, Nappy } from '../../core/types';
import { useApp } from '../../state/AppState';
import { usePalette } from '../../state/theme';
import { line, radius, space, TAP, type } from '../../theme';

const MIN = 60_000;
const TITLES: Record<EntryKind, [string, string]> = {
  nappy: ['Nappy', 'Edit nappy'],
  pump: ['Pumping', 'Edit pumping'],
  growth: ['Weight', 'Edit weight'],
  sleep: ['Sleep', 'Edit sleep'],
};
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Add or edit a nappy, pumping, a weight and length, or a sleep. */
export default function EntryEditor() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const { allEntries, entries, saveEntry, removeEntry, logNappy, settings } = useApp();
  const p = usePalette();
  const units = settings.units;
  const existing = id && id !== 'new' ? allEntries.find((e) => e.id === id && e.deletedAt === null) : undefined;
  const k: EntryKind = existing?.kind ?? (ENTRY_KINDS.includes(kind as EntryKind) ? (kind as EntryKind) : 'nappy');

  const [draft, setDraft] = useState<Entry>(() => {
    if (existing) return { ...existing };
    const now = Math.floor(Date.now() / MIN) * MIN;
    const base: Entry = { id: newId(), type: 'entry', kind: k, at: now, deletedAt: null };
    if (k === 'pump') return { ...base, leftMl: 0, rightMl: 0, minutes: 15 };
    if (k === 'sleep') return { ...base, at: now - 60 * MIN, end: now };
    if (k === 'growth') {
      const last = liveEntries(entries).filter((e) => e.kind === 'growth').sort((a, b) => b.at - a.at)[0];
      return { ...base, weightG: last?.weightG ?? 3500, lengthMm: last?.lengthMm ?? 0 };
    }
    return { ...base, nappy: 'wet' };
  });
  const [problem, setProblem] = useState<string | null>(null);
  const set = (patch: Partial<Entry>) => {
    setProblem(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const now = Date.now();
  const day0 = new Date(new Date(draft.at).setHours(0, 0, 0, 0)).getTime();
  const running = k === 'sleep' && (draft.end ?? null) === null;
  const durationMin = Math.round(sleepMs(draft, now) / MIN);

  const save = () => {
    const result = saveEntry(withNote(draft, draft.note));
    if (!result) return router.back();
    if (result === 'future') setProblem('That is later than now.');
    else if (result === 'order') setProblem('She woke before she fell asleep. Check the times.');
    else setProblem(k === 'pump' ? 'Add how much on at least one side.' : 'Add a weight or a length.');
  };

  const moveDay = (dir: 1 | -1) => {
    const d = new Date(draft.at);
    d.setDate(d.getDate() + dir);
    const shift = d.getTime() - draft.at;
    if (d.getTime() <= now + MIN) set({ at: d.getTime(), ...(draft.end ? { end: draft.end + shift } : {}) });
  };
  const moveTime = (dir: 1 | -1, fast: boolean) => {
    const shift = dir * (fast ? 5 : 1) * MIN;
    set({ at: draft.at + shift, ...(draft.end ? { end: draft.end + shift } : {}) });
  };
  const ml = (n: number) => Math.max(0, Math.min(500, n));
  const stepMl = (v: number, dir: 1 | -1, fast: boolean) =>
    ml(units === 'oz' ? fromOz(toOz(v) + dir * (fast ? 1 : 0.5)) : Math.round(v / 10) * 10 + dir * (fast ? 30 : 10));

  // a new nappy is one tap: pick the kind and it is saved at the time shown
  const quickNappy = !existing && k === 'nappy';

  return (
    <Screen>
      <TopBar left={<PillButton label="Cancel" onPress={() => router.back()} testID="cancel" />} title={TITLES[k][existing ? 1 : 0]} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Row label="Day">
            <Stepper label="Day" testID="day" display={dayLabel(day0, now)} onStep={moveDay} />
          </Row>
          <Row label={k === 'sleep' ? 'Fell asleep at' : 'At'}>
            <Stepper label="Time" testID="time" display={timeOf(draft.at)} onStep={moveTime} />
          </Row>

          {quickNappy && (
            <View style={{ gap: space.m, paddingTop: space.l }}>
              {(['wet', 'dirty', 'both'] as Nappy[]).map((n) => (
                <Pressable
                  key={n}
                  testID={`nappy-${n}`}
                  accessibilityRole="button"
                  accessibilityHint={`Saves a ${nappyWord(n).toLowerCase()} nappy at ${timeOf(draft.at)}`}
                  onPress={() => {
                    logNappy(n, draft.at);
                    router.back();
                  }}
                  style={({ pressed }) => [styles.big, { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 }]}
                >
                  <T style={type.title}>{nappyWord(n)}</T>
                </Pressable>
              ))}
            </View>
          )}

          {!quickNappy && k === 'nappy' && (
            <Row label="Nappy">
              <Choice<Nappy>
                label="Nappy"
                value={draft.nappy ?? 'wet'}
                onChange={(v) => set({ nappy: v })}
                options={[{ value: 'wet', label: 'Wet' }, { value: 'dirty', label: 'Dirty' }, { value: 'both', label: 'Both' }]}
              />
            </Row>
          )}

          {k === 'pump' && (
            <>
              <Row label="Left">
                <Stepper label="Left amount" testID="pump-left" display={amount(draft.leftMl ?? 0, units)} onStep={(d, f) => set({ leftMl: stepMl(draft.leftMl ?? 0, d, f) })} />
              </Row>
              <Row label="Right">
                <Stepper label="Right amount" testID="pump-right" display={amount(draft.rightMl ?? 0, units)} onStep={(d, f) => set({ rightMl: stepMl(draft.rightMl ?? 0, d, f) })} />
              </Row>
              <Row label="How long">
                <Stepper label="Minutes pumping" display={`${draft.minutes ?? 0} min`} onStep={(d, f) => set({ minutes: Math.max(0, Math.min(120, (draft.minutes ?? 0) + d * (f ? 5 : 1))) })} />
              </Row>
            </>
          )}

          {k === 'growth' && (
            <>
              <Row label="Weight">
                <Stepper
                  label="Weight"
                  testID="weight"
                  display={draft.weightG ? weightText(draft.weightG, units) : 'Not measured'}
                  onStep={(d, f) => {
                    const step = units === 'oz' ? 28.3495 * (f ? 4 : 1) : f ? 100 : 10;
                    set({ weightG: Math.max(0, Math.min(30000, Math.round((draft.weightG ?? 0) + d * step))) });
                  }}
                />
              </Row>
              <Row label="Length">
                <Stepper
                  label="Length"
                  display={draft.lengthMm ? lengthText(draft.lengthMm, units) : 'Not measured'}
                  onStep={(d, f) => {
                    const start = draft.lengthMm || 500;
                    const step = units === 'oz' ? 25.4 * (f ? 1 : 0.25) : f ? 10 : 5;
                    set({ lengthMm: Math.max(0, Math.min(1200, Math.round(start + (draft.lengthMm ? d * step : 0)))) });
                  }}
                />
              </Row>
            </>
          )}

          {k === 'sleep' && (
            <Row label="Slept for">
              {running ? (
                <View style={{ gap: space.s }}>
                  <T>Still asleep, {span(now - draft.at)} so far</T>
                  <QuietButton label="She woke up now" tone="ink" style={styles.left} onPress={() => set({ end: Date.now() })} />
                </View>
              ) : (
                <Stepper
                  label="Sleep length"
                  testID="sleep-length"
                  display={span(durationMin * MIN) === 'just now' ? '0m' : span(durationMin * MIN)}
                  onStep={(d, f) => set({ end: draft.at + Math.max(0, durationMin + d * (f ? 15 : 5)) * MIN })}
                />
              )}
            </Row>
          )}

          {!quickNappy && (
            <Row label="Note">
              <TextInput
                testID="note"
                value={draft.note ?? ''}
                onChangeText={(t) => set({ note: t.slice(0, 200) })}
                placeholder="Anything to remember"
                placeholderTextColor={p.muted}
                multiline
                accessibilityLabel="Note"
                style={[type.body, styles.note, { color: p.ink, backgroundColor: p.surface }]}
              />
            </Row>
          )}
        </ScrollView>
        <View style={styles.bottom}>
          {problem && (
            <View style={[styles.problem, { backgroundColor: p.surface, borderColor: line(p) }]}>
              <T accessibilityLiveRegion="polite" style={type.body}>{problem}</T>
            </View>
          )}
          {!quickNappy && <PrimaryButton label="Save" onPress={save} testID="save-entry" />}
          {existing && (
            <QuietButton
              label="Delete"
              testID="delete-entry"
              onPress={() => {
                removeEntry(existing.id);
                router.back();
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
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
  body: { paddingHorizontal: space.side, paddingBottom: space.xl, gap: space.s },
  row: { gap: space.s, paddingVertical: space.m, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  bottom: { paddingHorizontal: space.side, gap: space.xs },
  problem: { borderRadius: radius.row, borderWidth: 1.5, paddingHorizontal: space.l, paddingVertical: space.m },
  big: { minHeight: 72, borderRadius: radius.big, alignItems: 'center', justifyContent: 'center' },
  note: { minHeight: TAP, borderRadius: radius.row, paddingHorizontal: space.l, paddingVertical: space.m, textAlignVertical: 'top' },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
});
