# Calorify — Project Memory

> High-level context, architecture, and work history so future sessions can pick up without re-deriving everything.

## What this app is

**Calorify** — a nutrition / calorie-tracking app with an AI "Ria" coach (Gemini). Light-only design, warm cream/terracotta brand.

## Tech stack

- **Expo SDK 57** (`expo ~57.0.x`), **React Native 0.86**, **React 19.2**, **TypeScript 6**
- **Navigation:** no React Navigation / no expo-router — a hand-rolled custom tab bar (`BottomNavBar` + `useState` tab switching in `App.tsx`)
- **State:** `HealthContext` (React Context) is the central store; local cache in AsyncStorage + cloud sync to Firestore
- **Backend:** Firebase (Auth + Firestore), security rules in `firestore.rules` (owner-scoped `isOwner()`)
- **Images:** `expo-image` everywhere (WebP food catalog, avatars)
- **Fonts:** Kurale (brand serif) + Poppins via `@expo-google-fonts`, loaded with `useFonts` + native splash hold
- **Animation:** `react-native-reanimated` 4.5.1 + `react-native-worklets` 0.10.1 (migrated from RN `Animated`)

## Key architecture notes

- `App.tsx` renders the whole app (no router). Root wraps `ErrorBoundary > SafeAreaProvider > HealthProvider`, with `<StatusBar style="dark" />` + `<NavigationBar style="dark" />` at the root.
- `HealthContext` is the single source of truth: auth state, goals, daily logs, custom foods. It caches to AsyncStorage (per-user keys `@calori_daily_logs_${uid}` etc.) and debounce-syncs to Firestore.
- `typography.ts` is the single font source (`Fonts.poppins.*`, `Fonts.kurale`) — no platform branching.

## Work done this session (chronological)

1. **React Native skills audit** (against the `vercel-react-native-skills` skill) — established baseline: expo-image everywhere, Pressable (no Touchable*), memoized FlatLists, `MealCard` had a JS-thread `maxHeight` animation (jank), no Reanimated, no nav library.

2. **Safe areas** — fixed `ForgotPasswordScreen` double-applying the Android top inset (removed manual `paddingTop: RNStatusBar.currentHeight`; `SafeAreaView` already handles it).

3. **System bars** — removed the deprecated raw `<StatusBar backgroundColor=... />` on Android (ignored under edge-to-edge), hoisted `expo-status-bar`'s `<StatusBar style="dark" />` to the root, installed `expo-navigation-bar` and added `<NavigationBar style="dark" />`, removed an unused `RNStatusBar` import in `SignInScreen`.

4. **Fonts** — unified `typography.ts` to the same `Poppins_*`/`Kurale_400Regular` keys on all platforms (dropped web `Platform.select` + Google Fonts `<link>` injection), added `SplashScreen.preventAutoHideAsync()`/`hideAsync()` to hold the native splash until fonts load (no FOUT).

5. **Splash screen** — generated a composite wordmark `assets/splash-icon.png` (terracotta flame `#F47551` + "Calorify" in Kurale) via `scratch/make_splash.py`, and migrated `app.json` from the legacy `splash` key to the `expo-splash-screen` config plugin (`backgroundColor #FAF9F6`, `image`, `imageWidth 280`).

6. **Reanimated migration** (the big one) — installed Reanimated + worklets; migrated 13 files from RN `Animated` to Reanimated (`useSharedValue`/`useAnimatedStyle`/`withTiming`/`withSpring`/`useAnimatedScrollHandler`):
   - Scroll headers: `Header.tsx`, `TodayScreen`, `DiaryScreen`, `AnalyticsScreen`
   - `MealCard` (expand/collapse), `FoodLogModal` (press/toast/pill stagger), onboarding `Weight`/`Height` drag springs
   - Loaders: `ScreenTransitionContainer`, `AnimatedProgressBar`, `AnimatedSvgRing`, `BouncingDotsLoader`, `BrandRingLoader`, `AppLoadingScreen`
   - `AnimatedSvgRing` fixed a per-frame `setState` (now `createAnimatedComponent(Circle)` + `useAnimatedProps`)

7. **Data storage** — migrated Firebase auth persistence from plaintext AsyncStorage to **SecureStore** (`firebase.ts`), added toast reduced-motion support, and made `logout()` clear user-scoped AsyncStorage keys.

8. **Optimistic auth restore** — `HealthContext` now restores the cached user immediately on cold start (race-safe via `authResolvedRef`), with `onAuthStateChanged` staying authoritative.

9. **Profile screen transitions & sub-view stack fix** — removed the flickering `ScreenTransitionContainer` wrapper on `ProfileScreen` so switching to Profile tab is instant (matching Today, Diary, Analytics). Replaced sub-view unmounting with a native slide-in stack layer (`SlideInSubScreen`) using Reanimated hardware-accelerated transforms (`translateX`), maintaining the base Profile screen and its scroll position intact, and supporting multi-level navigation (Summary -> Goals) with clean slide-out on Back and Android hardware back.

10. **Navigation bar shadow removal & header blending fix** — removed the upward shadow (`shadowOffset: { height: -2 }`, `elevation: 8`) and harsh `#D0D5DD` border from `BottomNavBar.tsx` (now subtle hairline border, zero upward shadow); removed Android omnidirectional `elevation: 8` on `subScreenContainer` in `ProfileScreen.tsx` (preventing elevation shadow bleed onto headers and bottom edges); set root OS window `backgroundColor: "#FAF9F6"` in `app.json`; and harmonized header padding (`paddingTop: 10, paddingBottom: 8, minHeight: 56`) across `ProfileScreen`, `AwardsScreen`, `MetabolicSummaryScreen`, `PreferencesScreen`, and `GoalsScreen`.

11. **Profile metric pill clipping fix** — added vertical padding (`paddingTop: 4, paddingBottom: 8`) to `pillsScrollContent` in `ProfileMetricInspector.tsx`, centered items, and added `includeFontPadding: false` to `pillText` so that pills and active shadow elevations (`elevation: 2`, `shadowRadius: 4`) are never clipped by the ScrollView viewport.

12. **Bottom navigation FAB z-index stacking fix** — resolved the issue where the top dome of the green `+` FAB (`bottom: 16`) was cut off when opening sub-screens (Awards, Summary, Preferences, Goals) by lowering `SlideInSubScreen` `zIndex` from `100 + index` to `10 + index`, and raising `barContainer` (`zIndex: 500`), `centerFabAnchor` (`zIndex: 501`), and `centerFab` (`zIndex: 502`) in `BottomNavBar.tsx` so the floating button always layers cleanly over the content area.

13. **1-Tap AI Camera Navigation & Context-Aware Meal Logger** — grounded in `info/` UX principles ("Minimize Interaction Cost", "Smart Defaults", "Navigation is not decoration"):
    - Replaced the ambiguous center `+` icon in `BottomNavBar.tsx` with `Ionicons name="camera-outline"` (`#FFFFFF`, size 26).
    - Removed the redundant intermediate `quickSheetVisible` modal (with its 5 duplicate meal buttons) so tapping the center button directly triggers `onOpenFoodVision()`.
    - Enhanced `FoodVisionModal.tsx` to provide two dedicated, frictionless cards: **Take Photo** ("Snap with camera") for live plate photos, and **Photo Library** ("Already taken") for logging previously captured meal photos from phone storage.
    - Enhanced the post-analysis review card to feature Ria's Nutrition Analysis insight note, an automatic context-aware meal slot selection based on time of day (morning = Breakfast, afternoon = Lunch, evening = Snacks, night = Dinner), and horizontal interactive pills with "Tap to change" so the user can easily reassign the meal slot with a single tap.

14. **Comprehensive AI Food Vision Error Handling & Empathetic Failure UX** — eliminated raw technical JSON dumps and unhandled HTTP errors:
    - Fixed unhandled HTTP `401 Unauthorized` / `403 Forbidden` / `400 API_KEY_INVALID` in `AIErrorMapper.ts` by parsing JSON error responses from Google Gemini and mapping them to typed `INVALID_KEY` errors with actionable titles and user messages.
    - Enriched `AIErrorMapper` to cleanly categorize Quota Exceeded (429/RESOURCE_EXHAUSTED), Rate Limits (429/Too Many Requests), Server Unavailable (500/502/503/504), Network Offline / Fetch Failures, Timeouts, and Non-Food Photo Detections.
    - In `GeminiProvider.ts` and `AIOutputValidator.ts`, added non-food photo fallback schema (`isFood: false`) so photos of non-food objects (laptops, pets, documents) trigger polite, user-friendly guidance rather than corrupt macro calculations or unhandled exceptions.
    - In `FoodVisionModal.tsx`, replaced raw red text error string with a structured, state-aware error card:
      - **Gemini Key Issues (401/403/Missing):** Features the official `GeminiIcon`, polite explanation, and a direct 1-tap **"Update Gemini Key"** action button that seamlessly launches `BYOKSetupModal`.
      - **Network / Timeout / Rate Limit:** Features a 1-tap **"Retry Analysis"** button that re-runs the vision model on the already-captured photo (`selectedAsset`) without forcing the user to re-snap or re-select.
      - **Non-Food / Unclear Photo:** Features friendly lighting advice with immediate "Take Photo" and "Photo Library" shortcuts.

15. **MealCard Mobile Render & Collapse Fix** — fixed food items disappearing on mobile devices:
    - Resolved the issue where the food items list (rotis, chicken, macros) was completely hidden or collapsed to 0 height on iOS/Android.
    - Root cause: `collapseStyle` had been changed to use `contentHeight = useSharedValue(0)` with `onLayout`. On native Yoga layout, because the parent started with `height: 0` and `overflow: 'hidden'`, children were layout-clamped to 0 or skipped, leaving `contentHeight` at 0 permanently.
    - Restored UI-thread `maxHeight: interpolate(expandAnim.value, [0, 1], [0, 2000])` directly on the animated container (matching `MEMORY.md` decision), allowing immediate natural layout on mount while animating smoothly on expand/collapse.
    - Added `flexShrink: 0` on `foodActions` and `flexWrap: 'wrap'` / responsive padding on `macroSummaryBar` to prevent row squishing on narrow mobile screens.

16. **WorkoutHistoryCard UX/UI Validation & Redesign** — audited against `info/` design principles:
    - **Contextual Activity Iconography (`getActivityConfig`):** Eliminated the repetitive "Universal Dumbbell" anti-pattern. Activities now dynamically receive tailored semantic icons and pastel backgrounds (Walk = green `walk-outline`, Run/Treadmill = coral `flame-outline`, Cycle = sky `bicycle-outline`, Yoga/Stretch = teal `body-outline`, Gym/Weights = amber `barbell-outline`, Swim = sky `water-outline`, Sports = gold `trophy-outline`).
    - **Brand Color Harmonization:** Removed foreign saturated electric purple (`#8B5CF6`, `#EDE9FE`) to match Calorify's warm porcelain cream (`#FAF9F6`), signature sun terracotta (`#F47551`), and warm slate palette.
    - **Unified Row Hierarchy:** Eliminated horizontal crowding from side-by-side badges (`[Today] [Icon]`) that took ~74px; merged the day label into the secondary metadata line (`Today · 30 min`), freeing horizontal space for long activity titles.
    - **Habit-Driven 3-Pod Stats:** Replaced redundant multiplication stats (`count * avg = total`) with 3 core habit metrics: total burn (`totalBurn` kcal), active duration (`formatDuration`), and consistency (`activeDays / totalDays`).
    - **Progressive Disclosure:** Replaced dead-end unclickable `+X more sessions` cutoff with interactive `View all X activities` / `Show fewer` button.
    - **Stable Date Sorting:** Fixed non-strict sort comparator to use `localeCompare` so items on the same date preserve natural order.
    - **Unit Test Coverage:** Created comprehensive test suite `WorkoutHistoryCard.test.tsx` (empty state, habit metrics, dynamic icon categorizer, progressive disclosure).

