# Calorify — Codebase Guide

This is a practical map: where code lives, how to find things, and which files to treat with care. For the system design, see [ARCHITECTURE.md](ARCHITECTURE.md). For formulas, see [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md).

## 1. Entry points

| File | Role |
|---|---|
| `index.ts` | `registerRootComponent(App)` |
| `App.tsx` | Provider tree, tab state, splash and font gating, the auth gate (`WelcomeScreen`), notification-tap routing, `syncNotifications`, the sign-out flow |
| `src/navigation/OverlayHost.tsx` | Renders every modal and tracker sub-screen from `activeModal` |
| `src/context/HealthContext.tsx` | `HealthProvider`: the entire app state, persistence, sync and auth |
| `app.json` | Expo config: plugins (RN Firebase app and crashlytics, expo-font, camera, image-picker, secure-store, splash, health-connect, notifications, build-properties), Android permissions, SDK levels |
| `firestore.rules`, `storage.rules` | Server-side validation. This is the only "backend" logic |

## 2. "Where is…?" lookup

| I need to change… | Look in |
|---|---|
| A tab's layout | `src/screens/main/{Today,Tracker,Analytics,Profile}Screen.tsx` |
| A modal, or a full-screen tracker opened from anywhere | Add a member to the `ActiveModal` union in `src/navigation/types.ts`, then render it in `src/navigation/OverlayHost.tsx` |
| A profile sub-screen | `src/screens/profile/*`, mounted with `SlideInSubScreen` from `ProfileScreen` |
| How a meal, water, weight or step entry is stored | The mutations in `HealthContext.tsx`: `addMealItem`, `addWater`, `logWeight`, `addSteps`, `batchUpdateDailySteps`, … |
| What gets synced to Firestore and how | The logs and goals effects plus `fetchAndHydrateUserData` in `HealthContext.tsx`, and `firestore.rules` |
| Daily calorie, macro, water and step targets | `src/features/onboarding/services/onboardingCalculator.ts` (onboarding), `calculateCalibratedGoals` in `HealthContext.tsx` (register), `src/screens/profile/GoalsScreen.tsx` (manual edits), and `src/constants/biometricDefaults.ts` (fallbacks) |
| Domain calculations for charts and analytics | `src/features/<domain>/services/*Analytics.ts` |
| Report and chart cards | `src/components/report/*` and the feature `components/` folders |
| Food search, custom foods and quick add | `src/features/nutrition/modals/FoodLogModal.tsx` |
| AI food photos | `src/features/nutrition/modals/FoodVisionModal.tsx` → `AIService.analyzeFoodImage` |
| Barcode scanning | `src/components/scanner/BarcodeScannerModal.tsx`, `src/hooks/useBarcodeScanner.ts`, `src/services/barcodeService.ts`, `src/types/barcode.ts` |
| The Ria chat UI | `src/components/modals/RiaChatModal.tsx` |
| Ria's prompt and context | `src/services/ai/context/NutritionContextBuilder.ts` |
| Ria's generative cards | Parsing in `src/services/ai/cards/RiaCardParser.ts`; views in `src/features/ria/cards/*`; types in `src/services/ai/types/ai.types.ts` |
| The Gemini model, limits and token budgets | `src/services/ai/config/AIConfig.ts` |
| AI error messages and recovery actions | `src/services/ai/errors/AIErrorMapper.ts` |
| The API key UI | `src/components/modals/BYOKSetupModal.tsx`, `src/screens/profile/PreferencesScreen.tsx` |
| Which reminders get scheduled | `src/services/notifications/engine/planner.ts` |
| How reminders are applied to the OS | `src/services/notifications/engine/reconciler.ts`, `expoNotifications.ts` |
| Reminder settings storage | `src/services/notifications/storage/notificationStorage.ts`, `defaults.ts` |
| Android notification channels | `src/config/notificationChannels.ts` |
| Health Connect | `src/features/health/{healthConnect,healthPermissions,healthService}.ts`; UI in `src/features/movement/screens/StepTrackerScreen.tsx` |
| Onboarding steps | `src/features/onboarding/screens/OnboardingWizardScreen.tsx` (step machine) and one screen per step |
| Onboarding draft persistence and cloud migration | `src/features/onboarding/services/onboardingDraft.ts`, `onboardingMigration.ts` |
| Achievements | `src/features/gamification/engine/achievementRules.ts`, `AchievementEvaluator.ts` |
| Pro, paywall and entitlement | `src/services/payments/paymentService.ts` (mock), `entitlementManager.ts`, `src/features/subscription/*` |
| Colours, fonts, spacing, motion | `src/theme/*`. Import a subpath such as `@/theme/colors` (`Colors`), `@/theme/typography` (`Typography`, `Fonts`), `@/theme/motion` (`MotionDurations`, `MotionCurves`) |
| The bundled food catalog | `src/data/foodDatabase.ts` (64 items) and `src/assets/foodImages.ts` (image map) |
| Date helpers | `src/utils/dateUtils.ts` (`getTodayDateString`, `toDateString`, `shiftDateClamped`, `getRollingSevenDays`) |
| Step kcal, km and minutes | `src/utils/stepHistoryUtils.ts` (`calculateStepMetrics`) |
| Beverage types | `src/utils/beverageUtils.tsx` (13 definitions) |
| Haptics | `src/utils/haptics.ts` |
| Analytics and crash logging | `src/services/monitoring.ts` (`Monitoring.logEvent`, `recordError`, `setUserId`) |

