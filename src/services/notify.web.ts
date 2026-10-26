// The web preview has no phone notifications; these stand ins keep the screens working.
export type Permission = 'granted' | 'denied' | 'undetermined';
export interface Planned {
  babyId: string;
  at: number;
  body: string;
  /** In her quiet hours: arrives without sound. */
  silent?: boolean;
}
export const setUpNotifications = async () => {};
export const permission = async (): Promise<Permission> => 'undetermined';
export const askPermission = async (): Promise<Permission> => 'denied';
export const syncReminders = async (_plans: Planned[], _clock: { hour: number; minute: number; body: string; silent?: boolean }[], _planFeeds: Planned[] = []) => {};
export const showRunningNotice = async (_babyId: string, _body: string | null) => {};
export const pendingReminderAt = async (_babyId: string): Promise<number | null> => null;
