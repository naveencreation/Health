Part 2 picks up right after the plan reveal. The key idea is that the user does something real (logs a meal) before being asked for an account or money, and each permission is asked at the moment it's useful.

## 13. First meal win

- **Purpose:** This is the aha moment. The plan is just numbers until they see the app turn food into calories.
- **Header:** "Let's log your first meal, {name}." Subtext: "Takes about 10 seconds."
- **Three options as large cards:**
  - Scan a meal (primary, camera icon)
  - Search food
  - Quick pick: 4 to 6 starter foods chosen by food style and time of day, e.g. idli, dosa, chapati, eggs. One tap logs a standard portion.
- **Time-aware:** The meal slot is guessed from the clock and shown as an editable chip, "Logging as: Lunch."
- **Camera primer:** The system dialog never appears cold. A short sheet comes first: "Scan needs your camera to recognise your food." Add one line stating exactly what happens to the photo, and only write what's true. If they decline, fall back to Search without any guilt.
- **Scan result card:** Dish name, kcal, and the three macros in their brand colors, with portion size editable via a slider or ± buttons. The button reads "Add to Lunch."
- **Escape:** A "Skip for now" text link goes straight to Home, and the checklist keeps the task alive.
- **Personalization:** Under the result, a line tied to their struggle: "Home-cooked is hard to estimate, so we show a range you can adjust" or "{x} g of protein, {y}% of today's target."

**The win moment**

- The calorie ring on screen animates from empty to the logged amount, with "{kcal} of {budget} kcal" and a success haptic.
- Reuse `CelebrationModal` briefly (under 2 seconds, confetti optional) and light the Day 1 streak flame.
- Message: "First meal logged. That's {pct}% of your day done in one tap."
- **Storage:** This meal is saved locally and migrates to the account at signup. That is what makes the next screen feel natural.

## 14. Save your plan (signup)

- **Header:** "Save your plan, {name}." Subtext: "So your numbers and your first meal are never lost."
- **Summary card at the top:** A compact version of their plan (calories, goal date) and "1 meal logged." This is the sunk-cost hook, so use real data only.
- **Form:**
  - Name is prefilled and editable.
  - Email.
  - Password with live requirement ticks as they type, plus a show/hide toggle.
  - No confirm-password field, since the toggle replaces it. This cuts one field.
- **Social login:** "Continue with Google" is the primary option. If you ship on iOS, Sign in with Apple is required as soon as any social login exists.
- **Trust strip:** One line: "Your data stays private. We never sell it." Link to privacy and terms below the button. Add real social proof (rating, downloads) only when you have real numbers.
- **Guest path:** A secondary "Continue without an account" is allowed. It uses Firebase anonymous auth. The home screen then shows a quiet "Save your progress" card after a few days. When they sign up later, `linkWithCredential` upgrades the same user, so nothing is lost. Replace the current demo login with this.
- **Errors:** Inline and friendly ("That email is already registered. Sign in instead?") with a one-tap switch to sign-in that keeps their onboarding draft.
- **After success, a short personal note (about 3 seconds, skippable):** Your own message, handwritten-style signature and one small hand-drawn element (a leaf or a plate). Example: "Hi {name}, thanks for trusting Calori with your food. I built it because I wanted tracking to take seconds, not minutes. Tell me what's missing. — Naveen." Auto-advances, with a tap to continue.
- **Email verification:** Send it in the background and prompt later. Never block onboarding on it.

## 15. Paywall (soft, shown once)

- **When:** Right after the signup note, since the user has just seen real value. Never show it before the first meal.
- **Header, tied to their goal:** "{name}, reach 68 kg by 14 Nov with Pro." For maintain or build, swap the line to match ("Hit {protein} g protein every day.").
- **Benefits (3 only, chosen by struggle):**
  - Portions or home-cooked: Unlimited AI meal scans
  - Consistency: Adaptive macro coaching that adjusts when you slip
  - Protein: Smart protein tracking and suggestions
  - Everyone: Deep trends (30-day, monthly)
  - Reuse the `highlightFeature` prop already in `ProPaywallModal` for the first one.
