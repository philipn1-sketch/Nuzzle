import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CalendarSheet } from '../../components/CalendarSheet';
import { Stepper } from '../../components/Stepper';
import { Choice, PillButton, PrimaryButton, QuietButton, Screen, T, TopBar } from '../../components/ui';
import { draftFrom, effectiveEndSide, feedStart, lastBreast, other, type FeedDraft } from '../../core/feeds';
import { amount, dayLabel, fromOz, timeOf, toOz } from '../../core/format';
import type { Milk, Side } from '../../core/types';
import { useApp } from '../../state/AppState';
import { line, radius, space, TAP, type } from '../../theme';
import { usePalette } from '../../state/theme';

const MIN = 60_000;

/** Edit a saved feed, or add one she forgot to time. */
export default function FeedEditor() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const { feeds, saveDraft, remove, settings } = useApp();
  const oz = settings.units === 'oz';
  const p = usePalette();
  const existing = id && id !== 'new' ? feeds.find((f) => f.id === id && f.deletedAt === null) : undefined;

  const [draft, setDraft] = useState<FeedDraft>(() => {
    if (existing) return draftFrom(existing, Date.now());
    const prev = lastBreast(feeds);
    const bottle = kind === 'bottle';
    // a bottle she is logging probably just happened; a forgotten breast feed was a while ago
    const start = Math.floor((Date.now() - (bottle ? 0 : 20) * MIN) / MIN) * MIN;
    return {
      start, leftMin: 0, rightMin: 0, endedOn: prev ? other(prev.segments[prev.segments.length - 1].side) : 'L',
      kind: bottle ? 'bottle' : 'breast', amountMl: oz ? fromOz(3) : 90, milk: 'breast', note: '',
    };
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [calendar, setCalendar] = useState(false);
  // a new feed starts with the time showing, since that is the thing most often fixed
  const [whenOpen, setWhenOpen] = useState(!existing && kind !== 'bottle');
  const [noteOpen, setNoteOpen] = useState(false);

  const set = (patch: Partial<FeedDraft>) => {
    setProblem(null);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const clampMin = (n: number) => Math.max(0, Math.min(300, n));
  const clampMl = (n: number) => Math.max(0, Math.min(500, n));
  const isBottle = draft.kind === 'bottle';
  const ml = draft.amountMl ?? 0;
  const stepAmount = (dir: 1 | -1, fast: boolean) =>
    set({ amountMl: clampMl(oz ? fromOz(toOz(ml) + dir * (fast ? 1 : 0.5)) : Math.round(ml / 10) * 10 + dir * (fast ? 30 : 10)) });

  const save = () => {
    Keyboard.dismiss();
    const result = saveDraft(draft, existing?.id ?? null);
    if (!result) {
      router.back();
      return;
    }
    if (result === 'empty') setProblem(isBottle ? 'Add how much was in the bottle.' : 'Add some minutes on at least one side.');
    else if (result === 'future') setProblem('The start time is later than now.');
    else if (result === 'ends-later') setProblem('With those minutes it would end later than now.');
    else setProblem(`That overlaps the feed at ${timeOf(feedStart(result.overlaps))}.`);
  };

  const now = Date.now();
  const today0 = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
  const day0 = new Date(new Date(draft.start).setHours(0, 0, 0, 0)).getTime();
  const both = draft.leftMin > 0 && draft.rightMin > 0;

  const when = Math.abs(now - draft.start) < 2 * MIN ? 'Now' : `${dayLabel(day0, now)} ${timeOf(draft.start)}`;

  return (
    <Screen>
      <TopBar left={<PillButton label="Cancel" onPress={() => router.back()} testID="cancel" />} title="Feed" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Choice<'breast' | 'bottle'>
          label="Feed type"
          value={draft.kind ?? 'breast'}
          onChange={(v) => set({ kind: v })}
          options={[{ value: 'breast', label: 'Breast' }, { value: 'bottle', label: 'Bottle' }]}
        />
        <Pressable
          testID="when"
          accessibilityRole="button"
          accessibilityLabel={`When: ${when}`}
          accessibilityHint={whenOpen ? 'Hides the day and time' : 'Change the day and time'}
          onPress={() => setWhenOpen((o) => !o)}
          style={({ pressed }) => [styles.whenRow, { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 }]}
        >
          <T tone="muted">When</T>
          <T style={{ fontWeight: '700' }}>{when} {whenOpen ? '⌄' : '›'}</T>
        </Pressable>
        {whenOpen && (
          <View style={{ gap: space.s }}>
            <Stepper
              label="Day"
              testID="day"
              display={dayLabel(day0, now)}
              onStep={(dir) => {
                const d = new Date(draft.start);
                d.setDate(d.getDate() + dir); // a calendar day, so daylight saving changes don't move the time
                if (d.getTime() <= now + MIN) set({ start: d.getTime() });
              }}
              onPressValue={() => setCalendar(true)}
            />
            <Stepper label="Start time" testID="time" display={timeOf(draft.start)} onStep={(dir, fast) => set({ start: draft.start + dir * (fast ? 5 : 1) * MIN })} />
            <CalendarSheet
              visible={calendar}
              title="Which day?"
              value={day0}
              max={today0}
              onDone={(day) => {
                // the chosen day at the same clock time
                const t = new Date(draft.start);
                const d = new Date(day);
                d.setHours(t.getHours(), t.getMinutes(), 0, 0);
                set({ start: Math.min(d.getTime(), now) });
                setCalendar(false);
              }}
              onCancel={() => setCalendar(false)}
            />
          </View>
        )}
        {isBottle ? (
          <View style={{ gap: space.m }}>
            <T tone="muted" style={type.label}>Amount{oz ? '' : ', tap to type'}</T>
            <Stepper
              label="Amount" testID="amount" numeric={oz ? undefined : ml} display={amount(ml, settings.units)}
              onStep={stepAmount}
              onType={oz ? undefined : (n) => set({ amountMl: clampMl(n) })}
            />
            <Choice<Milk>
              label="Milk"
              value={draft.milk ?? 'breast'}
              onChange={(v) => set({ milk: v })}
              options={[{ value: 'breast', label: 'Breast milk' }, { value: 'formula', label: 'Formula' }]}
            />
          </View>
        ) : (
          <View style={{ gap: space.m }}>
            <T tone="accent" style={type.label}>Left</T>
            <Stepper
              label="Minutes on the left" testID="left" numeric={draft.leftMin} display={`${draft.leftMin}m`}
              onStep={(dir, fast) => set({ leftMin: clampMin(draft.leftMin + dir * (fast ? 5 : 1)) })}
              onType={(n) => set({ leftMin: clampMin(n) })}
            />
            <T tone="peach" style={type.label}>Right</T>
            <Stepper
              label="Minutes on the right" testID="right" numeric={draft.rightMin} display={`${draft.rightMin}m`}
              onStep={(dir, fast) => set({ rightMin: clampMin(draft.rightMin + dir * (fast ? 5 : 1)) })}
              onType={(n) => set({ rightMin: clampMin(n) })}
            />
            {both && (
              // which side came last decides the side to start on next time
              <Choice<Side>
                label="Ended on"
                value={effectiveEndSide(draft)}
                onChange={(v) => set({ endedOn: v })}
                options={[{ value: 'L', label: 'Ended on left' }, { value: 'R', label: 'Ended on right' }]}
              />
            )}
          </View>
        )}
        {noteOpen || draft.note ? (
          <TextInput
            testID="note"
            value={draft.note ?? ''}
            onChangeText={(t) => set({ note: t.slice(0, 200) })}
            placeholder="Anything to remember"
            placeholderTextColor={p.muted}
            multiline
            autoFocus={noteOpen && !draft.note}
            accessibilityLabel="Note"
            style={[type.body, styles.note, { color: p.ink, backgroundColor: p.surface }]}
          />
        ) : (
          <QuietButton label="+ Note" onPress={() => setNoteOpen(true)} testID="add-note" style={styles.left} />
        )}
      </ScrollView>
      <View style={styles.bottom}>
        {problem && (
          <View style={[styles.problem, { backgroundColor: p.surface, borderColor: line(p) }]}>
            <T accessibilityLiveRegion="polite" style={type.body}>{problem}</T>
          </View>
        )}
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

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingTop: space.s, paddingBottom: space.xl, gap: space.l },
  whenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TAP, paddingHorizontal: space.side, borderRadius: radius.row },
  bottom: { paddingHorizontal: space.side, paddingTop: space.s, gap: space.xs },
  problem: { borderRadius: radius.row, borderWidth: 1.5, paddingHorizontal: space.l, paddingVertical: space.m },
  note: { minHeight: TAP, borderRadius: radius.row, paddingHorizontal: space.l, paddingVertical: space.m, textAlignVertical: 'top' },
  left: { alignSelf: 'flex-start', paddingHorizontal: 0 },
});
