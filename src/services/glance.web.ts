// The web preview has no widgets or lock screen.
import type { ActivityProps, GlanceProps } from '../core/glance';

export const updateWidget = (_props: GlanceProps): void => {};
export const syncActivity = async (_props: ActivityProps | null): Promise<boolean> => false;
export const resend = (): void => {};
