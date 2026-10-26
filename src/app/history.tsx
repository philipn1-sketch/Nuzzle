import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { PlusCard } from '../components/PlusGate';
import { Week } from '../components/Week';
import { Card, Choice, PillButton, PrimaryButton, Screen, SecondaryButton, SnackbarSlot, T, TopBar } from '../components/ui';
import { APP_NAME } from '../config';
import { feedsToCsv } from '../core/csv';
import { dayKey, dayStartOf, feedStart, groupByDay, sideRuns, type DayGroup } from '../core/feeds';
import { entryDetail, entryTitle, liveEntries, nappyCount, sortedEntries, weightText } from '../core/entries';
import { ageText, amount, dayLabel, milkWord, mins, span, timeOf } from '../core/format';
import { babyName } from '../core/reminder';
import { summaryDays, summaryHtml } from '../core/summary';
import type { Entry, Feed } from '../core/types';
import { shareSummaryPdf } from '../services/summary';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { radius, space, type, wash } from '../theme';

type Day = { key: string; dayStart: number; feeds: DayGroup | null; nappies: number };
type Row = { kind: 'day'; day: Day } | { kind: 'feed'; feed: Feed } | { kind: 'entry'; entry: Entry };
type Tab = 'list' | 'week' | 'summary';

/** Everything logged, newest first, with the week chart and a check up summary as tabs. */
export default function History() {
  const { feeds, entries, allFeeds, allEntries, settings, baby, plus } = useApp();
  const [tab, setTab] = useState<Tab>('list');
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
      rows.push({ kind: 'day', day: { key, dayStart: d0, feeds: groups.get(key) ?? null, nappies: nappyCount(entries, d0, dayStartOf(it.t, -1)).total } });
      lastKey = key;
    }
    rows.push(it.row);
  }

  return (
    <Screen>
      <TopBar left={<PillButton label="Back" onPress={() => router.back()} testID="back" />} title="History" />
      <View style={styles.toggle}>
        <Choice<Tab>
          label="View"
          value={tab}
          onChange={setTab}
          options={[{ value: 'list', label: 'List' }, { value: 'week', label: 'Week' }, { value: 'summary', label: 'Summary' }]}
        />
      </View>
      {tab === 'week' ? (
        <ScrollView contentContainerStyle={styles.list}>
          {plus ? <Week feeds={feeds} now={now} units={settings.units} /> : <PlusCard feature="insights" />}
        </ScrollView>
      ) : tab === 'summary' ? (
        <ScrollView contentContainerStyle={styles.list}>
          {plus ? summary() : <PlusCard feature="insights" />}
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
              const n = item.day.feeds?.count ?? 0;
              const parts = [n ? `${n} ${n === 1 ? 'feed' : 'feeds'}` : '', item.day.nappies ? `${item.day.nappies} ${item.day.nappies === 1 ? 'nappy' : 'nappies'}` : ''].filter(Boolean);
              return (
                <View style={styles.dayHead} accessibilityRole="header">
                  <T tone="muted" style={[type.label, { fontWeight: '700' }]}>{dayLabel(item.day.dayStart, now)}</T>
                  <T tone="muted" style={type.label}>{parts.join(' · ')}</T>
                </View>
              );
            }
            if (item.kind === 'entry') {
              const e = item.entry;
              const title = entryTitle(e, settings.units, now);
              const detail = entryDetail(e, settings.units);
              return (
                <RowBox
                  testID={`entry-row-${e.id}`}
                  onPress={() => router.push(`/entry/${e.id}`)}
                  label={`${timeOf(e.at)}, ${title}${detail ? `, ${detail}` : ''}${e.note ? `, note: ${e.note}` : ''}`}
                  time={timeOf(e.at)}
                  note={e.note}
                >
                  <T tone="muted" style={styles.what} numberOfLines={1}>{title}</T>
                </RowBox>
              );
            }
            const f = item.feed;
            if (f.bottle) {
              return (
                <RowBox
                  testID={`feed-row-${f.id}`}
                  onPress={() => router.push(`/feed/${f.id}`)}
                  label={`${timeOf(feedStart(f))}, bottle, ${amount(f.bottle.amountMl, settings.units)} of ${milkWord(f.bottle.milk)}${f.note ? `, note: ${f.note}` : ''}`}
                  time={timeOf(feedStart(f))}
                  note={f.note}
                >
                  <View style={[styles.bottle, { backgroundColor: wash(p.muted, '40') }]}><T style={[type.small, { fontWeight: '700' }]}>Bottle</T></View>
                  <T style={styles.what}>{amount(f.bottle.amountMl, settings.units)}</T>
                </RowBox>
              );
            }
            const runs = sideRuns(f, now);
            const text = runs.map((r) => `${r.side === 'L' ? 'Left' : 'Right'} ${mins(r.ms)}m`).join(' · ');
            return (
              <RowBox
                testID={`feed-row-${f.id}`}
                onPress={() => router.push(`/feed/${f.id}`)}
                label={`${timeOf(feedStart(f))}, ${runs.map((r) => `${r.side === 'L' ? 'left' : 'right'} ${mins(r.ms)} minutes`).join(', then ')}${f.note ? `, note: ${f.note}` : ''}`}
                time={timeOf(feedStart(f))}
                note={f.note}
              >
                <T tone={runs[0]?.side === 'R' ? 'peach' : 'accent'} style={styles.what} numberOfLines={1}>{text}</T>
              </RowBox>
            );
          }}
        />
      )}
      <View style={styles.bottom}>
        <SnackbarSlot />
        <PrimaryButton label="Add a feed" onPress={() => router.push('/feed/new')} testID="add-feed" />
      </View>
    </Screen>
  );

  /** The last seven days in four numbers, and the way to share them at a check up. */
  function summary() {
    const days = summaryDays(feeds, entries, 7, now);
    const logged = days.filter((d) => !d.empty);
    const n = Math.max(1, logged.length);
    const feedsADay = Math.round(logged.reduce((t, d) => t + d.feeds, 0) / n);
    const breastADay = logged.reduce((t, d) => t + d.leftMs + d.rightMs, 0) / n;
    const from = days[0]?.dayStart ?? now;
    const nappiesADay = Math.round(nappyCount(entries, from, dayStartOf(now, -1)).total / n);
    const weight = liveEntries(entries).filter((e) => e.kind === 'growth' && e.weightG).sort((a, b) => b.at - a.at)[0];
    const facts: [string, string][] = [
      ['Feeds a day', String(feedsADay)],
      ['Time on the breast', span(breastADay) === 'just now' ? '0m' : span(breastADay)],
      ['Nappies a day', String(nappiesADay)],
      ...(weight?.weightG ? [['Weight', weightText(weight.weightG, settings.units)] as [string, string]] : []),
    ];
    const name = babyName(baby);
    const pdf = () => {
      const html = summaryHtml({ name, age: baby.birthday !== null ? ageText(baby.birthday, now) : '', feeds, entries, days: 7, units: settings.units, now });
      shareSummaryPdf(html).catch(() => {});
    };
    const csv = () => {
      const first = settings.babies[0];
      const nameOf = (f: { babyId?: string }) => babyName(settings.babies.find((b) => b.id === (f.babyId ?? first.id)));
      Share.share({ title: `${APP_NAME} feeds`, message: feedsToCsv(allFeeds, Date.now(), nameOf, allEntries, settings.units) }).catch(() => {});
    };
    return (
      <Card style={{ gap: 14 }}>
        <T tone="muted" style={type.label} accessibilityRole="header">Last 7 days{logged.length < 7 && logged.length > 0 ? `, averaged over the ${logged.length} logged` : ''}</T>
        {facts.map(([k, v]) => (
          <View key={k} style={styles.fact} accessible accessibilityLabel={`${k}: ${v}`}>
            <T tone="muted">{k}</T>
            <T style={{ fontWeight: '800' }}>{v}</T>
          </View>
        ))}
        <SecondaryButton
          strong
          label="Share as PDF or spreadsheet"
          testID="share-summary"
          onPress={() =>
            Alert.alert('Share', undefined, [
              { text: 'One page PDF for a check up', onPress: pdf },
              { text: 'Spreadsheet of everything', onPress: csv },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
        />
      </Card>
    );
  }
}

function RowBox({ testID, onPress, label, time, note, children }: {
  testID: string; onPress: () => void; label: string; time: string; note?: string; children: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens it to edit or delete"
      style={({ pressed }) => [styles.row, { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={styles.line}>
        <T style={styles.time}>{time}</T>
        {children}
      </View>
      {note ? <T tone="muted" style={[type.label, { fontStyle: 'italic' }]} numberOfLines={2}>{note}</T> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.side, paddingBottom: space.m, gap: space.s, flexGrow: 1 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.m, paddingBottom: space.s, paddingHorizontal: space.xs },
  row: { minHeight: 56, justifyContent: 'center', gap: 2, paddingHorizontal: 18, paddingVertical: space.s, borderRadius: radius.row, marginBottom: space.s },
  line: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  time: { width: 82, fontWeight: '700', fontVariant: ['tabular-nums'] },
  what: { flexShrink: 1 },
  bottle: { borderRadius: 999, paddingHorizontal: space.s + 2, paddingVertical: 3 },
  fact: { flexDirection: 'row', justifyContent: 'space-between' },
  toggle: { paddingHorizontal: space.side, paddingTop: space.s, paddingBottom: space.m },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s, paddingTop: 120 },
  bottom: { paddingHorizontal: space.side, gap: space.m, paddingTop: space.s },
});
