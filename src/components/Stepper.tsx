import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { usePalette } from '../state/theme';
import { radius, space, TAP, type } from '../theme';
import { T } from './ui';

/**
 * Minus, value, plus. The buttons repeat when held (speeding up after a second), and when `onType`
 * is given the number itself can be tapped to type. Works as an adjustable control for VoiceOver and TalkBack.
 */
export function Stepper({
  label, display, onStep, onType, numeric, testID,
}: {
  label: string;
  display: string;
  onStep: (dir: 1 | -1, fast: boolean) => void;
  onType?: (n: number) => void;
  numeric?: number;
  testID?: string;
}) {
  const p = usePalette();
  const [typing, setTyping] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const hold = (dir: 1 | -1) => {
    started.current = Date.now();
    const loop = () => {
      stepRef.current(dir, Date.now() - started.current > 1200);
      timer.current = setTimeout(loop, 110);
    };
    timer.current = setTimeout(loop, 400);
  };

  const button = (dir: 1 | -1) => (
    <Pressable
      testID={testID ? `${testID}-${dir > 0 ? 'more' : 'less'}` : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'More' : 'Less'} ${label.toLowerCase()}`}
      onPress={() => stepRef.current(dir, false)}
      onLongPress={() => {}}
      delayLongPress={350}
      onPressIn={() => hold(dir)}
      onPressOut={stop}
      style={({ pressed }) => [styles.btn, { backgroundColor: p.surface, opacity: pressed ? 0.7 : 1 }]}
    >
      <T style={styles.sign}>{dir > 0 ? '+' : '−'}</T>
    </Pressable>
  );

  return (
    <View
      style={styles.row}
      accessible={false}
    >
      {button(-1)}
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: display }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => stepRef.current(e.nativeEvent.actionName === 'increment' ? 1 : -1, false)}
        style={styles.valueBox}
      >
        {onType && typing !== null ? (
          <TextInput
            autoFocus
            selectTextOnFocus
            keyboardType="number-pad"
            value={typing}
            onChangeText={(t) => setTyping(t.replace(/[^0-9]/g, '').slice(0, 3))}
            onBlur={() => {
              if (typing !== '') onType(Number(typing));
              setTyping(null);
            }}
            onSubmitEditing={() => {
              if (typing !== '') onType(Number(typing));
              setTyping(null);
            }}
            style={[type.title, styles.input, { color: p.ink, borderColor: p.accent }]}
            accessibilityLabel={`Type ${label.toLowerCase()}`}
          />
        ) : (
          <Pressable disabled={!onType} onPress={() => setTyping(String(numeric ?? ''))} testID={testID ? `${testID}-value` : undefined}>
            <T style={[type.title, { textAlign: 'center', fontVariant: ['tabular-nums'] }]}>{display}</T>
          </Pressable>
        )}
      </View>
      {button(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  btn: { width: TAP, height: TAP, borderRadius: radius.row, alignItems: 'center', justifyContent: 'center' },
  sign: { fontSize: 28, lineHeight: 32, fontWeight: '600' },
  valueBox: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: TAP },
  input: { minWidth: 72, textAlign: 'center', borderBottomWidth: 2, paddingVertical: 4 },
});
