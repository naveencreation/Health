// Dashboard Primitives
export { TopDateStrip } from './dashboard/TopDateStrip';
export { RiaCoachCard } from './dashboard/RiaCoachCard';

// Hydration Components & Modals (Domain Package)
export {
  WaterTracker,
  DropletVisualizer,
  WaterGaugeVisualizer,
  HeroDropletCard,
  WaterHistoryCard,
  WaterEntryActionPopover,
  DailyWaterGoalModal,
  CupSizeModal,
  HydrationSettingsModal,
  useHydration,
} from '@/features/hydration';

// Weight & Body Components & Modals (Domain Package)
export {
  WeightTrackerCard,
  TodayBMICard,
  HeroWeightCard,
  WeightHistoryCard,
  type WeightHistoryItem,
  WeightEntryActionPopover,
  ClinicalBmiGauge,
  LogWeightModal,
  WeightGoalSettingsModal,
  useWeight,
  getTodayBMICategory,
  BMI_SPECTRUM_CATEGORIES,
} from '@/features/weight';

// Movement & Step Components & Modals (Domain Package)
export {
  MovementTrackerCard,
  type MovementTrackerCardProps,
  HeroStepCard,
  StepGaugeVisualizer,
  RunningShoeSvg,
  StepHistoryCard,
  StepEntryActionPopover,
  StepHistoryModal,
  HealthConnectSyncCard,
  useMovement,
} from '@/features/movement';

// Nutrition & Calorie Components & Modals (Domain Package)
export {
  HeroCalorieCard,
  MealSection,
  MealCard,
  CalorieCompletionCard,
  MacroDistributionCard,
  FoodLogModal,
  FoodVisionModal,
  useNutrition,
} from '@/features/nutrition';

// Scanner Components
export { BarcodeScannerModal, ScannedProductCard } from './scanner';

// Global Modals
export { AvatarPickerModal } from './modals/AvatarPickerModal';
export { NotificationModal } from './modals/NotificationModal';
export { RiaChatModal } from './modals/RiaChatModal';
export { BYOKSetupModal } from './modals/BYOKSetupModal';

// Navigation Primitives
export { Header } from './navigation/Header';
export { BottomNavBar, TabType } from './navigation/BottomNavBar';

// Profile Primitives
export { ProfileHeaderCard } from './profile/ProfileHeaderCard';
export { ProfileQuickNavGrid } from './profile/ProfileQuickNavGrid';
export { ProfileMetricInspector } from './profile/ProfileMetricInspector';

// Common Components & Motion Primitives
export { ErrorBoundary } from './common/ErrorBoundary';
export { UserAvatar } from './common/UserAvatar';
export { ConfirmationModal } from './common/ConfirmationModal';
export { TimePickerModal } from './modals/TimePickerModal';
export { MarkdownText } from './common/MarkdownText';
export { ScreenTransitionContainer } from './common/ScreenTransitionContainer';
export { AnimatedSvgRing } from './common/AnimatedSvgRing';
export { AnimatedProgressBar } from './common/AnimatedProgressBar';
export { FoodIconBadge } from './common/FoodIconBadge';
export { FoodImage } from './common/FoodImage';

export { AppLoadingScreen } from './common/AppLoadingScreen';
export { BouncingDotsLoader } from './common/BouncingDotsLoader';
export { SlideInSubScreen } from './common/SlideInSubScreen';

// Onboarding Primitives
export { OnboardingHeader } from '@/features/onboarding';

// Report Primitives
export {
  ChartTypeToggle,
  ChartTooltipPin,
  DrinkCompletionCard,
  HydrateVolumeCard,
  DrinkTypesCard,
  WeightSummaryCard,
  WeightTrendCard,
  BMIGaugeCard,
  type ChartType,
  type DayCompletionData,
  type DayHydrateData,
  type DrinkTypeBreakdown,
  type WeightSummaryData,
  type DayWeightTrendData,
} from './report';
