# Calorify — Profile & Settings Subscreens Scenarios & Test Case Matrix

> **Target Directory:** `src/screens/profile/`  
> **Applicable SDK:** Expo SDK 57 / React Native 0.86 / SecureStore / Notifications  
> **Coverage:** `GoalsScreen`, `MetabolicSummaryScreen`, `PreferencesScreen`

---

## 1. GoalsScreen (`src/screens/profile/GoalsScreen.tsx`)

### 1.1 Architectural Role & Component Hierarchy
`GoalsScreen` allows users to calibrate their biometric targets (daily calorie budget, macronutrient grams, water volume, step count, target weight, and height). It includes real-time macro calorie synchronization, presets, and safety constraints.

#### Visual Layout & Elements
* **Header:** Back button (`onBack`), Title "Nutrition & Body Goals", Subtitle "Calibrate your daily targets".
* **Quick Presets Row (3 Segmented Pills):**
  * "Fat Loss" (1,650 kcal · 90P / 160C / 40F / 30Fib)
  * "Maintenance" (1,950 kcal · 75P / 220C / 50F / 30Fib)
  * "Muscle Gain" (2,300 kcal · 130P / 260C / 60F / 35Fib)
* **Calorie Budget Input Card:**
  * Numeric input for daily calorie target (`testID="input-goals-calories"`).
  * Live comparison badge: Shows difference between target budget and sum of macro grams `(P*4 + C*4 + F*9)`.
* **Macronutrient Inputs (Grams & Live Percentages):**
  * Protein (g) input + percentage pill.
  * Carbohydrates (g) input + percentage pill.
  * Dietary Fat (g) input + percentage pill.
  * Dietary Fiber (g) input.
* **Daily Lifestyle Targets Card:**
  * Water intake goal (ml) input (Default: 2,500 ml).
  * Step goal input (Default: 10,000 steps).
* **Body Metrics Calibration Card:**
  * Current Weight (kg) & Target Weight (kg).
  * Height (cm).
* **Bottom Action Bar:**
  * "Save Changes" CTA (`testID="btn-goals-save"`): Triggers `updateGoals`, haptic confirmation, and brief success checkmark.

### 1.2 State & Context Bindings
* **Context:** `useGoals()` (`userGoals`, `updateGoals`).
* **Local State:** Inputs for calories, macros, hydration, steps, weight, height; `activePreset`, `savedSuccess`.

### 1.3 Test Cases: Happy Paths

| Test ID | Scenario | Actions | Expected Output |
|---|---|---|---|
| `GOAL-001` | Apply "Fat Loss" Preset | Tap "Fat Loss" preset button | Form fields populate with 1,650 kcal, 90g P, 160g C, 40g F; macro distribution chart updates instantly. |
| `GOAL-002` | Custom Macro Calibration | Type 150g into Protein, 180g Carbs, 60g Fat | Macro calories computed as `(150*4)+(180*4)+(60*9) = 1,860 kcal`; macro balance badge displays "+10 kcal surplus vs budget". |
| `GOAL-003` | Save Goal Calibration | Tap "Save Changes" | `updateGoals()` persists changes to Firestore/SQLite; shows green checkmark toast; auto-dismisses back to Profile tab after 800ms. |

### 1.4 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `GOAL-NEG-001` | Zero Calorie Input | Type `0` into Calorie Budget | Reverts to minimum safety fallback (1,200 kcal for female / 1,500 kcal for male) or warns user. |
| `GOAL-NEG-002` | Massive Macro Discrepancy | Calorie budget: 1,500 kcal; Macros sum: 4,000 kcal | Discrepancy indicator highlights orange/red: "Macros total 4,000 kcal (2,500 kcal above budget)". Allows saving with advisory. |
| `GOAL-NEG-003` | Non-numeric Characters in Weight | Type `"75.5.2"` or `"abc"` | Regex sanitize extracts valid float or prevents invalid keystrokes; prevents NaN crash in BMI engine. |
| `GOAL-NEG-004` | Unsaved Changes Exit | User modifies values and taps Back button | If changes are dirty, prompts "Discard unsaved changes?" or persists draft. |

---

## 2. MetabolicSummaryScreen (`src/screens/profile/MetabolicSummaryScreen.tsx`)

### 2.1 Architectural Role & Component Hierarchy
Displays clinical metabolic telemetry based on the scientific Mifflin-St Jeor formula, calculating Basal Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE), active daily deficit, and projected weekly fat loss rate.

#### Visual Layout & Elements
* **Header:** Back button, Title "Metabolic Summary", Subtitle "Clinical daily burn rate & deficit telemetry", Tune Goals action button (`onOpenGoals`).
* **Dual Hero Stat Cards:**
  * BMR Card (Flame icon): Displays computed BMR (e.g. `1,640 kcal/day` resting burn).
  * TDEE Card (Activity icon): Displays computed TDEE (e.g. `2,255 kcal/day` at light activity multiplier 1.375).
* **Clinical Deficit Telemetry Card:**
  * Current Daily Budget: `1,750 kcal`.
  * Daily Deficit: `505 kcal/day` (TDEE - Budget).
  * Weekly Projected Fat Loss: `0.46 kg / week` (calculated as `(deficit * 7) / 7700`).
* **Timeline Projection Card:**
  * Estimated date to reach target weight (e.g., "Target 68.0 kg reachable in ~13 weeks").
* **Mifflin-St Jeor Methodology Accordion:**
  * Clinical formula breakdown: `10 * weight(kg) + 6.25 * height(cm) - 5 * age + s` (`s = +5` for males, `-161` for females).

