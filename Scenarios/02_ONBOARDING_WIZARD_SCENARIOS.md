# Calorify — Onboarding Wizard Scenarios & Test Case Matrix

> **Target Directory:** `src/features/onboarding/screens/`  
> **Applicable SDK:** Expo SDK 57 / React Native 0.86 / AsyncStorage  
> **Orchestrator:** `OnboardingWizardScreen.tsx`  
> **Total Steps:** 17 Specialized Step Screens + Step Orchestrator

---

## 1. Flow Orchestrator: `OnboardingWizardScreen.tsx`

### 1.1 Architectural Role & State Engine
The `OnboardingWizardScreen` orchestrates the complete 17-step onboarding journey. It manages step transitions, bi-directional back navigation with Android hardware back-button interception, persistent state saving into `@calori_onboarding_draft_v1`, dynamic step skipping (e.g. teen guardrail & maintain goal), and telemetry.

#### Dynamic Step Branching Logic
```
[1. Name] ➔ [2. Goal] ➔ [3. Struggles] ➔ [4. About You (Age/Sex)] ➔ [5. Height] ➔ [6. Weight]
                                                                                   │
                 ┌─────────────────────────────────────────────────────────────────┴────────┐
                 ▼ (If Goal == 'maintain' OR Age in [13..17])                               ▼ (Weight Loss / Gain)
          [Skip to Activity]                                                         [7. Target Weight]
                 │                                                                          │
                 │                                                                   [8. Activity Level]
                 │                                                                          │
                 │                                                                   [9. Pace Selection]
                 └─────────────────────────────────┬────────────────────────────────────────┘
                                                   ▼
                                         [10. Food Style]
                                                   ▼
                                        [11. Building Plan] (Timed Animation)
                                                   ▼
                                          [12. Plan Reveal] (Calorie/Macro Target)
                                                   ▼
                                         [13. First Meal Win] (Camera / Manual Log)
                                                   ▼
                                         [14. Save Plan] (Account Migration / Guest)
                                                   ▼
                                         [15. Soft Paywall] (Dismissible)
                                                   ▼
                                         [16. Permission Primer] (Camera, Steps, Alerts)
```

---

## 2. Step 1: NameInputScreen (`NameInputScreen.tsx`)

### 2.1 Visual Layout & Elements
* Progress Bar: Step indicator (1 of 15+).
* Back Button: Exits flow back to `WelcomeScreen`.
* Headline: "What should we call you?"
* Text Input (`testID="input-onboarding-name"`): Single-line, autoFocus, capitalized, max 40 chars.
* CTA Button (`testID="btn-onboarding-name-next"`): "Continue", disabled when empty.

### 2.2 Test Cases & Negative Paths

| Test ID | Scenario | Input | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-NAME-001` | Valid Name Entry | `"Alex Rivera"` | CTA unlocks, transitions to Goal Step. Saved to draft. | - |
| `ONB-NAME-002` | Leading / Trailing Whitespace | `"   Jordan   "` | Auto-trimmed to `"Jordan"`, validates successfully. | - |
| `ONB-NAME-NEG-001` | Empty Submission | `""` or `"   "` | CTA remains disabled; tapping does not advance. | Prevents blank user profiles. |
| `ONB-NAME-NEG-002` | Excessive String Length | 100+ character string | Input capped at 40 chars; no UI overflow or wrapping break. | Input boundary protection. |
| `ONB-NAME-NEG-003` | Emoji & Non-Latin Scripts | `"Sakura 🌸"` or `"محمد"` | Unicode correctly accepted and persisted to Firestore. | Internationalization support. |

---

## 3. Step 2: GoalSelectionScreen (`GoalSelectionScreen.tsx`)

### 3.1 Visual Layout & Elements
* Title: "What is your primary goal?"
* 3 Interactive Selection Cards:
  * "Lose Weight" (Icon: Scale down, subtitle: "Burn fat & establish a healthy deficit")
  * "Maintain Weight" (Icon: Balance, subtitle: "Keep current weight & optimize body composition")
  * "Gain Weight / Muscle" (Icon: Dumbbell, subtitle: "Build lean muscle mass with a surplus")
* Checkmark indicator on active card.
* CTA: "Continue".

### 3.2 Test Cases & Negative Paths

| Test ID | Scenario | Selection | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-GOAL-001` | Select Lose Weight | `goal = 'lose'` | Card glows, target weight step queued in flow. | - |
| `ONB-GOAL-002` | Select Maintain Weight | `goal = 'maintain'` | `TargetWeightScreen` & `PaceSelectionScreen` dynamically omitted from step history. | Eliminates redundant deficit questions. |
| `ONB-GOAL-003` | Select Gain Muscle | `goal = 'gain'` | Prepares caloric surplus engine (+250 to +500 kcal). | - |
| `ONB-GOAL-NEG-001` | Advance Without Selection | None selected | "Continue" button remains disabled (`disabled={!selectedGoal}`). | Prevents undefined goal state. |

