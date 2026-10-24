import { Pressable, StyleSheet, View } from 'react-native';

import { clock, sideName } from '../core/format';
import type { Side } from '../core/types';
import { usePalette } from '../state/theme';
import { radius, space, type } from '../theme';
import { T } from './ui';

export type SideState = 'rest' | 'suggested' | 'running' | 'switch' | 'paused';
// paused: the side she paused on; the other side shows 'switch'

const STATUS: Record<SideState, string> = {
  rest: ' ',
  suggested: 'Start here',
  running: 'Tap to pause',
  switch: 'Tap to switch',
  paused: 'Carry on here',
};

/** One of the two big start buttons: a tall rounded block with a large letter. */
export function SideButton({ side, state, ms, onPress }: { side: Side; state: SideState; ms: number | null; onPress: () => void }) {
  const p = usePalette();
  const running = state === 'running';
  const fg = running ? 'onAccent' : 'ink';
  const status = STATUS[state];
  return (
    <Pressable
      testID={`side-${side}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${sideName(side)} side${ms !== null ? `, ${clock(ms)}` : ''}`}
      accessibilityHint={status.trim() || 'Starts a feed on this side'}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: running ? p.accent : p.surface,
          borderColor: state === 'suggested' ? p.accent : 'transparent',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <T tone={fg} style={styles.letter} allowFontScaling={false}>{side}</T>
      <T tone={fg} style={type.title} maxFontSizeMultiplier={1.6}>{sideName(side)}</T>
      <View style={styles.meta}>
        {ms !== null && <T tone={fg} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.6} style={[type.title, { fontVariant: ['tabular-nums'] }]}>{clock(ms)}</T>}
        <T tone={running ? 'onAccent' : state === 'suggested' ? 'accent' : 'muted'} maxFontSizeMultiplier={1.6}
          style={[state === 'suggested' ? type.title : type.label, { textAlign: 'center' }]}>{status}</T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 172,
    borderRadius: radius.big,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.l,
    paddingHorizontal: space.s,
    gap: 2,
  },
  letter: { fontSize: 64, lineHeight: 70, fontWeight: '700' },
  meta: { alignItems: 'center', minHeight: 24, marginTop: space.xs },
});
