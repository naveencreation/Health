Here's Part 1: splash through plan reveal. Part 2 will cover first meal, signup, paywall, permissions and the first-run home screen. The repo uses both "Calori" (Welcome screen) and "Calorify" (DESIGN.md, paywall), so pick one name before building. I use "Calori" below.

## Rules that apply to every screen

- Visuals follow DESIGN.md: cream background `#FAF9F6`, coral `#F47551` for primary actions, Urbanist everywhere, Kurale only for the logo wordmark. Macro colors are fixed: protein green, carbs yellow, fat coral.
- The header has a 38dp circular back button and a section-based progress bar: About you, Your goal, Your lifestyle, Your plan. Drop "Step X of 7". Section labels feel shorter than counts.
- Every answer is saved to a local draft immediately, so the user can close the app and resume exactly where they were.
- One question per screen, one tap or one picker, light haptic on selection, and a button at the bottom in thumb reach.

## 0. Splash (about 1.5s)

- **Visual:** The native splash and the animated splash use the same cream background, so there is no flash. A thin coral ring draws itself like a plate rim (SVG stroke animation). Three arcs then fill in green, yellow and coral. The "Calori" wordmark fades in beneath it. A soft haptic fires when the ring completes.
- **Content:** Only the logo, no spinner and no text.
- **Behind the scenes:** Load fonts and check for a saved session and any saved onboarding draft. Logged-in users go to Home, mid-onboarding users resume, and new users go to Welcome. If the app is already ready, shorten the animation.

## 1. Welcome

- **Purpose:** Sell the outcome before asking for anything.
- **Visual:** A looping, auto-playing demo in a phone frame. A meal photo appears, a scan line sweeps across it, and chips pop up ("Masala dosa · 168 kcal") while the macro bars fill. Use regional dishes so it feels like their food. No static feature list.
- **Content:** Headline "Know what's on your plate in 3 seconds." Subline "Snap it. Log it. Hit your goal. Built around the food you actually eat." A small line under the buttons: "About 2 minutes. No account needed yet."
- **Actions:** Get Started (coral, primary), Try a scan first (secondary, if you build pre-signup scan), and "Already have an account? Sign in".
- **Personalization:** None yet. This screen only has to create the "I want that" feeling.

## 2. Name

- **Purpose:** Unlock personal copy for every later screen.
- **Content:** "First things first, what should we call you?" Keyboard opens automatically with a single text field. Helper text: "Just a first name or nickname is fine."
- **Transition:** After Continue, a 1-second full-screen "Nice to meet you, {name}." fades into the next screen. If they skip, use a neutral fallback like "friend."
- **Saved:** `displayName`. It prefills the signup form later, so they never retype it.

## 3. Goal

- **Content:** "What brings you here, {name}?" Four large cards with icons:
  - Lose weight
  - Maintain my weight
  - Build muscle
  - Just understand what I eat (maps to maintain)
- **Behavior:** Tapping a card scales it, fires a haptic and reveals one reassuring line under it. For example, under Lose weight: "We'll set a gentle calorie budget you can actually stick to." The screen advances after about 300ms.
- **Saved:** `goal`. Later screens branch on it: target weight and pace are skipped for maintain.

## 4. What gets in the way

- **Content:** "What usually makes tracking hard?" Multi-select chips, up to 3:
  - Home-cooked food, no idea of calories
  - Portion sizes
  - Eating out or ordering in
  - Staying consistent
  - Getting enough protein
  - Late-night snacking
  - Not sure where to start
- **Behavior:** After each pick, a reassurance line appears below it. For example, "Scan estimates portions for you, no weighing." The Continue button activates after at least one pick.
- **Saved:** `struggles[]`. These drive the plan reveal insight, the order of the home checklist, and the wording of reminders.

## 5. About you (sex and age)

