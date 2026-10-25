import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Week } from '../components/Week';
import { Choice, PillButton, PrimaryButton, QuietButton, Screen, SnackbarSlot, T, TopBar } from '../components/ui';
import { dayKey, dayStartOf, feedStart, groupByDay, sideRuns, totalMs, type DayGroup } from '../core/feeds';
import { entryDetail, entryTitle, nappyCount, nappyLine, sortedEntries, type NappyCount } from '../core/entries';
import { amount, dayLabel, milkWord, mins, timeOf } from '../core/format';
import type { Entry, Feed } from '../core/types';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { chipStyle, radius, space, type, wash } from '../theme';

type Day = { key: string; dayStart: number; feeds: DayGroup | null; nappies: NappyCount };
type Row = { kind: 'day'; day: Day } | { kind: 'feed'; feed: Feed } | { kind: 'entry'; entry: Entry };

/** Every saved feed, grouped by the day it started, newest first. */
export default function History() {
  const { feeds, entries, settings } = useApp();
  const [view, setView] = useState<'list' | 'week'>('list');
  const now = useNow(30_000);
  const p = usePalette();
  const groups = new Map(groupByDay(feeds, now).map((g) => [g.key, g]));
  // feeds and everything else, newest first, under one heading per day
  const items: { t: number; row: Row }[] = [
    ...[...groups.values()].flatMap((g) => g.feeds.map((f) => ({ t: feedStart(f), row: { kind: 'feed', feed: f } as Row }))),
    ...sortedEntries(entries).map((e) => ({ t: e.at, row: { kind: 'entry', entry: e } as Row })),
  ].sort((a, b) => b.t - a.t);
  const rows: Row[] = [];
  let lastKey = '';
  for (const it of items) {
    const key = dayKey(it.t);
    if (key !== lastKey) {
      const d0 = dayStartOf(it.t);
      rows.push({ kind: 'day', day: { key, dayStart: d0, feeds: groups.get(key) ?? null, nappies: nappyCount(entries, d0, dayStartOf(it.t, -1)) } });
      lastKey = key;
    }
    rows.push(it.row);
  }

  return (
    <Screen>
      <TopBar
        left={<PillButton label="Back" onPress={() => router.back()} testID="back" />}
        title="History"
        right={<PillButton label="Summary" onPress={() => router.push('/summary')} testID="open-summary" a11yLabel="Summary for appointments" />}
      />
      <View style={styles.toggle}>
        <Choice<'list' | 'week'>
          label="View"
          value={view}
          onChange={setView}
          options={[{ value: 'list', label: 'List' }, { value: 'week', label: 'Week' }]}
        />
      </View>
      {view === 'week' ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Week feeds={feeds} now={now} units={settings.units} />
        </ScrollView>
      ) : (
      <FlatList
        data={rows}
        keyExtractor={(r) => (r.kind === 'day' ? `d${r.day.key}` : r.kind === 'feed' ? r.feed.id : r.entry.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <T style={type.title}>Nothing here yet</T>
            <T tone="muted" style={[type.label, { textAlign: 'center' }]}>Feeds you save will show up here.</T>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'day') {
            const g = item.day.feeds;
            const n = item.day.nappies;
            return (
              <View style={styles.dayHead} accessibilityRole="header">
                <T style={type.title}>{dayLabel(item.day.dayStart, now)}</T>
                {g && (
                  <T tone="muted" style={type.label}>
                    {g.count} {g.count === 1 ? 'feed' : 'feeds'} · Left {mins(g.leftMs)}m · Right {mins(g.rightMs)}m
                    {g.bottleMl > 0 ? ` · Bottles ${amount(g.bottleMl, settings.units)}` : ''}
                  </T>
                )}
                {n.total > 0 && (
                  <T tone="muted" style={type.label}>{nappyLine(n, '')}</T>
                )}
              </View>
            );
          }
          if (item.kind === 'entry') {
            const e = item.entry;
            const title = entryTitle(e, settings.units, now);
            const detail = entryDetail(e, settings.units);
            return (
              <Pressable
                testID={`entry-row-${e.id}`}
                onPress={() => router.push(`/entry/${e.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${timeOf(e.at)}, ${title}${detail ? `, ${detail}` : ''}${e.note ? `, note: ${e.note}` : ''}`}
                accessibilityHint="Opens it to edit or delete"
                style={({ pressed }) => [styles.row, { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 }]}
              >
                <T style={[type.body, styles.time]}>{timeOf(e.at)}</T>
                <View style={styles.chips}>
                  <View style={[styles.chip, { backgroundColor: wash(p.muted, '2E') }]}>
                    <T style={type.small}>{title}</T>
                  </View>
                </View>
                {detail ? <T tone="muted" style={[type.label, styles.note, { fontStyle: 'normal' }]}>{detail}</T> : null}
                {e.note ? <T tone="muted" style={[type.label, styles.note]} numberOfLines={2}>{e.note}</T> : null}
              </Pressable>
            );
          }
          const f = item.feed;
          if (f.bottle) {
            const what = `Bottle ${amount(f.bottle.amountMl, settings.units)} of ${milkWord(f.bottle.milk)}`;
            return (
              <Pressable
                testID={`feed-row-${f.id}`}
                onPress={() => router.push(`/feed/${f.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${timeOf(feedStart(f))}, ${what}${f.note ? `, note: ${f.note}` : ''}`}
                accessibilityHint="Opens this bottle to edit or delete it"
                style={({ pressed }) => [styles.row, { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 }]}
              >
                <T style={[type.body, styles.time]}>{timeOf(feedStart(f))}</T>
                <View style={styles.chips}>
                  <View style={[styles.chip, { backgroundColor: wash(p.muted, '2E') }]}>
                    <T style={type.small}>{what}</T>
                  </View>
                </View>
                {f.note ? <T tone="muted" style={[type.label, styles.note]} numberOfLines={2}>{f.note}</T> : null}
              </Pressable>
            );
          }
          const sideList = sideRuns(f, now);
          const runs = sideList.map((r) => `${r.side === 'L' ? 'left' : 'right'} ${mins(r.ms)} minutes`).join(', then ');
          return (
            <Pressable
              testID={`feed-row-${f.id}`}
              onPress={() => router.push(`/feed/${f.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${timeOf(feedStart(f))}, ${runs}, ${mins(totalMs(f, now))} minutes in total${f.note ? `, note: ${f.note}` : ''}`}
              accessibilityHint="Opens this feed to edit or delete it"
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <T style={[type.body, styles.time]}>{timeOf(feedStart(f))}</T>
              <View style={styles.chips}>
                {sideList.map((r, i) => (
                  <View key={i} style={[styles.chip, chipStyle(p, r.side === 'L' ? p.accent : p.peach)]}>
                    <T tone={r.side === 'L' ? 'accent' : 'peach'} style={type.small}>{r.side === 'L' ? 'Left' : 'Right'} {mins(r.ms)}m</T>
                  </View>
                ))}
              </View>
              <T tone="muted" style={[type.body, { fontVariant: ['tabular-nums'] }]}>{mins(totalMs(f, now))}m</T>
              {f.note ? <T tone="muted" style={[type.label, styles.note]} numberOfLines={2}>{f.note}</T> : null}
            </Pressable>
          );
        }}
      />
      )}
      <View style={[styles.bottom, { borderTopColor: wash(p.muted, '33') }]}>
        <SnackbarSlot />
        <PrimaryButton label="Add a feed" onPress={() => router.push('/feed/new')} testID="add-feed" />
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
          <QuietButton label="Add pumping ›" tone="ink" onPress={() => router.push('/entry/new?kind=pump')} testID="log-pump" />
          <QuietButton label="Add a weight ›" tone="ink" onPress={() => router.push('/entry/new?kind=growth')} testID="add-growth" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.side, paddingBottom: space.xxl * 2, flexGrow: 1 },
  dayHead: { paddingTop: space.xl, paddingBottom: space.m, paddingHorizontal: space.xs, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', alignContent: 'center', flexWrap: 'wrap', columnGap: space.m, rowGap: space.xs, minHeight: 64, paddingHorizontal: space.l, paddingVertical: space.m, borderRadius: radius.row, marginBottom: space.s },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { borderRadius: 999, paddingHorizontal: space.s + 2, paddingVertical: 3 },
  toggle: { paddingHorizontal: space.side, paddingBottom: space.s },
  note: { flexBasis: '100%', fontStyle: 'italic' },
  time: { minWidth: 84, fontVariant: ['tabular-nums'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s, paddingTop: 120 },
  bottom: { paddingHorizontal: space.side, gap: space.m, paddingTop: space.m, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
