import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { APP_NAME } from '../config';

export type Permission = 'granted' | 'denied' | 'undetermined';

// one of each per baby: `feed-reminder:b1`, `feed-running:b1`
const REMINDER = 'feed-reminder';
const RUNNING = 'feed-running';
const CLOCK = 'clock-reminder';
// one per plan feed time still to come: `plan-feed:b1:1730000000000`
const PLAN_FEED = 'plan-feed';

/** Reminders ring and show as a banner; the running feed notice sits quietly on the lock screen. */
export async function setUpNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const quiet = n.request.identifier.startsWith(RUNNING);
      return { shouldShowBanner: !quiet, shouldShowList: true, shouldPlaySound: !quiet, shouldSetBadge: false };
    },
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Feed reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('feeding', {
      name: 'Feed in progress',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      showBadge: false,
    });
  }
}

export async function permission(): Promise<Permission> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function askPermission(): Promise<Permission> {
  const p = await Notifications.requestPermissionsAsync();
  return p.granted ? 'granted' : 'denied';
}

export interface Planned {
  babyId: string;
  at: number;
  body: string;
  /** In her quiet hours: arrives without sound. */
  silent?: boolean;
}

/**
 * Makes the phone's queue match exactly: one reminder per baby that has one planned, and one repeating
 * reminder for each clock time. Anything else of ours that is queued is cancelled.
 */
let queue: Promise<void> = Promise.resolve();

/** One at a time, so an older call can never finish after a newer one and leave a stale reminder. */
export function syncReminders(
  plans: Planned[],
  clock: { hour: number; minute: number; body: string; silent?: boolean }[],
  planFeeds: Planned[] = [],
): Promise<void> {
  queue = queue.catch(() => {}).then(() => applyReminders(plans, clock, planFeeds));
  return queue;
}

async function applyReminders(
  plans: Planned[],
  clock: { hour: number; minute: number; body: string; silent?: boolean }[],
  planFeeds: Planned[],
): Promise<void> {
  const queued = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const granted = (await permission()) === 'granted';
  const now = Date.now();
  const due = granted ? plans.filter((p) => p.at > now) : [];
  const dueFeeds = granted ? planFeeds.filter((p) => p.at > now) : [];
  const daily = granted ? clock : [];
  const keep = new Set<string>([
    ...due.map((p) => `${REMINDER}:${p.babyId}`),
    ...daily.map((c) => `${CLOCK}:${c.hour}:${c.minute}`),
    ...dueFeeds.map((p) => `${PLAN_FEED}:${p.babyId}:${p.at}`),
  ]);
  // stale ones go first, so the queue never runs past the phone's limit while new ones are added
  for (const n of queued) {
    const ours = n.identifier.startsWith(REMINDER) || n.identifier.startsWith(CLOCK) || n.identifier.startsWith(PLAN_FEED);
    if (ours && !keep.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
  }
  const same = (identifier: string, body: string, silent?: boolean) =>
    queued.some((n) => n.identifier === identifier && n.content.body === body && Boolean(n.content.sound) === !silent);
  for (const p of due) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${REMINDER}:${p.babyId}`,
      content: { title: APP_NAME, body: p.body, sound: p.silent ? false : 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: 'reminders' },
    });
  }
  for (const c of daily) {
    const identifier = `${CLOCK}:${c.hour}:${c.minute}`;
    if (same(identifier, c.body, c.silent)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: APP_NAME, body: c.body, sound: c.silent ? false : 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: c.hour, minute: c.minute, channelId: 'reminders' },
    });
  }
  for (const p of dueFeeds) {
    const identifier = `${PLAN_FEED}:${p.babyId}:${p.at}`;
    if (same(identifier, p.body, p.silent)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: APP_NAME, body: p.body, sound: p.silent ? false : 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: 'reminders' },
    });
  }
}

/** Shows or clears the notice for one baby's feed in progress, which also sits on the lock screen. */
export async function showRunningNotice(babyId: string, body: string | null): Promise<void> {
  const identifier = `${RUNNING}:${babyId}`;
  if (body === null) {
    await Notifications.dismissNotificationAsync(identifier).catch(() => {});
    // the notice from before there were babies
    await Notifications.dismissNotificationAsync(RUNNING).catch(() => {});
    return;
  }
  if ((await permission()) !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: APP_NAME, body, sound: false, sticky: true, autoDismiss: false },
    trigger: Platform.OS === 'android' ? { channelId: 'feeding' } : null,
  });
}

/** The time the pending reminder is set for, used by the end to end test and Settings. */
export async function pendingReminderAt(babyId: string): Promise<number | null> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const r = all.find((n) => n.identifier === `${REMINDER}:${babyId}`);
  if (!r) return null;
  const next = await Notifications.getNextTriggerDateAsync(r.trigger as Notifications.SchedulableNotificationTriggerInput).catch(() => null);
  return next ?? null;
}
