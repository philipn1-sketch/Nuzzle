import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { usePalette } from '../state/theme';
import { radius, space, TAP, type } from '../theme';
import { T } from './ui';
import { t } from '../i18n';

/**
 * Minus, value, plus. The buttons repeat when held (speeding up after a second), and when `onType`
 * is given the number itself can be tapped to type. Works as an adjustable control for VoiceOver and TalkBack.
 */
export function Stepper({
  label, display, onStep, onType, onPressValue, numeric, testID,
}: {
  label: string;
  display: string;
  onStep: (dir: 1 | -1, fast: boolean) => void;
  onType?: (n: number) => void;
  /** Tapping the value itself, for example to open a calendar. */
  onPressValue?: () => void;
  numeric?: number;
  testID?: string;
}) {
  const p = usePalette();
  const [typing, setTyping] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  // true only while a finger is on + or −; the repeat checks it every step
  const held = useRef(false);
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  const stop = () => {
    held.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  // Holding repeats, speeding up after a second. It stops the moment the finger lifts or the touch is
  // taken away (the keyboard closing or the list moving can do that without a normal lift on iPhone),
  // and after 6 seconds at most, so it can never run on by itself.
  const hold = (dir: 1 | -1) => {
    stop();
    held.current = true;
    started.current = Date.now();
    const loop = () => {
      if (!held.current || Date.now() - started.current > 6000) return stop();
      stepRef.current(dir, Date.now() - started.current > 1200);
      timer.current = setTimeout(loop, 110);
    };
    timer.current = setTimeout(loop, 400);
  };

  const button = (dir: 1 | -1) => (
    <Pressable
      testID={testID ? `${testID}-${dir > 0 ? 'more' : 'less'}` : undefined}
      accessibilityRole="button"
      accessibilityLabel={t(dir > 0 ? 'More {what}' : 'Less {what}', { what: label.toLowerCase() })}
      onPress={() => stepRef.current(dir, false)}
      onLongPress={() => {}}
      delayLongPress={350}
      onPressIn={() => {
        // a typed number gives way to the buttons, so what shows is what is saved
        setTyping(null);
        hold(dir);
      }}
      onPressOut={stop}
      onTouchEnd={stop}
      onTouchCancel={stop}
      onResponderTerminate={stop}
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
            keyboardType="number-pad"
            placeholder={display}
            placeholderTextColor={p.muted}
            value={typing}
            onChangeText={(t) => {
              const digits = t.replace(/[^0-9]/g, '').slice(0, 3);
              setTyping(digits);
              // saved as she types: the iPhone number pad has no return key, and Save doesn't blur the field
              onType(digits === '' ? 0 : Number(digits));
            }}
            onBlur={() => setTyping(null)}
            onSubmitEditing={() => setTyping(null)}
            style={[type.title, styles.input, { color: p.ink, borderColor: p.accent }]}
            accessibilityLabel={t('Type {what}', { what: label.toLowerCase() })}
          />
        ) : (
          // opens empty (the old value shows as a hint), so what she types replaces it; iPhone won't select the old number
          <Pressable
            disabled={!onType && !onPressValue}
            onPress={() => (onPressValue ? onPressValue() : setTyping(''))}
            accessibilityHint={onPressValue ? t('Opens a calendar') : undefined}
            testID={testID ? `${testID}-value` : undefined}
          >
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
