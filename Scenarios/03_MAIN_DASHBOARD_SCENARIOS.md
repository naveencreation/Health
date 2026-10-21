# Calorify — Main Dashboard Scenarios & Test Case Matrix

> **Target Directory:** `src/screens/main/`  
> **Applicable SDK:** Expo SDK 57 / React Native 0.86 / React Native Reanimated  
> **Coverage:** 4 Primary Tabs (`TodayScreen`, `TrackerScreen`, `AnalyticsScreen`, `ProfileScreen`)

---

## 1. TodayScreen (`src/screens/main/TodayScreen.tsx`)

### 1.1 Architectural Role & Component Hierarchy
`TodayScreen` is the central daily nutrition dashboard. It features a high-performance 60fps UI-thread morphing header (`scrollY.value > 35`), date strip navigation, a hero calorie ring card with remaining budget telemetry, and 4 expandable meal sections (Breakfast, Lunch, Dinner, Snacks).

#### Visual Layout & Elements
* **Anchored Morphing Header:**
  * Top bar with greeting ("Good morning / afternoon / evening, {Name}").
  * Global Search button (`testID="btn-header-search"`).
  * Notification Bell icon with unread badge (`testID="btn-header-notifications"`).
  * User Avatar button with streak count badge (`testID="btn-header-avatar"`).
  * Sign In / Sign Out button (for guest users).
  * Header morphs in-place into a compact summary bar upon scrolling down past 35px.
* **TopDateStrip (`testID="component-date-strip"`):**
  * Horizontal scrollable date pills showing past 14 days and upcoming 7 days.
  * Active date highlighted; "Today" button returns immediately to current date.
* **HeroCalorieCard (`testID="component-hero-calorie"`):**
  * Animated circular SVG calorie ring.
  * Center Display: "1,240 kcal Remaining" (Base Goal - Food Consumed + Exercise Burned).
  * Horizontal Macro Progress Bars:
    * Protein: `110g / 150g` (Green fill).
    * Carbs: `160g / 220g` (Orange fill).
    * Fat: `45g / 65g` (Blue fill).
* **MealSection (4 Categories):**
  * `Breakfast`, `Lunch`, `Dinner`, `Snacks`.
  * Category Header: Meal name, consumed calories vs target, "+ Add Food" action button (`testID="btn-add-food-{mealType}"`).
  * Food Item Rows: Food title, portion amount (e.g. "2 eggs, 100g spinach"), calorie badge, delete/edit swipe actions.
* **Pull-to-Refresh:** Pull down triggers `RefreshControl` (750ms simulated sync).
* **AI Coach Floating Action:** Tap to launch `RiaChatModal`.

### 1.2 State & Context Bindings
* **Context:** `useDailyLog()` (`currentLog`, `selectedDate`, `addFoodItem`, `removeFoodItem`, `refreshDailyLog`), `useGoals()`.
* **Shared Values:** `scrollY`, `isScrolledSV`.
* **Local State:** `refreshing: boolean`, `isScrolled: boolean`.

### 1.3 Test Cases: Happy Paths

| Test ID | Scenario | Pre-conditions | Actions | Expected Output |
|---|---|---|---|---|
| `DASH-TD-001` | First-render hydration | Active user with daily log | Launch tab | Renders today's date, computes remaining calories accurately, expands meal cards. |
| `DASH-TD-002` | Morphing Header Animation | User at top of page | Scroll down past 35px | `scrollY > 35` triggers UI-thread transition: large greeting collapses into compact sticky title; search/avatar condense. |
| `DASH-TD-003` | Add Food from Breakfast card | Breakfast section visible | Tap "+ Add Food" on Breakfast card | Invokes `onAddFood('breakfast')`, opens `FoodLogModal` pre-selected to Breakfast meal slot. |
| `DASH-TD-004` | Date Switching | On today's date | Tap yesterday's pill in `TopDateStrip` | `selectedDate` updates; loads historical food log from SQLite/Firestore; calorie ring updates to past data. |
| `DASH-TD-005` | Pull to Refresh | Anywhere on scroll | Pull down list past threshold | `RefreshControl` activates, queries remote Cloud Firestore for latest changes, recalculates macros. |

### 1.4 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `DASH-TD-NEG-001` | Rapid Date Paging Spam | User rapidly taps 10 dates across date strip in 1 second | Async debounce prevents race conditions; UI cancels stale queries and displays exact target date log. |
| `DASH-TD-NEG-002` | Calorie Target Exceeded | Food logged exceeds target by 800 kcal | Hero card transitions smoothly: Remaining text changes to "800 kcal Over Budget" with alert accent color; ring fills 100% with warning ring. |
| `DASH-TD-NEG-003` | Zero Calorie Logging | User logs item with 0 kcal (e.g. Diet soda, black coffee) | Item accepts without division-by-zero error in macro percentage calculations. |
| `DASH-TD-NEG-004` | Delete Last Remaining Food Item | 1 item in Lunch; user deletes it | Meal card transitions cleanly to empty state ("No foods logged for lunch yet"); totals decrement to 0. |
| `DASH-TD-NEG-005` | Offline Cold Start | Launch app in Airplane mode | Displays locally cached SQLite log; non-intrusive offline indicator pill shown; no blocking crash. |

