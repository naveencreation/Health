# Calorify — Business Logic

Every rule below comes from the current code, with its file path. Where the code holds several conflicting implementations of the same rule, all of them are listed and the conflict is flagged. **The code does not record which one is intended**, so the open product questions are collected in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md#open-product-questions).

## 1. Core domain model (`src/types/index.ts`)

| Entity | Key fields | Stored |
|---|---|---|
| `DailyLog` (9 keys) | `date`, `meals[]`, `waterMl`, `steps`, `activities[]`, `waterEntries?[]`, `weightKg?`, `weightEntries?[]`, `stepEntries?[]` | AsyncStorage map keyed by date; Firestore `users/{uid}/dailyLogs/{date}` |
| `LoggedMealItem` | `id`, `foodId`, `name`, `mealType` (`breakfast \| lunch \| dinner \| snacks`), `quantity`, `calories`, `carbs`, `protein`, `fat`, `fiber`, `servingUnit`, `imageUrl?`, `loggedAt` | inside `DailyLog.meals` |
| `UserGoals` (22 keys) | `dailyCalorieBudget`, `targetProtein/Carbs/Fat/Fiber`, `waterGoalMl`, `dailyStepGoal`, `currentWeightKg`, `targetWeightKg`, `startWeightKg`, `heightCm`, `age`, `gender`, `goal`, `weightUnit`, `streakDays`, `avatarUrl`, `name`, … | AsyncStorage; Firestore `users/{uid}.goals` (a map) plus a few root fields |
| `FoodItem` | `id`, `name`, `category`, `servingUnit`, `defaultServingSize`, `calories`, `carbs`, `protein`, `fat`, `fiber`, `icon`, `imageUrl?` | bundled catalog (64 items, `src/data/foodDatabase.ts`) plus `customFoods` |
| `AuthUser` | `id`, `email`, `name`, `isGuest?` | `@calori_auth_v1` |

Nutrient values on a `FoodItem` are **per serving**. A logged item stores the values already multiplied by `quantity`, rounded: calories to the nearest integer, macros to 0.1 g (`HealthContext.addMealItem`).

## 2. Calorie plan

### 2.1 Defaults (`src/constants/biometricDefaults.ts`)
`BIOMETRIC_DEFAULTS` is a frozen object. It is meant to be the single source of fallbacks:

| Field | Default |
|---|---|
| Calories | 2213 kcal |
| Protein / carbs / fat / fiber | 90 / 110 / 70 / 30 g |
| Water | 2500 ml |
| Steps | 10000 |
| Weight / target / start | 68 / 65 / 68 kg |
| Height, age, sex | 175 cm, 24, male |
| Goal, unit | maintain, kg |
| Streak | 1 |

> Conflict: many components hardcode other fallbacks: 2000, 2350 or 2500 kcal; 2000 ml water; 6000 steps; macros 140/220/65/30. See TECHNICAL_DEBT TD-M8.

### 2.2 Onboarding plan (`src/features/onboarding/services/onboardingCalculator.ts`) — the primary path
1. **Age policy.**
   - Under 13: blocked ("designed for users aged 13 and older").
   - 13–17: goal forced to *maintain*.
   - 18 and over: normal.
2. **Input clamps.** Age 13–100 (default 25), weight 30–300 kg (default 70), height 100–250 cm (default 170).
3. **BMR (Mifflin-St Jeor).** `10·kg + 6.25·cm − 5·age`, then add +5 (male), −161 (female) or −78 (other).
4. **TDEE.** BMR × activity multiplier:

   | Activity | Multiplier |
   |---|---|
   | sedentary | 1.2 |
   | lightly_active | 1.375 |
   | moderately_active | 1.55 (also the default) |
   | very_active | 1.725 |

5. **Goal and pace adjustment.**

   | Goal | gentle | steady | faster |
   |---|---|---|---|
   | `lose_weight` (deficit from TDEE) | −10% | −20% | −25% |
   | `gain_muscle` (surplus added) | +150 kcal | +300 kcal | +450 kcal |

6. **Safety floor.** 1200 kcal (female), 1500 (male), 1350 (other). The budget is `max(floor, budget)`, and `isAtSafeFloor` is reported.
7. **Macros.**
   - Protein = kg × 1.8 g, or × 2.2 for `gain_muscle`.
   - Fat = 28% of kcal ÷ 9.
   - Carbs = the remaining kcal ÷ 4.
   - Fiber = 14 g per 1000 kcal.
