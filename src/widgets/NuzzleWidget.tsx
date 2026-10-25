import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background, containerBackground, font, frame, foregroundStyle, lineLimit, minimumScaleFactor, monospacedDigit, padding, shapes, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { GlanceProps } from '../core/glance';

/**
 * The home screen and lock screen widget. It runs on its own inside iOS, so everything it needs comes in
 * through its props, and the live times are drawn by iOS from timestamps: they keep counting with the app closed.
 */
const NuzzleWidget = (props: GlanceProps, env: WidgetEnvironment) => {
  'widget';
  // the app's palette; declared in here because a widget can't see anything outside this function
  const dark = env.colorScheme !== 'light';
  const c = dark
    ? { bg: '#1A1221', ink: '#F4E9EF', muted: '#BBA9C2', left: '#EBA3B9', right: '#F4BC9C', chip: '#2A1E33' }
    : { bg: '#F6EEF3', ink: '#2D1E33', muted: '#6B5872', left: '#A8456A', right: '#B0503F', chip: '#FFF9FB' };
  const sideColor = props.next === 'Left' ? c.left : c.right;
  const rounded = (size: number, weight: 'medium' | 'semibold' | 'bold' = 'semibold') => font({ size, weight, design: 'rounded' });
  const family = env.widgetFamily ?? 'systemSmall';
  const feeding = props.feeding !== '';
  const hasLast = props.lastStart > 0;
  const day = 86_400_000;

  const timerText = (size: number) => (
    <Text
      timerInterval={{ lower: new Date(props.timerFrom), upper: new Date(props.timerFrom + day) }}
      countsDown={false}
      pauseTime={props.pausedAt ? new Date(props.pausedAt) : undefined}
      modifiers={[rounded(size, 'bold'), monospacedDigit(), foregroundStyle(c.ink), minimumScaleFactor(0.6), lineLimit(1)]}
    />
  );
  const sinceText = (size: number) => (
    <Text
      date={new Date(props.lastStart)}
      dateStyle="relative"
      modifiers={[rounded(size, 'bold'), foregroundStyle(c.ink), minimumScaleFactor(0.5), lineLimit(1)]}
    />
  );

  // lock screen: iOS draws these in one tint, so no colours
  if (family === 'accessoryInline') {
    return <Text>{feeding ? props.feeding : props.next ? `Next: ${props.next}` : 'Nuzzle'}</Text>;
  }
  if (family === 'accessoryCircular') {
    return (
      <VStack spacing={0}>
        <Text modifiers={[rounded(11, 'medium')]}>{feeding ? 'Feeding' : 'Next'}</Text>
        <Text modifiers={[rounded(22, 'bold')]}>{props.letter || 'L R'}</Text>
      </VStack>
    );
  }
  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[rounded(13, 'semibold')]}>{feeding ? props.feeding : `${props.name}'s last feed`}</Text>
        {feeding ? timerText(20) : hasLast ? sinceText(20) : <Text>No feeds yet</Text>}
        {!feeding && props.next !== '' && <Text modifiers={[rounded(13, 'medium')]}>Next: {props.next}</Text>}
      </VStack>
    );
  }

  const chip = (label: string, color: string) => (
    <Text modifiers={[rounded(13, 'bold'), foregroundStyle(color), padding({ horizontal: 8, vertical: 3 }), background(c.chip, shapes.capsule())]}>
      {label}
    </Text>
  );

  const main = feeding ? (
    <VStack alignment="leading" spacing={4}>
      <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>{props.feeding}</Text>
      {timerText(family === 'systemSmall' ? 34 : 40)}
    </VStack>
  ) : hasLast ? (
    <VStack alignment="leading" spacing={4}>
      <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>Since the last feed</Text>
      {sinceText(family === 'systemSmall' ? 22 : 26)}
      <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>{props.lastLine}</Text>
    </VStack>
  ) : (
    <Text modifiers={[rounded(15, 'medium'), foregroundStyle(c.muted)]}>No feeds yet. Tap to start.</Text>
  );

  return (
    <VStack alignment="leading" spacing={8} modifiers={[frame({ maxWidth: 2000, maxHeight: 2000, alignment: 'topLeading' }), containerBackground(c.bg, 'widget'), widgetURL('nuzzle://')]}>
      <Text modifiers={[rounded(15, 'bold'), foregroundStyle(c.ink), lineLimit(1)]}>{props.name}</Text>
      {main}
      <Spacer />
      {!feeding && props.next !== '' && (
        <HStack spacing={6}>
          {chip(`Next: ${props.next}`, sideColor)}
        </HStack>
      )}
    </VStack>
  );
};

export default createWidget<GlanceProps>('NuzzleWidget', NuzzleWidget, {
  name: 'Baby', lastStart: 0, lastLine: '', next: '', letter: '', feeding: '', timerFrom: 0, pausedAt: 0,
});