---

## 4. Step 3: StrugglesScreen (`StrugglesScreen.tsx`)

### 4.1 Visual Layout & Elements
* Title: "What's held you back in the past?"
* Multi-select Chip Grid:
  * "Consistency", "Late night snacking", "Lack of time", "Social eating", "Slow metabolism", "Meal planning difficulty".
* Multiple items selectable simultaneously.
* CTA: "Continue" (Enabled if 0 or more selected, non-blocking).

### 4.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-STRG-001` | Multiple Selections | Select "Late night snacking" and "Lack of time" | Both chips highlight with active border and checkmark; saved as array in draft. | - |
| `ONB-STRG-002` | Deselect All | Tap selected chip again | Toggles off; array updates; user can still proceed with empty array. | Non-blocking telemetry. |
| `ONB-STRG-NEG-001` | Rapid Selection Toggling | Tapping 5 chips in <300ms | Local state reconciles without race condition or state drop. | Concurrency check. |

---

## 5. Step 4: AboutYouScreen (`AboutYouScreen.tsx`)

### 5.1 Visual Layout & Elements
* Title: "Tell us about yourself"
* Biological Sex Segmented Control: `Male` | `Female` (Required for Mifflin-St Jeor formula).
* Age Input Field: Wheel picker / numeric input.
* Eating Habits Toggles:
  * "Do you typically skip breakfast?" (Yes / No toggle).
  * "Do you snack between meals?" (Yes / No toggle).
* Meal Schedule Pickers: Breakfast (08:00), Lunch (13:00), Dinner (19:30).

### 5.2 Test Cases & Negative Paths (Teen Safety Guardrails)

