import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { weekDays, type Block } from '../core/feeds';
import { amount, dayLabel, span, spanWords } from '../core/format';
import type { Feed, Units } from '../core/types';
import { usePalette } from '../state/theme';
import { radius, space, type, wash } from '../theme';
import { Card, T } from './ui';

const BAR_H = 120;
const STRIP_H = 22;

const short = (dayStart: number) => new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' });
const feedsWord = (n: number) => `${n} ${n === 1 ? 'feed' : 'feeds'}`;

/**
 * The last seven days: time on the breast per day as bars, then each day's feeds laid on a 24 hour strip.
 * Left and Right differ in height as well as colour, so they read apart without colour.
 */
export function Week({ feeds, now, units }: { feeds: Feed[]; now: number; units: Units }) {
  const p = usePalette();
  const days = weekDays(feeds, now);
  const [picked, setPicked] = useState(days.length - 1);
  const most = Math.max(...days.map((d) => d.breastMs), 1);
  const sel = days[picked];

  const summary = (i: number) => {
    const d = days[i];
    const bottles = d.bottleMl > 0 ? `, bottles ${amount(d.bottleMl, units)}` : '';
    return `${dayLabel(d.dayStart, now)}, ${feedsWord(d.count)}, ${spanWords(d.breastMs)} on the breast${bottles}`;
  };

  const blockStyle = (b: Block) => {
    const left = `${b.from * 100}%` as const;
    const width = `${Math.max(b.to - b.from, 0.004) * 100}%` as const;
    if (b.what === 'bottle') return [styles.block, { left, width: 3, top: 0, bottom: 0, backgroundColor: p.ink }];
    if (b.what === 'L') return [styles.block, { left, width, top: 0, bottom: 0, backgroundColor: p.accent }];
    return [styles.block, { left, width, top: STRIP_H * 0.4, bottom: 0, backgroundColor: p.peach }];
  };

  return (
    <View style={{ gap: space.l, paddingTop: space.s }}>
      <Card style={{ gap: space.m }}>
        <T style={type.title} accessibilityRole="header">Time on the breast</T>
        <T testID="week-picked" tone="muted" style={type.label} accessibilityLiveRegion="polite">
          {dayLabel(sel.dayStart, now)} · {feedsWord(sel.count)} · {span(sel.breastMs) === 'just now' ? '0m' : span(sel.breastMs)}
          {sel.bottleMl > 0 ? ` · Bottles ${amount(sel.bottleMl, units)}` : ''}
        </T>
        <View style={[styles.bars, { borderBottomColor: wash(p.muted, '40') }]}>
          {days.map((d, i) => (
            <Pressable
              key={d.dayStart}
              testID={`week-bar-${i}`}
              onPress={() => setPicked(i)}
              accessibilityRole="button"
              accessibilityLabel={summary(i)}
              accessibilityState={{ selected: i === picked }}
              style={styles.barHit}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max((d.breastMs / most) * BAR_H, d.breastMs > 0 ? 4 : 0),
                    backgroundColor: i === picked ? p.accent : wash(p.muted, 'A6'),
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
        <View style={styles.barLabels}>
          {days.map((d, i) => (
            <T key={d.dayStart} tone={i === picked ? 'ink' : 'muted'} style={[type.small, styles.barLabel]} numberOfLines={1}>
              {short(d.dayStart)}
            </T>
          ))}
        </View>
      </Card>

      <Card style={{ gap: space.m }}>
        <T style={type.title} accessibilityRole="header">Feeds through the day</T>
        <View style={styles.legend}>
          <Key color={p.accent} label="Left" />
          <Key color={p.peach} label="Right" short />
          <Key color={p.ink} label="Bottle" thin />
        </View>
        <View style={styles.hours}>
          <View style={styles.dayCol} />
          <View style={styles.hourRow}>
            {['12am', '6am', '12pm', '6pm'].map((h) => (
              <T key={h} tone="muted" style={[type.small, { flex: 1 }]}>{h}</T>
            ))}
          </View>
        </View>
        {[...days].reverse().map((d, ri) => {
          const i = days.length - 1 - ri;
          return (
            <View key={d.dayStart} style={styles.dayRow} accessible accessibilityLabel={summary(i)}>
              <T tone={i === picked ? 'ink' : 'muted'} style={[type.small, styles.dayCol]} numberOfLines={1}>{short(d.dayStart)}</T>
              <View style={[styles.strip, { backgroundColor: wash(p.muted, '1F') }]}>
                {[0.25, 0.5, 0.75].map((q) => (
                  <View key={q} style={[styles.tick, { left: `${q * 100}%`, backgroundColor: wash(p.muted, '40') }]} />
                ))}
                {d.blocks.map((b, k) => <View key={k} style={blockStyle(b)} />)}
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function Key({ color, label, short: low, thin }: { color: string; label: string; short?: boolean; thin?: boolean }) {
  return (
    <View style={styles.key}>
      <View style={{ width: thin ? 3 : 14, height: low ? 8 : 14, alignSelf: 'flex-end', backgroundColor: color, borderRadius: 2 }} />
      <T style={type.label}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: BAR_H + space.s, borderBottomWidth: 1 },
  barHit: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '62%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabels: { flexDirection: 'row', marginTop: -space.s },
  barLabel: { flex: 1, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: space.l },
  key: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  hours: { flexDirection: 'row', gap: space.s },
  hourRow: { flex: 1, flexDirection: 'row' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  dayCol: { width: 40 },
  strip: { flex: 1, height: STRIP_H, borderRadius: radius.row / 3, overflow: 'hidden' },
  tick: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  block: { position: 'absolute', borderRadius: 2 },
});