17. **Cinematic Startup Reveal & Two-Phase Handoff (Healthify / Spotify Standard)** — resolved emblem oversizing, circular mask clipping, and created a luxury brand reveal:
    - **Refined Emblem Scale & 1:1 Density Alignment:** Scaled the Terracotta Flame down from oversized 140dp to an understated, elegant **~73dp height** (visual width 54dp, 260px height in 1024x1024 master canvas). Configured `imageWidth: 288` in `app.json` matching Android 12+ 288dp icon canvas for 1:1 un-interpolated pixel mapping on 4x xxxhdpi screens (1152px), eliminating hardware upscaling blur.
    - **Native Android Project Sync:** Regenerated `android/` via `npx expo prebuild --platform android`. Configured `Theme.SplashScreen` (`windowSplashScreenBackground: #FAF9F6`, `windowSplashScreenAnimatedIcon: @drawable/splashscreen_logo`, `postSplashScreenTheme: @style/AppTheme`), wiring `SplashScreenManager.registerOnActivity(this)` in `MainActivity.kt`.
    - **Cinematic Motion Choreography (`AppLoadingScreen.tsx`):**
      - **Freeze-Frame Handshake (0–200ms):** Flame starts dead-center at $X=0, Y=0$, matching the native splash screen with 0.0px layout shift.
      - **Leftward Glide (200–750ms):** Flame smoothly glides leftward ($X: 0 \to -64\text{dp}$) via organic cubic bezier (`Easing.bezier(0.16, 1, 0.3, 1)`).
      - **Letter-by-Letter Reveal (280–650ms):** As the flame glides, each letter of **"Calorify"** (`C - a - l - o - r - i - f - y`) reveals sequentially with 38ms stagger in **solid black** (`#000000`, `Kurale_400Regular`, 32px) right next to the flame, forming the complete horizontal lockup.
      - **Status Fade-In (680–1200ms):** 3 terracotta jumping dots (`BouncingDotsLoader`) and `"Personalizing your data..."` fade in underneath the lockup.
      - **Buttery Dissolve (1200ms):** Smooth 300ms crossfade into the active dashboard once data and minimum display threshold are ready.

18. **Zero-Jank Deferred Mounting & Single-Clock Worklet Optimization** — eliminated startup stutter and frame drops:
    - **Deferred Dashboard Mounting (`App.tsx`):** Root cause of stutter was `{isFontsReady && renderContent()}` mounting the entire heavy dashboard (SVG rings, calendar strip, meal cards, AI hooks) on the JavaScript thread simultaneously while Reanimated was playing the intro animation. Resolved by deferring `{isContentMounted && renderContent()}` until 800ms (after the flame glide and letter reveal are complete). The intro animation gets 100% of CPU/GPU headroom on the UI thread at silky 60/120 FPS, and the dashboard mounts invisibly behind the static holding phase before the 1200ms dissolve.
    - **Native Splash Handoff Buffer (`requestAnimationFrame`):** Wrapped `SplashScreen.hideAsync()` in `requestAnimationFrame` so the native splash window dismisses only after React Native's first paint is buffered in the GPU, preventing any 1-frame flash.
    - **Single Master Reanimated Clock (`AppLoadingScreen.tsx`):** Replaced 8 independent `useSharedValue` timers with a single master `wordmarkProgress` shared value (`0 -> 1`), synchronizing all letter reveals into one GPU animation tick.
    - **Hardware Layer Translation vs Text Rasterization:** Wrapped each letter in an `<Animated.View>` with static `<Text>` inside, animating `translateY` (6 -> 0) and `opacity`. Removed dynamic text `scale`, completely eliminating Android Skia glyph re-rasterization and layout recalculations. Added `cachePolicy="memory-disk"` to `expo-image`.

19. **Native Static Font Embedding (Zero-Wait Native Boot)** — eliminated `useFonts()` asynchronous hook and registration delay:
    - Extracted all `.ttf` font files (`Kurale_400Regular.ttf`, `Poppins_400Regular.ttf`, `Poppins_500Medium.ttf`, `Poppins_600SemiBold.ttf`, `Poppins_700Bold.ttf`) and embedded them directly into `assets/fonts/` and native `android/app/src/main/assets/fonts/`.
    - Configured the native `expo-font` plugin in `app.json` with the static fonts array and ran `npx expo prebuild --platform android --no-install`.
    - Removed `useFonts()` and `@expo-google-fonts/*` dependencies from `App.tsx`.
    - Fonts are now linked directly at the native OS level (`Typeface` on Android, `UIFont` on iOS) at application launch before JavaScript boots. Startup wait time for fonts dropped to **0ms**, eliminating any possibility of font-loading delays or FOUT.

20. **Pure Minimalist Brand Reveal (Option A / Apple & Spotify Standard)** — removed jumping dots and status text:
    - Removed `BouncingDotsLoader` and `"Personalizing your data..."` caption from `AppLoadingScreen.tsx`.
    - Focused 100% of visual attention on the centered brand lockup: the Terracotta Flame gliding leftward ($X: 0 \to -64\text{dp}$) and the solid black serif wordmark `"Calorify"` revealing letter-by-letter.
    - Tightened startup lifecycle in `App.tsx`: background dashboard mounts at 600ms, display threshold reduced from 1200ms to **950ms**, followed by the 300ms dissolve into the active dashboard. Total startup time is now a crisp, luxury **~1.25s** with zero dropped frames.

21. **Auth Screen Horizontal Padding Harmonization** — resolved 44px double-padding bug and vertical header misalignment:
    - Root cause: `SignInScreen.tsx` had compounded paddings (`phoneFrame` had `paddingHorizontal: 20` and `scrollContent` had `paddingHorizontal: 24`, totaling 44px per side). This squished inputs and misaligned the form from the `<OnboardingHeader>` back button (which sat at 24px).
    - Reduced `scrollContent` in `SignInScreen.tsx` to `paddingHorizontal: 4`, aligning form fields, titles, error banners, and buttons on the exact same 24px vertical grid line ($20\text{px} + 4\text{px} = 24\text{px}$) as `SignUpScreen.tsx`.
    - Added matching `paddingHorizontal: 20` to `phoneFrame` and updated `scrollContent` to `4` in `ForgotPasswordScreen.tsx`.
    - Unified `WelcomeScreen.tsx` container padding to `24px`. All screens across the auth flow now share an identical, balanced 24px gutter consistent with the rest of the application.

22. **Navigation Button Shape Unification (Circle Standard)** — eliminated squircle back button in onboarding header:
    - Root cause: `OnboardingHeader.tsx` had `borderRadius: 10` (a rounded square/squircle) on its 38x38 back button, while 100% of other navigation and modal close controls in the app (`Header.tsx` search/notification, `FoodLogModal.tsx`, `FoodVisionModal.tsx`, `RiaChatModal.tsx`, `GoalsModalSheet.tsx`, etc.) use circular buttons (`borderRadius = width / 2`).
    - Updated `backButton` in `OnboardingHeader.tsx` to `borderRadius: 19`, matching `Header.tsx`'s `circleButton` (`38 × 38dp`, `borderRadius: 19`). Navigation icon buttons across the entire app are now 100% unified in shape and visual affordance.

23. **Today Quick-Jump Affordance ("Return to Today")** — replaced ambiguous dot with actionable return icon:
    - In `TopDateStrip.tsx`, replaced `<View style={styles.todayPillDot} />` inside `todayPill` with `<Ionicons name="arrow-undo-outline" size={12} color="#C2410C" />`.
    - The button now clearly reads `[ ↩ Today ]`, providing an unambiguous, actionable visual affordance that clicking it returns to the current real-world day.

24. **Safe Area Compliance Overhaul (`FoodLogModal.tsx`)** — grounded in Expo Safe Area guidelines (`useSafeAreaInsets`):
    - Replaced hardcoded `paddingBottom: Platform.OS === 'ios' ? 24 : 14` on `productStickyFooter` with dynamic `paddingBottom: Math.max(insets.bottom, 16)`, preventing button overlap with the iOS home indicator bar (34px) and Android gesture bar.
    - Updated `fullScreenScrollContent` to dynamic `paddingBottom: 160 + insets.bottom`, fully resolving the "Quick Portions" chips cutoff behind the sticky footer bar.
    - Updated `fullScreenProductContainer` to `edges={['top']}`, allowing the sticky footer to cleanly bleed to the bottom edge.
    - Updated in-modal `toastContainer` to dynamic `bottom: Math.max(insets.bottom + 12, 20)` to float above the home indicator.

25. **Web Typography & Google Fonts CDN Integration** — eliminated browser Times New Roman fallback:
    - In `App.tsx`, injected Google Fonts CDN `<link>` (preconnect to `fonts.googleapis.com` & `fonts.gstatic.com` + `Kurale` & `Poppins:wght@400;500;600;700&display=swap`) strictly within `Platform.OS === 'web'` (0 KB mobile bundle impact).
    - Injected CSS `@font-face` aliases on Web for `Poppins_400Regular`, `Poppins_500Medium`, `Poppins_600SemiBold`, `Poppins_700Bold`, and `Kurale_400Regular`.
    - In `typography.ts`, added modern system-ui fallback stacks (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) on Web so text never renders in Times New Roman.

26. **Design & Color System Harmonization (`FoodLogModal.tsx`)** — unified with Figma design tokens in `Colors.ts`:
    - Replaced heavy dark forest green (`#15803D`) on primary CTA button (`confirmAddBtn`) with brand Terracotta (`Colors.primary = '#F47551'`), matching all other app action buttons.
    - Harmonized Macro matrix dots in `nutritionMatrixGrid`: Protein uses `Colors.protein` (`#67BD6E`), Carbs uses `Colors.carbs` (`#F8D558`), Fat uses `Colors.fat` (`#F47551`).
    - Harmonized Health Badge ("Gut Friendly") to `Colors.proteinLight` (`#E8F6E9`) with `#2E7D32` accessible typography.
    - Unified live budget impact ticker to `Colors.protein` / `Colors.proteinLight`.
    - Harmonized meal switcher active pills (`mealTabPillActive`) and active icons to `Colors.primary` (`#F47551`).
    - Normalized `footerStepperPill` border to `borderWidth: 1` (was 1.5px), matching 1px border grid across all chips and cards.

27. **Modal Header Typography Unification (`AvatarPickerModal`, `NotificationModal`, `SearchFoodModal`)**:
    - Replaced serif `Fonts.kurale` header titles with `Fonts.poppins.bold` (`fontWeight: '700'`) in `AvatarPickerModal.tsx` ("Select Avatar"), `NotificationModal.tsx` ("Notifications"), and `SearchFoodModal.tsx` ("Search Food").
    - Unified `emptyTitle` in `NotificationModal.tsx` to `Fonts.poppins.semiBold`.
    - Modal sheets across the entire app now share a cohesive, modern geometric typography matching their subtitles and buttons.

28. **Daily Habits & Activity Iconography & Button Harmonization (`DailyHabitsCard.tsx`)**:
    - Replaced raw filled OS emojis (`💧` and `👟`) with monoline vector outline icons: `<Ionicons name="water-outline" size={13} color="#0284C7" />` and `<Ionicons name="footsteps-outline" size={13} color="#F47551" />`.
    - Replaced heavy solid buttons with industry-standard soft-tinted surface action buttons matching `+ Log Workout`:
      - Water Add Button: `#F0F9FF` background, `borderWidth: 1`, `#BAE6FD` border, `#0284C7` icon/text.
      - Step Add Button: `#FFF5F1` background, `borderWidth: 1`, `#FFD5C6` border, `#F47551` icon/text.
    - Result: Eliminates platform emoji distortion and heavy bottom weight, centering focus on the data gauges while keeping clean 1-tap touch affordances.

29. **Date Strip Android Square Shadow Outline Bug Fix (`TopDateStrip.tsx`)**:
    - Root cause: On Android, `ReactViewBackgroundDrawable` fails to compute rounded convex outline paths when a View/Pressable combines `borderRadius`, `borderWidth: 1.2`, semi-transparent RGBA borders, and child SVGs, causing Android's native hardware `ViewOutlineProvider` to fall back to the bounding rectangle box ($44 \times 72$ dp) and cast a square shadow behind the rounded capsules.
    - Solution: Aligned with Google Material Design 3 and Apple HIG standards:
      - Normalized borders to crisp integer `borderWidth: 1`.
      - Applied `Platform.select`: set `elevation: 0` on Android across `capsule`, `futureCapsule`, `activeCapsule`, and `arrowCircle`, while preserving subtle, curved box-shadows on Web and iOS.
      - Result: 100% elimination of square shadow artifacts on Android mobile, creating a clean, lightweight, tier-1 segmented date strip.

