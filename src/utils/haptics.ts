import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

let hapticsEnabled = true;

/**
 * Checks if the current runtime environment supports native haptic vibration.
 */
function isSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Enables or disables haptic feedback globally (e.g. user toggles in settings).
 */
export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

/**
 * Returns whether haptic feedback is currently enabled.
 */
export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

/**
 * Subtle selection tick — used for tabs, date picker scrolls, radio pills, segmented toggles.
 */
export async function selection(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.selectionAsync();
  } catch {
    // Graceful fallback for simulators / unsupported devices
  }
}

/**
 * Gentle light tap — used for standard icon buttons, steppers (+ / -), and chip taps.
 */
export async function impactLight(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
  } catch {
    // Graceful fallback
  }
}

/**
 * Medium crisp click — used for modal triggers, view switches (Bar/Line), save actions.
 */
export async function impactMedium(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Graceful fallback
  }
}

/**
 * Prominent heavy thump — used for significant state changes, weight logging, major confirmations.
 */
export async function impactHeavy(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Graceful fallback
  }
}

/**
 * Snappy rigid impact — mechanical, precise feel for switches, pickers, and toggles.
 */
export async function impactRigid(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Rigid);
  } catch {
    // Graceful fallback
  }
}

/**
 * Soft cushioned impact — plush, rubberized feel for elastic gestures and bounds.
 */
export async function impactSoft(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Soft);
  } catch {
    // Graceful fallback
  }
}

/**
 * Celebratory double pulse — used for goal completions, badge unlocks, meal logged successfully.
 */
export async function success(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
  } catch {
    // Graceful fallback
  }
}

/**
 * Cautionary pulse — used for approaching limits, unsaved changes warnings.
 */
export async function warning(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
  } catch {
    // Graceful fallback
  }
}

/**
 * Sharp error buzz — used for failed validations, network errors, invalid inputs.
 */
export async function error(): Promise<void> {
  if (!hapticsEnabled || !isSupported()) return;
  try {
    await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
  } catch {
    // Graceful fallback
  }
}

/**
 * Unified Haptics Engine facade.
 */
export const haptics = {
  selection,
  impactLight,
  impactMedium,
  impactHeavy,
  impactRigid,
  impactSoft,
  success,
  warning,
  error,
  setEnabled: setHapticsEnabled,
  isEnabled: isHapticsEnabled,
};

export default haptics;
