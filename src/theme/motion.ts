import { AccessibilityInfo } from 'react-native';
import { Easing } from 'react-native-reanimated';

/**
 * Global Motion Design Tokens for Calorify (Pass 8)
 *
 * Principles:
 * - Calm: No animation for the sake of animation
 * - Immediate: Feedback acknowledges touch at 0ms
 * - Physical: Restrained scale (0.985), small distance travel
 * - Predictable: Standardized durations, easings, and reduced-motion fallbacks
 */

export const MotionDurations = {
  /** Immediate touch acknowledgement, press release, micro-toggles (~100ms) */
  instant: 100,

  /** Popover appearance, chip selection, micro-fades (~140ms) */
  micro: 140,

  /** Standard state transitions, toasts, chart toggles, tab indicators (~180ms) */
  standard: 180,

  /** Accordion expand/collapse, chevron rotation, dialog dismissals (~200–220ms) */
  emphasized: 200,

  /** Sub-screen horizontal slide-in (~250ms) */
  screen: 250,

  /** Bottom-sheet presentation, modal slide-in, splash dismiss (~280ms) */
  sheet: 280,
} as const;

const linearFallback = (t: number): number => {
  'worklet';
  return t;
};
const rawEasing: any = Easing;

export const MotionCurves = {
  /** Standard entering and settling curve (swift start, smooth deceleration) */
  easeOut:
    rawEasing?.out && rawEasing?.cubic
      ? (rawEasing.out(rawEasing.cubic) as (t: number) => number)
      : linearFallback,

  /** Standard state transition and layout reflow curve */
  easeInOut:
    rawEasing?.inOut && rawEasing?.cubic
      ? (rawEasing.inOut(rawEasing.cubic) as (t: number) => number)
      : linearFallback,

  /** Standard exit and dismissal curve */
  easeIn:
    rawEasing?.in && rawEasing?.cubic
      ? (rawEasing.in(rawEasing.cubic) as (t: number) => number)
      : linearFallback,

  /** Accordion expansion curve (natural expansion deceleration without bounce) */
  accordion: rawEasing?.bezier
    ? (rawEasing.bezier(0.25, 0.1, 0.25, 1) as (t: number) => number)
    : linearFallback,

  /** Swift launch with silky deceleration */
  decelerate: rawEasing?.bezier
    ? (rawEasing.bezier(0.16, 1, 0.3, 1) as (t: number) => number)
    : linearFallback,
} as const;

export const SpringPresets = {
  /** Gentle physical settle for UI indicators */
  gentle: {
    damping: 18,
    stiffness: 120,
  },

  /** Precision instrument needle / gauge tracking */
  gauge: {
    damping: 18,
    stiffness: 85,
  },

  /** Liquid droplet slosh and settle physics */
  slosh: {
    damping: 12,
    stiffness: 220,
  },
} as const;

/**
 * Check if the user has requested reduced motion at the OS level.
 */
export async function checkReducedMotion(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}