- **Content:** "A little about you." Sex selector: Female / Male / Prefer not to say. Below it, an age wheel picker. Note under the selector: "Only used for your calorie math. Never shown or shared."
- **Age rule:** Under 18, don't set a weight-loss target. Show a calm message ("Growing bodies need different guidance, so we'll focus on tracking and balance") and set the goal to maintain. This also means raising the calculator's current minimum age of 12 and deciding your policy.
- **Saved:** `sex`, `age`.

## 6. Body (height and weight)

- **Content:** "Your starting point." Height and weight pickers with the existing drag-spring feel. Unit toggle (cm/kg or ft/lbs) defaults from device region.
- **Tone:** No BMI display and no judgmental language. Subtext: "This only sets your starting numbers. You can change it anytime."
- **Saved:** `heightCm`, `weightKg`, and the unit preference.

## 7. Target weight (lose or build only)

- **Content:** "Where would you like to be?" A slider starting at the current weight.
- **Live feedback card:** It updates as they drag: "−5 kg · about 10 weeks at a steady pace · around 14 Dec." This is the first "your answers unlocked something" moment.
- **Guardrail:** If the target puts BMI under 18.5, the slider stops there and a soft message appears: "That's below a healthy range for your height, so let's aim for {x} kg." This is quiet, protective copy, not an error.
- **Saved:** `targetWeightKg`.

## 8. Activity level

- **Content:** "How active is a normal week?" Four cards described by real life, not jargon:
  - Mostly sitting: desk job, little exercise
  - Light: walks or 1–3 workouts a week
  - Moderate: 3–5 workouts, or on your feet most of the day
  - Very active: daily training or a physical job
- **Behavior:** After selecting, a chip shows the effect: "Daily step goal: 8,000." The user sees that their answer changed something.
- **Saved:** `activityLevel`. The calculator already supports it; onboarding just never asked.

## 9. Pace (lose or build only)

- **Content:** "How fast do you want to go?" Three cards, each with live numbers:
  - Gentle: 1,850 kcal/day, around 14 Dec
  - Steady (recommended): 1,720 kcal/day, around 14 Nov
  - Faster: 1,600 kcal/day, around 20 Oct
- **Guardrail:** Faster never goes below the safety floor. If the floor is hit, show "We keep this at a safe minimum." Steady is pre-selected.
- **Saved:** `pace`. This needs the calculator's fixed 20% deficit to become a parameter.

## 10. Food style and meal rhythm

- **Content:** Two short sections on one screen.
  - Food style chips: Vegetarian / Eggetarian / Non-veg / Vegan / No preference.
  - Meal times: Breakfast, Lunch, Dinner time pickers with sensible defaults, plus "I skip breakfast" and "I snack between meals" toggles.
- **Why:** Food style tunes protein suggestions and the starter food list. Meal times set the Home meal sections and the reminder times used later.
- **Saved:** `foodStyle`, `mealTimes`, `skipsBreakfast`, `snacks`.

## 11. Building your plan (about 3 seconds)

- **Visual:** A coral ring rotates in the center. Four lines tick in with checkmarks and a light haptic each:
  - Reading your answers, {name}
  - Working out your metabolism
  - Balancing protein, carbs and fat
  - Setting a pace for your goal
- **Why it exists:** The math is instant, but a short build moment makes the plan feel earned. Keep it under 3.5 seconds and make the lines reflect real steps.

## 12. Plan reveal

- **Header:** "{name}, your plan is ready."
- **Hero:** A large calorie number counts up inside a segmented ring (green protein, yellow carbs, coral fat).
- **Below it:**
  - Three macro tiles in grams.
  - Chips for water target and step goal.
  - A goal line: "On track for 68 kg by 14 Nov."
- **Personal insight card:** Keyed to their first struggle from screen 4. For example: "You said portions are hard. Scan estimates them from a photo, so you don't have to weigh your food."
- **Trust:** An expandable "How we calculated this" explaining Mifflin-St Jeor, your activity level and your pace. A small footer: "Estimates, not medical advice."
- **Actions:** "Log my first meal" (primary) and "Adjust my plan" (text link). Tapping the calorie number also opens manual adjustment.
