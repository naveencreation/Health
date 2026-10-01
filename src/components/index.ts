// Dashboard Components
export { HeroCalorieCard } from './dashboard/HeroCalorieCard';
export { TopDateStrip } from './dashboard/TopDateStrip';
export { MealSection } from './dashboard/MealSection';
export { DailyHabitsCard } from './dashboard/DailyHabitsCard';
export { WaterTracker } from './dashboard/WaterTracker';
export { WeightTrackerCard } from './dashboard/WeightTrackerCard';
export { RiaCoachCard } from './dashboard/RiaCoachCard';

// Water Tracking Components
export { DropletVisualizer } from './water/DropletVisualizer';
export { WaterGaugeVisualizer } from './water/WaterGaugeVisualizer';
export { HeroDropletCard } from './water/HeroDropletCard';
export { WaterHistoryCard } from './water/WaterHistoryCard';
export { WaterBottomDock } from './water/WaterBottomDock';
export { WaterEntryActionPopover } from './water/WaterEntryActionPopover';

// Weight Tracking Components
export { HeroWeightCard } from './weight/HeroWeightCard';
export { WeightHistoryCard, type WeightHistoryItem } from './weight/WeightHistoryCard';
export { WeightEntryActionPopover } from './weight/WeightEntryActionPopover';

// Diary Components
export { MealCard } from './diary/MealCard';

// Modals
export { AvatarPickerModal } from './modals/AvatarPickerModal';
export { FoodLogModal } from './modals/FoodLogModal';
export { NotificationModal } from './modals/NotificationModal';
export { RiaChatModal } from './modals/RiaChatModal';
export { SearchFoodModal } from './modals/SearchFoodModal';
export { BYOKSetupModal } from './modals/BYOKSetupModal';
export { FoodVisionModal } from './modals/FoodVisionModal';
export { DailyWaterGoalModal } from './modals/DailyWaterGoalModal';
export { CupSizeModal } from './modals/CupSizeModal';
export { HydrationSettingsModal } from './modals/HydrationSettingsModal';
export { LogWeightModal } from './modals/LogWeightModal';
export { WeightGoalSettingsModal } from './modals/WeightGoalSettingsModal';

// Navigation
export { Header } from './navigation/Header';
export { BottomNavBar, TabType } from './navigation/BottomNavBar';

// Profile Components
export { ProfileHeaderCard } from './profile/ProfileHeaderCard';
export { ProfileQuickNavGrid } from './profile/ProfileQuickNavGrid';
export { ClinicalBmiGauge } from './profile/ClinicalBmiGauge';
export { ProfileMetricInspector } from './profile/ProfileMetricInspector';

// Common Components & Motion Primitives
export { ErrorBoundary } from './common/ErrorBoundary';
export { UserAvatar } from './common/UserAvatar';
export { ConfirmationModal } from './common/ConfirmationModal';
export { MarkdownText } from './common/MarkdownText';
export { ScreenTransitionContainer } from './common/ScreenTransitionContainer';
export { AnimatedSvgRing } from './common/AnimatedSvgRing';
export { AnimatedProgressBar } from './common/AnimatedProgressBar';
export { FoodIconBadge } from './common/FoodIconBadge';
export { FoodImage } from './common/FoodImage';

export { AppLoadingScreen } from './common/AppLoadingScreen';
export { BouncingDotsLoader } from './common/BouncingDotsLoader';
export { SlideInSubScreen } from './common/SlideInSubScreen';

// Onboarding Components
export { OnboardingHeader } from './onboarding';

// Report Components
export {
  ChartTypeToggle,
  ChartTooltipPin,
  DrinkCompletionCard,
  HydrateVolumeCard,
  DrinkTypesCard,
  type ChartType,
  type DayCompletionData,
  type DayHydrateData,
  type DrinkTypeBreakdown,
} from './report';
