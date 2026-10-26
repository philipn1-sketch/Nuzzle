// The web preview has no widgets or lock screen.
import type { ActivityProps } from '../core/glance';
import type { Baby } from '../core/types';
import type { WidgetProps } from '../widgets/NuzzleWidget';

export const updateWidget = (_props: WidgetProps, _lockAt: number | null = null): void => {};
export const offerBabies = (_babies: Baby[]): void => {};
export const syncActivity = async (_props: ActivityProps | null): Promise<boolean> => false;
export const resend = (): void => {};