## 3. Feature module anatomy

Every `src/features/<domain>/` follows the same shape. A folder is present only when the domain needs it.

```
features/<domain>/
  index.ts            barrel: the public surface for screens and other features
  hooks/use<Domain>.ts reads slice hooks from @/context, derives domain values
  services/*.ts       pure calculations (unit-tested in services/__tests__)
  components/         cards, gauges, history lists
  screens/            full-screen views (tracker sub-screens, history, report)
  modals/             bottom sheets and dialogs
  utils/              domain helpers (weight/utils/bmiCalculator.ts)
```

| Domain | Hook | Main dashboard UI | Detail / report |
|---|---|---|---|
| nutrition | `useNutrition` | `HeroCalorieCard`, `MealSection` → `MealCard` | `CalorieCompletionCard`, `MacroDistributionCard`; `FoodLogModal`, `FoodVisionModal` |
| hydration | `useHydration` | `WaterTracker` | `WaterTrackerScreen`, `WaterIntakeHistoryScreen`, `WaterReportScreen` |
| movement | `useMovement` | `MovementTrackerCard` | `StepTrackerScreen`, `StepHistoryModal`, `StepReportScreen` |
| weight | `useWeight` | `WeightTrackerCard`, `TodayBMICard` | `WeightTrackerScreen`, `LogWeightScreen`, `WeightHistoryScreen`, `WeightReportScreen` |
| health | — | `HealthConnectSyncCard` (in movement) | `HealthScreen` (reachable only through barrels) |
| onboarding | — | `WelcomeScreen` → `OnboardingWizardScreen` | 17 step screens |
| gamification | — | `StreakFlameBadge` | `AchievementCenterScreen`, `CelebrationModal` |
| subscription | `usePro` | `ProBadge`, `ProMembershipCard` | `ProPaywallModal`, `ProGate` (unused) |
| ria | — | `RiaCoachCard` (in `components/dashboard`) | `features/ria/cards/*View.tsx` |

**Import rule.** `src/components/index.ts` re-exports feature components. A file inside a feature must import its siblings by relative path, never from `@/components`, or you create require cycles.

## 4. Naming and code conventions observed

- **Files.** Components and screens are `PascalCase.tsx`. Hooks are `useX.ts`. Services are `camelCase.ts` (`healthService.ts`), except the AI classes, which are `PascalCase.ts` (`GeminiProvider.ts`).
- **Services** are mostly static classes or singleton objects: `PaymentService`, `NotificationScheduler`, `AIService`, `SecureKeyStorage`, `Monitoring`.
- **Storage keys** use the `@calori_` prefix. New per-user settings must use `ScopedStorage` (`@calori_${uid|guest}_${key}`).
- **IDs** are client-generated: `meal_${Date.now()}_${rand}`, `weight_${ts}_${rand4}`, `work_${Date.now()}`, `synth_${date}_${n}`, `hc_step_*`, and `calori_<type>_<date>[_slot]` for notifications.
- **Dates** are local `YYYY-MM-DD` strings and are compared as strings. Do not use `toISOString().split('T')[0]` for day keys; it returns the UTC date.
- **Styling** uses `StyleSheet.create` in the same file. Many files still contain raw hex values instead of `Colors.*` (see TECHNICAL_DEBT).
- **Animation** uses Reanimated only. No file imports RN `Animated`.
- **Formatting** is Prettier: single quotes, 100 columns, es5 trailing commas, `arrowParens: avoid`.

## 5. Tests layout

- Tests sit in co-located `__tests__/` folders. There are 100 test files against 248 source files.
- `jest.config.js`:
  - `preset: 'jest-expo'`
  - `setupFiles: ['./jest.setup.js']`
  - forces `NODE_ENV=test`
  - maps `firebase/storage` to `src/__mocks__/firebaseStorageMock.js`
