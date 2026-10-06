// Auth Screens
export { WelcomeScreen } from './auth/WelcomeScreen';
export { SignInScreen } from './auth/SignInScreen';
export { SignUpScreen } from './auth/SignUpScreen';
export { ForgotPasswordScreen } from './auth/ForgotPasswordScreen';

// Onboarding Screens (modularized in features/onboarding)
export {
  AgeSelectionScreen,
  HeightSelectionScreen,
  HeightUnit,
  GenderSelectionScreen,
  GoalSelectionScreen,
  WeightSelectionScreen,
  OnboardingWizardScreen,
} from '@/features/onboarding';

// Main App Screens
export { TodayScreen } from './main/TodayScreen';
export { TrackerScreen, TrackerScreen as TrackerTab } from './main/TrackerScreen';
export { AnalyticsScreen, AnalyticsTab } from './main/AnalyticsScreen';
export { ProfileScreen, ProfileTab } from './main/ProfileScreen';
// Hydration Screens (modularized in features/hydration)
export {
  WaterTrackerScreen,
  WaterIntakeHistoryScreen,
  WaterReportScreen,
} from '@/features/hydration';
// Weight & Body Screens (modularized in features/weight)
export {
  WeightTrackerScreen,
  WeightHistoryScreen,
  LogWeightScreen,
  WeightReportScreen,
} from '@/features/weight';
// Movement Screens (modularized in features/movement)
export { StepTrackerScreen, StepReportScreen } from '@/features/movement';
