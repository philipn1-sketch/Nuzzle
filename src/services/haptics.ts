import * as Haptics from 'expo-haptics';

/** A soft tick so she knows a tap worked without looking. */
export const tick = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
