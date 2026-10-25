import { useEffect, useRef, type ReactNode } from 'react';
import {
  AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SNACKBAR_MS } from '../config';
import { useApp } from '../state/AppState';
import { usePalette } from '../state/theme';
import { line, radius, space, TAP, type, wash } from '../theme';

type Tone = 'ink' | 'muted' | 'accent' | 'peach' | 'onAccent';

/** Text in the theme. Always follows the phone's text size setting. */
export function T({ tone = 'ink', style, ...rest }: TextProps & { tone?: Tone; style?: StyleProp<TextStyle> }) {
  const p = usePalette();
  return <Text {...rest} style={[type.body, { color: p[tone] }, style]} />;
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space.l) }, style]}>
      {children}
    </View>
  );
}

/** Full width main action (Done, Save). Neutral, so it is never mistaken for a side's colour. */
export function PrimaryButton({ label, onPress, hint, testID }: { label: string; onPress: () => void; hint?: string; testID?: string }) {
  const p = usePalette();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={hint}
      style={({ pressed }) => [styles.primary, { backgroundColor: wash(p.ink, pressed ? '2E' : '1A'), borderColor: wash(p.ink, '59') }]}
    >
      <T style={type.title} maxFontSizeMultiplier={1.6}>{label}</T>
    </Pressable>
  );
}

/** A filled button for choices inside a card. */
export function SecondaryButton({ label, onPress, testID, strong }: { label: string; onPress: () => void; testID?: string; strong?: boolean }) {
  const p = usePalette();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.secondary, { backgroundColor: p.bg, borderColor: strong ? p.accent : 'transparent', opacity: pressed ? 0.75 : 1 }]}>
      <T tone={strong ? 'accent' : 'ink'} style={{ textAlign: 'center' }}>{label}</T>
    </Pressable>
  );
}

/** A text button that is still a full 56 tall to hit. */
export function QuietButton({ label, onPress, tone = 'muted', testID, style }: { label: string; onPress: () => void; tone?: Tone; testID?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" hitSlop={8}
      style={({ pressed }) => [styles.quiet, { opacity: pressed ? 0.6 : 1 }, style]}>
      <T tone={tone}>{label}</T>
    </Pressable>
  );
}

/** Rounded pill in the surface colour, used in top bars. */
export function PillButton({ label, onPress, testID, a11yLabel }: { label: string; onPress: () => void; testID?: string; a11yLabel?: string }) {
  const p = usePalette();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={a11yLabel ?? label}
      style={({ pressed }) => [styles.pill, { backgroundColor: p.surface, borderColor: line(p), opacity: pressed ? 0.75 : 1 }]}>
      <T maxFontSizeMultiplier={1.5} numberOfLines={1} style={type.label}>{label}</T>
    </Pressable>
  );
}

export function TopBar({ title, left, right }: { title?: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topSide}>{left}</View>
      {title ? <T style={[type.title, styles.topTitle]} accessibilityRole="header" numberOfLines={1}>{title}</T> : <View style={{ flex: 1 }} />}
      <View style={[styles.topSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <View style={[{ backgroundColor: p.surface, borderRadius: radius.card, padding: space.xl }, style]}>{children}</View>;
}

/** Two choice toggle, such as Left and Right or Night and Day. */
export function Choice<V extends string>({ options, value, onChange, label }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string }) {
  const p = usePalette();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.choice, { borderColor: line(p) }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={[styles.choiceItem, on && { backgroundColor: p.accent }]}>
            <T tone={on ? 'onAccent' : 'ink'}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The snackbar. Each screen places this where it should appear: above its main buttons, never over them.
 * It slides up, stays six seconds, and fades.
 */
export function SnackbarSlot() {
  const p = usePalette();
  const { snack, hideSnack } = useApp();
  const y = useRef(new Animated.Value(0)).current;
  const shownAt = useRef(0);

  useEffect(() => {
    if (!snack) return;
    shownAt.current = Date.now();
    let reduce = false;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => (reduce = r)).catch(() => {});
    y.setValue(reduce ? 1 : 0);
    Animated.spring(y, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    AccessibilityInfo.announceForAccessibility(snack.message);
    const t = setTimeout(hideSnack, SNACKBAR_MS);
    return () => clearTimeout(t);
  }, [snack, hideSnack, y]);

  if (!snack) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[styles.snack, { backgroundColor: p.surface, borderColor: p.accent, opacity: y, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
    >
      <Text maxFontSizeMultiplier={1.6} style={[type.body, { color: p.ink, flex: 1, minWidth: 140 }]}>{snack.message}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {snack.actions.map((a) => (
          <Pressable key={a.label} testID={`snack-${a.label.toLowerCase()}`} accessibilityRole="button" hitSlop={6}
            onPress={() => {
              // a double tap on Done would otherwise land here and undo the save unseen
              if (Date.now() - shownAt.current < 600) return;
              hideSnack();
              a.onPress();
            }} style={styles.snackAction}>
            <Text maxFontSizeMultiplier={1.6} style={[type.body, { color: p.accent, textDecorationLine: 'underline' }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  primary: { minHeight: 64, borderWidth: 1.5, borderRadius: radius.big, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingVertical: space.m },
  secondary: { flexGrow: 1, flexBasis: 140, minHeight: TAP, borderRadius: radius.row, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.m, paddingVertical: space.s },
  quiet: { minHeight: TAP, minWidth: TAP, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.m },
  pill: { minHeight: TAP, minWidth: TAP, borderRadius: TAP / 2, borderWidth: 1, paddingHorizontal: space.l + 2, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.side, paddingVertical: space.s, gap: space.m, minHeight: TAP + space.l },
  topSide: { minWidth: TAP },
  topTitle: { flex: 1, textAlign: 'center' },
  choice: { flexDirection: 'row', borderWidth: 1.5, borderRadius: radius.row, overflow: 'hidden' },
  choiceItem: { flex: 1, minHeight: TAP, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.m },
  snack: { borderRadius: radius.row, borderWidth: 1.5, paddingHorizontal: space.l, paddingVertical: space.s, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s },
  snackAction: { minHeight: TAP, minWidth: TAP, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s },
});
