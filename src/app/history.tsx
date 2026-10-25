import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PillButton, PrimaryButton, Screen, SnackbarSlot, T, TopBar } from '../components/ui';
import { feedStart, groupByDay, sideRuns, totalMs, type DayGroup } from '../core/feeds';
import { dayLabel, mins, timeOf } from '../core/format';
import type { Feed } from '../core/types';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { radius, space, type, wash } from '../theme';

type Row = { kind: 'day'; group: DayGroup } | { kind: 'feed'; feed: Feed; first: boolean; lastInDay: boolean };

/** Every saved feed, grouped by the day it started, newest first. */
export default function History() {
  const { feeds } = useApp();
  const now = useNow(30_000);
  const p = usePalette();
  const groups = groupByDay(feeds, now);

  const rows: Row[] = [];
  for (const g of groups) {
    rows.push({ kind: 'day', group: g });
    g.feeds.forEach((f, i) => rows.push({ kind: 'feed', feed: f, first: i === 0, lastInDay: i === g.feeds.length - 1 }));
  }

  return (
    <Screen>
      <TopBar left={<PillButton label="Back" onPress={() => router.back()} testID="back" />} title="History" />
      <FlatList
        data={rows}
        keyExtractor={(r) => (r.kind === 'day' ? `d${r.group.key}` : r.feed.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <T style={type.title}>Nothing here yet</T>
            <T tone="muted" style={[type.label, { textAlign: 'center' }]}>Feeds you save will show up here.</T>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'day') {
            const g = item.group;
            return (
              <View style={styles.dayHead} accessibilityRole="header">
                <T style={type.title}>{dayLabel(g.dayStart, now)}</T>
                <T tone="muted" style={type.label}>
                  {g.count} {g.count === 1 ? 'feed' : 'feeds'} · Left {mins(g.leftMs)}m · Right {mins(g.rightMs)}m
                </T>
              </View>
            );
          }
          const f = item.feed;
          const sideList = sideRuns(f, now);
          const runs = sideList.map((r) => `${r.side === 'L' ? 'left' : 'right'} ${mins(r.ms)} minutes`).join(', then ');
          return (
            <Pressable
              testID={`feed-row-${f.id}`}
              onPress={() => router.push(`/feed/${f.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${timeOf(feedStart(f))}, ${runs}, ${mins(totalMs(f, now))} minutes in total`}
              accessibilityHint="Opens this feed to edit or delete it"
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <T style={[type.body, styles.time]}>{timeOf(feedStart(f))}</T>
              <View style={styles.chips}>
                {sideList.map((r, i) => (
                  <View key={i} style={[styles.chip, { backgroundColor: wash(r.side === 'L' ? p.accent : p.peach, '2E') }]}>
                    <T tone={r.side === 'L' ? 'accent' : 'peach'} style={type.small}>{r.side === 'L' ? 'Left' : 'Right'} {mins(r.ms)}m</T>
                  </View>
                ))}
              </View>
              <T tone="muted" style={[type.body, { fontVariant: ['tabular-nums'] }]}>{mins(totalMs(f, now))}m</T>
            </Pressable>
          );
        }}
      />
      <View style={[styles.bottom, { borderTopColor: wash(p.muted, '33') }]}>
        <SnackbarSlot />
        <PrimaryButton label="Add a feed" onPress={() => router.push('/feed/new')} testID="add-feed" />
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
  time: { minWidth: 84, fontVariant: ['tabular-nums'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s, paddingTop: 120 },
  bottom: { paddingHorizontal: space.side, gap: space.m, paddingTop: space.m, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
