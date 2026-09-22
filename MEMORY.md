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

## Important decisions & gotchas (do NOT re-litigate without reason)

- **Springs → `withTiming`.** The user preferred simple, fast, predictable timing over spring physics for press feedback (springs felt "unnatural"/bouncy). Press feedback uses `withTiming` (~80–120ms), toast/tooltip ~150–180ms, ruler snap-back 200ms.
- **`MealCard` kept `maxHeight`** (moved to UI thread) rather than `scaleY` + measured height — the lower-risk fix. Could upgrade to `scaleY` later if desired.
- **`FoodLogModal` drawer slide/fade was dead code** — the `Modal` already slides via `animationType="slide"`; the unused `drawerSlideAnim`/`drawerFadeAnim` were removed.
- **SecureStore keys must be hex-encoded.** Firebase persistence keys contain `:` and `[`/`]` (e.g. `firebase:authUser:<apiKey>:[DEFAULT]`), which SecureStore rejects. `firebase.ts` hex-encodes keys (`fb_auth_` + hex).
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
