import { Platform } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo';

export interface WatchAction {
  /** "L", "R" or "done". */
  action: string;
  /** When it was tapped on the Watch, in ms. */
  at: number;
}

interface NativeModule {
  setGlance(json: string): void;
  takePendingActions(): WatchAction[];
  addListener(event: 'onWatchAction', listener: (a: WatchAction) => void): EventSubscription;
}

// missing in the web preview and in tests
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeModule>('NuzzleNative') : null;

export function setGlance(json: string): void {
  native?.setGlance(json);
}

export function takePendingActions(): WatchAction[] {
  return native?.takePendingActions() ?? [];
}

export function onWatchAction(listener: (a: WatchAction) => void): { remove: () => void } {
  return native ? native.addListener('onWatchAction', listener) : { remove: () => {} };
}