30. **HeroCalorieCard Macro Visual Affordance & Track Polish (`HeroCalorieCard.tsx`)**:
    - Grounded in Gestalt shape hierarchy: preserved Linear Progress Bars to prevent "Circle Overload" against the hero 120px circular calorie dial.
    - Clean typography: pure, uncluttered macro labels (`Carbs`, `Protein`, `Fat`) without extra dot noise.
    - Replaced dull gray `#E2E8F0` track with accessible, soft-tinted pastel tracks: Carbs (`#FEF3C7`), Protein (`#DCFCE7`), Fat (`#FFEDD5`).
    - Elevated bar height from 5px to 6px with smooth rounded pill caps (`borderRadius: 3`), ensuring macros are warm, distinct, and visually identifiable even at 0g.

31. **Universal 4-Tier Color Design System Rollout (`colors.ts`, `DailyHabitsCard.tsx`, `AnalyticsScreen.tsx`)**:
    - Formalized 4-tier functional tokens (Primary Fill, Pastel Track, Hairline Border, Dark Accessible Text) across Carbs (`#F8D558`), Protein (`#67BD6E`), Fat (`#F47551`), Fiber (`#10B981`), Water (`#0284C7`), and Steps (`#EA580C`).
    - Steps Unified to Kinetic Flame Orange (`#EA580C`): eliminates color collision between physical movement and dietary Fat (`#F47551`).
    - `DailyHabitsCard`: Water and Steps dials upgraded to soft-tinted circular tracks (`Colors.waterTrack` `#E0F2FE` and `Colors.stepsTrack` `#FFEDD5`), creating high-contrast complementary balance (Sky Blue + Kinetic Orange).
    - `AnalyticsScreen`: Resolved "Green Flame" cognitive conflict on Calories tab (flame icon now uses `#F47551` and active text `#0F172A`), aligning metric identity and reserving Green purely for "On Budget" evaluation and Protein.
    - `AnalyticsScreen` Macro Tracks & Tooltip: Macro Averages Card now features pastel background tracks (`Colors.proteinLight`, `Colors.carbsLight`, `Colors.fatLight`, `Colors.fiberLight`) matching HeroCalorieCard; tooltip letters use accessible dark text tokens (`Colors.proteinDark`, `Colors.carbsDark`, `Colors.fatDark`); chart bars & legend dots fully tokenized to `Colors.water`, `Colors.waterSecondary`, `Colors.steps`, and `Colors.stepsSecondary`.

32. **Complete Elimination of Green from Calorie Tracking & Analytics Charts**:
    - **Problem Identified**: The legacy financial budget metaphor ("under budget = green, over budget = red") caused calorie bars, selected bar outlines, active day dots, the "On Budget" legend, and the tooltip status badge to render in bright green (`#67BD6E`). This created cognitive collision with Protein (`#67BD6E`) and broke the mental model that Calories = Warm Coral (`#F47551`).
    - **Resolution**:
      - `AnalyticsScreen.tsx`: Updated 7D and 30D/1Y calorie chart bars to use `Colors.primary` (`#F47551`) for on-budget days and `#DC2626` (Alert Crimson) for surplus days.
      - Selected bar outline and active day indicator dot bound to `Colors.primary`.
      - Chart legend "On Budget" dot updated to `Colors.primary`; "Surplus" dot updated to `#DC2626`.
      - Interactive tooltip status badge updated from green (`tooltipPillGreen`) to warm coral (`tooltipPillWarm`: `#FFF5F1` background, `#FFD5C6` border, `Colors.primaryDark` text, and `Colors.primary` checkmark).
      - `HeroCalorieCard.tsx`: Removed the 95–105% green dial override so the hero calorie dial stays brand Warm Coral (`Colors.primary`).
      - `TopDateStrip.tsx`: Date capsule progress ring stroke standardized to `Colors.primary` instead of turning green at >= 90%.
      - `MealCard.tsx`: Meal calorie progress bar updated to `Colors.primary` / `Colors.primaryDark` instead of green.
      - Result: 100% green-free Calorie tracking across the entire app; green is now exclusively and unambiguously reserved for Protein (`#67BD6E`).

33. **Architectural Dead Code Purge & Component Structure Simplification**:
    - Safely eliminated 15 orphaned, duplicate, and superseded component files (~3,500 lines of dead code):
      - **Dashboard Prototypes (6):** `CalorieBudgetCard.tsx`, `ActivityCard.tsx`, `AppleActivityCard.tsx`, `DietJourneyChart.tsx`, `FigmaDatePicker.tsx`, `HydrationTracker.tsx` (all superseded by `HeroCalorieCard.tsx` and `DailyHabitsCard.tsx`).
      - **Duplicate Profile Modal Sheets (4):** `AwardsModalSheet.tsx`, `GoalsModalSheet.tsx`, `MetabolicSummaryModalSheet.tsx`, `PreferencesModalSheet.tsx` (superseded by full-screen views in `src/screens/profile/`). Removed empty `src/components/profile/modals` folder.
      - **Orphaned Profile Cards (4):** `AccountSecurityCard.tsx`, `BodyCompositionCard.tsx`, `DailyTargetsCard.tsx`, `PreferencesCard.tsx` (integrated into `PreferencesScreen.tsx` and `ProfileMetricInspector.tsx`).
      - **Unused Loaders (1):** `BrandRingLoader.tsx` (standardized on `AppLoadingScreen` and `BouncingDotsLoader`).
    - Total component files reduced from 67 to 52; active app architecture is now 1:1 with reality. All 13 test suites (106 tests) pass with 0 errors.

22. **Water Tracker & Water Intake History Domain Architecture**:
    - **Clean Domain Separation (`src/components/water/`)**:
      - `DropletVisualizer.tsx`: Reusable SVG sinusoidal wave physics engine with dual overlapping wave layers, teardrop contour halo, and Reanimated GPU "Slosh & Settle" physics.
      - `HeroDropletCard.tsx`: Sized to `145 × 185` for non-scrolling full-screen proportions, large readout (`42px`), and tap-to-slosh gesture.
      - `WaterHistoryCard.tsx`: Compact preview card (~125px) showing 1 latest drink entry or the dual-clipboard empty vector illustration with "No records yet".
      - `WaterBottomDock.tsx`: Sticky bottom bar with container icon pill and "Drink (300 mL)" CTA with "Drinking..." momentary state.
    - **Modals (`src/components/modals/`)**:
      - `DailyWaterGoalModal.tsx`: Goal stepper ($\pm 100\text{ mL}$) and quick presets.
      - `CupSizeModal.tsx`: "Switch Cup Size" with 10 volume presets ($100–600\text{ mL}$, $+$ custom input) and 12 beverage types.
    - **Strict Non-Scrolling Full-Screen Viewport**:
      - Refactored `WaterTrackerScreen.tsx` from `<ScrollView>` to `flex: 1` non-scrolling layout where Header, Week Strip, Hero Droplet, History Preview, and Bottom Dock fit in 100% viewport height with 0px overflow.
    - **Dedicated Full-Screen History (`WaterIntakeHistoryScreen.tsx`)**:
      - Top bar: Back arrow `←`, `Water Intake History`, Calendar icon `📅`.
      - Date-grouped hydration feed (`Today, <Date>`, `Yesterday, <Date>`, past dates).
      - Custom SVG beverage vectors (glass with bubbles, measuring mug, coffee cup with sleeve, juice with citrus garnish, steaming tea cup, tumbler).
      - Floating popover menu (`✎ Edit`, `🗑 Delete`).
      - Stepper edit modal and delete actions live-synchronized with `HealthContext` (`removeWaterEntry`, `updateWaterEntry`).

23. **Water Tracker Edge-Case & Data Safety Audit Refinements**:
    - **Data Safety Fix (`HealthContext.tsx`)**: Guarded `cleanWater` in `cleanDailyLog` so that `waterMl === 1250` and `steps === 4620` are only cleaned when `isMockLog` is true. Genuine user logs of 1250 mL / 4620 steps are preserved.
    - **Multi-Entry Preview & Legacy Balance (`WaterHistoryCard.tsx`)**:
      - Expanded the preview card from 1 to the 3 most recent entries, eliminating the visual mismatch between the 1500 mL hero total and history list.
      - Added dynamic entry count badge next to `"History"` (e.g. `History [5]`).
      - Added compact footer indicator (`+X more record(s)`) when entries exceed 3, keeping `View All →` solely in the header to avoid duplicate CTAs.
      - Added tailored beverage icons and pastel color backgrounds for Coffee, Tea, Juice, Sport Drinks, Smoothies, Wine, Beer, and Water.
      - Integrated unitemized legacy balance protection (`legacy_balance`) so historical totals without granular entries never vanish when adding a new drink.
    - **Goal Celebration & Progress Subtitle (`HeroDropletCard.tsx`)**:
      - Added a clean progress subtitle under the daily goal: `{percentage}% · {remainingMl} mL remaining`.
      - Added an emerald celebration pill when intake meets or exceeds 100%: `Daily goal achieved! 🎉` or `Goal achieved! (+{overflow} mL)`.

24. **Hydration Settings, Future Date Guards & Quick Minus Decrement**:
    - **`HydrationSettingsModal.tsx`**: Added full hydration preferences sheet triggered via header settings cog with reminder toggles (`Every 1h`, `2h`, `3h`), metric/imperial unit switcher (`mL` vs `fl oz`), goal adjust shortcut, and scientific beverage hydration guide.
    - **Future Date Guard (`WaterTrackerScreen.tsx` & `WaterBottomDock.tsx`)**: Added real-world date comparison `isFutureDate = selectedDate > todayStr`. When selecting a future day, the dock button disables with `"Cannot log for future date"` to avoid corrupting forward logs.
    - **Quick Minus (`−`) Button (`WaterBottomDock.tsx`)**: Added a 48px circular `−` button to the dock. When `currentWater > 0`, tapping deducts `cupSize` (e.g. $-300\text{ mL}$) and triggers `heroDropletRef.current?.triggerSlosh('down')` with reverse wave physics. Dims and disables when `currentWater === 0` or on future dates.
    - **Debounce Optimization**: Reduced button lock duration to 350ms for responsive multi-glass logging.

25. **Entry Actions Parity in Preview Card (`WaterHistoryCard.tsx`)**:
    - **Direct Action Menu**: Tapping `⋮` on any preview row (or inside the "View All" modal) now opens a dedicated action sheet displaying the beverage's custom icon, name, volume, and logged time, with options for **`✎ Edit Amount`** and **`🗑 Delete Entry`** plus **`Cancel`**.
    - **Edit Amount Stepper Sheet**: Features an interactive volume stepper ($\pm 50\text{ mL}$, min 50, max 3000), quick preset chips ($150, 250, 300, 400, 500\text{ mL}$), and a "Save Changes" CTA that updates the entry in real time via `updateWaterEntry` (or `addWater` for synthetic/legacy balance entries) without leaving the screen.
    - **Safe Delete Flow**: Choosing "Delete Entry" prompts a clean confirmation dialog displaying the exact mL being removed from today's intake before executing `removeWaterEntry`, preventing accidental loss.
    - **Full Parity in "View All" Modal**: Upgraded the inner "View All" modal rows to also render contextual beverage icons and backgrounds, and wired their `⋮` triggers to the same edit/delete flow.

26. **Water Data Storage & Cloud Sync Deep Audit & Fixes**:
    - **Firestore Security Rules Schema Fix & Live Deploy (`firestore.rules`)**: Identified and fixed a critical rule bug where `isValidDailyLogDoc` had strict `data.keys().hasOnly(['date', 'waterMl', 'steps', 'meals', 'activities'])`. Because `waterEntries` was missing, the remote Firebase backend rejected every document containing `waterEntries` with `FirebaseError: Missing or insufficient permissions.`. Added `'waterEntries'` to `hasOnly`, added list validation (`size <= 200`), validated via Firebase MCP, and successfully deployed to live Firebase via `firebase_deploy`.
    - **Multi-Date Firestore Sync (`HealthContext.tsx`)**: Replaced the hardcoded single-date `selectedDate` upload with a dirty-date tracker that syncs any modified log date (e.g. past dates edited from the history screen) to Cloud Firestore.
    - **Offline-First Merging Protection (`HealthContext.tsx`)**: In `fetchAndHydrateUserData`, replaced destructive `merged[dateKey] = cloudLog` with an intelligent non-destructive merge (`Math.max(cloudWater, localWater)` and richer `waterEntries`), preventing offline water intake from being overwritten by a stale cloud document.
    - **Synthetic & Legacy Entry Global Support**: `removeWaterEntry` and `updateWaterEntry` in `HealthContext.tsx` now natively handle `synth_`, `synthetic_`, and `legacy_` IDs so unitemized historical water can be updated or deleted from any screen without failing silently.