### 2.2 State & Context Bindings
* **Context:** `useGoals()` (`userGoals`).
* **Calculations:** Mifflin-St Jeor equation evaluated dynamically from biometrics in context.

### 2.3 Test Cases & Negative Paths

| Test ID | Scenario | Pre-conditions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `MET-001` | Male Metabolic Evaluation | Male, 80kg, 180cm, 30yo, budget 2000 | BMR = `10(80) + 6.25(180) - 5(30) + 5 = 1,780 kcal`. TDEE = `2,448 kcal`. Deficit = `448 kcal/day`. | Formula accuracy check. |
| `MET-002` | Female Metabolic Evaluation | Female, 65kg, 165cm, 25yo, budget 1500 | BMR = `10(65) + 6.25(165) - 5(25) - 161 = 1,395 kcal`. TDEE = `1,918 kcal`. Deficit = `418 kcal/day`. | Gender constant check (-161 vs +5). |
| `MET-003` | Open Goals Calibration | Tap top-right tuning icon | Invokes `onOpenGoals()`, smoothly transitioning directly to `GoalsScreen`. | Subscreen routing. |
| `MET-NEG-001` | Zero Deficit (Maintenance/Surplus) | Budget (2,500) > TDEE (2,200) | Deficit clamps to `0 kcal` via `Math.max(0, ...)`; weekly fat loss displays `0.00 kg/week` or surplus mode. | Prevents negative deficit string. |
| `MET-NEG-002` | Missing Biometrics Fallback | User profile lacks height or age | Defaults gracefully to `BIOMETRIC_DEFAULTS` without NaN rendering or app crashes. | Telemetry resilience. |

---

## 3. PreferencesScreen (`src/screens/profile/PreferencesScreen.tsx`)

### 3.1 Architectural Role & Component Hierarchy
Manages local device preferences, AI coach personality tone, notification schedules and quiet hours, Gemini BYOK (Bring Your Own Key) setup, Pro subscription state, and dangerous account operations (Sign Out, Delete Account).

#### Visual Layout & Elements
* **Header:** Back button, Title "Preferences & Settings".
* **AI Coach Tone Selector (Segmented Cards):**
  * `Supportive`: Gentle, encouraging, positive reinforcement.
  * `Focused`: Direct, metric-driven, concise.
  * `Scientific`: Macro-focused, metabolic pathways, clinical precision.
* **Notification Preferences Section:**
  * Toggles: Water Reminders, Meal Reminders, Step Milestone Reminders, Streak Reminders, Weight Logging Reminders.
  * Schedule Row Items: Breakfast (08:30), Lunch (13:00), Dinner (19:30), Weight Check-in (07:30).
  * Quiet Hours (Do Not Disturb): Start (22:00) to End (07:00).
  * "Send Test Notification" action button.
* **Gemini AI BYOK Section:**
  * Status Badge: "Configured (Masked: `AIzaSy...4xQ`)" or "Not Configured".
  * "Manage Gemini API Key" button (Opens `BYOKSetupModal`).
* **Subscription & Pro Section:**
  * Active Plan Status (Free vs Pro).
  * "Manage Subscription" (Opens `ProPaywallModal`).
* **Account & Privacy Section:**
  * "Sign Out" button (Opens confirmation dialog).
  * "Delete Account" button (Red destructive style, opens `ConfirmationModal`).

### 3.2 State & Context Bindings
* **Context:** `useAuth()`, `useGoals()`, `useDailyLog()`, `usePro()`.
* **Services:** `NotificationStorage`, `NotificationScheduler`, `AIService`.

### 3.3 Test Cases: Happy Paths

| Test ID | Scenario | Actions | Expected Output |
|---|---|---|---|
| `PREF-001` | Change AI Tone | Select "Scientific" | Updates `userGoals.riaTone`; Ria AI assistant system prompt adopts clinical tone on next conversation. |
| `PREF-002` | Adjust Meal Reminder Time | Tap Breakfast time (08:30) | Opens `TimePickerModal`; select `07:45`; schedules OS notification at 07:45 AM daily; saves to `NotificationStorage`. |
| `PREF-003` | Toggle Off Water Reminders | Flip Water switch to Off | Cancels scheduled water notifications in Expo Notifications; persists setting in AsyncStorage. |
| `PREF-004` | Send Test Notification | Tap "Send Test Notification" | Schedules instant local notification; banner appears in OS notification tray. |
| `PREF-005` | Configure Gemini API Key | Tap "Manage Gemini API Key" | Opens `BYOKSetupModal`; enters key; validates; status badge turns green with masked key string. |

### 3.4 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `PREF-NEG-001` | Quiet Hours Inversion | Set Quiet Hours from 07:00 to 22:00 (daytime) | System handles inverted cross-midnight intervals via `isInsideQuietHours`; correctly silences daytime alerts. |
| `PREF-NEG-002` | Notification Permission Denied | Toggle reminder on when OS notifications blocked | OS permission prompt rejected; switch flips back to Off; displays alert guiding user to device Settings. |
| `PREF-NEG-003` | Delete Account Interruption | Confirm delete account during network timeout | Shows loading spinner; on timeout, displays error toast: "Deletion failed. Please try again." Does not sign out locally. |
| `PREF-NEG-004` | Revoking Gemini Key | User clears API key in BYOK modal | Key removed from SecureStore; status updates to "Not Configured"; AI features revert to default rate-limited pool. |