---

## 2. TrackerScreen (`src/screens/main/TrackerScreen.tsx`)

### 2.1 Architectural Role & Component Hierarchy
`TrackerScreen` serves as the holistic daily telemetry console, unifying hydration logging, body weight tracking, BMI categorization, and physical movement / step synchronization.

#### Visual Layout & Elements
* **TopDateStrip:** Shared date switcher synced with `TodayScreen`.
* **RiaCoachCard (`testID="component-ria-card"`):**
  * Dynamic AI motivational or behavioral prompt (e.g., "You're 400ml away from your hydration goal today!").
  * "Chat with Ria" button opens AI assistant.
* **WaterTracker (`testID="component-water-card"`):**
  * Quick-add cup buttons (+250ml, +500ml, +750ml).
  * Current volume vs daily target (e.g., `1,750 / 2,500 ml`).
  * Tap card opens full `WaterTrackerScreen`.
* **WeightTrackerCard (`testID="component-weight-card"`):**
  * Most recent logged weight, date logged, and delta from starting weight.
  * "+ Log Weight" button opens `LogWeightScreen`.
* **TodayBMICard (`testID="component-bmi-card"`):**
  * Calculated BMI value (e.g. `23.4`) with visual gauge bar and status pill ("Normal Weight").
* **MovementTrackerCard (`testID="component-movement-card"`):**
  * Daily step count (e.g. `7,420 / 10,000 steps`).
  * Calories burned & distance walked (`320 kcal · 5.2 km`).
  * Health Connect status sync badge (Green check for connected, sync icon for sync).

### 2.2 State & Context Bindings
* **Context:** `useDailyLog()`, `useGoals()`.
* **Local State:** `refreshing: boolean`.

### 2.3 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `TRACK-001` | Quick Water Add | Tap `+250ml` button | Water total increments by 250ml; haptic feedback triggers; water animation ripples. | - |
| `TRACK-002` | Open Weight Hub | Tap "Weight Tracker" card | Navigates to `WeightTrackerScreen` with full historical charts. | - |
| `TRACK-003` | Open Step Hub | Tap "Movement Tracker" card | Navigates to `StepTrackerScreen` with hourly step distributions. | - |
| `TRACK-NEG-001` | Rapid Water Button Spam | Tap `+250ml` 10 times consecutively | Transaction queue serializes increments; exactly 2,500ml added without state loss. | Concurrency lock. |
| `TRACK-NEG-002` | Health Connect Permission Revoked | User turns off step permission in Android Settings | Movement card displays "Permission needed" badge with "Reconnect" button; no crash. | Graceful permission degradation. |
| `TRACK-NEG-003` | No Weight Ever Logged | Fresh account with no weight entries | Weight card displays "No weight logged yet" with CTA "Record your starting weight". | Empty state handling. |

---

## 3. AnalyticsScreen (`src/screens/main/AnalyticsScreen.tsx`)

### 3.1 Architectural Role & Component Hierarchy
Provides retrospective reports and multi-domain trend analysis across Calories & Macros, Movement, Hydration, and Weight over weekly, monthly, and yearly timeframes.

#### Visual Layout & Elements
* **Header & Category Picker:**
  * Title: "Analytics & Trends".
  * Category Dropdown Trigger: Calories, Movement, Hydration, Weight (`ReportPickerModal`).
* **Timeframe Segmented Control:**
  * `Weekly` (Last 7 days) | `Monthly` (Last 30 days) | `Yearly` (Last 12 months).
* **Nutrition Domain Cards:**
  * `CalorieCompletionCard`: Daily bar chart showing calorie intake vs target line.
  * `MacroDistributionCard`: Donut chart of average macro percentages (Protein, Carbs, Fat).
* **Movement Domain Cards:**
  * `StepCompletionCard`: Daily step bars with 10k target indicator.
  * `StepCalorieBurnCard`: Active burn trends.
  * `StepTimeDurationCard`: Active minutes per day.
* **Hydration Domain Cards:**
  * `DrinkCompletionCard`: Hydration consistency percentage.
  * `HydrateVolumeCard`: Volume bar charts.
* **Weight Domain Cards:**
  * `WeightSummaryCard`: Net change, highest, lowest, average.
  * `WeightTrendCard`: Moving average trend line.
  * `BMIGaugeCard`: BMI progression over time.
* **Paywall Overlay (`ProPaywallModal`):**
  * Gating for Monthly/Yearly extended historical analytics for non-Pro users.
* **Empty State:** `EmptyAnalyticsState` shown when no logs exist for selected timeframe.

