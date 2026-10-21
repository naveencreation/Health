# Calorify — Health & Domain Trackers Scenarios & Test Case Matrix

> **Target Directories:** `src/features/hydration/`, `src/features/movement/`, `src/features/weight/`, `src/features/gamification/`, `src/features/health/`  
> **Applicable SDK:** Expo SDK 57 / React Native 0.86 / Health Connect  
> **Coverage:** 11 Health & Tracker Hub Screens

---

## 1. Hydration Hub: WaterTrackerScreen, WaterIntakeHistoryScreen, WaterReportScreen

### 1.1 Architectural Role & Component Hierarchy
Manages fluid intake telemetry across cup sizes, beverage types (water, tea, coffee, electrolytes), historical log audits, reversible undo toasts, and hydration volume reports.

#### Visual Layout & Elements
* **WaterTrackerScreen (`src/features/hydration/screens/WaterTrackerScreen.tsx`):**
  * `TopDateStrip`: Calendar navigation; future date logging explicitly blocked (`isFutureDate`).
  * `HeroDropletCard`: Animated filling droplet SVG, percentage of daily goal, remaining ml.
  * Container Quick-Add Bar: Current cup size preset (e.g. 300ml Glass), tap to log instantly.
  * "Choose Container / Beverage" CTA: Opens `CupSizeModal` (150ml Espresso, 250ml Mug, 300ml Glass, 500ml Bottle, 750ml Shaker, 1000ml Jug).
  * Quick Actions: "View History" (slides in `WaterIntakeHistoryScreen`), "Weekly Report" (slides in `WaterReportScreen`), "Goal Settings" (opens `DailyWaterGoalModal`).
  * Reversible Undo Toast: Slides in for 4 seconds after every log ("Added 300ml Water · [Undo]").
* **WaterIntakeHistoryScreen (`src/features/hydration/screens/WaterIntakeHistoryScreen.tsx`):**
  * Chronological list of logged beverages with timestamps and milliliter badges.
  * Swipe-to-delete or trash icon to remove erroneous entries.
* **WaterReportScreen (`src/features/hydration/screens/WaterReportScreen.tsx`):**
  * Daily completion consistency bar chart.
  * Beverage distribution breakdown (Water % vs Coffee % vs Tea %).

### 1.2 Test Cases: Happy Paths

| Test ID | Scenario | Actions | Expected Output |
|---|---|---|---|
| `HYD-001` | Quick Cup Log | Tap "+300ml" quick log button | Daily total increments by 300ml; droplet water level rises with spring physics; undo toast displays. |
| `HYD-002` | Change Cup Size Preset | Open `CupSizeModal`, select "500ml Bottle" | Default button updates to "+500ml"; saved to AsyncStorage `@calori_water_cup_pref`. |
| `HYD-003` | Reversible Undo Action | Log 500ml, tap "Undo" on toast within 4 seconds | 500ml decremented immediately; droplet reverts; toast dismisses. |
| `HYD-004` | Delete Past Log Entry | Open `WaterIntakeHistoryScreen`, delete 250ml entry | Entry removed from list; daily total decrements; reflects across dashboard. |

### 1.3 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `HYD-NEG-001` | Future Date Logging Block | Navigate to tomorrow's date on date strip | Quick-add button disabled; warning pill: "Cannot log water for future dates." |
| `HYD-NEG-002` | Extreme Daily Total Overflow | Log 15,000ml of water in a single day | Droplet caps visually at 100% full; text counter shows exact total; health advisory warning appears above 5,000ml. |
| `HYD-NEG-003` | Undo After Timer Expiry | Tap "Undo" at 4.2 seconds while toast is fading out | No-op; toast completes dismiss; entry remains recorded safely in database. |
| `HYD-NEG-004` | Deleting All Daily Entries | Delete all entries in `WaterIntakeHistoryScreen` | Daily water resets to 0ml; list displays clean empty state graphic. |

---

## 2. Movement Hub: StepTrackerScreen & StepReportScreen

### 2.1 Architectural Role & Component Hierarchy
Connects to Google Health Connect (Android 14+) to read real-time step counts, computes active walking calories and distances, provides manual log fallbacks, and executes 48-hour rolling sync and 7-day historical backfill.

