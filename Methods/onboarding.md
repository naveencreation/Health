---
description: Calorify onboarding spec. Flow, screens, copy, data model, calculator changes, auth, scan limits, permissions, analytics, build phases. Use when touching onboarding, auth, paywall, permissions or first-run Home.
globs: src/features/onboarding/**,src/screens/auth/**,src/features/subscription/**,src/services/payments/**
alwaysApply: false
trigger: model_decision
---

# Calorify Onboarding Spec

## 0. Agent rules (read first)

- Read `AGENTS.md` and `MEMORY.md` before changing anything. Read the Expo v57 docs referenced in `AGENTS.md`.
- Run `npx tsc --noEmit` before tests. Run tests only if it passes.
- Work one phase at a time (section 12). Finish, verify, report, then wait for the next phase.
- Do not add dependencies without asking first. Candidates flagged below: Google sign-in library, `expo-notifications`.
- Follow `DESIGN.md` tokens. No hardcoded colors or fonts outside the theme. Urbanist everywhere, Kurale only for the logo wordmark.
- Reuse existing components: `OnboardingHeader`, `PlanCalculationStep`, `CelebrationModal`, `ProPaywallModal`, `ProGate`, `usePro`, `FoodVisionModal`, `FoodLogModal`.
- Do not rename the npm package, slug or Android package id. Only change user-facing strings to "Calorify" (the app currently shows "Calori" in places).
- Do not change `firestore.rules` without showing the diff and asking.
- Android only for now. No iOS or HealthKit work.
- Every new pure function gets a unit test (calculator, draft persistence, scan limiter, checklist ordering).

## 1. Locked decisions

- App name: Calorify.
- Platform: Android first.
- Auth: email + password AND Google sign-in. Plus anonymous guest, upgradeable to either.
- Free tier: 5 AI scans per day. Pro: unlimited scans. Manual logging is always free.
- Paywall: soft, shown once, after the first meal win and signup. Dismissible.
- Permissions: asked in context, one at a time, each with a primer. Never bundled.

## 2. Principles

1. Sell the outcome, not features. Show the product working on screen one.
2. Aha moment = first logged meal, not the plan screen.
3. Personalize, then show what the answers unlocked.
4. Value before signup. Account request comes after the first win.
5. Long flow must feel short: one question per screen, one tap or picker, animation, conversational copy.
6. Primer screen before every system permission dialog, at the moment of need.
7. Paywall is tied to the user's own plan and has a visible exit.
8. Human touch: personal name in copy, a short founder note after signup.
9. First-run Home uses a checklist, not popups or tours.

## 3. Global UI rules

- Background `#FAF9F6`, primary coral `#F47551`. Macro colors: protein green, carbs yellow, fat coral (from `DESIGN.md`).
- Header: 38dp circular back button, section progress bar. No "Step X of 7" text.
- Progress sections: About you (S2, S5, S6), Your goal (S3, S4, S7, S9), Your lifestyle (S8, S10), Your plan (S11, S12).
- Light haptic on every selection. Success haptic on wins.
- Primary button fixed at bottom, in thumb reach. Disabled until the screen is valid.
- Hardware back pops one step. On the first step it returns to Welcome.
- Every answer is saved to the local draft immediately (section 5).
- Respect reduced-motion settings. Animations must not block input.
- Copy uses `{name}` when known. Fallback is "friend".

## 4. Flow overview

```
S0 Splash
S1 Welcome
S2 Name
S3 Goal
S4 What gets in the way
S5 Sex + Age
S6 Height + Weight
S7 Target weight        (skip if goal = maintain)
S8 Activity level
S9 Pace                 (skip if goal = maintain)
S10 Food style + meals
S11 Building plan
S12 Plan reveal
S13 First meal win
S14 Signup (email / Google / guest)
S15 Paywall (once)
S16 Permissions (distributed, in context)
S17 First-run Home with checklist
```

Entry routing at launch:
- Signed in with a profile -> Home.
- Signed in without a profile -> resume or start onboarding at S2.
- Draft exists -> resume at the saved step.
- Otherwise -> S1.
- "Sign in" from S1 -> sign in. If the account has a profile, skip onboarding. If it has none, run onboarding from S2.

## 5. Data model

```ts
type Goal = 'lose_weight' | 'maintain' | 'gain_muscle';
type GoalIntent = 'lose' | 'maintain' | 'build' | 'understand';
type Sex = 'female' | 'male' | 'prefer_not_to_say';
type Pace = 'gentle' | 'steady' | 'faster';
type FoodStyle = 'vegetarian' | 'eggetarian' | 'non_veg' | 'vegan' | 'no_preference';
type Struggle =
  | 'home_cooked' | 'portions' | 'eating_out' | 'consistency'
  | 'protein' | 'late_snacking' | 'not_sure';

interface OnboardingDraft {
  version: 1;
  step: string;                 // last completed step id
  startedAt: number;
  name?: string;
  goal?: Goal;
  goalIntent?: GoalIntent;
  struggles?: Struggle[];       // max 3
  sex?: Sex;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  units?: { height: 'cm' | 'ft'; weight: 'kg' | 'lbs' };
  targetWeightKg?: number;
  activityLevel?: ActivityLevel;
  pace?: Pace;
  foodStyle?: FoodStyle;
  mealTimes?: { breakfast: string; lunch: string; dinner: string }; // 'HH:mm'
  skipsBreakfast?: boolean;
  snacks?: boolean;
  firstMeal?: PendingMeal;      // logged before signup, migrated after
}
```

- Storage key: `onboarding_draft_v1` in AsyncStorage. Delete it after the profile is saved to Firestore.
- Profile saved to `users/{uid}` after signup using existing Firestore paths. Check `firestore.rules` and `ARCHITECTURE.md` for the current shape before writing.
- Unit defaults come from device region (metric for India).

## 6. Calculator changes (`onboardingCalculator.ts`)

Keep Mifflin-St Jeor, activity multipliers, macro logic, safety floors, water and steps. Add:

- `activityLevel` is now required from onboarding (remove the hardcoded moderate default for the onboarding path).
- `pace` parameter.
  - Lose: deficit of TDEE: gentle 10%, steady 20%, faster 25%. Apply the safety floor after.
  - Gain: surplus kcal: gentle +150, steady +300, faster +450.
  - Maintain: ignores pace.
- `estimatedWeeksToGoal`:
  - Lose: `diffKg / (((tdee - budget) * 7) / 7700)` using the budget after the floor.
  - Gain: fixed rates 0.15 / 0.25 / 0.35 kg per week.
- Add `goalDate` (today + weeks) to the returned plan.
- Add `previewPlans(input)` returning all three pace results for S9 in one call.
- Target-weight guardrail helper: `minSafeTargetKg(heightCm)` = weight at BMI 18.5. Clamp lose targets to it.
- Age policy:
  - Under 13: block onboarding with a friendly message. (Default, confirm.)
  - 13 to 17: force goal `maintain`, skip S7 and S9, show the message in S5.
  - Update the current `Math.max(12, ...)` clamp to match.
- Sex `prefer_not_to_say` uses the existing "other" midpoint formula. Review the safety floor for this case.
- Tests: every goal x pace x sex combination, floor behavior, age policy, weeks calculation.

## 7. Screens

### S0 Splash (about 1.5s)
- Native and animated splash share the cream background (no flash).
- Coral ring draws itself like a plate rim (SVG stroke). Three arcs fill: green, yellow, coral. "Calorify" wordmark (Kurale) fades in beneath. Soft haptic when the ring completes.
- No text, no spinner.
- Meanwhile: load fonts, check session, read draft. Route per section 4. If everything is ready early, shorten the animation.

### S1 Welcome
- Looping auto-play demo in a phone frame: meal photo -> scan line sweeps -> chips pop ("Masala dosa . 168 kcal") -> macro bars fill. Use local/regional dishes. Local assets only, no network.
- Headline: "Know what's on your plate in 3 seconds."
- Subline: "Snap it. Log it. Hit your goal. Built around the food you actually eat."
- Small line: "About 2 minutes. No account needed yet."
- Buttons: Get Started (primary), "Already have an account? Sign in".
- Remove "Explore as Guest" demo login from production. Keep it behind `__DEV__` only.

### S2 Name
- Title: "First things first, what should we call you?"
- Single text field, auto-focus, helper "Just a first name or nickname is fine."
- Continue shows a 1s full-screen "Nice to meet you, {name}." transition.
- Skippable. Fallback "friend".
- Saves: `name`. Prefills signup later.

### S3 Goal
- Title: "What brings you here, {name}?"
- Four large cards:
  - Lose weight -> `lose_weight`, intent `lose`
  - Maintain my weight -> `maintain`, intent `maintain`
  - Build muscle -> `gain_muscle`, intent `build`
  - Just understand what I eat -> `maintain`, intent `understand`
- Tap: scale + haptic + one reassurance line under the card (e.g. lose: "We'll set a gentle calorie budget you can actually stick to."). Auto-advance after ~300ms.
- Saves: `goal`, `goalIntent`. Branching: maintain skips S7 and S9.

### S4 What gets in the way
- Title: "What usually makes tracking hard?"
- Multi-select chips, max 3:
  - Home-cooked food, no idea of calories
  - Portion sizes
  - Eating out or ordering in
  - Staying consistent
  - Getting enough protein
  - Late-night snacking
  - Not sure where to start
- After each pick, a reassurance line appears (e.g. portions: "Scan estimates portions for you, no weighing.").
- Continue enabled after at least one pick.
- Saves: `struggles`. Used by S12 insight, S15 benefits, S17 checklist order, reminder copy.

### S5 About you (sex + age)
- Title: "A little about you."
- Sex selector: Female / Male / Prefer not to say. Note: "Only used for your calorie math. Never shown or shared."
- Age wheel picker, default 25.
- Age policy from section 6 applies (message shown inline for 13 to 17, block for under 13).
- Saves: `sex`, `age`.

### S6 Body (height + weight)
- Title: "Your starting point."
- Reuse the existing Height and Weight pickers (drag-spring feel). Unit toggle defaults from region.
- Subtext: "This only sets your starting numbers. You can change it anytime."
- No BMI display. No judgmental wording.
- Saves: `heightCm`, `weightKg`, `units`.

### S7 Target weight (lose or build only)
- Title: "Where would you like to be?"
- Slider starting at current weight.
- Live feedback card while dragging: "-5 kg . about 10 weeks at a steady pace . around 14 Dec." (Uses steady pace for the preview.)
- Guardrail: lose targets clamp at `minSafeTargetKg`. Show: "That's below a healthy range for your height, so let's aim for {x} kg." Calm tone, not an error.
- Saves: `targetWeightKg`.

### S8 Activity level
- Title: "How active is a normal week?"
- Four cards, plain language:
  - Mostly sitting: desk job, little exercise
  - Light: walks or 1 to 3 workouts a week
  - Moderate: 3 to 5 workouts, or on your feet most of the day
  - Very active: daily training or a physical job
- After selecting, a chip shows the effect: "Daily step goal: 8,000."
- Saves: `activityLevel`.

### S9 Pace (lose or build only)
- Title: "How fast do you want to go?"
- Three cards from `previewPlans`, each showing kcal/day and goal date. Steady is pre-selected and labeled "Recommended".
- If the safety floor was hit, show "We keep this at a safe minimum."
- Saves: `pace`.

### S10 Food style + meal rhythm
- One screen, two sections.
  - Food style chips: Vegetarian / Eggetarian / Non-veg / Vegan / No preference.
  - Meal times: Breakfast, Lunch, Dinner time pickers with defaults (08:30, 13:00, 20:00). Toggles: "I skip breakfast", "I snack between meals".
- Use: food style tunes quick-pick foods and protein suggestions. Meal times drive Home sections and reminder times.
- Saves: `foodStyle`, `mealTimes`, `skipsBreakfast`, `snacks`.

### S11 Building your plan (about 3s)
- Rotating coral ring. Four lines tick in with a check and light haptic each:
  - Reading your answers, {name}
  - Working out your metabolism
  - Balancing protein, carbs and fat
  - Setting a pace for your goal
- Max 3.5s. Calculation is instant, this is presentation only.

### S12 Plan reveal
- Title: "{name}, your plan is ready."
- Hero: calorie number counts up inside a segmented ring (protein green, carbs yellow, fat coral).
- Three macro tiles (grams). Chips: water target, step goal.
- Goal line: "On track for {target} kg by {goalDate}." (lose/build only.)
- Personal insight card keyed to the first struggle (S4). Examples:
  - portions: "You said portions are hard. Scan estimates them from a photo, so you don't have to weigh your food."
  - protein: "Your protein target is {x} g. We'll show how close you are after every meal."
  - consistency: "We'll nudge you at your meal times, not randomly."
- Expandable "How we calculated this": Mifflin-St Jeor, activity level, pace. Footer: "Estimates, not medical advice."
- Actions: "Log my first meal" (primary), "Adjust my plan" (text link, opens manual calorie/macro edit).

### S13 First meal win
- Title: "Let's log your first meal, {name}." Subtext: "Takes about 10 seconds."
- Three cards:
  - Scan a meal (primary)
  - Search food
  - Quick pick: 4 to 6 starter foods by food style and time of day (e.g. idli, dosa, chapati, eggs). One tap logs a standard portion.
- Editable meal-slot chip guessed from the clock: "Logging as: Lunch."
- Camera: show the primer sheet first (S16). Decline falls back to Search, no guilt copy.
- Scan counts toward the 5/day limit (section 9). Show "N of 5 scans left today" in the scan UI.
- Result card: dish, kcal, three macros in brand colors, portion editable (slider or +/-). Button "Add to {meal}".
- Personal line under the result, from S4 struggle (e.g. "Home-cooked is hard to estimate, so we show a range you can adjust" or "{x} g protein, {y}% of today's target").
- Win moment: calorie ring animates from empty to the logged amount, "{kcal} of {budget} kcal", success haptic, brief `CelebrationModal` (under 2s), Day 1 streak flame lights. Message: "First meal logged. That's {pct}% of your day done in one tap."
- Meal is stored in `draft.firstMeal` and saved locally. It is migrated to the account at signup.
- "Skip for now" goes to S14, and the checklist keeps "log first meal" open.

### S14 Save your plan (signup)
- Title: "Save your plan, {name}." Subtext: "So your numbers and your first meal are never lost."
- Summary card: plan (calories, goal date) and "1 meal logged". Real data only.
- Options:
  - Continue with Google (primary).
  - Email + password form: name (prefilled), email, password. No confirm-password field. Show/hide toggle. Live requirement ticks as the user types.
  - "Continue without an account" (secondary) -> anonymous guest.
- One line: "Your data stays private. We never sell it." Links to Privacy and Terms.
- Errors are inline and friendly. "That email is already registered. Sign in instead?" with one-tap switch that keeps the draft.
- After success: profile written, first meal migrated, draft cleared.
- Founder note (about 3s, tap to continue): handwritten-style signature and one small hand-drawn element. Example: "Hi {name}, thanks for trusting Calorify with your food. I built it because tracking should take seconds, not minutes. Tell me what's missing. - Naveen"
- Email verification is sent in the background. Never block onboarding on it.
- No social-proof numbers until real ones exist.

### S15 Paywall (soft, once)
- Shown right after S14, never before the first meal. Reuse `ProPaywallModal`.
- Headline tied to goal: lose/build: "{name}, reach {target} kg by {goalDate} with Pro." Maintain: "Hit {protein} g protein every day."
- Exactly 3 benefits, chosen from S4:
  - portions or home_cooked -> Unlimited AI meal scans (pass as `highlightFeature`)
  - consistency -> Adaptive macro coaching
  - protein -> Smart protein tracking and suggestions
  - everyone else -> Deep trends (30-day, monthly)
- Plans: yearly (pre-selected, shows per-month price and savings badge) and monthly. Prices come from `paymentService` in local currency. Never hardcode prices.
- Trial timeline: "Today: full access free. Day 5: we remind you. Day 7: billing starts. Cancel anytime." Only show this if the real plan has a trial.
- Free tier line: "Free: 5 scans a day and full manual logging."
- Buttons: "Start 7-day free trial" (primary), "Maybe later" (equal readability, visible from the first second), Restore purchases, Terms, Privacy.
- After "Maybe later": do not show the paywall again in onboarding. Pro is shown later only at contextual moments (scan limit hit, deep trends tab).
- No one-time-offer mechanics at launch.

### S16 Permissions (in context)
Replace the bundled `PermissionPrimerStep` with three separate moments. Each has a primer sheet first, then the system dialog. Ask each at most once in onboarding. Never block progress on a denial.

- Camera: at first scan (S13). Primer: "Scan needs your camera to recognise your food." Add one accurate line about what happens to the photo (verify against the actual `GeminiProvider` flow before writing it).
- Notifications (Android 13+ `POST_NOTIFICATIONS`): on first Home visit after the first log.
  - Primer: "Want a nudge at meal times, {name}?" with a mock of the real notification (e.g. "12:45 . Lunch time? Snap it in 3 seconds.").
  - Toggles before the system dialog: Meal reminders (from S10 times, 15 min before), Streak protection (evening, only if nothing logged that day). Water reminders default off.
  - If declined: no re-ask in onboarding. After 3 days show one in-app banner linking to Settings.
  - `expo-notifications` is not in `package.json`. Check what `src/services/notifications` uses. Ask before adding a dependency.
- Steps (Health Connect): from the Home checklist item "Connect steps". Primer: "Connect your steps to track your {stepGoal} daily goal automatically." Use the existing `requestStepsPermission`. Denial leaves manual steps.

### S17 First-run Home
- Greeting: "Good {morning|afternoon|evening}, {name}."
- Hero calorie card shows the first meal and remaining kcal. Day 1 streak flame beside it.
- Meal sections use the user's meal times. The upcoming slot is highlighted with a soft prompt.
- Getting-started checklist card:
  1. Plan created (done)
  2. First meal logged (done, or open if skipped)
  3. Log your next meal
  4. Add a glass of water
  5. Turn on reminders
  6. Connect steps
  - Items complete themselves when the real action happens (tick animation + haptic). Header shows "2 of 6".
  - Order adapts: struggle `protein` adds "See your protein target" near the top. Struggle `consistency` moves "Turn on reminders" up.
  - Persisted across sessions. Dismissible. Still reachable from Profile.
  - On completion: one celebration, then the card disappears.
- No popups or tours. At most one tooltip at a time (e.g. on the quick-add button, first time only). Empty states for water, steps, weight carry a small inline prompt.
- AI chat shows one suggested first question tied to the user's struggle. Passive only.

## 8. Auth

- Providers: Firebase Auth email/password, Google, anonymous.
- Anonymous session is created lazily at the first scan or at "Continue without an account". Do not create one on app open.
- Upgrade path: `linkWithCredential` for both email and Google so the same uid keeps its data.
- If the credential already belongs to another account (`auth/credential-already-in-use` or `email-already-in-use`): sign in to that account and attach the local draft meal to it. Never lose the first meal.
- Google on Android needs: a native Google sign-in library, the web client ID, and SHA-1/SHA-256 fingerprints added in Firebase. This needs a dev build (the project already uses `expo run:android`). Propose the library and wait for approval before installing.
- Guests see a quiet "Save your progress" card on Home after 3 days.
- Password reset: keep the existing `ForgotPasswordScreen`.

## 9. Scan limit (5 per day)

- Free: 5 AI scans per local day. Pro: unlimited. Applies to guests and signed-in users.
- Counter keyed by `uid` + date, stored in Firestore under the user, incremented on each scan attempt that reaches the AI call.
- Client `AIRateLimiter` is not enough on its own because it can be bypassed. Propose a server-side enforcement approach (Firestore rules or a function) and ask before changing rules or adding backend pieces.
- Show remaining scans in the scan UI. Failed scans (network or AI error) do not consume a scan.
- At limit: open `ProPaywallModal` with `highlightFeature` = "Unlimited AI Meal Vision". Search and manual logging stay available.
- Reset at local midnight. Handle timezone changes gracefully.

## 10. Analytics events

Use the project's existing analytics approach. If none exists, propose Firebase Analytics and ask first.

- `onboarding_started`, `onboarding_resumed`, `onboarding_step_viewed {step}`, `onboarding_step_completed {step, ms}`, `onboarding_abandoned {step}`
- `scan_started`, `scan_succeeded`, `scan_failed {reason}`, `scan_limit_hit`
- `first_meal_logged {method, ms_since_start}`
- `signup_started {method}`, `signup_completed {method}`, `guest_continued`, `guest_upgraded {method}`
- `paywall_viewed {source}`, `paywall_trial_started {plan}`, `paywall_dismissed {source}`
- `permission_primer_viewed {permission}`, `permission_accepted {permission}`, `permission_declined {permission}`
- `checklist_item_completed {item}`, `checklist_completed`

No personal data (name, weight, age) in event params.

## 11. Edge cases

- App killed mid-onboarding: resume at the last completed step with all answers intact.
- Back after a branch: S7 and S9 are skipped both forward and backward for maintain.
- Unit toggle changes never alter the stored metric value.
- Offline: onboarding and manual logging work fully. Scan shows a clear offline message. Signup queues or shows a retry.
- Camera denied permanently: primer offers "Open Settings" and falls back to Search.
- Very small screens: all screens scroll, button stays reachable. Test at 320dp width and with large font scale.
- TalkBack: every card and chip has `accessibilityRole` and `accessibilityLabel`. Selection state is announced.

## 12. Implementation phases

Complete one phase per task. Run `npx tsc --noEmit`, then tests.

- Phase 0: Consolidate. Remove the duplicated step logic from `WelcomeScreen.tsx`. `OnboardingWizardScreen` becomes the single orchestrator. Rename user-facing "Calori" to "Calorify". No behavior change.
- Phase 1: Foundation. `OnboardingDraft` type and persistence with resume. Calculator changes (section 6) with tests. Section progress bar in `OnboardingHeader`.
- Phase 2: New and updated screens S2 to S10 (Name, Goal with intent, Struggles, Sex+Age, Body, Target, Activity, Pace, Food+Meals) with branching.
- Phase 3: S0 splash, S1 welcome demo, S11 build animation, S12 plan reveal with insight card and "How we calculated this".
- Phase 4: S13 first meal win (scan, search, quick pick), scan counter and the 5/day limit, local meal draft.
- Phase 5: S14 auth. Email/password, Google, anonymous, linking, merge on collision, profile write, meal migration, founder note.
- Phase 6: S15 paywall wiring with goal-based headline and benefit selection.
- Phase 7: S16 and S17. Contextual permission primers, reminder scheduling, Home checklist with persistence and ordering.
- Phase 8: Analytics events, edge-case pass, accessibility pass.

## 13. Acceptance checklist

- [ ] New user reaches Home with a logged first meal in under 3 minutes.
- [ ] Killing the app on any screen resumes correctly.
- [ ] Maintain flow skips S7 and S9 in both directions.
- [ ] Calorie budget never goes below the safety floor for any input.
- [ ] Under-13 is blocked. 13 to 17 never gets a weight-loss target.
- [ ] 6th scan of the day opens the paywall. Failed scans do not count.
- [ ] Guest upgrade to Google and to email keeps the same uid and all data.
- [ ] Credential collision keeps the first meal.
- [ ] No system permission dialog appears without its primer.
- [ ] Paywall appears once in onboarding and "Maybe later" is always visible.
- [ ] No hardcoded prices, colors or fonts.
- [ ] `npx tsc --noEmit`, `expo lint` and `jest` all pass.

## 14. Open items (defaults used until decided)

- Minimum age 13 (default). Confirm against your target markets and Play policy.
- Safety floor for "prefer not to say" currently inherits the male floor (1500). Decide whether to use a midpoint.
- Trial length 7 days and the plan prices are placeholders. Real values come from `paymentService`.
- Founder note wording and signature are yours to write.
- Where the Google sign-in library comes from (needs approval).