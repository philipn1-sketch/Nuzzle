import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { APP_NAME } from '../config';

export type Permission = 'granted' | 'denied' | 'undetermined';

const REMINDER_ID = 'feed-reminder';
const RUNNING_ID = 'feed-running';

/** Reminders ring and show as a banner; the running feed notice sits quietly on the lock screen. */
export async function setUpNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const quiet = n.request.identifier === RUNNING_ID;
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

/** Replaces any pending reminder with this one, or clears it when `at` is null. */
export async function scheduleReminder(at: number | null, body: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  if (at === null || at <= Date.now() || (await permission()) !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: APP_NAME, body, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'reminders' },
  });
}

/** Shows or clears the notice for a feed in progress, which also sits on the lock screen. */
export async function showRunningNotice(body: string | null): Promise<void> {
  if (body === null) {
    await Notifications.dismissNotificationAsync(RUNNING_ID).catch(() => {});
    return;
  }
  if ((await permission()) !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    identifier: RUNNING_ID,
    content: { title: APP_NAME, body, sound: false, sticky: true, autoDismiss: false },
    trigger: Platform.OS === 'android' ? { channelId: 'feeding' } : null,
  });
}

/** The time the pending reminder is set for, used by the end to end test and Settings. */
export async function pendingReminderAt(): Promise<number | null> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const r = all.find((n) => n.identifier === REMINDER_ID);
  if (!r) return null;
  const next = await Notifications.getNextTriggerDateAsync(r.trigger as Notifications.SchedulableNotificationTriggerInput).catch(() => null);
  return next ?? null;
}
