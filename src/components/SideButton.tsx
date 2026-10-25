import { Pressable, StyleSheet, View } from 'react-native';

import { clock, sideName, spanWords } from '../core/format';
import type { Side } from '../core/types';
import { usePalette } from '../state/theme';
import { radius, sideColor, space, type, wash } from '../theme';
import { T } from './ui';

export type SideState = 'rest' | 'suggested' | 'running' | 'switch' | 'paused';
// paused: the side she paused on; the other side shows 'switch'

const STATUS: Record<SideState, string> = {
  rest: 'Start',
  suggested: 'Start here',
  running: 'Tap to pause',
  switch: 'Tap to switch',
  paused: 'Carry on here',
};

/** One of the two big start buttons: a soft rounded pill with the side's name. */
export function SideButton({ side, state, ms, onPress }: { side: Side; state: SideState; ms: number | null; onPress: () => void }) {
  const p = usePalette();
  const running = state === 'running';
  const marked = state === 'suggested' || state === 'paused';
  const fg = 'ink';
  const c = sideColor(p, side);
  return (
    <Pressable
      testID={`side-${side}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${sideName(side)} side${ms !== null ? `, ${spanWords(ms)}` : ''}`}
      accessibilityHint={state === 'rest' ? 'Starts a feed on this side' : STATUS[state]}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: running ? wash(c, '40') : marked ? wash(c, '1F') : p.surface,
          borderColor: running || marked ? c : 'transparent',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <T tone={fg} style={type.side} maxFontSizeMultiplier={1.5}>{sideName(side)}</T>
      {ms !== null && (
        <T tone={fg} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.5} style={[type.title, { fontVariant: ['tabular-nums'] }]}>
          {clock(ms)}
        </T>
      )}
      <View style={[styles.chip, (marked || running) && { backgroundColor: c }]}>
        <T
          tone={running || marked ? 'onAccent' : 'muted'}
          maxFontSizeMultiplier={1.5}
          style={[type.label, { textAlign: 'center', fontWeight: marked || running ? '700' : '500' }]}
        >
          {STATUS[state]}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 150,
    borderRadius: radius.big,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.l,
    paddingHorizontal: space.s,
    gap: space.xs,
  },
  chip: { borderRadius: 999, paddingHorizontal: space.m, paddingVertical: 5, marginTop: space.xs },
});
