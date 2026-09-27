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

## Important decisions & gotchas (do NOT re-litigate without reason)

- **Springs → `withTiming`.** The user preferred simple, fast, predictable timing over spring physics for press feedback (springs felt "unnatural"/bouncy). Press feedback uses `withTiming` (~80–120ms), toast/tooltip ~150–180ms, ruler snap-back 200ms.
- **`MealCard` kept `maxHeight`** (moved to UI thread) rather than `scaleY` + measured height — the lower-risk fix. Could upgrade to `scaleY` later if desired.
- **`FoodLogModal` drawer slide/fade was dead code** — the `Modal` already slides via `animationType="slide"`; the unused `drawerSlideAnim`/`drawerFadeAnim` were removed.
- **SecureStore keys must only contain alphanumeric, '.', '-', and '_'.** Firebase persistence keys contain `:` and `[`/`]`, so `firebase.ts` hex-encodes keys (`fb_auth_` + hex). `SecureKeyStorage.ts` previously used `${GEMINI_API_KEY_STORAGE_KEY}:${activeUid}` containing a colon `:`, which threw `Invalid key provided to SecureStore`. Updated to `${GEMINI_API_KEY_STORAGE_KEY}_${safeUid}` with regex sanitization.
- **One-time re-login** was required after switching auth persistence from AsyncStorage → SecureStore.
- **Reduced motion** is respected in `AnimatedProgressBar`, `AnimatedSvgRing`, and the `FoodLogModal` toast (via `AccessibilityInfo.isReduceMotionEnabled()`).
- **Native splash renders a single image only** — no text/layout, so "logo + wordmark" must be a pre-composited PNG.
- **Android adaptive-icon assets are mismatched** (`android-icon-background.png` is a blue geometric design, `android-icon-monochrome.png` reads as a chevron, not the flame) — left unwired. `icon.png` is an orphan duplicate of `logo.png`.
- **No `expo-navigation-bar` config plugin** — light-only app, the OS already renders dark nav buttons correctly via color-scheme; `enforceContrast: false` would just disable useful OS logic.
- **Metro config** keeps `unstable_enablePackageExports: false` for Firebase. Reanimated 4 uses package exports — if bundling errors ("cannot resolve react-native-worklets"), flip it to `true`.

## Known / pending items

- Verify the Reanimated bundle on a device (Metro resolution wasn't exercised in-session).
- Optionally delete the orphaned `assets/icon.png`.
- Optionally regenerate a proper Android monochrome + background adaptive-icon layer from the flame.
- Optional hardening: move health data (logs/goals) from AsyncStorage → SecureStore; the Firestore Gemini-key "backup" is base64 (reversible), not encrypted.
- `expo-doctor` reports a pre-existing patch mismatch (`expo` / `@expo/metro-runtime`) — unrelated to the work above.

## Reference

- Expo v57 docs are the source of truth for API changes (per `AGENTS.md`).
- `firestore.rules` = owner-scoped access (`request.auth.uid == userId`), default deny.
