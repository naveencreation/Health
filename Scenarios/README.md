# Calorify — Master Screen & Behavior Test Case Matrix

> **Document Type:** Production Quality Assurance, Architecture Inventory & Behavioral Test Specification  
> **Target Application:** Calorify (Expo SDK 57, React Native 0.86, React 19.2, TypeScript ~6.0.3)  
> **Status:** Active Reference & Baseline Specification  
> **Total Documented Surfaces:** 48 Screens, Subscreens, and Feature Modals  

---

## 1. Directory Structure & Documentation Map

The `Scenarios/` directory contains complete behavioral specifications, visual inventories, functional test cases, and exhaustive negative/edge case paths for every screen in the Calorify application.

```
Scenarios/
├── README.md                               # Master Index, Sitemap & Global Quality Checklist
├── 01_AUTHENTICATION_SCENARIOS.md          # Welcome, SignIn, SignUp, ForgotPassword
├── 02_ONBOARDING_WIZARD_SCENARIOS.md       # Onboarding Wizard Steps 1 through 17 (Name through SavePlan)
├── 03_MAIN_DASHBOARD_SCENARIOS.md          # 4 Top-Level Tabs: Today, Tracker, Analytics, Profile
├── 04_PROFILE_AND_SETTINGS_SCENARIOS.md    # Goals, Metabolic Summary, Preferences
├── 05_HEALTH_TRACKERS_SCENARIOS.md         # Hydration, Steps, Weight, Gamification, Health Connect
└── 06_MODALS_AND_AI_SCENARIOS.md           # Food Log, Food Vision AI, Barcode Scanner, Ria Chat, BYOK, Paywall
```

---

## 2. Global Screen & Modal Inventory (48 Surfaces)