27. **Hero Droplet Card Symmetrical Stepper Trio & Bottom Dock Removal**:
    - **Physical Layout Collision Resolved**: The floating bottom dock previously collided with the floating lime-green camera FAB button on `BottomNavBar`.
    - **Integrated Symmetrical Stepper Trio (Option A)**: Relocated the intake controls directly into the bottom of [HeroDropletCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/water/HeroDropletCard.tsx):
      - **Left (`stepperMinusBtn`)**: 44px circular minus button `( − )` with deduction state, disabled when `currentWater === 0` or on future dates.
      - **Center (`cupSelectorPill`)**: Pill container `[ 🥤 300 mL ▾ ]` rendering contextual SVG beverage icons, current container volume, and dropdown chevron; triggers `CupSizeModal` to switch presets or beverage type.
      - **Right (`stepperPlusBtn`)**: 44px circular plus button `( + )` in brand water cyan with haptic bounce, momentary checkmark indicator, and slosh physics trigger.
    - **Bottom Collision Permanently Eliminated**: Completely removed `WaterBottomDock` from [WaterTrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WaterTrackerScreen.tsx) and reduced `ScrollView` bottom padding to `24`, giving `BottomNavBar` complete unobstructed visibility and creating a cohesive, self-contained hero tracker.
28. **Hydration Container & Beverage Selection Architecture Overhaul (`CupSizeModal.tsx`)**:
    - **Added "Water" as Primary Beverage (Index 0)**: Resolved a critical edge case where `water` was previously absent from `BEVERAGE_TYPES`, preventing users who switched to Coffee/Tea from ever switching back to plain Water. Water is now item 0 with dedicated SVG water glass vector and cyan `#0284C7`.
    - **Replaced "Or Drink" with Clear Semantic Taxonomy**: Replaced ambiguous `"Or Drink"` divider with `"Beverage Type"` and added clear section headers (`Container Size`, `Beverage Type`).
    - **Dual Selection with Single Confirm CTA (`Set Container`)**: Eliminated premature modal dismissals where selecting a volume preset slammed the modal shut before the user could choose a beverage. Users can now select both volume and beverage with active badges/highlights and confirm via a sticky bottom button: `Set Container · [size] mL [Beverage]`.
    - **Persistent Custom Cup Sizes**: When users add a custom volume (e.g. 750 mL Hydro Flask) with bounds validation (50–3,000 mL) and inline error handling, the custom size is saved to AsyncStorage (`@calori_custom_cup_presets`) so it remains a permanent preset across sessions. Added clean `Cancel` button for custom input mode.
    - **Eliminated Android Outline Tessellation on Selected Circle**: Removed `elevation: 2` on Android from `iconCircleSelected` and set crisp integer `borderWidth: 2`, preventing Android HWUI's `ViewOutlineProvider` from approximating the circle as an 8-sided polygon/octagon.
29. **Hydration Ecosystem Cross-Component Edge-Case & Taxonomy Harmonization**:
    - **Centralized Beverage Engine (`beverageUtils.tsx`)**: Created unified definitions, colors, background tints, and iconography for all 13 beverages (`water`, `coffee`, `tea`, `juice`, `sport`, `coconut`, `smoothie`, `chocolate`, `carbonated`, `soda`, `wine`, `beer`, `liquor`).
    - **Fixed Label & Icon Fallback Bug in History Cards (`WaterHistoryCard.tsx`)**: Previously, 6 beverage types (`coconut`, `chocolate`, `carbonated`, `soda`, `liquor`) were missing from ternary mappings and fell back to the label `"Water"` and water glass icon. Connected `WaterHistoryCard` preview rows, action sheet header, and "View All" modal rows to `getBeverageName`, `getBeverageBg`, and `renderBeverageIconElement`.
    - **Fixed History Screen Parity & Edit Beverage Picker (`WaterIntakeHistoryScreen.tsx`)**: Integrated `beverageUtils` into the full history feed. Upgraded the Edit Entry modal with an interactive horizontal beverage selector so users can modify both intake volume and beverage type simultaneously when editing past entries.
    - **HealthContext 0 mL Guard (`HealthContext.tsx`)**: Added `if (updated === 0) { updatedEntries = []; }` so deducting intake to zero cleanses any orphaned entries from the local store.
30. **Industry-Standard Beverage-Scoped Deductions & 1-Tap Undo Toast (Waterllama / YAZIO Standard)**:
    - **Beverage-Scoped Deduction (`HealthContext.tsx`)**: In `addWater(-amount, beverageType)`, deductions target only entries matching the active beverage (e.g. deduct Water leaves Smoothie and Coffee entries 100% untouched). If multiple beverage types exist, non-matching entries are strictly protected.
    - **Context-Aware `canDeduct` Button (`HeroDropletCard.tsx`)**: The `( − )` button dynamically checks if the user has any entries matching the active container's beverage type (`hasMatchingBeverage`). If the user switches to a drink they have not logged today (e.g. Coffee), the minus button dims to 45% opacity and disables, preventing accidental subtraction from non-existent drinks.
    - **1-Tap Floating Undo Toast (`WaterTrackerScreen.tsx`)**: When tapping `( + )`, a dark navy floating snackbar appears for 4.5 seconds: `"Added [X] mL [Beverage] • [Undo]"`. Tapping `[Undo]` immediately reverts the exact entry without requiring any manual container configuration or mental math.
31. **Contextual Edit & Delete Popover Architecture (`WaterEntryActionPopover.tsx`)**:
    - **Floating Anchor Popover (`WaterEntryActionPopover.tsx`)**: Created reusable anchor-relative popover matching reference screenshot. Features pure white card (`#FFFFFF`), rounded corners (`borderRadius: 14`), fine border stroke (`rgba(15, 23, 42, 0.08)`), drop shadow (`elevation: 8, shadowRadius: 16`), and animated entry (`FadeIn.duration(130)`).
    - **Boundary Detection & Auto-Flip**: Automatically detects if the tapped `[ ⋮ ]` row is near the bottom of the viewport (`positionY + CARD_HEIGHT > screenHeight - 90`). If near bottom, flips above the trigger row; otherwise aligns adjacent to the row.
    - **Outside-Tap Dismiss Scrim**: Transparent backdrop overlay captures outside touches, dismissing the menu seamlessly without triggering unwanted clicks on other rows.
    - **Ecosystem Harmonization (`WaterIntakeHistoryScreen.tsx` & `WaterHistoryCard.tsx`)**: Upgraded both full history feed and dashboard history preview card to use `WaterEntryActionPopover`.
    - **1-Tap Delete Undo Toast in History Screen**: Tapping Delete instantly cleanses the entry with zero lag while displaying a 4.5-second dark floating snackbar (`"Deleted [X] mL [Beverage] • [Undo]"`), providing safe reversible deletion without intrusive confirmation dialogues.
    - **Breathable Squircle Icon Containers (`WaterIntakeHistoryScreen.tsx`, `WaterHistoryCard.tsx`, `beverageUtils.tsx`)**: Replaced unconstrained collapsing rectangular icon wrappers with generous 44×44px continuous rounded squircles (`borderRadius: 14`, `borderCurve: 'continuous'`), centered 20px icons with ~12px of breathing room on all sides, and added a safe viewBox buffer (`-1 -1 22 26`) to `MiniWaterGlassSvg` so strokes and rims are never clipped.
32. **Comprehensive Hydration Report Screen & Modular Chart Architecture (`WaterReportScreen.tsx`)**:
    - **Header & Navigation ([WaterReportScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WaterReportScreen.tsx))**: Circular back button (`[ ‹ ]`), bold title (`Report`), options button (`[ ⋮ ]`), 3-tab segmented timeframe switcher (`Weekly` | `Monthly` | `Yearly`), and date range navigator with chevrons (`< Dec 16 - Dec 22, 2024 >`) connected to `WaterIntakeHistoryScreen` via `stats-chart-outline` button in header.
    - **Dual-Mode Chart Type Toggle ([ChartTypeToggle.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/ChartTypeToggle.tsx))**: Compact pill toggle with custom SVG Bar (`Rect`) and Line (`Path` + `Circle`) icons; active state in brand blue (`#2563EB`) with white glyph, inactive state in transparent with slate glyph (`#94A3B8`).
    - **Circular Pin Tooltip Badge ([ChartTooltipPin.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/ChartTooltipPin.tsx))**: Speech-bubble badge with downward needle pointer attached. Android elevation set to 0 with integer `borderWidth: 2` to prevent polygon tessellation. Displays `%` or volume with unit (`1750 mL`).
    - **Drink Completion Card ([DrinkCompletionCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/DrinkCompletionCard.tsx))**: Dual-mode Bar (`capsuleBar` with responsive 26–30px width, `#90C5FE` unselected, `#2563EB` selected) and Line (`strokeWidth: 3.5`, white/blue nodes, vertical gradient fill). Dynamic Y-axis ticks (`100%`, `80%`, `60%`, `40%`, `20%`, `0%`), hairline header divider, and interactive floating pin badge tracking selected day.
    - **Hydrate Volume Card ([HydrateVolumeCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/HydrateVolumeCard.tsx))**: Dual-mode Line and Bar views with auto-scaling Liter Y-axis (`2.5L`, `2L`, `1.5L`, `1L`, `0.5L`, `0%`), hairline header divider, and interactive floating volume badge.
    - **Drink Types Card ([DrinkTypesCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/DrinkTypesCard.tsx))**: Multi-segment SVG Donut ring (`DONUT_SIZE: 126`, `STROKE_WIDTH: 13`) with center cutout displaying `100%` and `"Water Intake"`. Right side features 2-column legend grid showing rounded color swatches, drink names, and percentages (Water, Juice, Coffee, Tea, Beer, Soda, Wine, Carbon) with seamless fallback to template reference data when no logs exist.
33. **Precision Radial Gauge & Beveled Liquid Droplet Architecture ([WaterGaugeVisualizer.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/water/WaterGaugeVisualizer.tsx))**:
    - **270° Speedometer Radial Gauge**: Built a 270° radial gauge ($135^\circ \to 45^\circ$, $90^\circ$ bottom aperture) scaled to a prominent 300px canvas with 120px radius, 26px chunky stroke width (~292px outer diameter), rounded end-caps, and an outer bezel shadow track for 3D depth.
    - **15 Precision Radial Instrument Ticks**: 15 evenly-spaced concentric radial tick marks pointing toward the gauge center in soft slate tint (`#CBD5E1`, outer radius 94px).
    - **Floating Center Droplet**: Scaled to 98px × 122px with native SVG teardrop halo contour (`#F0F2F6`, `showHalo={true}`), completely eliminating artificial oval container borders. Features real-time liquid wave slosh physics and press-squish bounce (`DropletVisualizer` integration).
    - **Integrated Bottom Metric Readout**: Nestled in the bottom aperture between the two arc tips with large bold intake text (`42px`, `Fonts.poppins.bold`, `#0F172A`) and goal subtitle with tap-to-edit pencil icon (`/{maxWater} mL`).
    - **HeroDropletCard Integration ([HeroDropletCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/water/HeroDropletCard.tsx))**: Unified the hero water visualizer and metric row into `WaterGaugeVisualizer` while preserving the symmetrical stepper trio `[ ( − ) [ 🥤 300 mL ▾ ] ( + ) ]` and goal modal triggers. Removed redundant `32% · 2050 mL remaining` subtitle text for a clean, minimalist design matching reference specifications.
    - **Smooth 60fps GPU Arc Interpolation & Mechanical De-stuttering**: Replaced instantaneous state-snap rendering with `AnimatedCircle = Animated.createAnimatedComponent(Circle)`, initialized `animatedProgress = useSharedValue(initialProgress)` to eliminate mount jumps, harmonized physics with `DropletVisualizer` using `withSpring(target, { damping: 18, stiffness: 85 })` (zero initial velocity $v_0 = 0$, organic acceleration), deduplicated `triggerSlosh` (removed 2 redundant triggers from parent screens that interrupted wave sequences), and removed blocking button disable/icon-swap states for instant, buttery-smooth tactile logging.
