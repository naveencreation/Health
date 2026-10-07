import { Platform, ViewStyle } from 'react-native';
import { Colors } from './colors';

/**
 * Global Interactive Control Design Tokens (DESIGN.md Pass 7)
 * Standardizes buttons, chips, pills, steppers, inputs, circular controls, and hit zones.
 */

export const ControlHeights = {
  /** Full-width primary & secondary action buttons */
  button: 52,
  /** Compact modal or in-card action buttons */
  buttonCompact: 42,
  /** Standard single-line form text inputs */
  input: 52,
  /** Compact inline table / modal search inputs */
  inputCompact: 44,
  /** Selectable filter / category chip */
  chip: 36,
  /** Status / metadata badge pill */
  pill: 26,
  /** Segmented toggle track */
  segmentedTrack: 40,
  /** Segmented inner active pill */
  segmentedTab: 34,
} as const;

export const ControlRadii = {
  /** Standard buttons & form inputs */
  control: 10,
  /** Full-width primary CTA squircle */
  button: 10,
  input: 10,
  /** Selectable filter / category chip */
  chip: 10,
  /** Semantic metadata / status pill (strictly 14px per DESIGN.md) */
  pill: 14,
  /** Segmented track container (strictly 12px per DESIGN.md) */
  segmentedTrack: 12,
  /** Segmented active tab pill */
  segmentedTab: 8,
  /** Circular controls */
  circle: 999,
} as const;

export const CircularControlSizes = {
  /** Top screen navigation / header action buttons (38x38, radius 19) */
  headerNav: 38,
  /** Modal close / dismiss circle buttons (36x36, radius 18) */
  modalClose: 36,
  /** Stepper +/- circular actions (32x32, radius 16) */
  stepper: 32,
  /** Hero visualizer stepper actions (38x38 or 44x44) */
  stepperHero: 44,
  /** Date range / table accessory arrows (32x32, radius 16) */
  accessory: 32,
  /** Tiny item-level accessories (26x26, radius 13) */
  itemAccessory: 26,
} as const;

export const HitSlop = {
  /** Subtle 6px touch expansion */
  tight: { top: 6, bottom: 6, left: 6, right: 6 },
  /** Standard 8px touch expansion for compact controls */
  small: { top: 8, bottom: 8, left: 8, right: 8 },
  /** Comfortable 10px expansion for header icons and chevrons */
  medium: { top: 10, bottom: 10, left: 10, right: 10 },
  /** Generous 12px expansion for standalone back/close buttons */
  large: { top: 12, bottom: 12, left: 12, right: 12 },
  /** 16px touch expansion for small icons to ensure 44x44 minimum touch target */
  accessible: { top: 14, bottom: 14, left: 14, right: 14 },
} as const;

export const ControlStyles = {
  /** Restrained tactile press feedback: communicates touch without visual bleaching or flickering */
  pressedPrimary: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  } as ViewStyle,

  pressedSecondary: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    transform: [{ scale: 0.985 }],
  } as ViewStyle,

  pressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  } as ViewStyle,

  pressedIcon: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  } as ViewStyle,

  pressedCard: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  } as ViewStyle,

  /** Standard disabled control state */
  disabled: {
    opacity: 0.45,
  } as ViewStyle,

  /** Standard form input container */
  inputBase: {
    height: ControlHeights.input,
    borderRadius: ControlRadii.input,
    borderCurve: 'continuous',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
  } as ViewStyle,

  /** Form input active/focused state: clean whisper border, zero heavy glow */
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  } as ViewStyle,

  /** Segmented outer track container */
  segmentedTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: ControlRadii.segmentedTrack,
    borderCurve: 'continuous',
    padding: 3,
  } as ViewStyle,

  /** Segmented active inner tab pill */
  segmentedTabActive: {
    backgroundColor: '#FFFFFF',
    borderRadius: ControlRadii.segmentedTab,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  } as ViewStyle,
} as const;
