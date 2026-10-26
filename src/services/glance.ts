import { Platform } from 'react-native';

import type { ActivityProps } from '../core/glance';
import type { Baby } from '../core/types';
import FeedActivity from '../widgets/FeedActivity';
import NuzzleWidget, { type WidgetProps } from '../widgets/NuzzleWidget';

let lastWidget = '';

/** Sends the latest numbers to the home screen widget, only when they changed. */
export function updateWidget(props: WidgetProps): void {
  const key = JSON.stringify(props);
  if (key === lastWidget || Platform.OS !== 'ios') return;
  lastWidget = key;
  try {
    // one version now, and one at the end of each baby's window, so the countdown turns into
    // "Past your 2h window" right on time even if the app is never opened
    const now = Date.now();
    const ends = [...new Set(props.babies.map((b) => b.dueAt).filter((t) => t > now))].sort((a, b) => a - b);
    NuzzleWidget.updateTimeline([{ date: new Date(now), props }, ...ends.map((t) => ({ date: new Date(t), props }))]);
  } catch {
    // no widget support on this phone: the app works the same without it
  }
}

let lastActivity = '';

/**
 * Keeps one lock screen timer in step with the feed being timed: starts it, updates it on switch or pause,
 * and ends it when there is no feed. Live Activities can be turned off in iPhone Settings; then this does nothing.
 */
let shown = false;

/** Resolves true when the timer is on the lock screen. */
export async function syncActivity(props: ActivityProps | null): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const key = JSON.stringify(props);
  if (key === lastActivity) return shown;
  lastActivity = key;
  try {
    const running = FeedActivity.getInstances();
    if (!props) {
      await Promise.all(running.map((a) => a.end('immediate')));
      shown = false;
      return false;
    }
    const [first, ...extra] = running;
    await Promise.all(extra.map((a) => a.end('immediate')));
    if (first) await first.update(props);
    else FeedActivity.start(props, 'nuzzle://');
    shown = true;
  } catch {
    lastActivity = '';
    shown = false;
  }
  return shown;
}

/** Forget what was last sent, so the next update goes through: used when the app comes back to the front. */
export function resend(): void {
  lastWidget = '';
  lastActivity = '';
}

let lastBabies = '';

/** The choice of baby offered when she sets up a widget: the baby on screen, or a named baby. */
export function offerBabies(babies: Baby[]): void {
  const options = [{ name: 'Baby on screen', value: 'active' }, ...babies.map((b, i) => ({ name: b.name.trim() || `Baby ${i + 1}`, value: b.id }))];
  const key = JSON.stringify(options);
  if (key === lastBabies || Platform.OS !== 'ios') return;
  lastBabies = key;
  try {
    NuzzleWidget.setConfigurationParameterEnum('baby', options);
  } catch {
    lastBabies = '';
  }
}