- **Plans:** Two cards only. Yearly is pre-selected with "per month" price and a savings badge, monthly beside it. Show real prices from `paymentService`, in INR for India.
- **Trial transparency:** A three-line timeline. "Today: full access free. Day 5: we remind you. Day 7: billing starts. Cancel anytime." This builds trust and lowers refunds.
- **Buttons:** "Start 7-day free trial" (primary). "Maybe later" is visible from the first second and equally readable. It's a real exit, not a hidden × in the corner.
- **Free tier clarity:** One line says what they keep for free, for example "Free: {n} scans per day, full logging." You need to pick that number.
- **After "Maybe later":** Go straight to Permissions then Home. Don't repeat the paywall. Show Pro again only at contextual moments, such as hitting the scan limit or opening the deep-trends tab.
- **Optional (test later):** A single one-time offer on dismissal, as in the video. It needs fair copy and a clear deadline. I'd skip it at launch.
- **Also:** Restore purchases, terms and privacy links.

## 16. Permissions (in context, not bundled)

Replace the single `PermissionPrimerStep` screen with three separate moments, each with its own primer.

- **Camera:** Asked at the first scan (screen 13). Covered above.
- **Notifications:** Asked on the first Home visit after the first log.
  - **Primer sheet:** "Want a nudge at meal times, {name}?" Shows a mock of the real notification, such as "12:45 · Lunch time? Snap it in 3 seconds."
  - **Toggles before the system dialog:** Meal reminders (using their meal times from screen 10) and streak protection in the evening. Water reminders are off by default.
  - **If they decline:** Don't ask again in the flow. After 3 days, show one in-app banner with a link to Settings.
- **Steps (Health Connect):** Asked from the Home checklist item "Connect steps," not during onboarding. Primer: "Connect your steps to track your {stepGoal} daily goal automatically." The current code only handles Android Health Connect, so decide what iOS does (HealthKit later, or manual steps).
- **Rules:** Ask once per permission, only at the moment it's needed, never block progress on a denial, and log accept and decline rates.

## 17. First-run Home

- **Greeting:** "Good afternoon, {name}." The time-aware line stays short.
- **Top:** The hero calorie card already shows their first meal and remaining kcal. The Day 1 streak flame sits beside it.
- **Meal sections:** Breakfast, Lunch, Dinner at their own times. The upcoming slot is highlighted with a soft prompt ("Lunch around 1:00 pm").
- **Getting-started checklist card (the core of this screen):**
  - Plan created (done)
  - First meal logged (done)
  - Log your next meal
  - Add a glass of water
  - Turn on reminders
  - Connect steps
  - Items reorder by their struggles. If protein was picked, "See your protein target" appears early.
  - Each item completes itself when the action happens, with a tiny tick animation and haptic.
  - A progress count ("2 of 6") shows at the top.
  - It persists across sessions and can be dismissed. A dismissed checklist is still reachable from Profile.
  - Finishing it triggers one celebration and the card disappears.
- **Nudges, not tours:** No popups. One tooltip at a time, e.g. on the quick-add button the first time. Empty states for water, steps and weight carry a small inline prompt instead of a blank card.
- **Coach:** Add a suggested first question in the AI chat tied to their struggle, such as "How do I estimate home-cooked curry?" Keep it passive.

## After onboarding (days 1 to 7)

- Evening of Day 1: if only one meal was logged, a gentle nudge to protect the streak.
- Day 2: a "welcome back" recap of yesterday against their plan, with no guilt language.
- Day 3 to 7: surface one new capability per day, e.g. weight check-in, water tracker, trends. Show the paywall only when they use a Pro feature.

## Instrumentation

Track every screen view, step completion time, drop-off per screen, scan success rate, time to first logged meal, signup rate, guest-to-signup rate, trial start rate, permission accept rate, and D1 and D7 retention. Persist wizard progress so resume works, and log whether each user resumed.

## Decisions I need from you

- Free scan limit per day, which drives paywall copy and the guest scan abuse limit.
- Whether you ship Google sign-in at launch, and which platforms (Android only first, or iOS too).
- App name: Calori or Calorify.
