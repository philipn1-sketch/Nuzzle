import { StyleSheet, View } from 'react-native';

import { weekDays, type Block } from '../core/feeds';
import { amount, span, spanWords } from '../core/format';
import type { Feed, Units } from '../core/types';
import { usePalette } from '../state/theme';
import { line, space, type } from '../theme';
import { Card, T } from './ui';

const STRIP_H = 22;

const short = (dayStart: number, today: boolean) => (today ? 'Today' : new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' }));
const feedsWord = (n: number) => `${n} ${n === 1 ? 'feed' : 'feeds'}`;

/**
 * The last seven days in one chart: each day's feeds laid on a 24 hour strip, oldest at the top.
 * Left and Right differ in height as well as colour, so they read apart without colour.
 */
export function Week({ feeds, now, units }: { feeds: Feed[]; now: number; units: Units }) {
  const p = usePalette();
  const days = weekDays(feeds, now);

  const summary = (i: number) => {
    const d = days[i];
    const bottles = d.bottleMl > 0 ? `, bottles ${amount(d.bottleMl, units)}` : '';
    return `${short(d.dayStart, i === days.length - 1)}, ${feedsWord(d.count)}, ${spanWords(d.breastMs)} on the breast${bottles}`;
  };

  const blockStyle = (b: Block) => {
    const left = `${b.from * 100}%` as const;
    const width = Math.max((b.to - b.from) * 100, 1.4);
    if (b.what === 'bottle') return [styles.block, { left, width: 3, top: 3, bottom: 3, backgroundColor: p.ink }];
    if (b.what === 'L') return [styles.block, { left, width: `${width}%` as const, top: 2, bottom: 2, backgroundColor: p.accent }];
    return [styles.block, { left, width: `${width}%` as const, top: 7, bottom: 7, backgroundColor: p.peach }];
  };

  return (
    <Card style={{ gap: space.m }}>
      <T tone="muted" style={type.label} accessibilityRole="header">Feeds through the day</T>
      {days.map((d, i) => (
        <View key={d.dayStart} style={styles.dayRow} accessible accessibilityLabel={summary(i)} testID={`week-day-${i}`}>
          <T tone="muted" style={[type.small, styles.dayCol]} numberOfLines={1}>{short(d.dayStart, i === days.length - 1)}</T>
          <View style={[styles.strip, { backgroundColor: line(p) }]}>
            {d.blocks.map((b, k) => <View key={k} style={blockStyle(b)} />)}
          </View>
        </View>
      ))}
      <View style={styles.dayRow}>
        <View style={styles.dayCol} />
        <View style={styles.hours}>
          {['12am', '12pm', '12am'].map((h, i) => (
            <T key={i} tone="muted" style={type.small}>{h}</T>
          ))}
        </View>
      </View>
      <T tone="muted" style={type.small} testID="week-picked">
        Today {feedsWord(days[days.length - 1].count)} · {span(days[days.length - 1].breastMs) === 'just now' ? '0m' : span(days[days.length - 1].breastMs)} on the breast
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: space.s + 2 },
  dayCol: { width: 44 },
  strip: { flex: 1, height: STRIP_H, borderRadius: 6, overflow: 'hidden' },
  hours: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  block: { position: 'absolute', borderRadius: 3 },
});
