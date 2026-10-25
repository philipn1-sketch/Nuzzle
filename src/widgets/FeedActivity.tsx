import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint, font, foregroundStyle, frame, lineLimit, monospacedDigit, padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import type { ActivityProps } from '../core/glance';

/**
 * The feed timer on the lock screen and in the Dynamic Island. iOS keeps the timer counting by itself,
 * so it stays right with the app closed. The app updates it on switch and pause, and ends it on Done.
 */
const FeedActivity = (props: ActivityProps, env: LiveActivityEnvironment) => {
  'widget';
  const dark = env.colorScheme !== 'light';
  const c = dark
    ? { bg: '#1A1221', ink: '#F4E9EF', muted: '#BBA9C2', left: '#EBA3B9', right: '#F4BC9C' }
    : { bg: '#F6EEF3', ink: '#2D1E33', muted: '#6B5872', left: '#A8456A', right: '#B0503F' };
  const side = props.pausedAt ? c.muted : props.letter === 'L' ? c.left : c.right;
  const rounded = (size: number, weight: 'medium' | 'semibold' | 'bold' = 'semibold') => font({ size, weight, design: 'rounded' });
  const day = 86_400_000;
  const timer = (size: number, color: string) => (
    <Text
      timerInterval={{ lower: new Date(props.timerFrom), upper: new Date(props.timerFrom + day) }}
      countsDown={false}
      pauseTime={props.pausedAt ? new Date(props.pausedAt) : undefined}
      modifiers={[rounded(size, 'bold'), monospacedDigit(), foregroundStyle(color), lineLimit(1)]}
    />
  );
  const letter = <Text modifiers={[rounded(17, 'bold'), foregroundStyle(side)]}>{props.letter}</Text>;

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 16 }), activityBackgroundTint(c.bg)]}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[rounded(15, 'bold'), foregroundStyle(c.ink), lineLimit(1)]}>{props.name}</Text>
          <Text modifiers={[rounded(15, 'semibold'), foregroundStyle(side), lineLimit(1)]}>{props.status}</Text>
          <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>{props.startedAt}</Text>
        </VStack>
        <Spacer />
        {timer(40, c.ink)}
      </HStack>
    ),
    compactLeading: letter,
    compactTrailing: <VStack modifiers={[frame({ width: 56 })]}>{timer(15, side)}</VStack>,
    minimal: letter,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 8 })]}>
        <Text modifiers={[rounded(15, 'bold'), foregroundStyle(side)]}>{props.status}</Text>
        <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted)]}>{props.startedAt}</Text>
      </VStack>
    ),
    expandedTrailing: <VStack modifiers={[padding({ trailing: 8 })]}>{timer(28, c.ink)}</VStack>,
  };
};

export default createLiveActivity<ActivityProps>('FeedActivity', FeedActivity);
