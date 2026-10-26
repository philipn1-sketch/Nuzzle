import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background, containerBackground, font, frame, foregroundStyle, lineLimit, minimumScaleFactor, monospacedDigit, padding, shapes, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { GlanceProps } from '../core/glance';

/** Every baby's numbers, the baby on screen first; each widget shows the baby picked when it was set up. */
export interface WidgetProps {
  babies: (GlanceProps & { babyId: string })[];
  /** Without Nuzzle Plus the widget shows a short note instead of the numbers. */
  locked?: boolean;
}
type WidgetConfig = { baby: string };

/**
 * The home screen and lock screen widget. It runs on its own inside iOS, so everything it needs comes in
 * through its props, and the live times are drawn by iOS from timestamps: they keep counting with the app closed.
 */
const NuzzleWidget = (all: WidgetProps, env: WidgetEnvironment<WidgetConfig>) => {
  'widget';
  const list = all.babies ?? [];
  const chosen = env.configuration?.baby;
  const props = list.find((b) => b.babyId === chosen) ?? list[0] ?? {
    babyId: '', name: 'Baby', lastStart: 0, lastLine: '', next: '', letter: '', feeding: '', timerFrom: 0, pausedAt: 0, dueAt: 0, windowText: '',
  };
  // the app's palette; declared in here because a widget can't see anything outside this function
  const dark = env.colorScheme !== 'light';
  const c = dark
    ? { bg: '#1A1221', ink: '#F4E9EF', muted: '#BBA9C2', left: '#EBA3B9', right: '#F4BC9C', chip: '#2A1E33' }
    : { bg: '#F6EEF3', ink: '#2D1E33', muted: '#6B5872', left: '#A8456A', right: '#B0503F', chip: '#FFF9FB' };
  const sideColor = props.next === 'Left' ? c.left : c.right;
  const rounded = (size: number, weight: 'medium' | 'semibold' | 'bold' = 'semibold') => font({ size, weight, design: 'rounded' });
  const family = env.widgetFamily ?? 'systemSmall';
  // iOS 17 and later shows an error instead of any widget, lock screen ones included, that sets no
  // container background. On the lock screen iOS draws its own, so this colour only shows elsewhere.
  const lock = (url = 'nuzzle://') => [containerBackground(c.bg, 'widget'), widgetURL(url)];
  if (all.locked) {
    if (family === 'accessoryInline' || family === 'accessoryCircular' || family === 'accessoryRectangular') {
      return <Text modifiers={[rounded(13, 'semibold'), ...lock('nuzzle://plus')]}>Nuzzle Plus</Text>;
    }
    return (
      <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: 2000, maxHeight: 2000, alignment: 'topLeading' }), containerBackground(c.bg, 'widget'), widgetURL('nuzzle://plus')]}>
        <Text modifiers={[rounded(17, 'bold'), foregroundStyle(c.ink)]}>Nuzzle</Text>
        <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted)]}>The widget is part of Nuzzle Plus. Tap to open the app.</Text>
        <Spacer />
      </VStack>
    );
  }
  const feeding = props.feeding !== '';
  const hasLast = props.lastStart > 0;
  const day = 86_400_000;
  // the moment this version of the widget is shown; the app also schedules one for when her window ends
  const at = env.date ? new Date(env.date).getTime() : Date.now();
  const waiting = hasLast && props.dueAt > at;

  const timerText = (size: number) => (
    <Text
      timerInterval={{ lower: new Date(props.timerFrom), upper: new Date(props.timerFrom + day) }}
      countsDown={false}
      pauseTime={props.pausedAt ? new Date(props.pausedAt) : undefined}
      modifiers={[rounded(size, 'bold'), monospacedDigit(), foregroundStyle(c.ink), minimumScaleFactor(0.6), lineLimit(1)]}
    />
  );
  // counts down to the end of her window, then up from the last feed's start
  const countdown = (size: number) => (
    <Text
      timerInterval={{ lower: new Date(props.lastStart), upper: new Date(props.dueAt) }}
      countsDown
      modifiers={[rounded(size, 'bold'), monospacedDigit(), foregroundStyle(c.ink), minimumScaleFactor(0.6), lineLimit(1)]}
    />
  );
  const sinceText = (size: number) => (
    <Text
      timerInterval={{ lower: new Date(props.lastStart), upper: new Date(props.lastStart + day) }}
      countsDown={false}
      modifiers={[rounded(size, 'bold'), monospacedDigit(), foregroundStyle(c.ink), minimumScaleFactor(0.6), lineLimit(1)]}
    />
  );

  // lock screen: iOS draws these in one tint, so no colours
  if (family === 'accessoryInline') {
    return <Text modifiers={lock()}>{feeding ? props.feeding : props.next ? `Next: ${props.next}` : 'Nuzzle'}</Text>;
  }
  if (family === 'accessoryCircular') {
    return (
      <VStack spacing={0} modifiers={lock()}>
        <Text modifiers={[rounded(20, 'bold')]}>{props.letter || 'L R'}</Text>
        {!feeding && waiting ? (
          <Text timerInterval={{ lower: new Date(props.lastStart), upper: new Date(props.dueAt) }} countsDown modifiers={[rounded(11, 'semibold'), monospacedDigit(), minimumScaleFactor(0.6), lineLimit(1)]} />
        ) : (
          <Text modifiers={[rounded(11, 'medium')]}>{feeding ? 'Feeding' : 'Next'}</Text>
        )}
      </VStack>
    );
  }
  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[frame({ maxWidth: 2000, alignment: 'leading' }), ...lock()]}>
        <Text modifiers={[rounded(13, 'semibold')]}>
          {feeding ? props.feeding : waiting ? 'Next feed in' : hasLast ? 'Since last feed started' : props.name}
        </Text>
        {feeding ? timerText(20) : waiting ? countdown(20) : hasLast ? sinceText(20) : <Text>No feeds yet</Text>}
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
  ) : waiting ? (
    <VStack alignment="leading" spacing={4}>
      <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>Next feed in</Text>
      {countdown(family === 'systemSmall' ? 34 : 40)}
      <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>{props.lastLine}</Text>
    </VStack>
  ) : hasLast ? (
    <VStack alignment="leading" spacing={4}>
      <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>Since last feed started</Text>
      {sinceText(family === 'systemSmall' ? 34 : 40)}
      <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>
        {props.windowText ? `Past your ${props.windowText} window` : props.lastLine}
      </Text>
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

export default createWidget<WidgetProps, WidgetConfig>('NuzzleWidget', NuzzleWidget, { babies: [] });
