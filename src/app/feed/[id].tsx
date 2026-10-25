import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { Stepper } from '../../components/Stepper';
import { Choice, PillButton, PrimaryButton, QuietButton, Screen, T, TopBar } from '../../components/ui';
import { draftFrom, effectiveEndSide, feedStart, lastSaved, other, type FeedDraft } from '../../core/feeds';
import { dayLabel, timeOf } from '../../core/format';
import type { Side } from '../../core/types';
import { useApp } from '../../state/AppState';
import { line, space, type } from '../../theme';
import { usePalette } from '../../state/theme';

const MIN = 60_000;

/** Edit a saved feed, or add one she forgot to time. */
export default function FeedEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { feeds, saveDraft, remove } = useApp();
  const p = usePalette();
  const existing = id && id !== 'new' ? feeds.find((f) => f.id === id && f.deletedAt === null) : undefined;

  const [draft, setDraft] = useState<FeedDraft>(() => {
    if (existing) return draftFrom(existing, Date.now());
    const prev = lastSaved(feeds);
    const start = Math.floor((Date.now() - 20 * MIN) / MIN) * MIN;
    return { start, leftMin: 0, rightMin: 0, endedOn: prev ? other(prev.segments[prev.segments.length - 1].side) : 'L' };
  });
  const [problem, setProblem] = useState<string | null>(null);

  const set = (patch: Partial<FeedDraft>) => {
    setProblem(null);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const clampMin = (n: number) => Math.max(0, Math.min(300, n));

  const save = () => {
    const result = saveDraft(draft, existing?.id ?? null);
    if (!result) {
      router.back();
      return;
    }
    if (result === 'empty') setProblem('Add some minutes on at least one side.');
    else if (result === 'future') setProblem('The start time is later than now.');
    else if (result === 'ends-later') setProblem('With those minutes it would end later than now.');
    else setProblem(`That overlaps the feed at ${timeOf(feedStart(result.overlaps))}.`);
  };

  const now = Date.now();
  const today0 = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
  const day0 = new Date(new Date(draft.start).setHours(0, 0, 0, 0)).getTime();
  const both = draft.leftMin > 0 && draft.rightMin > 0;

  return (
    <Screen>
      <TopBar left={<PillButton label="Cancel" onPress={() => router.back()} testID="cancel" />} title={existing ? 'Edit feed' : 'Add a feed'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Row label="Day">
          <Stepper
            label="Day"
            testID="day"
            display={dayLabel(day0, now)}
            onStep={(dir) => {
              const d = new Date(draft.start);
              d.setDate(d.getDate() + dir); // a calendar day, so daylight saving changes don't move the time
              if (d.getTime() <= now + MIN) set({ start: d.getTime() });
            }}
          />
        </Row>
        <Row label="Started at">
          <Stepper label="Start time" testID="time" display={timeOf(draft.start)} onStep={(dir, fast) => set({ start: draft.start + dir * (fast ? 5 : 1) * MIN })} />
        </Row>
        <Row label="Left">
          <Stepper
            label="Minutes on the left" testID="left" numeric={draft.leftMin} display={`${draft.leftMin} min`}
            onStep={(dir, fast) => set({ leftMin: clampMin(draft.leftMin + dir * (fast ? 5 : 1)) })}
            onType={(n) => set({ leftMin: clampMin(n) })}
          />
        </Row>
        <Row label="Right">
          <Stepper
            label="Minutes on the right" testID="right" numeric={draft.rightMin} display={`${draft.rightMin} min`}
            onStep={(dir, fast) => set({ rightMin: clampMin(draft.rightMin + dir * (fast ? 5 : 1)) })}
            onType={(n) => set({ rightMin: clampMin(n) })}
          />
        </Row>
        {both && (
          <View style={[styles.row, { borderBottomColor: line(p) }]}>
            <T tone="muted" style={type.label}>Ended on</T>
            <Choice<Side>
              label="Ended on"
              value={effectiveEndSide(draft)}
              onChange={(v) => set({ endedOn: v })}
              options={[{ value: 'L', label: 'Left' }, { value: 'R', label: 'Right' }]}
            />
          </View>
        )}
        {problem && <T tone="accent" accessibilityLiveRegion="polite" style={type.body}>{problem}</T>}
      </ScrollView>
      <View style={styles.bottom}>
        <PrimaryButton label="Save" onPress={save} testID="save-feed" />
        {existing && (
          <QuietButton
            label="Delete feed"
            testID="delete-feed"
            onPress={() => {
              remove(existing.id);
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
});