| # | Screen / Modal ID | Exact Codebase File Path | Architectural Role | Key State & Context Dependencies |
|---|---|---|---|---|
| **1** | `WelcomeScreen` | `src/screens/auth/WelcomeScreen.tsx` | Auth Landing | `useAuth`, Haptics |
| **2** | `SignInScreen` | `src/screens/auth/SignInScreen.tsx` | Auth Sign-In | `useAuth`, Firebase Auth |
| **3** | `SignUpScreen` | `src/screens/auth/SignUpScreen.tsx` | Auth Registration | `useAuth`, Firebase Auth, Firestore |
| **4** | `ForgotPasswordScreen` | `src/screens/auth/ForgotPasswordScreen.tsx` | Auth Reset | Firebase Auth `sendPasswordResetEmail` |
| **5** | `OnboardingWizardScreen` | `src/features/onboarding/screens/OnboardingWizardScreen.tsx` | Flow Orchestrator | `onboardingDraft.ts`, `onboardingCalculator.ts` |
| **6** | `NameInputScreen` | `src/features/onboarding/screens/NameInputScreen.tsx` | Onboarding Step 1 | Draft State, Local validation |
| **7** | `GenderSelectionScreen` | `src/features/onboarding/screens/GenderSelectionScreen.tsx` | Onboarding Step 2 | Draft State, Biological constants |
| **8** | `AgeSelectionScreen` | `src/features/onboarding/screens/AgeSelectionScreen.tsx` | Onboarding Step 3 | Draft State, Age Guardrail (13–17) |
| **9** | `HeightSelectionScreen` | `src/features/onboarding/screens/HeightSelectionScreen.tsx` | Onboarding Step 4 | Draft State, Dual-unit (cm / ft-in) sync |
| **10** | `WeightSelectionScreen` | `src/features/onboarding/screens/WeightSelectionScreen.tsx` | Onboarding Step 5 | Draft State, Dual-unit (kg / lbs) sync |
| **11** | `TargetWeightScreen` | `src/features/onboarding/screens/TargetWeightScreen.tsx` | Onboarding Step 6 | Draft State, Delta bounds vs current |
| **12** | `GoalSelectionScreen` | `src/features/onboarding/screens/GoalSelectionScreen.tsx` | Onboarding Step 7 | Draft State, Primary goal engine |
| **13** | `ActivityLevelScreen` | `src/features/onboarding/screens/ActivityLevelScreen.tsx` | Onboarding Step 8 | Draft State, Activity multipliers (1.2–1.725) |
| **14** | `PaceSelectionScreen` | `src/features/onboarding/screens/PaceSelectionScreen.tsx` | Onboarding Step 9 | Draft State, Deficit/surplus preview |
| **15** | `StrugglesScreen` | `src/features/onboarding/screens/StrugglesScreen.tsx` | Onboarding Step 10 | Draft State, Multi-select chip state |
| **16** | `FoodStyleScreen` | `src/features/onboarding/screens/FoodStyleScreen.tsx` | Onboarding Step 11 | Draft State, Dietary preference tags |
| **17** | `AboutYouScreen` | `src/features/onboarding/screens/AboutYouScreen.tsx` | Onboarding Step 12 | Draft State, Meal schedule & skipping flags |
| **18** | `BuildingPlanScreen` | `src/features/onboarding/screens/BuildingPlanScreen.tsx` | Onboarding Step 13 | Timed animation sequence, Haptics |
| **19** | `PlanRevealScreen` | `src/features/onboarding/screens/PlanRevealScreen.tsx` | Onboarding Step 14 | Computed Health Plan, Telemetry |
| **20** | `FirstMealWinScreen` | `src/features/onboarding/screens/FirstMealWinScreen.tsx` | Onboarding Step 15 | Draft First Meal, Camera/Manual entry |
| **21** | `SoftPaywallScreen` | `src/features/onboarding/screens/SoftPaywallScreen.tsx` | Onboarding Step 16 | Trial presentation, Dismissible gate |
| **22** | `SavePlanScreen` | `src/features/onboarding/screens/SavePlanScreen.tsx` | Onboarding Step 17 | `onboardingMigration.ts`, Auth, Guest mode |
| **23** | `TodayScreen` | `src/screens/main/TodayScreen.tsx` | Primary Tab 1 | `useDailyLog`, `useGoals`, Scroll tracking |
| **24** | `TrackerScreen` | `src/screens/main/TrackerScreen.tsx` | Primary Tab 2 | `useDailyLog`, Multi-date calendar strip |
| **25** | `AnalyticsScreen` | `src/screens/main/AnalyticsScreen.tsx` | Primary Tab 3 | Aggregation engines, Range filters, Pro gate |
| **26** | `ProfileScreen` | `src/screens/main/ProfileScreen.tsx` | Primary Tab 4 | `useAuth`, `useGoals`, `usePro`, Subscreen stack |
| **27** | `GoalsScreen` | `src/screens/profile/GoalsScreen.tsx` | Profile Subscreen | `useGoals`, Biometric calibration |
| **28** | `MetabolicSummaryScreen` | `src/screens/profile/MetabolicSummaryScreen.tsx` | Profile Subscreen | `useGoals`, BMR/TDEE deficit analytics |
| **29** | `PreferencesScreen` | `src/screens/profile/PreferencesScreen.tsx` | Profile Subscreen | `NotificationStorage`, `NotificationScheduler` |
| **30** | `WaterTrackerScreen` | `src/features/hydration/screens/WaterTrackerScreen.tsx` | Hydration Hub | `useDailyLog`, Cup animations |
| **31** | `WaterIntakeHistoryScreen` | `src/features/hydration/screens/WaterIntakeHistoryScreen.tsx` | Hydration History | `useDailyLog`, Entry deletion |
| **32** | `WaterReportScreen` | `src/features/hydration/screens/WaterReportScreen.tsx` | Hydration Analytics | `computeHydrationAnalytics` |
| **33** | `StepTrackerScreen` | `src/features/movement/screens/StepTrackerScreen.tsx` | Movement Hub | `useDailyLog`, Health Connect sync |
| **34** | `StepReportScreen` | `src/features/movement/screens/StepReportScreen.tsx` | Movement Analytics | `computeMovementAnalytics` |
| **35** | `WeightTrackerScreen` | `src/features/weight/screens/WeightTrackerScreen.tsx` | Weight Hub | `useWeight`, BMI categories, Trend charts |
| **36** | `LogWeightScreen` | `src/features/weight/screens/LogWeightScreen.tsx` | Weight Entry Screen | `useWeight`, Note, Timestamp |
| **37** | `WeightHistoryScreen` | `src/features/weight/screens/WeightHistoryScreen.tsx` | Weight History | `useWeight`, Entry deletion |
| **38** | `WeightReportScreen` | `src/features/weight/screens/WeightReportScreen.tsx` | Weight Analytics | `computeWeightAnalytics` |
| **39** | `AchievementCenterScreen` | `src/features/gamification/screens/AchievementCenterScreen.tsx` | Gamification Hub | Achievement Engine, Streaks |
| **40** | `HealthScreen` | `src/features/health/HealthScreen.tsx` | Health Connect Screen | `react-native-health-connect`, Permissions |
| **41** | `FoodLogModal` | `src/features/nutrition/modals/FoodLogModal.tsx` | Full-Screen Modal | Food catalog, Custom foods, Quantities |
| **42** | `FoodVisionModal` | `src/features/nutrition/modals/FoodVisionModal.tsx` | Camera AI Modal | ImagePicker, Gemini Multimodal, AIService |
| **43** | `BarcodeScannerModal` | `src/components/scanner/BarcodeScannerModal.tsx` | Hardware Camera Modal | Expo Camera, Barcode scanner |
| **44** | `RiaChatModal` | `src/components/modals/RiaChatModal.tsx` | AI Companion Modal | SSE Streaming, Rate limiter, Token budget |
| **45** | `BYOKSetupModal` | `src/components/modals/BYOKSetupModal.tsx` | Key Management Modal | SecureStore, Key validation endpoint |
| **46** | `ProPaywallModal` | `src/features/subscription/screens/ProPaywallModal.tsx` | Subscription Modal | `usePro`, Package selection, Restore |
| **47** | `AvatarPickerModal` | `src/components/modals/AvatarPickerModal.tsx` | Media Modal | Preset catalog, Custom photo picker |
| **48** | `NotificationModal` | `src/components/modals/NotificationModal.tsx` | Notification Modal | Alert inbox, Action links |