8. **Water.** `max(2000, round(kg × 35 / 100) × 100)` ml.
9. **Steps by activity.** 6000 / 8000 / 10000 / 12000 (default 10000).
10. **ETA to the target weight.**
    - With a real deficit: weekly kg = deficit × 7 / 7700.
    - Otherwise, a pace rate of 0.15 / 0.25 / 0.35 kg per week.
    - At least 1 week.
11. **Healthy minimum weight.** BMI 18.5 × height².

The wizard ends with `HealthProvider.applyOnboardingPlan`. It writes the goals, the name and the first meal, and sets `streakDays` to 1.

### 2.3 Other BMR/TDEE implementations (conflicting)

| Location | Formula differences |
|---|---|
| `HealthContext.calculateCalibratedGoals` (used by `register`) | TDEE = BMR × **1.375** fixed; lose −400 kcal and target −5 kg; gain +350 kcal and +4 kg; teens forced to maintain; floors 1200/1500/1350; protein 1.8 g/kg; fat 28%; carbs at least 200 kcal; water 35 ml/kg (min 2000). Expects goal values `'lose'`/`'gain'`, but onboarding sends `'lose_weight'`/`'gain_muscle'` (TD-H11) |
| `src/screens/profile/MetabolicSummaryScreen.tsx` | A third copy, ×1.375 |
| `src/services/ai/context/MetabolicAdaptiveEngine.ts` | Standard TDEE = BMR × **1.35**, with defaults 70 kg / 170 cm / 28 years |

### 2.4 Daily totals (`HealthContext.tsx`)
- `totalConsumed` = Σ meal calories (and the same for each macro).
- `totalBurned` = Σ activity calories + `round(steps × 0.04)`.
- `remainingCalories` = `dailyCalorieBudget − consumed + burned`, so exercise and steps earn calories back.
- `mealsByType` maps the legacy `'snack'` to `'snacks'`.
- The meal-share targets in FoodLogModal are breakfast 25%, lunch 35%, snacks 12%, dinner 28% of the budget.

## 3. Logging rules

| Action | Rule |
|---|---|
| Any meal, water or weight log | The target date is `min(selectedDate, today)`; future dates are clamped. **Not clamped:** `updateMealQuantity`, `addWorkout`, `addSteps`, `batchUpdateDailySteps`, `updateWeightEntry`'s new date |
| `addMealItem(meal, food, qty)` | id `meal_${Date.now()}_${rand5}`. `loggedAt` is now for today, or `${date}T12:00:00.000Z` for a past day. Emits the `meal_logged` analytics event |
| Water | `addWater(ml, beverage)`. A positive amount adds an entry at the front of the list. A **negative** amount deducts from entries of the same beverage, newest first. `waterMl` is floored at 0, and entries are cleared at 0. Every drink counts 1:1 (no hydration factors) |
| Water entry edit/delete | Real entries are edited in place, and `waterMl` becomes the sum of entries. Special ids: `synth*` rows are synthetic, and `legacy_balance` is the difference between `waterMl` and the sum of entries |
| Steps (manual) | `addSteps(n)` adds to `steps` and creates **no** `stepEntries` |
| Steps (Health Connect) | `batchUpdateDailySteps` **overwrites** `steps` and replaces `stepEntries` for each date it is given |
| Weight | `logWeight(kg, date, note)` rounds to 0.1 kg. id `weight_${ts}_${rand4}`. `loggedAt` is now, or 08:00 local for a past day. Entries are sorted. `log.weightKg` is the newest entry. `goals.currentWeightKg` updates when this is the latest day, and `startWeightKg` when it is empty |
| Weight delete | Recomputes `currentWeightKg` from the remaining entries. Fallback: `startWeightKg`, then 68 |
| Custom food | Name trimmed and cut to 150 chars; kcal 0–15000; macros 0–1000; fiber 0–500; icon ≤30; imageUrl ≤2000. Saved to the cloud only for a non-guest, non-`demo_` user whose uid matches |
| Undo | Most add and delete toasts give a 4500 ms Undo. Meal delete, step delete, the WaterHistoryCard delete and the LogWeightScreen trash have none |

## 4. Streak (`computeStreak`, `HealthContext.tsx`)
- Walks back from today for at most **30** days.
- A day is "active" if it has at least one meal, or `waterMl > 0`, or `steps > 0`. Workouts and weight do not count.
- Stops at the first inactive day and returns `max(streak, 1)`. If today has no activity yet, the streak shows 1.
- An effect writes the result to `userGoals.streakDays`, which then syncs to `users/{uid}`.

