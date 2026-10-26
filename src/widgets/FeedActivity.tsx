import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint, font, foregroundStyle, frame, lineLimit, monospacedDigit, padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import type { ActivityProps } from '../core/glance';

/**
 * The feed timer on the lock screen and in the Dynamic Island, and between feeds the countdown to the
 * next one. iOS keeps the timers counting by itself, so they stay right with the app closed.
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

  if (props.mode === 'waiting') {
    // Between feeds: count down to the next feed. iOS marks the activity stale when that time comes,
    // and it then counts up from the start of the last feed, so it is never left showing 0:00.
    const lastStart = props.lastStart ?? 0;
    const dueAt = props.dueAt ?? lastStart;
    const due = env.isStale === true || dueAt <= lastStart;
    const nextColor = props.letter === 'L' ? c.left : props.letter === 'R' ? c.right : c.muted;
    const big = (size: number, color: string) =>
      due ? (
        <Text timerInterval={{ lower: new Date(lastStart), upper: new Date(lastStart + day) }} countsDown={false} modifiers={[rounded(size, 'bold'), monospacedDigit(), foregroundStyle(color), lineLimit(1)]} />
      ) : (
        <Text timerInterval={{ lower: new Date(lastStart), upper: new Date(dueAt) }} countsDown modifiers={[rounded(size, 'bold'), monospacedDigit(), foregroundStyle(color), lineLimit(1)]} />
      );
    const caption = due ? 'since last feed' : 'until next feed';
    const nextLetter = <Text modifiers={[rounded(17, 'bold'), foregroundStyle(nextColor)]}>{props.letter || 'N'}</Text>;
    return {
      banner: (
        <HStack spacing={12} modifiers={[padding({ all: 16 }), activityBackgroundTint(c.bg)]}>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[rounded(15, 'bold'), foregroundStyle(c.ink), lineLimit(1)]}>{props.name}</Text>
            <Text modifiers={[rounded(15, 'semibold'), foregroundStyle(due ? c.ink : c.muted), lineLimit(1)]}>{due ? 'Feed due' : props.startedAt}</Text>
            <Text modifiers={[rounded(13, 'semibold'), foregroundStyle(nextColor), lineLimit(1)]}>{props.status}</Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={0}>
            {big(36, c.ink)}
            <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted), lineLimit(1)]}>{caption}</Text>
          </VStack>
        </HStack>
      ),
      compactLeading: nextLetter,
      compactTrailing: <VStack modifiers={[frame({ width: 56 })]}>{big(15, due ? c.ink : nextColor)}</VStack>,
      minimal: nextLetter,
      expandedLeading: (
        <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 8 })]}>
          <Text modifiers={[rounded(15, 'bold'), foregroundStyle(nextColor)]}>{props.status}</Text>
          <Text modifiers={[rounded(13, 'medium'), foregroundStyle(c.muted)]}>{due ? 'Feed due' : props.startedAt}</Text>
        </VStack>
      ),
      expandedTrailing: (
        <VStack alignment="trailing" spacing={0} modifiers={[padding({ trailing: 8 })]}>
          {big(28, c.ink)}
          <Text modifiers={[rounded(11, 'medium'), foregroundStyle(c.muted)]}>{caption}</Text>
        </VStack>
      ),
    };
  }

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
