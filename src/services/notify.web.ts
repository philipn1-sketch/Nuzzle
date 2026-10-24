// The web preview has no phone notifications; these stand ins keep the screens working.
export type Permission = 'granted' | 'denied' | 'undetermined';
export const setUpNotifications = async () => {};
export const permission = async (): Promise<Permission> => 'undetermined';
export const askPermission = async (): Promise<Permission> => 'denied';
export const scheduleReminder = async (_at: number | null, _body: string) => {};
export const showRunningNotice = async (_body: string | null) => {};
export const pendingReminderAt = async (): Promise<number | null> => null;
