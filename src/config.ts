/** The app's name, in one place. Also update `name` in app.json, which is what the phone shows under the icon. */
export const APP_NAME = 'Nuzzle';

/** Nuzzle's own web pages, linked from the paywall, Settings and the App Store listing. */
export const SITE_URL = 'https://nuzzle-app.vercel.app';
export const PRIVACY_URL = `${SITE_URL}/privacy`;
export const SUPPORT_URL = `${SITE_URL}/support`;
/** Apple's standard licence agreement, which covers Nuzzle's subscription terms. */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Feeds shorter than this are treated as a mistap and not saved. */
export const MIN_FEED_MS = 5_000;

/** How long the snackbar with Undo stays up. */
export const SNACKBAR_MS = 6_000;

export const REMINDER_DEFAULT_MIN = 120;
export const REMINDER_MIN_MIN = 60;
export const REMINDER_MAX_MIN = 240;
export const REMINDER_STEP_MIN = 15;