## 5. Weight and BMI
- BMI = kg / m². The WHO bands are applied in `src/features/weight/utils/bmiCalculator.ts`.
- There are five BMI implementations. `ClinicalBmiGauge` puts the Overweight/Obese boundary at 31, not 30 (TD-M23).
- lbs ↔ kg uses 2.20462, typed out in about 13 files. Onboarding's `WeightSelectionScreen` returns the value **in the selected unit**, and the wizard stores it as kg (TD-H10).

## 6. Movement
`src/utils/stepHistoryUtils.ts` `calculateStepMetrics`:
- kcal = steps × 0.04
- km = steps × 0.00076
- minutes = steps / 100

`MOVEMENT_DEFAULTS` holds a body-weight-based model that production code does not use. The 0.04 factor is duplicated in 7 places.

## 7. Health Connect sync (`src/features/health/healthService.ts`)
- **Permission:** READ_STEPS only.
- **Tier 1, backfill.** Days −1 to −7 are read once per device. The key `@calori_hc_backfill_completed_v1` is set even if every read failed.
- **Tier 2, rolling 48 h.** Today is always pushed, even when it is 0. Yesterday is pushed only if the new value is higher.
- **Tier 3.** When a past date with 0 steps is viewed, that single day is fetched, once per date per mount.
- **When it runs:** only on `StepTrackerScreen` mount and Connect (TD-M10).

## 8. Ria AI coach

### 8.1 Limits (`src/services/ai/config/AIConfig.ts`)

| Limit | Value |
|---|---|
| Model | `gemini-3.5-flash-lite` (configurable; its validity is unverified) |
| Send cooldown | 3 s |
| Requests per minute | 10 |
| Daily soft limit | 1200, warning at 1000. Counted per UTC date in `@calori_ai_daily_usage_{date}` |
| Retries | 2, on 429/500/503, with jittered backoff up to 6 s |
| Input text | ≤1500 chars, ≤5 repeated characters in a row |
| History | sliding window of 6 turns; 30 messages persisted; summary ≤60 words |
| Images | ≤2 MB base64. Size-checked only, not resized (`EdgeImagePreprocessor`) |
| Daily insight cache | 4 h in memory (`AIService.getDailyInsight`), plus `@calori_ria_daily_insight_${uid}_${date}` |

### 8.2 Memory
- **Fast loop.** `FastLoopMemoryExtractor` regex-extracts facts from each prompt (allergies, dislikes, fasting windows, diet style). They are saved locally and, in theory, to `users/{uid}/riaMemory/facts`, but no rule exists for that path (TD-H3).
- **Summary.** When history has 10 or more messages, the oldest 6 are summarized in the background into `chatHistory/summary`.
- **Adaptive TDEE (`MetabolicAdaptiveEngine`).**
  - Needs at least 4 days with ≥500 kcal logged, and at least 2 weight points.
  - Observed TDEE = average intake − (Δkg × 7700 / days).
  - Confidence is "high" with at least 8 valid days spanning at least 7 days.
  - The clinical floor is 1200 (female) / 1500.