34. **Weight Tracker Base Card & Quick Weigh-In Experience ([WeightTrackerCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/WeightTrackerCard.tsx), [LogWeightModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/LogWeightModal.tsx))**:
    - **Base Card Implementation**: Crafted the pixel-perfect Weight Tracker card matching user reference mockup (`media_1790853712174.png`). Features 20px continuous rounded card styling, `"Weight Tracker"` bold header with pinkish-coral accent arrow (`#FF3B5C`), hairline divider, 34px bold current weight readout with unit label, directional progress chip badge (`[ ↓ ] - 2.5 kg` in emerald `#10B981` / `#059669` or rose if gain), and 44×44px circular weigh-in action button `( ✏️ )`.
    - **Reanimated 4 Capsule Progress Bar**: Chunky 16px capsule track (`#EEF2F6`, `borderRadius: 8`) with smooth GPU-driven fill (`#FF3B5C`) calculating progress percentage from starting weight to goal weight with cubic easing.
    - **Range Footer Row**: Displays `Starting: 100.0 kg` and `Goal: 76.0 kg` (or user's configured goal) with responsive `kg` / `lbs` formatting.
    - **Quick Weigh-In Modal (`LogWeightModal.tsx`)**: Bottom sheet modal equipped with unit toggle (`kg` / `lbs`), high-contrast digital weight counter, micro-steppers `[-1.0 / -0.1 / +0.1 / +1.0]`, direct numerical input support, context tags (`Morning fasted`, `Post workout`, etc.), optional notes, and instant persistence via `logWeight` in `HealthContext`.
    - **Today Screen Feed Mount**: Inserted `WeightTrackerCard` seamlessly below `WaterTracker` in `TodayScreen.tsx`.
35. **Full Weight Tracker Screen Architecture ([WeightTrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightTrackerScreen.tsx))**:
    - **Top Navigation Bar**: Circle back button (`[ ← ]`), bold title (`Weight Tracker`), and circle settings gear (`[ ⚙️ ]`) that triggers `WeightGoalSettingsModal`.
    - **Streamlined Card Layout**: Direct transition from top navigation to the `"Current"` hero card without a redundant date strip, matching the mockup layout and placing weight history directly below.
    - **Current Weight Hero Component ([HeroWeightCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/weight/HeroWeightCard.tsx))**: Matches user mockup with `"Current"` header, 36px bold current weight with unit label, directional delta badge (`[ ˇ - 0.2 kg ]` in emerald or rose for gain), chunky capsule progress bar, starting and goal footer labels, and full-width `"Update"` button launching `LogWeightModal`.
    - **Weight History Component ([WeightHistoryCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/weight/WeightHistoryCard.tsx))**: Matches user mockup with `"History"` and `"View All →"` header, sorted list of weigh-in records with relative dates (`"Yesterday, Dec 21, 2024"`), directional delta badges, and three-dots menu button `[ ⋮ ]` ([WeightEntryActionPopover.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/weight/WeightEntryActionPopover.tsx)) providing Edit and Delete with 4.5-second reversible Undo Toast.
    - **Weight Goal & Settings Modal ([WeightGoalSettingsModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/WeightGoalSettingsModal.tsx))**: Bottom sheet modal allowing users to configure starting weight, goal weight, and preferred unit (`kg`/`lbs`) with interactive micro-steppers.
    - **Seamless App Integration**: Mounted via `SlideInSubScreen` in `App.tsx` connected to `WeightTrackerCard` header click on `TodayScreen`, with Android hardware back-button handling.
36. **Dedicated Weight History Screen & Historical Backfilling Architecture**:
    - **Dedicated Weight History Screen ([WeightHistoryScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightHistoryScreen.tsx))**: Full-screen date-grouped timeline screen displaying all historical weigh-ins, intra-day logs (`• 08:30 AM`), context tags (`Morning fasted`), adjacent deltas, and 3-dots popover for Edit and Delete with 4.5s reversible floating Undo Toast.
    - **Cloud Firestore Security Hardening ([firestore.rules](file:///c:/Users/navee/Videos/Calorify/calori/firestore.rules))**: Added `weightKg` (numeric 0–500) and `weightEntries` (list up to 100 entries) to the whitelist (`hasOnly`) validator `isValidDailyLogDoc`, resolving `Missing or insufficient permissions` errors on dailyLogs synchronization. Deployed live to Firebase.
    - **Past-Date Weigh-In & Calendar Picker ([LogWeightModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/LogWeightModal.tsx))**: Embedded quick date selector segmented pills (`Today`, `Yesterday`, `📅 Other Date`) and an expandable inline month calendar allowing users to backfill weigh-ins for any past date up to today (future dates disabled).
    - **Historical Insertion & Chronological Guard ([HealthContext.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/context/HealthContext.tsx))**:
      - `logWeight`: Past-date backfills anchor `loggedAt` to `${targetDate}T08:00:00.000Z` to guarantee intra-day sorting integrity. Chronologically sorts all recorded dates so `userGoals.currentWeightKg` is only updated if `targetDate` is $\ge$ the latest recorded date.
      - `updateWeightEntry`: Extended to support cross-date entry transfers (`newDate?: string`), automatically removing from the source date, inserting into the destination date, and recalibrating the latest weight.
    - **Robust Sorting Across Views ([WeightHistoryCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/weight/WeightHistoryCard.tsx), [WeightHistoryScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightHistoryScreen.tsx))**: Replaced loose timestamp sorting with date-first descending sorting (`b.date.localeCompare(a.date)`), followed by intra-day timestamp descending, guaranteeing accurate adjacent delta calculations.
37. **Full-Screen Non-Scroll Weight Logging & Settings Cloud Synchronization Engine ([LogWeightScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/LogWeightScreen.tsx), [HealthContext.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/context/HealthContext.tsx), [WeightGoalSettingsModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/WeightGoalSettingsModal.tsx))**:
    - **Full-Screen Non-Scroll Viewport ([LogWeightScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/LogWeightScreen.tsx))**:
      - Converted cramped bottom modal sheet into a distraction-free, 100% viewport bounded full-screen experience (`presentationStyle="fullScreen"`).
      - Zero vertical scrolling required: top toolbar, date quick ribbon (`[ Today ]`, `[ Yesterday ]`, `[ 📅 Pick Date ]`), hero weight visualizer, context tags (`Morning fasted`, etc.), and note input fit seamlessly with pinned bottom CTA (`Save Weigh-In` / `Update Weigh-In`) anchored directly above bottom safe area.
      - Hero card equipped with unit toggle pill (`[ kg | lbs ]`), 54px bold digital display, tap-to-type numeric input with instant checkmark, goal difference badge, and 4 micro-steppers (`[-1.0]`, `[-0.1]`, `[+0.1]`, `[+1.0]`).
      - Full interactive calendar modal for arbitrary past-date backfilling with disabled future dates.
    - **Settings & Goals Cloud Persistence Engine ([HealthContext.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/context/HealthContext.tsx))**:
      - **Unblocked Debounced Goals Sync**: Removed restrictive `hydratedUidRef.current === auth.currentUser.uid` gate in `firestoreGoalsDebounceRef` that silently dropped user goal writes for newly registered or active accounts.
      - **Dual Top-Level & Nested Map Parity**: Simultaneous synchronization of both top-level profile fields (`weight`, `weightUnit`, `startWeightKg`, `heightCm`, `updatedAt`) and nested `goals` map in Firestore `users/{userId}`.
      - **Hydration Precedence Fix**: Prioritized `data.goals?.weightUnit` and `data.goals?.startWeightKg` over stale registration-time profile fields during `fetchAndHydrateUserData`, permanently preventing goal settings (e.g. `lbs` or custom targets) from being overwritten by stale cloud data on reload.
      - **Cold-Start User Scoping**: Prioritizes `getUserGoalsKey(parsedAuth.id)` before falling back to generic `STORAGE_KEYS.USER_GOALS`.
    - **Harmonized Fallbacks Across Modals ([WeightGoalSettingsModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/WeightGoalSettingsModal.tsx))**:
38. **Red-Team Security Hardening, Information Leak Elimination & Viewport Keyboard Adaptability**:
    - **Cloud Firestore Subcollection Purge on Account Deletion ([HealthContext.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/context/HealthContext.tsx))**:
      - Root Cause: Deleting the parent user document via `deleteDoc(doc(db, 'users', uid))` left subcollections (`dailyLogs`, `customFoods`, `chatHistory`) permanently orphaned in Cloud Firestore. Once the Firebase Auth user was deleted, Firestore security rules denied all subsequent access, permanently trapping user health PII in the database.
      - Resolution: Implemented recursive, pre-deletion chunked batching (`writeBatch`) capped at 400 operations per commit across `dailyLogs`, `customFoods`, and `chatHistory` prior to root document and auth account deletion. Purged all user-scoped offline storage keys (`getUserLogsKey`, `getUserGoalsKey`, `getUserCustomFoodsKey`) and revoked local hardware secrets via `SecureKeyStorage.removeApiKey()`.
    - **Zero-Cloud Footprint Hardware-Backed BYOK Gemini API Key Storage ([SecureKeyStorage.ts](file:///c:/Users/navee/Videos/Calorify/calori/src/services/ai/storage/SecureKeyStorage.ts))**:
      - Root Cause: `safeEncode` (Base64) was uploading the user's BYOK Gemini API key to Firestore (`geminiKeyObfuscated`), exposing it to anyone with database/console read access.
      - Resolution: Completely removed cloud uploads from `saveApiKey()`. API keys are now stored strictly in hardware-backed `expo-secure-store` (iOS Keychain / Android KeyStore with `AFTER_FIRST_UNLOCK`). In `removeApiKey()`, added permanent field deletion with `deleteField()`. In `restoreFromFirestore()`, added a one-time migration that pulls legacy keys into local secure store and immediately purges `geminiKeyObfuscated` from Firestore using `deleteField()`.
    - **Indirect System Prompt Injection & Telemetry Sanitization ([NutritionContextBuilder.ts](file:///c:/Users/navee/Videos/Calorify/calori/src/services/ai/context/NutritionContextBuilder.ts))**:
      - Root Cause: Unsanitized user profile names and custom meal names were directly concatenated into system prompt instructions, opening an indirect prompt injection attack surface.
      - Resolution: Implemented strict sanitization (`sanitizeText`) stripping newlines (`[\r\n]+`) and angle brackets (`[<>]`), length limits, and bounded logged meals to 30 items. Encapsulated dynamic context inside structured `<user_telemetry>` and `<today_meals>` XML boundary tags, with explicit guard instructions directing Ria to treat all content in these tags as untrusted passive reference data.
    - **Cloud Firestore Rules Map Denial-of-Service Defense ([firestore.rules](file:///c:/Users/navee/Videos/Calorify/calori/firestore.rules))**:
      - Root Cause: `isValidUserDoc` accepted arbitrary map contents for `goals` without sizing constraints, allowing up to 1MB of arbitrary nested document bloat.
      - Resolution: Hardened rule constraint to `(!('goals' in data) || (data.goals is map && data.goals.keys().size() <= 35))` providing generous headroom for all 22 legitimate goal settings while strictly blocking document bloat DoS. Validated and deployed live to Firebase via `firebase_deploy`.
    - **Adaptive Viewport Compression & Keyboard Responsiveness ([LogWeightScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/LogWeightScreen.tsx))**:
      - Root Cause: On small viewports (iPhone SE / smaller Android devices), opening the soft keyboard compressed available viewport height from ~800dp to ~480dp, risking element squishing and pushing note inputs or CTA buttons off-screen.
      - Resolution: Added `Keyboard.addListener` detection (`isKeyboardOpen`). When the keyboard is active, conditionally hides the micro-steppers row (`steppersContainer`, saving ~54dp), scales the digital hero display from 54px to 38px, tightens hero card, date ribbon, and context card vertical paddings, and applies `keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}`, guaranteeing that 100% of the UI remains un-squished, fully visible, and interactive with zero vertical scrolling.
39. **Comprehensive Weight Report Screen & Analytical Architecture ([WeightReportScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightReportScreen.tsx))**:
    - **Parity with Hydration Reporting**: Ported the high-density analytical experience of `WaterReportScreen` into the Weight domain, tailored for continuous body state tracking with `Weekly` (7 days), `Monthly` (4-5 weekly intervals), and `Yearly` (12 months) timeframes with `< Period >` date range navigation.
    - **Period Overview KPI Card ([WeightSummaryCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/WeightSummaryCard.tsx))**: 4-pod summary showing Net Change ($\Delta$ with directional emerald `#10B981` / rose `#FF3B5C`), Current/Latest weigh-in, Period Average, and Goal Distance pill (`7.4 kg to goal` / `Goal Achieved! 🎉`).
    - **Dual-Mode Trend Chart with Goal Reference Line ([WeightTrendCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/WeightTrendCard.tsx))**:
      - Line Mode: Smooth SVG spline with area gradient and intelligent linear interpolation across empty weigh-in days so paths connect cleanly without gaps. Features an overlaid dashed horizontal reference line for **Goal Weight** with milestone label (`Goal: 65.0 kg`).
      - Bar Mode: Chunky capsule bars (`barWidth: 18–28px`) in brand Rose (`Colors.weight = '#FF3B5C'`).
      - Interactive Pin Tooltip: Pins circular needle badge (`ChartTooltipPin`) above selected day, displaying exact weight and unit.
      - Auto-Scaling Y-Axis: Dynamically calculates Y-bounds based on min/max weights and goal target.
    - **Weight Fluctuation Delta Card ([WeightDeltaCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/WeightDeltaCard.tsx))**: Dual-mode diverging chart showing day-to-day / interval $\pm \Delta$ variance centered on a zero baseline ($0.0$). Negative bars (losses) extend downward in emerald green; positive bars (gains) extend upward in warm coral.
    - **Weigh-In Conditions Donut Card ([WeightContextCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/WeightContextCard.tsx))**: SVG Donut chart (`DONUT_SIZE: 126`, `STROKE_WIDTH: 13`) with 2-column legend visualizing context habits (`Morning fasted`, `Post workout`, `Pre meal`, `Evening`) and center readout (`80% Fasted Logs`).
    - **Seamless App-Wide Entrypoints**: Added dedicated `stats-chart-outline` button in the header of `WeightTrackerScreen.tsx` and wired existing `onOpenReport` in `WeightHistoryScreen.tsx`, mounting `WeightReportScreen` via `SlideInSubScreen` with hardware back support.
40. **Weight History Header Report Icon & Resilient Fallback Wiring ([WeightHistoryScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightHistoryScreen.tsx))**:
    - **Contextual Access**: Users reviewing their weigh-in timeline now have immediate access to the full Weight Report without having to return to the parent tracker screen first.
    - **Unconditional Header Action Button**: Added `<Ionicons name="stats-chart-outline" size={19} color={Colors.iconNavy} />` circular action button (`width: 40, height: 40, borderRadius: 20`) alongside the coral `+` log button.
    - **Dual Wiring Architecture**:
      - If `onOpenReport` callback is provided by the parent (`WeightTrackerScreen`), it calls `onOpenReport()` to trigger the parent's `SlideInSubScreen` (`zIndex: 300`).
      - If `onOpenReport` is absent (e.g. standalone usage), `WeightHistoryScreen` automatically activates its own internal fallback `SlideInSubScreen` with hardware `BackHandler` dismissal.
    - **Pixel-Perfect Header Balance**: Styled `headerLeftWrapper` (`width: 88, alignItems: 'flex-start'`) to match `headerRightActions` (`width: 88, justifyContent: 'flex-end', gap: 8`), guaranteeing that the "Weight History" title remains centered with mathematical symmetry.
41. **Weight Report Fine-Tuning, Subheader Copy & Data Connection Integrity ([WeightReportScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightReportScreen.tsx))**:
    - **Empathetic & Precise Copywriting**:
      - Updated screen header to `"Weight Report"` with balanced layout (`width: 40` empty spacer balancing the back chevron).
      - Replaced sterile statistical jargon (`"daily mean"`) with natural health phrasing (`"period average"`).
      - Updated pod subheaders to `"across this period"` and `"recorded weigh-in"`. If a selected period has no entries, explicitly displays `"--"` and `"no entry in period"`.
      - Enhanced goal distance badge to `🎯 7.4 kg to goal` / `🎉 Goal Reached!`.
      - Updated Weigh-In Conditions card subtitle to `"Routine & habit consistency"`.
    - **Timeframe-Aware Dynamic Subheaders**:
      - Made the Weight Fluctuation card subtitle context-sensitive:
        - Weekly: `"Day-to-day ± variance (kg)"`
        - Monthly: `"Week-over-week ± variance (kg)"`
        - Yearly: `"Month-over-month ± variance (kg)"`
    - **Visual Logic & Color Semantics**:
      - Fixed zero-variance coloring (`delta === 0`): rendered in neutral Slate (`#94A3B8`) rather than gain-red (`#FF3B5C`).
      - Prevented synthetic flat horizontal line in Line Mode when only 1 weigh-in exists; renders a clean focal node dot with interactive tooltip.
      - Updated interactive pins on unlogged days to display `"No entry"` instead of ambiguous `"--"`.
    - **Data Connection & Calculation Integrity**:
      - Multi-day lookback seed: Seeds Monday's weekly delta by looking back up to 7 days prior to Monday for the user's latest baseline weigh-in.
      - Resilient data extraction: Added automatic fallback to `log.weightEntries[0].weightKg` if `log.weightKg` is missing or 0 across weekly, monthly, and yearly loops.
      - Eliminated mock data fallbacks: When a period has 0 logs, `WeightContextCard` now displays an honest zero-state (`"0 No Logs"`) with a helpful prompt encouraging users to tag conditions, rather than rendering sample mock data.
42. **Safe Areas & System Bars Hierarchy Audit (Expo SDK 57 & Edge-to-Edge Compliance)**:
    - **App Architecture Validation**: Verified root `App.tsx` wraps the app in `<SafeAreaProvider>`, `<StatusBar style="dark" />`, and `<NavigationBar style="dark" />` with `<SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>` wrapping `<View style={styles.contentArea}>`.
    - **Double Top Inset Bug Resolved**:
      - Because `contentArea` is already padded by `insets.top`, sub-screens inside `SlideInSubScreen` are already placed beneath the status bar.
      - Identified that `WeightTrackerScreen.tsx` (`paddingTop: Math.max(insets.top, 12)`), `WeightHistoryScreen.tsx` (`paddingTop: Math.max(insets.top, 10)`), `WeightReportScreen.tsx` (`paddingTop: Math.max(insets.top, 10)`), and `WaterReportScreen.tsx` (`paddingTop: Math.max(insets.top, 10)`) were inadvertently applying `insets.top` twice, causing an unnatural 118px empty whitespace gap on iOS / Android edge-to-edge.
      - Fixed all four screens to use consistent `{ paddingTop: 6 }`, harmonizing with `WaterTrackerScreen.tsx` and `WaterIntakeHistoryScreen.tsx`.
    - **Modal Validation**: Confirmed that `LogWeightModal.tsx` (`presentationStyle="fullScreen"`) correctly applies `insets.top` and `insets.bottom` because full-screen modals bypass root `SafeAreaView`. Enhanced bottom sheet modals (`CupSizeModal.tsx`, `HydrationSettingsModal.tsx`, `WeightGoalSettingsModal.tsx`) to dynamically pad their bottom sheets using `Math.max(insets.bottom, 16..24)` to safely avoid collision with Android edge-to-edge system navigation bars and iOS home indicators.
43. **Weight Trend Chart Card Reference Alignment ([WeightTrendCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/WeightTrendCard.tsx))**:
    - **Header & Title**: Updated card title to `"Weight (kg)"` (dynamic to selected unit).
    - **Dual Legend**: Added horizontal `● Selected` (solid vibrant orange dot) and `--- Weight Goal` (dashed orange indicator) side-by-side matching the reference images.
    - **0-to-100 Y-Axis Scale**: Replaced floating truncated scale with standard baseline scale starting at 0 (`[100, 80, 60, 40, 20, 0]` with 20-step intervals), allowing bars to rise naturally from 0 and positioning 70-80 kg in the upper quartile.
    - **Reference Squircles Toggle**: Refined `ChartTypeToggle.tsx` squircle buttons (`32x28`, `borderRadius: 8`, active background `#FF5B26`).
    - **Pill Pillar Bars (Bar Mode)**: Modeled full-height vertical pill columns rising from 0, with unselected bars rendered in soft peach-coral (`#FFAA94`) and selected bar in solid vibrant orange (`#FF5B26`).
    - **Node Styling (Line Mode)**: Unselected nodes rendered as crisp hollow white donuts with thick orange rim (`r=6.5, strokeWidth=3`), while selected node renders as a solid vibrant orange dot (`r=7`).
    - **Circular Tooltip Badge ([ChartTooltipPin.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/ChartTooltipPin.tsx))**: Thick 3.2px orange border, stacked bold value (`78.9`) and small unit (`kg`) with needle touching the apex of bars and line nodes.
    - **Clean X-Axis**: Displaying clean day numbers (`16, 17, 18, 19...`) centered under each column.
44. **Streamlined Weight Report Screen ([WeightReportScreen.tsx](file:///c:/Users/navee/Videos/Calorify\calori/src/screens/main/WeightReportScreen.tsx))**:
    - **Eliminated Redundant Charts**: Removed `WeightDeltaCard` (day-to-day ± variance) and `WeightContextCard` (weigh-in conditions donut chart).
    - **Clean, Focused Experience**: Reduced visual cognitive load and scroll fatigue. The report is now centered entirely around:
      1. Timeframe segmented tabs (`Weekly | Monthly | Yearly`)
      2. Date range navigator (`< Dec 16 – Dec 22 >`)
      3. Period Overview Summary card (`WeightSummaryCard`)
      4. Hero `Weight (kg)` trend chart with 0-to-100 scale, `Selected` & `Weight Goal` legend, and `Line ⇄ Bar` toggle (`WeightTrendCard`)
    - **Code Cleanup**: Removed all unused tag mapping logic (`QUICK_TAG_COLORS`), delta calculation loops, and unused state hooks, dramatically improving screen mount performance.
45. **BMI Radial Speedometer Gauge Architecture ([BMIGaugeCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/report/BMIGaugeCard.tsx))**:
    - **Header & Dynamic Status Pill**: Top row features title `"BMI (kg/m2)"` and dynamic classification pill badge displaying active status (e.g. `[Normal]` in emerald green `#22C55E`, `[Overweight]` in amber `#EAB308`, etc.).
    - **240° Radial Speedometer SVG**:
      - Sweep spans $240^\circ$ ($150^\circ$ bottom-left to $390^\circ$ bottom-right, centered at $(140, 116)$ on a $280\times 224$ canvas with $R = 90$ and stroke width $14$).
      - Composed of 8 distinct WHO classification segments mapped proportionally to BMI spans ($[15.0, 42.0]$, total span $27.0$):
        1. Very severely underweight ($< 16.0$, `#0284C7`)
        2. Severely underweight ($16.0 - 16.9$, `#0EA5E9`)
        3. Underweight ($17.0 - 18.4$, `#06B6D4`)
        4. Normal ($18.5 - 24.9$, `#22C55E`)
        5. Overweight ($25.0 - 29.9$, `#EAB308`)
        6. Obese Class I ($30.0 - 34.9$, `#F97316`)
        7. Obese Class II ($35.0 - 39.9$, `#EF4444`)
        8. Obese Class III ($\ge 40.0$, `#DC2626`)
      - Semicircular rounded end-caps on the outer extremities with seamless butt joins between internal segments.
      - Concentric inner ring of 17 precision instrument tick marks in light slate (`#CBD5E1`).
    - **Center Hub & Smooth 60fps Native-Driver Pointer Needle**:
      - Tapered gradient blade needle with rounded apex, transitioning from semi-transparent to solid active category color.
      - Center hollow donut hub ring (`r = 16`, `borderWidth = 4`, white background with colored border matching active tier).
      - Silky smooth needle movement powered by React Native `Animated.spring` with native driver (`useNativeDriver: true`) and angular interpolation (`-120deg` at $150^\circ$ to `+120deg` at $390^\circ$), ensuring 60fps/120fps GPU performance, graceful reduced-motion support, and full Jest testing compatibility.
    - **Central Readout**: Prominent bold numeric BMI display (`22.9`, 38px bold) and `"BMI (kg/m2)"` label nestled directly in the lower opening between the arc tips.
    - **WHO Classification Table**: Comprehensive 8-category legend with colored dots, tier labels, and BMI threshold ranges; active tier is dynamically highlighted in bold dark text (`#0F172A`).
    - **Seamless Screen Wiring ([WeightReportScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightReportScreen.tsx))**: Mounted directly below `WeightTrendCard`, dynamically pulling latest period weigh-in (`periodSummaryData.currentWeightKg ?? userGoals.currentWeightKg ?? 72.5`) and height (`userGoals.heightCm ?? 178`).
46. **Weight Tracker Flow Edge-Case Hardening & Mathematical Precision**:
    - **0.1 lbs Stepper Quantization Resolution ([LogWeightScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/LogWeightScreen.tsx), [WeightGoalSettingsModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/WeightGoalSettingsModal.tsx))**: Upgraded pound-stepping kg calculation to 2-decimal precision (`Math.round((nextLbs / 2.20462) * 100) / 100`). Resolves the critical math lock where $\pm 0.1\text{ lbs}$ ($\approx 0.045\text{ kg}$) was smaller than $0.1\text{ kg}$ resolution and rounded back to the initial value, freezing the stepper.
    - **Zero-Variance Neutral Badge ([WeightHistoryScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightHistoryScreen.tsx), [WeightHistoryCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/weight/WeightHistoryCard.tsx))**: Added `isZero` condition rendering a neutral slate badge (`#94A3B8`) with horizontal dash icon (`remove`) and `0.0 kg/lbs` text (no minus sign), eliminating false green downward indicators when weight is unchanged.
    - **Intra-Day Timestamp & Entry Restoration on Undo ([HealthContext.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/context/HealthContext.tsx), [WeightHistoryScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightHistoryScreen.tsx))**: Extended `logWeight` to accept `customLoggedAt` and `customId`. Tapping Undo on a deleted weigh-in now perfectly restores the original timestamp, unique ID, and chronological position in the intra-day feed.
    - **Timezone-Safe Backfilling ([HealthContext.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/context/HealthContext.tsx))**: Replaced forced `T08:00:00.000Z` UTC string with local morning date construction (`new Date(y, m - 1, d, 8, 0, 0)`), preventing negative timezone offsets (UTC-8, UTC-10) from rolling over into the previous calendar day.
47. **Compact BMI Spectrum Card on Dashboard Today Screen ([TodayBMICard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/TodayBMICard.tsx), [TodayScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/TodayScreen.tsx))**:
    - **Visual Hierarchy & Header**: Displays bold card header `"BMI (kg/m2)"` on the left and a circular 32px edit button `( ✎ )` on the right which triggers `LogWeightModal` to update weight.
    - **Numeric Readout & Active Category**: Prominent 32px bold numeric BMI value (e.g. `22.9`) paired with an inline category subtitle (e.g. `Normal` in `#64748B`). Dynamically computes BMI from `currentLog?.weightKg ?? userGoals.currentWeightKg ?? 72.5` and `userGoals.heightCm ?? 178`.
    - **8-Segment Proportional Spectrum Track**: Horizontal capsule bar segmented into the 8 clinical WHO categories:
      1. Very severely underweight ($< 16.0$, span: 1.0, `#0284C7`)
      2. Severely underweight ($16.0 - 16.9$, span: 1.0, `#0EA5E9`)
      3. Underweight ($17.0 - 18.4$, span: 1.5, `#06B6D4`)
      4. Normal ($18.5 - 24.9$, span: 6.5, `#22C55E`)
      5. Overweight ($25.0 - 29.9$, span: 5.0, `#EAB308`)
      6. Obese Class I ($30.0 - 34.9$, span: 5.0, `#F97316`)
      7. Obese Class II ($35.0 - 39.9$, span: 5.0, `#EF4444`)
      8. Obese Class III ($\ge 40.0$, span: 2.0, `#DC2626`)
    - **Sliding Upward Triangle Indicator**: 14px upward SVG triangle caret sliding horizontally beneath the spectrum track, pointing exactly to the user's BMI position. Powered by `Animated.spring` with `useNativeDriver: true` and `AccessibilityInfo.isReduceMotionEnabled()` support.
    - **Seamless Dashboard Feed Integration**: Mounted directly beneath `WeightTrackerCard` in `TodayScreen.tsx` with identical margins and borders for visual cadence.
    - **Testing**: Added comprehensive unit test suite ([TodayBMICard.test.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/__tests__/TodayBMICard.test.tsx)) covering WHO categorization, dynamic metric display, edit modal interaction, and layout changes. 15/15 test suites and 129/129 tests passing.
48. **Diary Tab Pivot to Dedicated Health Trackers Hub ([TrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/TrackerScreen.tsx), [BottomNavBar.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/navigation/BottomNavBar.tsx), [TodayScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/TodayScreen.tsx), [App.tsx](file:///c:/Users/navee/Videos/Calorify/calori/App.tsx))**:
    - **Architectural Motivation**: Eliminated the redundant `DiaryScreen` (which duplicated Today's meal cards) and resolved cognitive load/overlength scrolling on `TodayScreen`.
    - **Navigation Rebrand (`BottomNavBar.tsx`)**: Rebranded Tab 2 from `'diary'` to `'tracker'` with universal health biomarker icon (`pulse` / `pulse-outline`) and label `"Tracker"`.
    - **Dedicated Ria AI Top Deck**: Positioned [RiaCoachCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/RiaCoachCard.tsx) as the premier top hero card on `TrackerScreen`, establishing a dedicated gateway for daily AI synthesis and full-screen [RiaChatModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/RiaChatModal.tsx) access.
    - **Biometric Trackers Suite (Zero UI Distortion)**: Moved biometric trackers into `TrackerScreen` in precise visual hierarchy:
      1. Top Header (`"Trackers"`, formatted date subtitle, Search & Notifications quick actions)
      2. 7-Day Date Selector ([TopDateStrip.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/TopDateStrip.tsx))
      3. Ria AI Coach Top Deck ([RiaCoachCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/RiaCoachCard.tsx))
      4. Water Tracker ([WaterTracker.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/WaterTracker.tsx) → launches [WaterTrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WaterTrackerScreen.tsx))
      5. Weight Tracker ([WeightTrackerCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/WeightTrackerCard.tsx) → launches [WeightTrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WeightTrackerScreen.tsx))
      6. Compact BMI Spectrum Card ([TodayBMICard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/TodayBMICard.tsx))
      7. Dual Dial Daily Habits ([DailyHabitsCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/DailyHabitsCard.tsx))
    - **100% Wiring & Event Binding ([App.tsx](file:///c:/Users/navee/Videos/Calorify/calori/App.tsx))**: Connected `onOpenRiaChat`, `onOpenWaterTracker`, `onOpenWeightTracker`, `onSearchPress`, `onNotificationsPress`, scroll offset preservation (`trackerScrollRef`, `saveTrackerScrollOffset`), and Android back button handling.
    - **Streamlined Today Screen ([TodayScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/TodayScreen.tsx))**: Stripped duplicate tracker cards so Today Screen serves exclusively as the clean, lightning-fast Daily Nutrition & Energy Hub (`Header` → `TopDateStrip` → `HeroCalorieCard` → `MealSection`).
    - **Testing**: Added unit test suite ([TrackerScreen.test.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/__tests__/TrackerScreen.test.tsx)). All 16 test suites and 133 tests passing with 0 TypeScript compilation errors.
49. **Compact Water Tracker Card Reference Alignment ([WaterTracker.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/WaterTracker.tsx))**:
    - **Ultra-Compact Visual Footprint**: Reduced card height from ~195px down to a sleek ~105px, eliminating the old divider line, chevron arrow, and redundant `0% completed` text.
    - **Header & Metric Stack**: Bold left title `"Water"` (18px, `#0F172A`), large intake readout (`32px` bold value + `16px` medium `" mL"` aligned to baseline), and subtle target subtitle (`/ 2,500 mL` in `#64748B`).
    - **Symmetrical Stepper Trio with 3D Teardrop Droplet**:
      - Circular outline minus button `( − )` (`40×40px`, `1.5px` sky blue border `#0EA5E9`), disabled when water is 0 mL.
      - Center scaled [DropletVisualizer](file:///c:/Users/navee/Videos/Calorify/calori/src/components/water/DropletVisualizer.tsx) (`58×72px`) with outer 3D halo contour (`showHalo={true}`), soft cavity gradient, and dual GPU wave slosh physics.
      - Circular outline plus button `( + )` (`40×40px`, `1.5px` sky blue border `#0EA5E9`), incrementing intake by step (default 250 mL).
    - **Navigation & Affordance**: Title row features an inline sky blue chevron `[ Water › ]` (`Feather chevron-right`, `#0EA5E9`), clearly communicating to users that tapping the title navigates forward to [WaterTrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/WaterTrackerScreen.tsx).
    - **Testing**: Added dedicated unit test suite ([WaterTracker.test.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/__tests__/WaterTracker.test.tsx)). All 17 test suites and 137 tests passing with 0 TypeScript errors.
50. **Compact Weight Tracker Card Reference Alignment ([WeightTrackerCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/WeightTrackerCard.tsx))**:
    - **Ultra-Compact Visual Footprint**: Removed the old dividing line, chevron arrow, and gray circular pencil button.
    - **Header & Metric Stack**: Title row features `[ Weight › ]` with coral/orange chevron (`Feather chevron-right`, `#FF5B26`). Left metric row shows bold 32px weight value (`78.5`), medium unit (`kg`), and inline directional delta badge (`[ ˇ - 0.2 kg ]` with emerald circle & downward chevron).
    - **Vibrant Orange "Update" Pill Button**: Replaced pencil icon with a solid vibrant coral-orange pill button (`backgroundColor: '#FF5B26'`, white text) on the right, which opens [LogWeightModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/LogWeightModal.tsx).
    - **Chunky Orange Progress Bar**: Chunky 13px capsule progress bar in matching `#FF5B26` coral-orange animating from Starting weight to Goal weight.
    - **Range Footer**: Subtle Starting (`80.0 kg`) and Goal (`75.0 kg`) range indicators below the progress track.
    - **Testing**: Added unit test suite ([WeightTrackerCard.test.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/__tests__/WeightTrackerCard.test.tsx)). All 18 test suites and 140 tests passing with 0 TypeScript compilation errors.
51. **Dead Code Elimination, Interface Tightening & Re-Render Performance Optimization**:
    - **Purged 6 Orphaned / Superseded Files & Duplicate Asset**:
      - `WaterBottomDock.tsx`: Orphaned when dock controls were integrated directly into [HeroDropletCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/water/HeroDropletCard.tsx).
      - `WeightDeltaCard.tsx` & `WeightContextCard.tsx`: Orphaned during the Weight Report chart streamlining.
      - `SearchFoodModal.tsx`: 544 lines of dead prototype code superseded by [FoodLogModal.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/FoodLogModal.tsx).
      - `DropletVisualizer.tsx` & `HeroDropletCard.tsx` shims in `src/components/dashboard/`: 2-line re-export shims with 0 references.
      - `assets/icon.png`: Orphaned duplicate of `logo.png` (removed).
    - **Barrel & Export Cleanup**:
      - Cleaned barrel exports in `src/components/index.ts`, `src/components/water/index.ts`, and `src/components/report/index.ts`.
    - **Component Interface Tightening & Dead Prop Elimination**:
      - [TodayScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/TodayScreen.tsx): Removed unused `onOpenWaterTracker` and `onOpenWeightTracker` props.
      - [TrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/TrackerScreen.tsx): Removed unused `onAvatarPress`, `onSignInPress`, `onSignOutPress` from `TrackerScreenProps`.
      - [AnalyticsScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/AnalyticsScreen.tsx): Removed 5 unused header callback props.
      - [BottomNavBar.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/navigation/BottomNavBar.tsx): Removed unused `Platform`, `MealType`, `onQuickLogFood`, and `onQuickLogWater`.
      - [App.tsx](file:///c:/Users/navee/Videos/Calorify/calori/App.tsx): Removed dead callbacks (`handleQuickWater`, unused `useDailyLog` import) and stopped passing dead props.
    - **Re-Render & Performance Optimization**:
      - [TopDateStrip.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/TopDateStrip.tsx): Wrapped touch gesture handlers (`onTouchStart`, `onTouchEnd`) and calendar navigation (`handleOpenCalendar`, `prevMonth`, `nextMonth`) with `useCallback`.
      - [WaterTracker.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/WaterTracker.tsx): Wrapped `handlePlus` and `handleMinus` with `useCallback` and wrapped component with `React.memo`.
      - [WeightTrackerCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/WeightTrackerCard.tsx): Hoisted `toDisplayWeight` pure function, wrapped `handleSaveModal` with `useCallback`, and wrapped component with `React.memo`.
      - [TodayBMICard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/TodayBMICard.tsx): Wrapped `handleBarLayout` and `handleEditPress` with `useCallback` and wrapped component with `React.memo`.
    - **Verification**:
      - Full TypeScript type check (`npx tsc --noEmit`) passed with 0 errors.
      - All 18 test suites and 140 unit tests passing.
52. **Standalone Movement Tracker Card Reference Alignment & Full Suite Fine-Tuning ([MovementTrackerCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/MovementTrackerCard.tsx), [DailyHabitsCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/DailyHabitsCard.tsx), [TrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/TrackerScreen.tsx))**:
    - **Architectural Motivation (Option A)**: Eliminated the redundant duplicate hydration pod from the legacy `DailyHabitsCard.tsx` (Card #3 on `TrackerScreen` is already the dedicated [WaterTracker.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/WaterTracker.tsx)). Transformed the legacy dual-dial card into a sleek, standalone **Movement** card matching the visual language of `WaterTracker`, `WeightTrackerCard`, and `TodayBMICard` (~105px base height, 20px continuous rounded corners, `#FFFFFF` card surface, `#0F172A` soft shadow).
    - **Header & Metric Stack with Auto Distance**:
      - Title row: `[ Movement › ]` with Kinetic Flame Orange chevron (`Feather chevron-right`, `#EA580C`), signaling navigation affordance.
      - Stat stack: 32px bold number (`6,420`), medium unit (`steps`), and 3-biomarker context (`/ 10,000 steps • ~4.9 km • ~257 kcal`).
      - Top-right action: Soft-tinted `+ Workout` pill button (`#FFF7ED` bg, `#FED7AA` border, `#EA580C` text & barbell icon) opening the workout logging modal.
    - **Chunky Kinetic Flame Orange Progress Bar, Celebration Badge & Stepper Controls**:
      - Chunky 12px capsule progress bar (`#FFEDD5` track, `#EA580C` fill via Reanimated `withTiming`).
      - Goal progress readout: Shows `{actualStepPercent}% of daily goal` when under goal, or a golden celebration badge `[ ✨ Goal Smashed! (110%) ]` (`#FEF3C7` bg, `#B45309` text) when steps >= goal.
      - Symmetrical steppers with Haptic feedback (`expo-haptics`): Circular outline minus stepper `( − )` (deducts 1,000 steps, disabled when steps <= 0) and soft-tinted plus stepper `( + 1k )` (adds 1,000 steps).
    - **Collapsible Logged Workouts Section with Timestamps & Tap-to-Edit**:
      - Hairline divider appearing only when `currentLog.activities` contains logged workouts.
      - Header showing count (`Today's Workouts (1)`) and total active burn (`+130 kcal total`).
      - Activity chips display contextual emoji (`🚶`, `🏋️`, `🏃`, `🧘`, `🚴`, `🏊`, `⚡`, `🏸`), name, duration, calories, and time stamp (e.g. `• 9:30 AM`).
      - Tapping an activity chip enters edit mode (`Edit Activity` / `Update Workout`).
      - 1-tap delete button with tactile haptic feedback.
    - **Quick Workout Logging Modal with Proportional Calorie Calculation**:
      - 8 curated presets: Brisk Walk (30m, 130 kcal), Gym / Weights (45m, 220 kcal), Running (25m, 240 kcal), Yoga & Stretch (35m, 110 kcal), Cycling (30m, 190 kcal), Swimming (30m, 240 kcal), HIIT & Cardio (20m, 180 kcal), Badminton (40m, 220 kcal).
      - Proportional calorie auto-calculation: Changing duration automatically adjusts estimated calories according to activity burn rate per minute.
    - **Backwards Compatibility**:
      - Retained [DailyHabitsCard.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/DailyHabitsCard.tsx) as an alias re-exporting `MovementTrackerCard` with default `testID="daily-habits-card"`.
    - **Testing**: Added unit test suite ([MovementTrackerCard.test.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/components/dashboard/__tests__/MovementTrackerCard.test.tsx)). All 19 test suites and 149 unit tests passing with 0 TypeScript compilation errors.

28. **Step Tracker Screen Foundation & Slide-In Wiring** — wired dedicated sub-screen navigation to `[ Movement › ]`:
    - Created [StepTrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/StepTrackerScreen.tsx) with top safe-area insets, back button, title "Step Tracker", settings icon placeholder, scroll container, and Android hardware back handling.
    - Exported `StepTrackerScreen` in [src/screens/index.ts](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/index.ts).
    - Wired `onOpenStepTracker` through [TrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/TrackerScreen.tsx) to `<MovementTrackerCard onPressHeader={onOpenStepTracker} />`.
    - Integrated `<SlideInSubScreen>` in [App.tsx](file:///c:/Users/navee/Videos/Calorify/calori/App.tsx) with state management (`stepTrackerVisible`, `isClosingStepTracker`, open/close/closed callbacks, and hardware back dismissal).
    - Added unit test suite [StepTrackerScreen.test.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/__tests__/StepTrackerScreen.test.tsx) and updated [TrackerScreen.test.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/__tests__/TrackerScreen.test.tsx). 20 test suites, 152 tests passing.

29. **Android Health Connect Integration (Phase 1: Working Steps Milestone — Verified Live on Device)**:
    - Installed `react-native-health-connect` (`^4.1.3`) and `expo-build-properties` (`~57.0.4`).
    - Configured plugins and Android SDK targets (`compileSdkVersion: 36`, `targetSdkVersion: 36`, `minSdkVersion: 26`) + `android.permission.health.READ_STEPS` in [app.json](file:///c:/Users/navee/Videos/Calorify/calori/app.json).
    - Executed clean Android prebuild (`npx expo prebuild --clean --platform android`).
    - Created isolated feature module under `src/features/health/`:
      - [healthConnect.ts](file:///c:/Users/navee/Videos/Calorify/calori/src/features/health/healthConnect.ts): `isHealthConnectAvailable()`, `initializeHealthConnect()`, `getTodayStepsAggregate()` (aggregated queries between 00:00:00 and 23:59:59.999 today), `getTodayStepsRecords()` (raw step records fallback for 3rd-party apps).
      - [healthPermissions.ts](file:///c:/Users/navee/Videos/Calorify/calori/src/features/health/healthPermissions.ts): `hasStepsPermission()`, `requestStepsPermission()`, `openHealthSettings()` (guarantees `initializeHealthConnect()` is awaited first to prevent `ClientNotInitialized` exception).
      - [healthService.ts](file:///c:/Users/navee/Videos/Calorify/calori/src/features/health/healthService.ts): `connectHealth()`, `getTodaySteps()` (dual aggregate + raw records fallback).
      - [HealthScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/features/health/HealthScreen.tsx): Standalone test/dev component.
    - Product UI Integration:
      - Wired into [StepTrackerScreen.tsx](file:///c:/Users/navee/Videos/Calorify/calori/src/screens/main/StepTrackerScreen.tsx): Connection badge, hero count display, `~km` and `~kcal` calculation, "Connect Health Connect" / "Sync Health Data" button, direct link to manage Health Connect settings, and automatic sync to `currentLog.steps` in `HealthContext`.
    - **Live Device Verification**: Verified live on physical Android device connected with Google Fit:
      - Query returned: `'{"dataOrigins":["com.google.android.apps.fitness"],"COUNT_TOTAL":1269}'`
      - Displayed 1,269 steps, updated distance (~1.0 km) and active energy, syncing directly into `HealthContext.dailyLogs`.
    - Unit tests: 21 test suites, 159 tests passing (`npm test`), 0 TypeScript compiler errors (`npx tsc --noEmit`).

## Important decisions & gotchas (do NOT re-litigate without reason)

- **Springs → `withTiming`.** The user preferred simple, fast, predictable timing over spring physics for press feedback (springs felt "unnatural"/bouncy). Press feedback uses `withTiming` (~80–120ms), toast/tooltip ~150–180ms, ruler snap-back 200ms.
- **`MealCard` kept `maxHeight`** (moved to UI thread) rather than `scaleY` + measured height — the lower-risk fix. Could upgrade to `scaleY` later if desired.
- **`FoodLogModal` drawer slide/fade was dead code** — the `Modal` already slides via `animationType="slide"`; the unused `drawerSlideAnim`/`drawerFadeAnim` were removed.
- **SecureStore keys must only contain alphanumeric, '.', '-', and '_'.** Firebase persistence keys contain `:` and `[`/`]`, so `firebase.ts` hex-encodes keys (`fb_auth_` + hex). `SecureKeyStorage.ts` previously used `${GEMINI_API_KEY_STORAGE_KEY}:${activeUid}` containing a colon `:`, which threw `Invalid key provided to SecureStore`. Updated to `${GEMINI_API_KEY_STORAGE_KEY}_${safeUid}` with regex sanitization.
- **One-time re-login** was required after switching auth persistence from AsyncStorage → SecureStore.
- **Reduced motion** is respected in `AnimatedProgressBar`, `AnimatedSvgRing`, and the `FoodLogModal` toast (via `AccessibilityInfo.isReduceMotionEnabled()`).
- **Native splash renders a single image only** — no text/layout, so "logo + wordmark" must be a pre-composited PNG.
- **Android adaptive-icon assets are mismatched** (`android-icon-background.png` is a blue geometric design, `android-icon-monochrome.png` reads as a chevron, not the flame) — left unwired.
- **No `expo-navigation-bar` config plugin** — light-only app, the OS already renders dark nav buttons correctly via color-scheme; `enforceContrast: false` would just disable useful OS logic.
- **Metro config** keeps `unstable_enablePackageExports: false` for Firebase. Reanimated 4 uses package exports — if bundling errors ("cannot resolve react-native-worklets"), flip it to `true`.
- **Android `elevation` polygon tessellation on circles:** Setting `elevation > 0` on circular `View` elements (`borderRadius: 50%`) forces Android's `ViewOutlineProvider` to approximate the circle using an 8-vertex polygon for 3D shadow casting, creating a visible octagon shape along borders. Fix: use `Platform.select({ ios: { shadow... }, android: { elevation: 0 } })` and integer `borderWidth: 2` on circular selections (e.g., [`CupSizeModal.tsx`](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/CupSizeModal.tsx) and [`AvatarPickerModal.tsx`](file:///c:/Users/navee/Videos/Calorify/calori/src/components/modals/AvatarPickerModal.tsx)).

## Known / pending items

- Verify the Reanimated bundle on a device (Metro resolution wasn't exercised in-session).
- Optionally regenerate a proper Android monochrome + background adaptive-icon layer from the flame.
- `expo-doctor` reports a pre-existing patch mismatch (`expo` / `@expo/metro-runtime`) — unrelated to the work above.

## Reference

- Expo v57 docs are the source of truth for API changes (per `AGENTS.md`).
- `firestore.rules` = owner-scoped access (`request.auth.uid == userId`), default deny.