### 3.2 State & Context Bindings
* **Context:** `useDailyLog()`, `useGoals()`, `usePro()`.
* **State:** `selectedCategory: ReportCategory`, `timeframe: ReportTimeframe`, `pickerVisible: boolean`.

### 3.3 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `ANLY-001` | Switch Category to Hydration | Select "Hydration" from dropdown | Cards switch to Hydrate Volume, Drink Completion, and Drink Types breakdown. | - |
| `ANLY-002` | Switch Timeframe to Weekly | Select "Weekly" tab | Computes 7-day averages; X-axis renders Mon-Sun. | - |
| `ANLY-003` | Pro Gating on Yearly Timeframe | Free user selects "Yearly" | Displays locked blur overlay and prompts `ProPaywallModal`. | Monetization lock. |
| `ANLY-NEG-001` | Period With Zero Logs | Select category with no data | Renders `EmptyAnalyticsState` with clean icon and message "No data recorded for this period." | Zero chart division errors. |
| `ANLY-NEG-002` | Single Data Point in Trend | User has logged weight only once | Chart renders single dot with horizontal dashed reference line; does not attempt interpolation crash. | Single-point math safety. |
| `ANLY-NEG-003` | Month-to-Month Date Rollover | View monthly report during February leap year | Days calculated strictly based on calendar days in month without off-by-one errors. | Calendar leap year boundary. |

---

## 4. ProfileScreen (`src/screens/main/ProfileScreen.tsx`)

### 4.1 Architectural Role & Component Hierarchy
User identity, account management, subscription status, and navigation hub for profile subscreens (`GoalsScreen`, `MetabolicSummaryScreen`, `PreferencesScreen`, `AchievementCenterScreen`).

#### Visual Layout & Elements
* **ProfileHeaderCard (`testID="component-profile-header"`):**
  * Avatar with Edit Pencil overlay (Opens `AvatarPickerModal`).
  * User Display Name, Email, and Member Since date.
  * Pro Badge ("PRO MEMBER" in Gold, or "FREE PLAN" with "Upgrade" CTA).
  * Current Streak Count badge (e.g. "🔥 14 Days").
* **ProMembershipCard (`testID="component-pro-banner"`):**
  * Highlights active subscription perks or triggers upgrade flow.
* **ProfileQuickNavGrid (4 Navigation Tiles):**
  * `Goals`: Calorie & macro targets, target weight.
  * `Metabolic Summary`: BMR, TDEE, Mifflin-St Jeor details.
  * `Preferences`: Notification schedules, sound/haptic toggles, units.
  * `Awards`: Achievement badges, trophies, streaks (`AchievementCenterScreen`).
* **ProfileMetricInspector:**
  * Quick-view cards: Height, Current Weight, BMI, Target Weight, Activity Multiplier.
* **Account Action Buttons:**
  * "Sign Out" button (Triggers confirmation alert).
  * "Delete Account" button (Triggers destructive warning dialog).
* **Slide-In SubScreen Manager:**
  * `SlideInSubScreen` manages nested views (`navStack`) with native Android back-handler interception.

### 4.2 State & Context Bindings
* **Context:** `useAuth()`, `useGoals()`, `usePro()`.
* **Local State:**
  * `navStack: Exclude<ProfileSubView, 'main'>[]`
  * `closingView: Exclude<ProfileSubView, 'main'> | null`
  * `avatarPickerVisible: boolean`
  * `paywallVisible: boolean`

### 4.3 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `PROF-001` | Open Goals Subscreen | Tap "Goals" tile in QuickNavGrid | Pushes `'goals'` to `navStack`; `GoalsScreen` slides in smoothly from right. | - |
| `PROF-002` | Open Avatar Picker | Tap avatar image | Opens `AvatarPickerModal`; user chooses preset avatar; profile updates immediately. | - |
| `PROF-003` | Subscreen Back Navigation | User inside `MetabolicSummaryScreen` | Tap top back button or Android hardware back | Pops subscreen; returns to main `ProfileScreen` without exiting app or reloading. | Backstack management. |
| `PROF-004` | Sign Out Flow | Tap "Sign Out" | Displays confirmation dialog: "Are you sure you want to sign out?"; upon confirm, clears session and returns to `WelcomeScreen`. | Session termination. |
| `PROF-NEG-001` | Sign Out While Offline | Tap "Sign Out" with no internet | Local auth token cleared; cached private session destroyed; redirects to Welcome without hanging. | Safe offline logout. |
| `PROF-NEG-002` | Rapid Subscreen Tapping | Double-tap "Goals" and "Preferences" simultaneously | `handleOpenSubView` deduplicates; only the first tapped screen opens; prevents corrupt stacked animation. | Concurrency guard. |
| `PROF-NEG-003` | Delete Account Re-Authentication | Tap "Delete Account" | If Firebase session is stale, intercepts with `auth/requires-recent-login` prompt asking user to re-authenticate before deletion. | Security compliance. |