#### Visual Layout & Elements
* **StepTrackerScreen (`src/features/movement/screens/StepTrackerScreen.tsx`):**
  * `TopDateStrip`: Date selector.
  * `HeroStepCard`: Dynamic step dial (e.g. `8,450 / 10,000 steps`), active calorie burn (`380 kcal`), distance (`6.1 km`).
  * `HealthConnectSyncCard`:
    * Connected state: "Health Connect Active · Last synced 2m ago".
    * Disconnected state: "Sync Steps Automatically" with "Connect Health" action button.
  * `StepHistoryCard`: Hourly step buckets (Morning, Afternoon, Evening) or manual entry list.
  * Report CTA: Opens `StepReportScreen`.
* **StepReportScreen (`src/features/movement/screens/StepReportScreen.tsx`):**
  * Weekly bar chart of daily steps vs 10,000 goal line.
  * Best day callout ("Saturday: 14,210 steps").
  * Total weekly distance and estimated fat burn calories.

### 2.2 Test Cases: Happy Paths

| Test ID | Scenario | Actions | Expected Output |
|---|---|---|---|
| `MOV-001` | Automatic Health Connect Sync | Open tab with Health Connect permission granted | Reads sensor step records; updates `displaySteps`; active burn calories added to calorie budget. |
| `MOV-002` | Rolling 48-Hour Sync | Open tab after 24h absence | Syncs yesterday and today's steps in background; updates both daily logs in SQLite/Firestore. |
| `MOV-003` | 7-Day Initial Backfill | Connect Health Connect for first time | `backfillPastSevenDays()` queries historical records and populates previous 7 days in `dailyLogs`. |

### 2.3 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `MOV-NEG-001` | Health Connect Not Installed | Device running Android 13 without Health Connect app | Displays helpful card: "Health Connect app required. Tap to install from Google Play Store." |
| `MOV-NEG-002` | User Revokes Permission in OS Settings | Revoke step read permission while app is running | Next sync catches permission denial; displays reconnect prompt; does not throw unhandled promise rejection. |
| `MOV-NEG-003` | iOS Execution Safeguard | Run screen on iOS simulator/device | Platform check (`Platform.OS !== 'android'`) renders fallback message: "Health Connect is only available on Android." |
| `MOV-NEG-004` | Duplicate Sync Records | Health Connect returns overlapping records for same hour | Aggregation query deduplicates by record ID or timestamps; prevents double-counting step counts. |

---

## 3. Weight Hub: WeightTrackerScreen, LogWeightScreen, WeightHistoryScreen, WeightReportScreen

### 3.1 Architectural Role & Component Hierarchy
Tracks body mass changes over time, computes clinical BMI categories, maintains timestamped weighing logs with notes, and renders moving average trend lines.

#### Visual Layout & Elements
* **WeightTrackerScreen (`src/features/weight/screens/WeightTrackerScreen.tsx`):**
  * `HeroWeightCard`: Current weight (kg/lbs), total loss/gain delta since start, progress percentage toward goal weight, BMI category pill.
  * Action Buttons: "+ Log Today's Weight" (`LogWeightModal` / `LogWeightScreen`), "Full History" (`WeightHistoryScreen`), "Trends & Analysis" (`WeightReportScreen`).
  * `WeightHistoryCard`: Snippet of last 3 weighing records.
* **LogWeightScreen (`src/features/weight/screens/LogWeightScreen.tsx`):**
  * Precision numeric stepper / ruler input.
  * Date & Time picker (defaults to now).
  * Optional Note field (e.g. "Morning weigh-in, fasted").
* **WeightHistoryScreen (`src/features/weight/screens/WeightHistoryScreen.tsx`):**
  * Complete chronological log of every weight record.
  * Edit entry modal trigger and swipe-to-delete.
* **WeightReportScreen (`src/features/weight/screens/WeightReportScreen.tsx`):**
  * Trend Line Chart: Daily weigh-ins overlaid with 7-day smoothed moving average.
  * Milestone badges (e.g. "Lost 5% Body Weight").

