/**
 * Iconography Design System Tokens & Canonical Mappings
 * Standardizes semantic icon sizes and common action icons across Calorify.
 */

export const IconSizes = {
  /** 16px — Compact metadata, badges, micro-actions, secondary indicators */
  compact: 16,
  /** 18px — Secondary controls, inline card actions, list chevrons */
  secondary: 18,
  /** 20px — Standard UI actions, navigation tabs, input icons, modal controls */
  standard: 20,
  /** 24px — Prominent controls, floating action buttons (Scan FAB), primary modal dismiss */
  prominent: 24,
} as const;

export type IconSizeKey = keyof typeof IconSizes;
export type IconSize = (typeof IconSizes)[IconSizeKey];

/**
 * Standardized semantic Ionicons glyphs for common actions.
 * Guarantees a consistent outline icon language (~1.8–2.0px optical stroke weight).
 */
export const ActionIcons = {
  // Navigation & Directional
  back: 'chevron-back',
  arrowBack: 'arrow-back',
  arrowForward: 'arrow-forward',

  // Controls & Dismissal
  close: 'close',
  closeOutline: 'close-outline',
  closeCircle: 'close-circle',

  // Steppers & Arithmetic
  add: 'add',
  remove: 'remove',
  plus: 'add',
  minus: 'remove',

  // Item Management & Discovery
  edit: 'pencil-outline',
  delete: 'trash-outline',
  search: 'search-outline',
  settings: 'settings-outline',

  // Disclosure Chevrons
  chevronRight: 'chevron-forward',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  chevronLeft: 'chevron-back',

  // Metadata & Status
  calendar: 'calendar-outline',
  notification: 'notifications-outline',
  filter: 'filter-outline',
  moreHorizontal: 'ellipsis-horizontal',
  moreVertical: 'ellipsis-vertical',
  check: 'checkmark',
  checkCircle: 'checkmark-circle',
  clock: 'time-outline',
  chart: 'stats-chart-outline',
  chartFilled: 'stats-chart',
  healthPulse: 'pulse-outline',
  healthPulseFilled: 'pulse',
  heart: 'heart-outline',
  heartFilled: 'heart',

  // Navigation Bar Shell
  navToday: 'home-outline',
  navTodayActive: 'home',
  navTrack: 'pulse-outline',
  navTrackActive: 'pulse',
  navScan: 'camera-outline',
  navInsights: 'stats-chart-outline',
  navInsightsActive: 'stats-chart',
  navProfile: 'person-outline',
  navProfileActive: 'person',
} as const;