### 8.3 Generative cards (`src/services/ai/cards/RiaCardParser.ts`)
The model emits fenced ` ```ria_action ` (or `json:ria_action`) blocks. The parser removes them from the visible text and validates each one:
- **Meal card.**
  - Each item: qty 0.1–20; kcal 5–3000; carbs ≤300, protein ≤200, fat ≤200.
  - **Atwater check:** if `|kcal − (4C + 4P + 9F)| / kcal > 18%`, kcal is replaced by the Atwater value. If there are no macros, kcal is split 50/25/25 across C/P/F.
  - A 10-minute duplicate warning comes from `RiaDuplicateChecker`.
  - The meal slot is chosen by local hour: 04–11 breakfast, 11–16 lunch, 16–19 snack, otherwise dinner.
- **Plan-change card.** Calorie floor 1200 (female) / 1500, and a change of no more than ±15% from the current plan.
- **Other cards:** water, weight, suggestion, plate distribution, macro visualizer, day review. Each has its own clamps.
- **Confirming a card** calls the store: `addMealItem` (per item, with `item.qty` as quantity), `addWater`, `logWeight`, `updateGoals`.

> Known inconsistency: the meal card *displays* Σ `item.kcal`, but logging multiplies each item by `qty` (TD-H1).

## 9. Notifications (`src/services/notifications/`)

### 9.1 Defaults (`defaults.ts`)

| Setting | Default |
|---|---|
| Master switch | on |
| Quiet hours | 22:00–07:00 |
| Meals | on; breakfast 08:30, lunch 13:00, dinner 19:30; `skipsBreakfast` false |
| Water | on, every 120 min |
| Steps | on |
| Streak | on |
| Weight | **off**, 07:30 |

Settings are stored per user at `@calori_notif_settings_v2_${uid}`. Without a uid they fall back to `_default`.

### 9.2 Planner rules (`engine/planner.ts`)

| Reminder | Window | Skip when | Priority |
|---|---|---|---|
| Meals (breakfast/lunch/dinner) | 7 days | that meal is already logged today; breakfast is skipped entirely if `skipsBreakfast` | 3 |
| Weight | 7 days at `weight.time` | weight already logged today | 2.5 |
| Steps | 7 days at 17:30 | (step-goal logic) | 2 |
| Streak | today and tomorrow at 21:00 | `streakDays == 0`, or any meal logged today | 4 |
| Water | today and tomorrow, 09:00–21:00 every interval, at most 8 per day | past slots | 1 |

- Every candidate inside quiet hours is dropped.
- **Collisions.** Within 30 min of each other, the higher priority wins.
- The plan is sorted and **capped at 60**.
- IDs are deterministic: `calori_<type>_<date>[_slot]`.
- The reconciler (`engine/reconciler.ts`, mutex-protected) cancels or schedules only entries whose ID is new or whose `fireAt` moved by more than 60 s.
- **Channels:** meals, water, streak, steps. Weight reuses the steps channel. Channels are skipped in Expo Go.

## 10. Gamification (`src/features/gamification/engine/achievementRules.ts`)

| ID | Title | Unlocks when |
|---|---|---|
| `first_meal_log` | First Step | any meal logged |
| `streak_3_days` | 3-Day Ignition | streak ≥ 3 |
| `streak_7_days` | Week of Dedication | streak ≥ 7 |
| `streak_30_days` | Habit Master | streak ≥ 30 |
| `streak_100_days` | Century Club | streak ≥ 100. **Unreachable**, because `computeStreak` caps at 30 |
| `water_target_reached` | Hydro Pioneer | any day with water ≥ goal (fallback 2000) |
| `water_master_3` | Hydro Flow | 3 or more days with water ≥ goal |
| `steps_10k_daily` | 10K Milestone | any day with 10,000 or more steps |
| `first_workout_logged` | Active Spark | any activity logged |
| `calorie_budget_balanced` | Precision Eater | any day within ±10% of the budget (fallback 2000) |
| `protein_goal_met` | Protein Power | any day with protein ≥ target (fallback 120) |

Rules are evaluated only when `AchievementCenterScreen` opens. The streak input is `userGoals.streakDays`. Unlocks persist under the global key `@calori_unlocked_achievements_v1`, which is not per user.

## 11. Subscription (`src/services/payments/paymentService.ts`)

- **Plans:**

  | Plan | Price |
  |---|---|
  | Annual | $29.99, 7-day trial label |
  | Monthly | $4.99 |
  | Lifetime | $79.99 |

- **Billing is a mock.** `purchase` stores an entitlement in AsyncStorage (`@calori_subscription_entitlement_v1`, device-global) and always succeeds. `restore` reads it back, and `revoke` removes it.
- **What Pro unlocks:** the monthly and yearly timeframes on Analytics, which otherwise open `ProPaywallModal`. `ProGate` exists but nothing uses it.

## 12. Food sources

| Source | Logic |
|---|---|
| Bundled catalog | 64 items: breads 6, curries 3, fruits 36 (16 of them are nuts and seeds), rice 10, snacks 2, south_indian 7 |
| Barcode | Open Food Facts v2. `normalizedFoodToFoodItem` → id `barcode_<upc>`. The serving size is in grams, but calories are per 100 g (TD-H19) |
| AI vision | `AIService.analyzeFoodImage`, then the Atwater-checked result is shown with a "Verified" badge on every result. The scan limit (5 per day, `scanLimitService`) is enforced **only** during onboarding |

## 13. Auth and account rules
- **Email/password**: `login`, `register`. Sign-up through onboarding requires at least 8 characters with a digit. The SignUp screen shows extra strength indicators but doesn't enforce them.
- **Guest modes:**
  - `loginDemo`: local `demo_user_1` with `isGuest`; no Firebase call.
  - `loginAnonymous`: Firebase anonymous auth, falling back to a local `guest_${ts}` id.
- **Data scope.** Guests never sync to Firestore. AI cloud backups skip `demo_` ids.
- **Delete account** runs in this order: Firestore subcollections (`dailyLogs`, `customFoods`, `chatHistory`), then the user doc, then the meal photos, then `deleteUser`, then the local keys, then the BYOK key. The order matters; see TD-H5 and TD-H6.