---

## 3. Global Edge-Case & Failure-Mode Taxonomy

Every scenario sheet evaluates screens against these 6 standardized failure vectors:

1. **Input Boundary & Data Malformation:**
   * Numerical extremes (e.g. 0 kcal budgets, 500 kg weights, 30 cm heights, negative values).
   * Script injection / special characters / unicode zero-width characters in text inputs.
   * Empty string submissions and whitespace padding.
2. **Network Interruption & Latency:**
   * Total offline state during sync or sign-in.
   * Slow 3G / 15-second network timeout.
   * Cloud Firestore optimistic cache vs remote conflict.
3. **Hardware & Operating System Permissions:**
   * Camera permission explicitly denied (`expo-camera` / `expo-image-picker`).
   * Photo library permission restricted or denied.
   * Push notification permissions disabled at OS level.
   * Health Connect SDK missing, disabled, or permissions denied.
4. **Security & Session Lifecycle:**
   * Anonymous / Guest user upgrading to registered user.
   * Firebase `auth/requires-recent-login` on sensitive operations.
   * Hardware SecureStore availability check failing on jailbroken/custom ROMs.
5. **UI Concurrency & Rapid Interaction:**
   * Rapid spam double-tapping submit buttons before async locks engage.
   * Hardware Android back-button interception during in-flight mutations.
   * Keyboard avoidance overlay and input occlusion on small viewports (e.g. iPhone SE).
6. **Accessibility & Device Display:**
   * Large dynamic text / accessibility font scaling (up to 200%).
   * System `isReduceMotionEnabled` (disabling spring physics and auto-advancing timers).
   * Safe area insets (camera notches, Android gesture navigation bars).