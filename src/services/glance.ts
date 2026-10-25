import { Platform } from 'react-native';

import type { ActivityProps, GlanceProps } from '../core/glance';
import FeedActivity from '../widgets/FeedActivity';
import NuzzleWidget from '../widgets/NuzzleWidget';

let lastWidget = '';

/** Sends the latest numbers to the home screen widget, only when they changed. */
export function updateWidget(props: GlanceProps): void {
  const key = JSON.stringify(props);
  if (key === lastWidget || Platform.OS !== 'ios') return;
  lastWidget = key;
  try {
    NuzzleWidget.updateSnapshot(props);
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
