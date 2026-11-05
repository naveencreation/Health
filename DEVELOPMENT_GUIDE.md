# Calorify — Development Guide

How to set up, run, test, build and change this app safely. Read [ARCHITECTURE.md](ARCHITECTURE.md) first. Before writing Expo-specific code, check the SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/.

## 1. Prerequisites

- **Node and npm.** `package.json` declares no `engines` field and the repo has no `.nvmrc`; analysis was done on Node 24.
- **Android work:** Android Studio with SDK 36 and a device or emulator. Health Connect needs a real device or an emulator image that ships the Health Connect app.
- **EAS CLI,** run through `npx eas-cli` (not a dependency).
- **Firebase CLI,** only to deploy rules. It is not a dependency and no script wraps it.

## 2. Setup

```bash
npm install          # also runs scripts/patch-expo-notifications.js (postinstall)
```

- **Do not** install with `--ignore-scripts`. That skips the patch that stops `expo-notifications` from crashing Expo Go on Android.
- **Environment.** Copy `.env.example` to `.env`. `.env` and `.env.*` are gitignored; `.env.example` is tracked. Set:
  - `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`
  - `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, which is optional and only shows the Google-button stub in SavePlanScreen

  `EXPO_PUBLIC_*` values are bundled into the client and are not secret. Even so, don't paste real values into docs, issues or logs. `src/services/firebase.ts` falls back to a hardcoded config if the env vars are missing.
- **Native Firebase.** `app.json` sets `android.googleServicesFile: ./google-services.json`, which RN Firebase Analytics and Crashlytics need. iOS has no `googleServicesFile` configured (TD-M20).
- **Gemini.** No key is needed to build. Each user enters their own key in the app (BYOK).

## 3. Running

| Command | What it does |
|---|---|
| `npm start` | Expo dev server (`a` = Android, `w` = web) |
| `npm run start:mcp` | The same, with the Expo MCP server (`EXPO_UNSTABLE_MCP_SERVER=1`) |
| `npm run android` | `expo run:android`: generates `android/` (CNG) and builds a debug app |
| `npm run android:release` | `android:clean` (cmd.exe syntax, **Windows only**) + release variant |
| `npm run web` | Web build, rendered in a 480 px phone frame |

**Expo Go vs dev build**

| Feature | Expo Go | Dev or release build |
|---|---|---|
| RN Firebase Analytics and Crashlytics | no-op (lazy require) | ✓ |
| Health Connect | ✗ (possible startup crash, P-1) | ✓ (Android) |
| Notification channels | skipped | ✓ |
| Local notifications | warn-only (patched) | ✓ |

The `development` EAS profile sets `developmentClient: true`, but `expo-dev-client` is not installed (TD-M20). Use `npm run android` for local native builds.

## 4. Testing

**Always typecheck first** (AGENTS.md). Run the tests only when it passes. Restoring Jest and adding a rules-emulator suite are roadmap tasks RM-00a and RM-00b (the emulator needs a new dev dependency, so it needs approval).

```bash
npx tsc --noEmit
npm test                                                           # all suites
npx jest src/services/ai/cards/__tests__/RiaCardParser.test.ts     # one file
npx jest -t "duplicate"                                            # tests whose name matches
```

- **Current state (2026-11-05):** `tsc` passes. `npm test` **fails before running any suite**: jest-expo 57 requires `@react-native/jest-preset`, which is in `package.json` and the lockfile but missing from `node_modules`. Run `npm install` (or `npm ci`) to restore it.
- `jest.config.js` forces `NODE_ENV=test`. A global `NODE_ENV=production`, which is common on Windows, would otherwise make React drop `act` and break Testing Library.
- **Global mocks** in `jest.setup.js`:
  - Reanimated, a hand-written mock. If a component needs an API it lacks (for example `createAnimatedComponent`, `useAnimatedProps`, `Extrapolation`, `useReducedMotion`), add it there.
  - AsyncStorage
  - `firebase/firestore`
  - `@/services/firebase` (`auth.currentUser.uid === 'test_user_123'`)
- `firebase/storage` maps to `src/__mocks__/firebaseStorageMock.js`.
- **Where to put tests:** in a co-located `__tests__/` folder next to the code.

  | Type of code | Test with |
  |---|---|
  | Pure services (`features/*/services`, the notification engine, AI cards and validators) | plain unit tests |
  | Hooks and components | `@testing-library/react-native` |
- **What new or changed code should cover:**
  - every formula change in `*Analytics.ts`, `onboardingCalculator.ts` or `RiaCardParser.ts`
  - every new `HealthContext` mutation path (the sync and hydration effects currently have no tests)
  - every Firestore shape change. There is no rules emulator suite yet, so at least check the field against the `hasOnly` list by hand
- Behavioural test matrices per screen live in `Scenarios/`. Use them for manual QA.

## 5. Lint and format

```bash
npm run lint           # expo lint (flat config, eslint.config.js)
npm run format:check   # Prettier: single quotes, 100 cols, es5 trailing commas, arrowParens avoid
npm run format         # write
```

- Lint currently reports 500 problems (57 errors, 443 warnings).
- `eslint.config.js` downgrades six react-hooks compiler rules to warnings, including `rules-of-hooks`. Don't add new violations.
- Ignored paths: `dist`, `android`, `ios`, `scratch`, `.expo`.

## 6. Building and releasing

| Profile (`eas.json`) | Output |
|---|---|
| `development` | dev client (needs `expo-dev-client`, not installed) |
| `preview` | internal APK: `npx eas-cli build -p android --profile preview` (append `--local` for a local build) |
| `production` | AAB for the Play Store |

- **Native changes** (`app.json` plugins or permissions, new native modules) need a new native build. A JS reload is not enough.
- **Rules are deployed separately from the app.** `firebase.json` points at `firestore.rules` and `storage.rules`. Deploy them with the Firebase CLI (for example `firebase deploy --only firestore:rules,storage`), and do it **before** shipping an app version that writes new fields. Deploy in two steps: rules first (accept old and new shapes), then the app.
- **Don't edit `android/` or `ios/` by hand.** They are gitignored and regenerated by prebuild (CNG); put native changes in `app.json` plugins.

## 7. Change recipes

### Add a field to a synced document (DailyLog, UserGoals root, custom food, chat)
1. Add it to the type in `src/types/index.ts` (or `src/services/ai/types/ai.types.ts`).
2. Add it to the matching `hasOnly` allowlist and add a range check in `firestore.rules`, then deploy the rules.
3. Make sure the payload builder includes it, and run the payload through `sanitizeForFirestore` (Firestore rejects `undefined`).
4. Decide how the hydration merge treats it (`fetchAndHydrateUserData`); by default the cloud value wins through the spread.
5. If it is a list, cap it on the client to the rules' limit.

### Add a modal or a tracker sub-screen
1. Add a member to the `ActiveModal` union in `src/navigation/types.ts`.
2. Render it in `src/navigation/OverlayHost.tsx`: an RN `Modal` for sheets, or `SlideInSubScreen` for full-screen trackers.
3. Open it with `useOverlay().openModal({ type: '…' })`. Only one overlay can be open at a time, and Android back closes it.

### Add a Ria card type
You need four pieces:
1. the type in `src/services/ai/types/ai.types.ts`
2. the regex, builder and clamps in `src/services/ai/cards/RiaCardParser.ts`
3. the prompt contract in `src/services/ai/context/NutritionContextBuilder.ts`
4. a view in `src/features/ria/cards/` wired into `RiaActionCard`

Add parser tests in `src/services/ai/cards/__tests__/`.

### Add a reminder type
Update all of these, plus `planner.test` / `reconciler.test`:
- `ReminderType` in `src/services/notifications/types.ts`
- the channel and priority in `defaults.ts` (`NOTIFICATION_CHANNELS_MAP`, `REMINDER_PRIORITY`)
- the defaults in `DEFAULT_NOTIFICATION_SETTINGS`
- the generation rule in `engine/planner.ts`, with a deterministic id `calori_<type>_<date>[_slot]`
- a channel in `src/config/notificationChannels.ts` if needed
- the tap route in `App.tsx` if needed

Import notification APIs only from `expoNotifications.ts`. Always pass the uid to `NotificationStorage`: without it, settings go to the `_default` record, which signed-in users never read (TD-M32).

### Add a per-user setting
Use `ScopedStorage` (`src/services/storage/scopedStorage.ts`). Don't add a new global `@calori_*` key, because global keys leak between accounts on a shared device. A new SecureStore key may contain only `[A-Za-z0-9._-]`; hex-encode or sanitize any dynamic part, the way `firebase.ts` and `SecureKeyStorage.ts` do. `SecureKeyStorage` derives its key from `auth.currentUser` at call time, so call `removeApiKey` before anything that signs out (TD-H6).

### Add a feature module
Create `src/features/<domain>/` with an `index.ts` barrel. Put pure maths in `services/` and give it tests. The hook in `hooks/` reads `@/context` slice hooks. Import siblings by relative path, never from `@/components`.

## 8. UI rules (summary of DESIGN.md)

- Use tokens from `src/theme/*`, imported by subpath: `@/theme/colors` → `Colors`, `@/theme/typography` → `Typography`/`Fonts`, `@/theme/spacing`, `@/theme/icons`, `@/theme/controls`, `@/theme/motion`.
- Urbanist for all UI text and numbers; Kurale only for the "Calorify" wordmark. The app is light mode only.
- Cards: 10 px radius, `borderCurve: 'continuous'`, a 1 px hairline border, no shadows. Set `elevation: 0` on rounded views on Android.
- Colour meaning: calories `#F47551` (`Colors.primary`), protein green (`Colors.protein`, reserved), steps `Colors.steps` (`#F97316`), water `Colors.water`, weight `Colors.weight`. Never use `#000000`.
- Ionicons for standard actions. Use `expo-image` for images, `Pressable` for touch targets, and `useSafeAreaInsets` for safe areas.
- Motion: Reanimated only. Use `withTiming` for press feedback, durations from `MotionDurations` and curves from `MotionCurves`. Import `Easing` from `react-native-reanimated`. Respect reduced motion.

## 9. Pre-merge checklist

- [ ] Traced the existing implementation and its dependencies before changing it (see CLAUDE.md).
- [ ] `npx tsc --noEmit` passes, then `npm test` passes.
- [ ] No new lint errors; Prettier is clean.
- [ ] Synced shape changes are mirrored in `firestore.rules` and the rules are deployed.
- [ ] No new global storage keys and no direct `expo-notifications` root import.
- [ ] No secrets or real config values in code, docs or logs.
- [ ] UI follows DESIGN.md tokens and rules.
- [ ] Docs updated (ARCHITECTURE, BUSINESS_LOGIC, DATA_FLOW, TECHNICAL_DEBT) if behaviour changed.

There is no CI. These checks are manual (TD-L3).
