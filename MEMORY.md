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

17. **Splash Screen & Startup Loader Unification** — resolved visual discontinuity, jumping layouts, and abrupt transitions:
    - **Asset & Layout Parity (0px Layout Shift):** `AppLoadingScreen.tsx` now renders the exact canonical `assets/splash-icon.png` (280x106, flame + "Calorify" wordmark) centered on `#FAF9F6`, matching `expo-splash-screen` native configuration pixel-for-pixel with zero shift when the native splash hides.
    - **Simple & Elegant Loading Indicator:** Stripped out legacy circular card, heavy shadows, and rotating dashed lime ring. Replaced with an understated jumping dots animation (`BouncingDotsLoader`, 3 terracotta `#F47551` dots) and clean status text (`"Personalizing your data..."` in `Poppins`, `#64748B`) positioned directly 28px below the logo.
    - **Continuous Overlay & Crossfade:** In `App.tsx`, rather than unmounting the loading screen abruptly in 1 frame when `isAuthLoading` completes, `AppLoadingScreen` is mounted as an absolute overlay atop the app tree (`zIndex: 9999`). When `isAppReady` (`isFontsReady && !isAuthLoading`) becomes true, it smoothly dissolves into the app with a 250ms crossfade (`withTiming(0, { duration: 250 })`), simultaneously setting `pointerEvents="none"` for immediate user responsiveness, and unmounting once fully transparent.

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