### 3.2 Test Cases: Happy Paths

| Test ID | Scenario | Actions | Expected Output |
|---|---|---|---|
| `WGT-001` | Log New Weight | Enter `73.5 kg`, note "Fasted", tap Save | Saves weight entry; updates `currentWeightKg` in context; recalculates BMI and target delta; updates hero card. |
| `WGT-002` | Delete Erroneous Weight Entry | In `WeightHistoryScreen`, delete anomalous `95 kg` record | Record deleted; previous valid weight restored as current weight; trend line recalculates. |
| `WGT-003` | Reversible Undo Toast | Delete weight entry, tap "Undo" | Entry restored to database; history list updates seamlessly. |

### 3.3 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `WGT-NEG-001` | Unrealistic Weight Entry | Enter `15 kg` or `450 kg` | Input validation prompts warning: "Please enter a realistic weight between 30 kg and 300 kg." |
| `WGT-NEG-002` | Multiple Weigh-ins on Same Day | User logs weight at 8:00 AM (74.0 kg) and 8:00 PM (74.8 kg) | Both records saved with timestamps; dashboard daily metric uses latest or daily average based on setting. |
| `WGT-NEG-003` | Target Weight Reached | Current weight hits or surpasses target weight | Triggers congratulations celebration banner: "Goal Achieved! You reached your target weight of 68.0 kg!" |

---

## 4. Gamification: AchievementCenterScreen (`AchievementCenterScreen.tsx`)

### 4.1 Architectural Role & Component Hierarchy
Evaluates and rewards user consistency, streaks, hydration milestones, and nutritional balance using `AchievementEvaluator` engine.

#### Visual Layout & Elements
* **Header:** Back button, Title "Achievements & Awards".
* **Streak Hero:** `StreakFlameBadge` showing active consecutive daily streak with animated flame.
* **Category Tabs:** `All` | `Streaks` (`consistency`) | `Nutrition` | `Hydration` | `Movement`.
* **Badge Grid:**
  * Unlocked Badges: Vibrant full-color badge, title, unlock date, achievement description.
  * Locked Badges: Grayscale badge with progress bar (e.g. "5 / 7 Days Logged").
* **Celebration Overlay (`CelebrationModal`):**
  * Confetti animation, sound/haptic fanfare, badge reveal, "Share Milestone" button.

### 4.2 Test Cases & Negative Paths

| Test ID | Scenario | Pre-conditions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `GAM-001` | 7-Day Streak Unlock | User logs 7th consecutive day | `AchievementEvaluator` detects condition; unlocks "7-Day Streak" badge; triggers `CelebrationModal`. | - |
| `GAM-002` | Filter by Nutrition | Tap "Nutrition" tab | Filters grid to show only meal/macro badges (e.g. "Protein Master", "Clean Eater"). | - |
| `GAM-NEG-001` | Streak Broken After Inactivity | User misses 2 consecutive days | Streak resets to 0; streak flame changes to dormant grey; historical unlocked badges remain permanently earned. | Streak reset integrity. |
| `GAM-NEG-002` | Celebration Modal Double Trigger | 2 badges unlocked simultaneously | Modal queues celebrations sequentially; dismiss of first badge smoothly displays second badge. | Modal stacking guard. |

---

## 5. Health Screen: HealthScreen (`HealthScreen.tsx`)

### 5.1 Architectural Role & Component Hierarchy
Standalone diagnostics and connection verification screen for Health Connect permissions, status checks, and raw step telemetry.

#### Visual Layout & Elements
* Back button (`onBack`).
* Platform safeguard banner (if running on iOS).
* Title: "Today's Steps".
* Large numeric readout of current sensor steps.
* Diagnostic status message (`message`).
* "Connect Health Connect" CTA button.

### 5.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `HLT-001` | Connect & Query Steps | Tap "Connect Health Connect" on Android | Requests permissions, queries records, updates numeric step readout, displays success status. | - |
| `HLT-NEG-001` | iOS Simulator Launch | Launch on iOS | Renders warning: "Health Connect is only available on Android." Button is disabled. | Platform branching. |
