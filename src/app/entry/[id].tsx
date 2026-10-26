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
import { t, tk } from '../../i18n';

const MIN = 60_000;
const TITLES: Record<EntryKind, [string, string]> = {
  nappy: [tk('Nappy'), tk('Edit nappy')],
  pump: [tk('Pumping'), tk('Edit pumping')],
  growth: [tk('Weight'), tk('Edit weight')],
  sleep: [tk('Sleep'), tk('Edit sleep')],
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
    if (result === 'future') setProblem(t('That is later than now.'));
    else if (result === 'order') setProblem(t('She woke before she fell asleep. Check the times.'));
    else setProblem(k === 'pump' ? t('Add how much on at least one side.') : t('Add a weight or a length.'));
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
      <TopBar left={<PillButton label={t('Cancel')} onPress={() => router.back()} testID="cancel" />} title={t(TITLES[k][existing ? 1 : 0])} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Row label={t('Day')}>
            <Stepper label={t('Day')} testID="day" display={dayLabel(day0, now)} onStep={moveDay} />
          </Row>
          <Row label={k === 'sleep' ? t('Fell asleep at') : t('At')}>
            <Stepper label={t('Time')} testID="time" display={timeOf(draft.at)} onStep={moveTime} />
          </Row>

          {quickNappy && (
            <View style={{ gap: space.m, paddingTop: space.l }}>
              {(['wet', 'dirty', 'both'] as Nappy[]).map((n) => (
                <Pressable
                  key={n}
                  testID={`nappy-${n}`}
                  accessibilityRole="button"
                  accessibilityHint={t('Saves it at {time}', { time: timeOf(draft.at) })}
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
            <Row label={t('Nappy')}>
              <Choice<Nappy>
                label={t('Nappy')}
                value={draft.nappy ?? 'wet'}
                onChange={(v) => set({ nappy: v })}
                options={[{ value: 'wet', label: t('Wet') }, { value: 'dirty', label: t('Dirty') }, { value: 'both', label: t('Both') }]}
              />
            </Row>
          )}

          {k === 'pump' && (
            <>
              <Row label={t('Left')}>
                <Stepper label={t('Left amount')} testID="pump-left" display={amount(draft.leftMl ?? 0, units)} onStep={(d, f) => set({ leftMl: stepMl(draft.leftMl ?? 0, d, f) })} />
              </Row>
              <Row label={t('Right')}>
                <Stepper label={t('Right amount')} testID="pump-right" display={amount(draft.rightMl ?? 0, units)} onStep={(d, f) => set({ rightMl: stepMl(draft.rightMl ?? 0, d, f) })} />
              </Row>
              <Row label={t('How long')}>
                <Stepper label={t('Minutes pumping')} display={t('{n} min', { n: draft.minutes ?? 0 })} onStep={(d, f) => set({ minutes: Math.max(0, Math.min(120, (draft.minutes ?? 0) + d * (f ? 5 : 1))) })} />
              </Row>
            </>
          )}

          {k === 'growth' && (
            <>
              <Row label={t('Weight')}>
                <Stepper
                  label={t('Weight')}
                  testID="weight"
                  display={draft.weightG ? weightText(draft.weightG, units) : t('Not measured')}
                  onStep={(d, f) => {
                    const step = units === 'oz' ? 28.3495 * (f ? 4 : 1) : f ? 100 : 10;
                    set({ weightG: Math.max(0, Math.min(30000, Math.round((draft.weightG ?? 0) + d * step))) });
                  }}
                />
              </Row>
              <Row label={t('Length')}>
                <Stepper
                  label={t('Length')}
                  display={draft.lengthMm ? lengthText(draft.lengthMm, units) : t('Not measured')}
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
            <Row label={t('Slept for')}>
              {running ? (
                <View style={{ gap: space.s }}>
                  <T>{t('Still asleep, {time} so far', { time: span(now - draft.at) })}</T>
                  <QuietButton label={t('She woke up now')} tone="ink" style={styles.left} onPress={() => set({ end: Date.now() })} />
                </View>
              ) : (
                <Stepper
                  label={t('Sleep length')}
                  testID="sleep-length"
                  display={durationMin < 1 ? t('{m}m', { m: 0 }) : span(durationMin * MIN)}
                  onStep={(d, f) => set({ end: draft.at + Math.max(0, durationMin + d * (f ? 15 : 5)) * MIN })}
                />
              )}
            </Row>
          )}

          {!quickNappy && (
            <Row label={t('Note')}>
              <TextInput
                testID="note"
                value={draft.note ?? ''}
                onChangeText={(t) => set({ note: t.slice(0, 200) })}
                placeholder={t('Anything to remember')}
                placeholderTextColor={p.muted}
                multiline
                accessibilityLabel={t('Note')}
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
          {!quickNappy && <PrimaryButton label={t('Save')} onPress={save} testID="save-entry" />}
          {existing && (
            <QuietButton
              label={t('Delete')}
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
