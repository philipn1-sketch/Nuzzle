import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * A progress ring drawn with plain views (no drawing library): each half of the circle shows a rotated
 * half arc, clipped to that half. `progress` runs from 0 to 1, starting at the top and going clockwise.
 */
export function Ring({ size, width, progress, color, track, children }: {
  size: number;
  width: number;
  progress: number;
  color: string;
  track: string;
  children?: ReactNode;
}) {
  const deg = Math.max(0, Math.min(1, progress)) * 360;
  const circle = { width: size, height: size, borderRadius: size / 2, borderWidth: width } as const;
  // a circle with only its top and right borders drawn is a half arc from -45 to 135 degrees
  const arc = (rotate: number) => [
    circle,
    { position: 'absolute' as const, borderColor: 'transparent', borderTopColor: color, borderRightColor: color, transform: [{ rotate: `${rotate}deg` }] },
  ];
  return (
    <View style={{ width: size, height: size }}>
      <View style={[circle, { position: 'absolute', borderColor: track }]} />
      {deg > 0 && (
        <View style={[styles.half, { left: size / 2, width: size / 2, height: size }]}>
          <View style={[arc(Math.min(deg, 180) - 135), { left: -size / 2 }]} />
        </View>
      )}
      {deg > 180 && (
        <View style={[styles.half, { left: 0, width: size / 2, height: size }]}>
          <View style={arc(deg - 135)} />
        </View>
      )}
      <View style={[StyleSheet.absoluteFill, styles.centre, { padding: width + 12 }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  half: { position: 'absolute', top: 0, overflow: 'hidden' },
  centre: { alignItems: 'center', justifyContent: 'center' },
});