| Test ID | Scenario | Input | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-ABT-001` | Adult Standard Profile | Sex: `Female`, Age: `28` | Normal metabolic calibration; all weight deficit options accessible. | - |
| `ONB-ABT-002` | Adolescent Teen (13–17) | Age: `15`, Goal: `lose` | **Teen Guardrail Triggered:** Alert modal informs user that Caloric Deficits are locked. System forces `goal = 'maintain'` and locks target weight to protect adolescent growth. | Safety policy compliance. |
| `ONB-ABT-NEG-001` | Underage Child (<13) | Age: `11` | Form rejects submission; displays modal blocking registration: "Calorify is designed for ages 13 and up." | COPPA / Child Safety lock. |
| `ONB-ABT-NEG-002` | Biological Sex Omitted | Sex: `null` | "Continue" button remains disabled until Sex is chosen. | Prevents BMR calculation crash. |
| `ONB-ABT-NEG-003` | Extreme Age Input | Age: `150` or `-5` | Input clamped to range `[13, 100]`. | Numerical bounds protection. |

---

## 6. Step 5 & 6: Height & Weight Selection (`HeightSelectionScreen.tsx`, `WeightSelectionScreen.tsx`)

### 6.1 Visual Layout & Elements
* Unit Switcher Tab:
  * Height: `cm` (metric) vs `ft / in` (imperial).
  * Weight: `kg` (metric) vs `lbs` (imperial).
* Interactive Vertical / Horizontal Ruler or Precision Picker.
* Live BMI Preview pill (underweight, normal, overweight, obese indicator).

### 6.2 Test Cases & Negative Paths (Unit Conversion & Clamping)

| Test ID | Scenario | Input / Unit Toggle | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-HW-001` | Height Imperial Toggle | Enter `5 ft 10 in`, toggle to `cm` | Value automatically converts to `178 cm` without rounding loss. | Dual-unit sync. |
| `ONB-HW-002` | Weight Imperial Toggle | Enter `165 lbs`, toggle to `kg` | Value automatically converts to `74.8 kg`. | Dual-unit sync. |
| `ONB-HW-NEG-001` | Extreme Minimum Height | `height = 20 cm` (<50 cm) | Clamped to minimum safe boundary (`90 cm` / `3 ft 0 in`). | Boundary protection. |
| `ONB-HW-NEG-002` | Extreme Maximum Weight | `weight = 400 kg` (>300 kg) | Clamped to max limit (`250 kg` / `550 lbs`) with warning prompt. | Boundary protection. |
| `ONB-HW-NEG-003` | Rapid Unit Flipping | Toggle `kg` ➔ `lbs` ➔ `kg` 10 times | Float precision does not drift (e.g. 70.0 kg doesn't become 69.8 kg). | Float stability. |

---

## 7. Step 7: TargetWeightScreen (`TargetWeightScreen.tsx`)

### 7.1 Visual Layout & Elements
* Displays current weight for reference.
* Delta Indicator: "-8.0 kg" (Weight Loss) or "+5.0 kg" (Muscle Gain).
* Estimated time to goal badge (e.g. "~12 weeks at a safe pace").
* Warning banner if target weight drops below BMI 18.5 (underweight threshold).

### 7.2 Test Cases & Negative Paths

| Test ID | Scenario | Input | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-TGT-001` | Realistic Target Weight | Current: `80 kg`, Target: `72 kg` | Delta = `-8 kg`. Safe timeline calculated. | - |
| `ONB-TGT-NEG-001` | Inverted Goal Contradiction | Goal: `lose`, but Target: `90 kg` (> Current 80 kg) | Form error banner: "Your target weight must be lower than your current weight for a weight loss goal." | Logic contradiction. |
| `ONB-TGT-NEG-002` | Unsafe Underweight Target | Current: `55 kg` (165 cm), Target: `35 kg` (BMI < 15) | Safety Guardrail: Displays medical warning modal; blocks continuation to prevent eating disorder harm. | Clinical safety threshold. |

---

## 8. Step 8: ActivityLevelScreen (`ActivityLevelScreen.tsx`)

### 8.1 Visual Layout & Elements
* 4 Standard Activity Cards:
  * "Sedentary" (Multiplier: 1.2, "Desk job, little to no intentional exercise")
  * "Lightly Active" (Multiplier: 1.375, "1-3 days/week light activity or walking")
  * "Moderately Active" (Multiplier: 1.55, "3-5 days/week moderate exercise")
  * "Very Active" (Multiplier: 1.725, "6-7 days/week heavy exercise or physical job")

### 8.2 Test Cases & Negative Paths

| Test ID | Scenario | Selection | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-ACT-001` | Select Moderately Active | Select card 3 | Multiplier `1.55` bound to draft; TDEE recalculated instantly. | - |
| `ONB-ACT-NEG-001` | Missing Selection | None selected | CTA disabled. | - |

---

## 9. Step 9: PaceSelectionScreen (`PaceSelectionScreen.tsx`)

### 9.1 Visual Layout & Elements
* 3 Deficit/Surplus Speed Cards:
  * "Gentle" (0.25 kg / 0.5 lb per week, ~275 kcal deficit)
  * "Recommended" (0.5 kg / 1.0 lb per week, ~550 kcal deficit)
  * "Aggressive" (0.75-1.0 kg / 1.5-2.0 lb per week, ~825 kcal deficit)
* Projected Completion Date Banner.
* Caloric Floor Safety Indicator: Shows if aggressive pace would breach the 1,200 kcal (female) / 1,500 kcal (male) minimum.

### 9.2 Test Cases & Negative Paths (Caloric Minimum Guardrails)

| Test ID | Scenario | Input | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-PACE-001` | Recommended Pace Selected | Select `0.5 kg/week` | Projected date calculated; daily deficit set to ~550 kcal. | - |
| `ONB-PACE-NEG-001` | Aggressive Pace Violates Safe Floor | Female, 150 cm, 50 kg, sedentary. Aggressive deficit creates 950 kcal target | **Safe Floor Clamping:** System automatically clamps target to `1,200 kcal/day`. Displays notice: "For your safety, calories cannot go below 1,200/day." | Metabolic health protection. |

---

## 10. Step 10: FoodStyleScreen (`FoodStyleScreen.tsx`)

### 10.1 Visual Layout & Elements
* Dietary Style Cards:
  * "Balanced / Anything"
  * "Vegetarian"
  * "Vegan"
  * "Keto / Low-Carb"
  * "Mediterranean"
  * "Pescatarian"
* Allergy & Intolerance Multi-Select: Gluten-free, Dairy-free, Nut allergy, Shellfish.

### 10.2 Test Cases & Negative Paths

| Test ID | Scenario | Selection | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-FOOD-001` | Select Vegan + Nut Allergy | Vegan style + Nut allergy tag | Macro ratio adjusts (higher plant protein/carbs); recipes and AI recommendations filter out nuts. | - |
| `ONB-FOOD-NEG-001` | Deselect All Allergies | Tap active allergy tags | Clears array, returns to unrestricted food suggestions. | - |

---

## 11. Step 11 & 12: BuildingPlanScreen & PlanRevealScreen (`BuildingPlanScreen.tsx`, `PlanRevealScreen.tsx`)

### 11.1 Visual Layout & Elements
* **BuildingPlanScreen:**
  * Animated circular progress ring (0% ➔ 100% over 3.2 seconds).
  * Staggered text animations: "Analyzing metabolic rate...", "Optimizing macronutrient ratios...", "Finalizing your custom roadmap...".
  * Haptic vibration feedback on completion.
* **PlanRevealScreen:**
  * Hero Calorie Pill: "1,850 kcal / day".
  * Macronutrient Gram Breakdown Card:
    * Protein: 140g (30%)
    * Carbohydrates: 185g (40%)
    * Fats: 62g (30%)
  * Target Date Badge: "Reach 72 kg by October 14, 2026".
  * Water Target: "2,800 ml / day".
  * CTA: "Accept & Continue".

### 11.2 Test Cases & Negative Paths

| Test ID | Scenario | Action | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-PLAN-001` | Automated Calculation & Reveal | Wait for progress ring | Progress ring reaches 100%, triggers `Haptics.notificationAsync`, auto-transitions to `PlanRevealScreen`. | - |
| `ONB-PLAN-002` | Macro Sum Verification | Inspect macro calories | `(Protein * 4) + (Carbs * 4) + (Fats * 9)` matches total target calories within ±5 kcal rounding margin. | Mathematical integrity. |
| `ONB-PLAN-NEG-001` | Backgrounding App During Animation | Minimize app while `BuildingPlanScreen` is at 50% | Timer pauses or resumes seamlessly upon foregrounding without getting stuck in infinite loader. | Lifecycle resilience. |

---

## 12. Step 13: FirstMealWinScreen (`FirstMealWinScreen.tsx`)

### 12.1 Visual Layout & Elements
* Title: "Log your first meal to kickstart your streak!"
* 3 Entry Options:
  * "Scan Meal with AI Camera" (Launches camera or file picker).
  * "Search Food Database" (Inline quick search modal).
  * "Quick Calorie Add" (Manual calorie number input).
* "Skip for now" link at bottom.

### 12.2 Test Cases & Negative Paths

| Test ID | Scenario | Action | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-MEAL-001` | Quick Calorie Entry | Enter "450 kcal", label "Avocado Toast" | Adds pending meal to onboarding payload; advances to Paywall step. | - |
| `ONB-MEAL-002` | Camera Scan Entry | Snap picture of plate | AI analyzes photo, returns detected items, user accepts; attached to draft. | Camera integration. |
| `ONB-MEAL-003` | Skip Step | Tap "Skip for now" | Advances to SavePlan step without blocking or throwing errors. | User autonomy. |
| `ONB-MEAL-NEG-001` | Camera Permission Denied | Camera permission denied by user | Graceful alert dialog: "Camera access is needed to scan food. You can search manually instead." Fallback to text search. | Permission fallback. |

---

## 13. Step 14: SavePlanScreen (`SavePlanScreen.tsx`)

### 13.1 Visual Layout & Elements
* Headline: "Save your plan to keep your progress safe".
* Google Sign-In button (`testID="btn-save-plan-google"`).
* Email / Password Sign-Up form with real-time rule chips.
* "Continue as Guest" link at bottom (`handleContinueAsGuest`).

### 13.2 Test Cases & Negative Paths (Account Migration & Guest Persistence)

| Test ID | Scenario | Action | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-SAVE-001` | Create Permanent Account | Enter email/pass, submit | Firebase Auth account created, onboarding draft migrated into Firestore via `onboardingMigration.ts`, draft cleared from storage, advances to Paywall step. | Seamless migration. |
| `ONB-SAVE-002` | Continue as Guest | Tap "Continue as Guest" | Guest session initialized in local storage; plan saved into local SQLite / AsyncStorage; advances to Paywall step. | Frictionless onboarding. |
| `ONB-SAVE-NEG-001` | Network Dropout on Save Plan | Tap "Create Account" while offline | Displays alert: "Offline. Your plan is saved locally. You can sync an account later." Enters guest session with local plan intact. | Zero data loss. |
| `ONB-SAVE-NEG-002` | Account Email Already Taken | Enter email already in use | Alert prompt: "This email is already registered. Sign in to link your new plan." Offers inline sign-in mode. | Identity collision resolution. |

---

## 14. Step 15 & 16: SoftPaywallScreen & PermissionPrimerStep (`SoftPaywallScreen.tsx`, `PermissionPrimerStep.tsx`)

### 14.1 Visual Layout & Elements
* **SoftPaywallScreen:**
  * Premium Feature Comparison: Barcode scanning, AI meal photo scanner, Ria health coach, in-depth micronutrient analytics.
  * Plan options: Annual ($39.99/yr) vs Monthly ($6.99/mo).
  * "Start 7-Day Free Trial" primary button.
  * Dismiss button ("X" / "Continue with Free Version") in top-right or below CTAs.
* **PermissionPrimerStep:**
  * System permission explainers for Camera, Step Sensor (Health Connect), and Push Notifications.
  * "Enable Permissions" CTA (`handleEnablePermissions`) and "Skip for now" link.

### 14.2 Test Cases & Negative Paths

| Test ID | Scenario | Action | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ONB-PAY-001` | Dismiss Paywall | Tap "Continue with Free Version" | Soft paywall dismisses; advances to `PermissionPrimerStep` without charging or locking app. | Compliance with App Store guidelines. |
| `ONB-PERM-001` | Grant All Permissions | Tap "Enable Permissions" | Requests OS Camera, Health Connect, and Notification permissions; finishes onboarding; navigates to TodayScreen. | Device permissions setup. |
| `ONB-PERM-002` | Skip Permissions | Tap "Skip for now" | Completes flow without requesting permissions; user enters app. | Non-blocking onboarding. |