- `jest.setup.js` hand-mocks:
  - Reanimated
  - AsyncStorage
  - `firebase/firestore`
  - `@/services/firebase` (`auth.currentUser.uid === 'test_user_123'`)

  Add any missing Reanimated API there.
- Well covered:
  - pure services: analytics, planner, reconciler, onboarding calculator, card parser, duplicate checker, rate limiter, validators
  - several hooks and cards
- Not covered:
  - `GeminiProvider`, `AIService`, `ConversationMemoryManager`, `SecureKeyStorage`, `NutritionContextBuilder`
  - the sync and hydration effects
  - `login`, `register` and `deleteAccount`
  - `FoodLogModal`, `FoodVisionModal`, `RiaChatModal`
  - most hydration and weight UI
  - Firestore rules (no emulator tests)

See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md#4-testing) for how to run them.

## 6. Files that need special care

| File | Why |
|---|---|
| `src/context/HealthContext.tsx` (2,613 lines) | Every mutation, sync rule and auth path. Side effects run inside state updaters in several places. Small changes can break sync gating (`isHydratingRef`, `hydratedUidRef`, `isLoggingOutRef`) or the merge |
| `firestore.rules` | `hasOnly` allowlists. A new field on `DailyLog`, `UserGoals` (root fields), `FoodItem` (custom foods) or the chat docs must be added here, or cloud writes fail silently |
| `src/types/index.ts` | `DailyLog`, `UserGoals` and `FoodItem` shapes are mirrored by the rules and by `sanitizeForFirestore` callers |
| `src/services/notifications/expoNotifications.ts` + `scripts/patch-expo-notifications.js` | Prevent the Expo Go Android crash. Never import the `expo-notifications` root |
| `src/services/firebase.ts` | Auth persistence (hex SecureStore keys) and the config fallback. Do not log or copy its values |
| `src/services/ai/storage/SecureKeyStorage.ts` | BYOK key storage. The key is derived from `auth.currentUser`, so call order matters |
| `src/services/ai/cards/RiaCardParser.ts` | The safety clamps and floors that stop AI output from writing unsafe or absurd values |
| `src/components/modals/RiaChatModal.tsx` (2,134 lines) | Streaming state, card confirmation → store mutations, conversation management |
| `src/features/nutrition/modals/FoodLogModal.tsx` (3,054 lines) | The largest file. Search, portions, custom food, repeat-yesterday and undo |
| `src/features/movement/screens/StepTrackerScreen.tsx` | The only place Health Connect sync runs |
| `app.json` / `eas.json` | Native config. A change requires a new native build, not just a JS reload |
| `src/features/onboarding/screens/OnboardingWizardScreen.tsx` | 16-step state machine. `pushStep` closures save the previous step's values, the draft outlives the flow, and `building_plan` is missing from the resume sequence (TD-H26) |
| `src/screens/profile/PreferencesScreen.tsx` (1,684 lines) | Sign-out, delete, BYOK and reminder toggles. Its seven `syncSchedules` calls pass partial input (TD-H30) |

## 7. Largest source files

| Lines | File |
|---|---|
| 3054 | `src/features/nutrition/modals/FoodLogModal.tsx` |
| 2613 | `src/context/HealthContext.tsx` |
| 2134 | `src/components/modals/RiaChatModal.tsx` |
| 1684 | `src/screens/profile/PreferencesScreen.tsx` |
| 1457 | `src/features/onboarding/screens/FirstMealWinScreen.tsx` |
| 1447 | `src/features/nutrition/modals/FoodVisionModal.tsx` |
| 1351 | `src/components/scanner/ScannedProductCard.tsx` |
| 1295 | `src/features/weight/screens/LogWeightScreen.tsx` |
| 1144 | `src/features/hydration/components/WaterHistoryCard.tsx` |
| 1045 | `src/features/hydration/screens/WaterIntakeHistoryScreen.tsx` |
| 1036 | `src/features/nutrition/components/HeroCalorieCard.tsx` |
| 977 | `src/screens/main/AnalyticsScreen.tsx` |

About 35–40% of the chart and card files is `StyleSheet` code.

## 8. Non-code folders

| Folder | Contents | Status |
|---|---|---|
| `Scenarios/` | Behavioural test matrices per screen | Reference |
| `info/` | UX principles and method notes (`info/Methods/NOTIFICATIONS_SCENARIO_MAP.md`) | Reference |
| `MEMORY.md` | Chronological decision and root-cause log | Many paths predate the move to feature folders, and some claims are stale (see TECHNICAL_DEBT "Doc drift") |
| `IMPLEMENTATION_ROADMAP.md` | Validation dossiers, impact analysis and the prioritized fix plan (RM-…) | Current (2026-11-05) |
