# Calorify — Data Flow

This document covers how data moves between the UI, `HealthProvider`, device storage and Google/Firebase services. Every sequence is traced from code in `src/context/HealthContext.tsx` unless another file is named. Issue IDs (TD-…) refer to [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

Participants used in the diagrams:

| Short name | Meaning |
|---|---|
| UI | Screens and components |
| HP | `HealthProvider` |
| AS | AsyncStorage |
| SS | SecureStore |
| FA | Firebase Auth |
| FS | Firestore |
| ST | Cloud Storage |
| GM | Gemini API |

## 1. Cold start

```mermaid
sequenceDiagram
  autonumber
  participant App as App.tsx
  participant HP as HealthProvider
  participant AS as AsyncStorage
  participant SS as SecureStore
  participant FA as Firebase Auth
  participant FS as Firestore
  App->>App: hold splash, load fonts
  HP->>HP: pruneOldLocalPhotos(30)
  HP->>AS: read @calori_auth_v1
  alt cached user and auth not resolved yet
    HP->>HP: setCurrentUser(cached) (optimistic), isAuthLoading=false
  end
  HP->>AS: read goals (user key, or v1 for guests)
  HP->>AS: read custom foods (user key, or _v1 for guests)
  HP->>AS: read logs (user key, then v1), clean mock data, ensure today
  HP->>HP: isLoaded = true
  FA->>SS: restore session (fb_auth_<hex> keys)
  FA-->>HP: onAuthStateChanged(user | null)
  alt Firebase user
    HP->>HP: userObj {id,email,name} (isGuest dropped: TD-H14)
    HP->>AS: write @calori_auth_v1
    opt hydratedUidRef !== uid
      HP->>FS: fetchAndHydrateUserData(uid) (see §3)
    end
  else null and cached user not a guest
    HP->>HP: currentUser = null (logs stay in memory)
  end
  App->>App: content mounts at 600 ms, loading screen ≥950 ms, 300 ms fade
  App->>App: Welcome/onboarding if unauthenticated, else tabs
  App->>App: syncNotifications()
```

## 2. Logging a change → local save → cloud sync

```mermaid
sequenceDiagram
  autonumber
  participant UI
  participant HP as HealthProvider
  participant AS as AsyncStorage
  participant FS as Firestore
  UI->>HP: useDailyLog().addMealItem(meal, food, qty)
  HP->>HP: clamp date to today, build item, setDailyLogs()
  HP->>HP: Monitoring.logEvent('meal_logged')
  Note over HP: logs effect fires on dailyLogs change
  HP->>AS: setItem(@calori_daily_logs_${uid} or _v1, whole map)
  HP->>HP: clear and restart 1000 ms debounce
  Note over HP: when the timer fires: abort if logging out, hydrating,<br/>no auth user, guest, or hydratedUidRef ≠ uid
  HP->>HP: dates = {selectedDate} ∪ {d : JSON(log[d]) ≠ lastSyncedLogsRef[d]}
  loop each date
    HP->>HP: sanitizeForFirestore({date, waterMl, steps, meals, activities, waterEntries?, weightKg?, weightEntries?, stepEntries?})
    HP->>FS: setDoc(users/{uid}/dailyLogs/{date}, payload, {merge:true})
    alt accepted by rules (hasOnly + caps)
      HP->>HP: lastSyncedLogsRef[date] = JSON
    else rejected or offline
      HP->>HP: __DEV__ log only, retried on the next change
    end
  end
```

The goals sync follows the same pattern:
- `updateGoals`, `logWeight`, `updateWeightEntry`, `deleteWeightEntry`, `applyOnboardingPlan` and the streak effect write AsyncStorage immediately.
- After a 1000 ms debounce, it calls `setDoc(users/{uid}, {updatedAt, goals, weight?, weightUnit?, startWeightKg?, heightCm?}, {merge:true})`.
- There is **no** `hydratedUidRef` guard (TD-M3).

Custom foods are not debounced. `setDoc` or `deleteDoc` on `users/{uid}/customFoods/{id}` is issued from inside the state updater.

## 3. Cloud hydration merge

`fetchAndHydrateUserData(uid)`, around lines 309–535:

```mermaid
flowchart TD
  A[isHydratingRef = true] --> B[Load the user-scoped logs and goals cache from AS]
  B --> C[getDoc users/uid]
  C -->|has goals| D[goals = DEFAULT_GOALS + cloud goals + root fallbacks<br/>write to state and the user + v1 goals keys]
  C --> E[query dailyLogs orderBy date desc limit 90]
  E -->|query fails| E2[getDoc dailyLogs/today]
  E --> F[skip future ids, clean mock docs and rewrite them to the cloud]
  F --> G{date exists locally?}
  G -->|no| H[take the cloud log]
  G -->|yes| I["merge:<br/>meals = cloud if non-empty, else local<br/>activities = cloud if non-empty, else local<br/>waterMl = max(cloud, local)<br/>waterEntries = longer list, ties go to cloud<br/>steps = max<br/>weightKg, weightEntries, stepEntries = cloud (spread)"]
  H --> J[ensure today exists]
  I --> J
  J --> K[setDailyLogs + AS user key + AS v1 key]
  K --> L[getDocs customFoods. If non-empty, replace local]
  L --> M[SecureKeyStorage.restoreFromFirestore. Migrates a legacy key, then deletes the cloud field]
  M --> N[hydratedUidRef = uid, isHydratingRef = false]
```

Consequences (TD-C1):
- Offline meal and activity edits are lost whenever the cloud list is non-empty.
- Deleted water comes back through `max`.
- Weight deletes are undone (TD-M5).

## 4. Authentication flows

### 4.1 Sign-up (the reachable path goes through onboarding)

```mermaid
sequenceDiagram
  autonumber
  participant W as WelcomeScreen
  participant OW as OnboardingWizard
  participant SP as SavePlanScreen
  participant HP as HealthProvider
  participant FA as Firebase Auth
  participant FS as Firestore
  participant AS as AsyncStorage
  W->>OW: start onboarding (draft saved as onboarding_draft_v1)
  OW->>SP: save_plan step
  SP->>HP: register({name,email,password,age,weight,weightUnit,goal,…})
  HP->>FA: createUserWithEmailAndPassword + updateProfile
  FA-->>HP: onAuthStateChanged (may start a parallel hydration)
  HP->>HP: calculateCalibratedGoals → updateGoals
  HP->>FS: setDoc users/{uid} (13 allowed keys) + dailyLogs/{today}
  SP->>FS: migrateOnboardingData → setDoc users/{uid}. DENIED by rules (TD-H4)
  OW->>W: onComplete(plan)
  W->>HP: applyOnboardingPlan(plan). Goals, name, first meal, streak 1
  HP->>AS: goals and logs keys (user, v1, legacy unscoped)
  W->>W: onLoginSuccess → tabs
```

`SignUpScreen` is not reachable from the current UI. `App.tsx` opens the auth modal only in `'signin'` mode and always passes `onLoginSuccess`.

### 4.2 Sign-in, guest, sign-out, delete

| Flow | Steps |
|---|---|
| Sign-in | `SignInScreen` → `login(email.trim(), pw)` → FA `signInWithEmailAndPassword` → set the user and `@calori_auth_v1` → `await fetchAndHydrateUserData`. The auth listener hydrates as well (TD-M2) |
| Demo guest | "Explore as Guest" → `loginDemo()` → `demo_user_1 {isGuest:true}` in AS only. Data goes to the `_v1` keys. Nothing syncs to the cloud |
| Anonymous guest | `loginAnonymous()` → FA `signInAnonymously` (fallback `guest_${ts}`) → `{isGuest:true}`. The auth listener later overwrites it without `isGuest` (TD-H14) |
| Sign-out (header) | `App.handleConfirmSignOut` → cancel all notifications → `logout()` |
| Sign-out (Preferences) | `logout()` → `onSignOut` → `App.handleSignOutCompleted`. **Notifications are not cancelled** (TD-H13) |
| `logout()` | Set `isLoggingOutRef`, clear `hydratedUidRef`, `SecureKeyStorage.invalidateCache()`, `signOut`. Reset state. `multiRemove` the AUTH, v1 and user keys. After 500 ms, clear `isLoggingOutRef`. The pending debounce is dropped (TD-H15) |
| `deleteAccount()` | Batch-delete `dailyLogs`, `customFoods`, `chatHistory` → delete `users/{uid}` → `deleteAllUserPhotos` (meals) → `deleteUser` → remove the user keys → `removeApiKey()`. This removes the wrong key (TD-H6). If `deleteUser` fails, the data is already gone (TD-H5) |

## 5. Ria chat turn

```mermaid
sequenceDiagram
  autonumber
  participant UI as RiaChatModal
  participant AIS as AIService
  participant SKS as SecureKeyStorage
  participant FL as FastLoopMemoryExtractor
  participant CMM as ConversationMemoryManager
  participant GP as GeminiProvider
  participant GM as Gemini API
  participant P as RiaCardParser
  participant HP as HealthProvider
  UI->>AIS: streamChat(prompt, history, context, onChunk, signal, uid)
  AIS->>SKS: getApiKey() (none → NO_KEY_CONFIGURED)
  AIS->>FL: loadFacts + extractFactsFromText(prompt)
  FL-->>AIS: updatedFacts (new facts saved locally, the cloud write is denied, TD-H3)
  AIS->>CMM: loadSummary(uid)
  AIS->>GP: streamChat(key, prompt, history, enrichedContext, onChunk, signal, summary)
  GP->>GP: AIInputValidator, AIRateLimiter (3 s, 10/min, 1200/day), TokenBudgetManager
  GP->>GP: NutritionContextBuilder (goals, today's log, facts, MetabolicAdaptiveEngine TDEE, ria_action contract)
  GP->>GM: POST :streamGenerateContent?alt=sse (x-goog-api-key)
  GM-->>GP: SSE chunks
  GP-->>UI: onChunk(accumulatedText) (re-render per chunk, TD-M16)
  GP-->>AIS: completed text
  opt history.length ≥ 10
    AIS-)GP: background generateConversationSummary(history[0..6])
    AIS-)CMM: saveSummary → AS + FS chatHistory/summary
  end
  UI->>P: parse(text). Strip ria_action blocks, clamp, Atwater check, duplicate check
  P-->>UI: visible text + RiaCard
  UI->>CMM: saveHistory (AS ≤30 msgs, FS chatHistory/recent)
  UI->>HP: user confirms card → addMealItem / addWater / logWeight / updateGoals
```

Errors pass through `AIErrorMapper`, which returns typed codes (invalid key, quota, rate limit, network, non-food photo, …). The UI shows a recovery action for each code.

## 6. AI food photo

```mermaid
sequenceDiagram
  autonumber
  participant UI as FoodVisionModal
  participant IP as expo-image-picker / camera
  participant AIS as AIService
  participant GP as GeminiProvider
  participant GM as Gemini API
  participant MPS as mealPhotoService
  participant ST as Cloud Storage
  participant HP as HealthProvider
  UI->>IP: capture or pick (base64)
  UI->>AIS: analyzeFoodImage(base64, mime)
  AIS->>GP: analyzeFoodImage(key, …)
  GP->>GP: EdgeImagePreprocessor.processBase64 (size ≤2 MB, no resize)
  GP->>GM: POST :generateContent (image + JSON schema prompt)
  GM-->>GP: JSON
  GP->>GP: AIOutputValidator + Atwater consistency
  GP-->>UI: FoodVisionResult (items, kcal, macros, confidence)
  UI->>MPS: saveMealPhotoLocally(uri, 'meal_'+Date.now())
  UI->>MPS: uploadMealPhoto(uid, mealId, base64)
  MPS->>ST: users/{uid}/meals/{mealId}.jpg (<1 MB, else rejected)
  Note over UI: download URL discarded, imageUrl = local path (TD-H18)
  UI->>HP: addMealItem(meal, food{id: mealId, imageUrl: local}, qty). This generates a different meal id
```

## 7. Notification sync

```mermaid
sequenceDiagram
  autonumber
  participant App as App.tsx
  participant NS as NotificationScheduler
  participant NST as notificationStorage
  participant PL as planner
  participant RC as reconciler
  participant EN as expoNotifications adapter
  participant OS as OS scheduler
  App->>NS: syncSchedules({loggedMealTypes, lastWaterLoggedAt, hasLoggedWeightToday, streakDays, waterMl, goal, steps, …})
  Note over App: inputs come from currentLog (selected date, no water or weight entries, TD-H12)
  NS->>NST: loadSettings(uid) (@calori_notif_settings_v2_uid, or _default), unless options.settings is passed
  NS->>PL: planNotifications(settings, state, now)
  PL-->>NS: desired list (deterministic ids, quiet hours, 30 min collision priority, cap 60)
  NS->>RC: NotificationReconciler.reconcile(planned)
  RC->>EN: getAllScheduledNotificationsAsync
  RC->>RC: diff by id and fireAt (±60 s), under a mutex
  RC->>EN: cancel the stale ids, schedule the new ones (channel per type)
  EN->>OS: schedule / cancel
```

Triggers:
- any change to the dependent data or auth state
- the app returning to the foreground
- `handleConfirmSignOut`, which cancels everything

## 8. Health Connect steps

```mermaid
sequenceDiagram
  autonumber
  participant STS as StepTrackerScreen
  participant HS as healthService
  participant HC as Health Connect
  participant AS as AsyncStorage
  participant HP as HealthProvider
  STS->>HS: hasStepsPermission() (getSdkStatus, initialize, getGrantedPermissions)
  alt not granted
    STS->>STS: show the Connect card
  else granted
    opt @calori_hc_backfill_completed_v1 not set
      HS->>HC: getStepsForDate(−1 … −7) in parallel
      HS->>AS: mark the backfill done (even on failure, TD-M10)
      HS->>HP: batchUpdateDailySteps(days with steps > 0)
    end
    HS->>HC: syncRolling48Hours (today, yesterday)
    HS->>HP: batchUpdateDailySteps. Overwrites steps and stepEntries (TD-H8)
  end
  Note over STS,HP: the Connect button also calls setSteps(hc) and then addSteps(hc − old). Double count (TD-H8)
```

## 9. Barcode lookup

`BarcodeScannerModal` (expo-camera) → `useBarcodeScanner` → `barcodeService` → Open Food Facts API v2 → `normalizedFoodToFoodItem` (`src/types/barcode.ts`) → `ScannedProductCard` → `addMealItem`. Choosing "enter manually" reopens `foodLog` with `prefillBarcode`.

## 10. Storage inventory

### 10.1 AsyncStorage

| Key | Owner | Scope | Cleared on logout/delete? |
|---|---|---|---|
| `@calori_auth_v1` | HealthContext | global | yes |
| `@calori_daily_logs_v1`, `@calori_user_goals_v1` | HealthContext | global (guest data **and** a mirror of the signed-in user's data) | yes |
| `@calori_custom_foods_v1` | HealthContext | global (read for guests, never written) | yes |
| `@calori_daily_logs_${uid}`, `@calori_user_goals_${uid}`, `@calori_custom_foods_${uid}` | HealthContext | per user | yes |
| `@calori_user_goals_guest`, `@calori_custom_foods_guest` | HealthContext | guest | no |
| `@calori_daily_logs`, `@calori_user_goals` (legacy, unsuffixed) | `applyOnboardingPlan`, `onboardingMigration` | **unscoped** | **no** |
| `@calori_${uid\|guest}_water_cup_pref` | `useHydration` via ScopedStorage | per user | no |
| `@calori_water_cup_pref`, `@calori_custom_cup_presets` | hydration UI | **unscoped** | no |
| `@calori_unlocked_achievements_v1` | AchievementEvaluator | **unscoped** | no |
| `@calori_subscription_entitlement_v1` | PaymentService | **unscoped** | no |
| `@calori_hc_backfill_completed_v1` | healthService | **unscoped** | no |
| `@calori_ai_daily_usage_${utcDate}` | AIRateLimiter | **unscoped** | no |
| `@calori_ai_scans_${date}_${uid\|guest}` | scanLimitService | per user | no |
| `@calori_ria_chat_${u}`, `@calori_ria_summary_${u}`, `@calori_ria_conversations_${u}` | ConversationMemoryManager | per user | **no** |
| `@calori_ria_user_facts_${u}` | FastLoopMemoryExtractor | per user (allergies, diet) | **no** |
| `@calori_ria_daily_insight_${uid}_${date}` | useRiaDailyInsight | per user | no |
| `@calori_notif_settings_v2_${uid\|default}` | notificationStorage | per user | no |
| `@calori_notification_settings_v1`, `@calori_notif_migrated_v2` | notificationStorage (legacy) | unscoped | no |
| `onboarding_draft_v1` | onboardingDraft | **unscoped** | no |

### 10.2 SecureStore

| Key | Owner |
|---|---|
| `fb_auth_<hex(key)>` | `src/services/firebase.ts` (Firebase Auth persistence). Hex encoding satisfies SecureStore's `[A-Za-z0-9._-]` rule |
| `calorify_gemini_byok_api_key_v1_${uid\|guest}` | `SecureKeyStorage` (`localStorage` on web) |

### 10.3 File system
`documentDirectory/meals/*`: local meal photos, pruned after 30 days (`mealPhotoService.pruneOldLocalPhotos`).

### 10.4 Firestore (`firestore.rules`)

| Path | Writer | Allowed shape |
|---|---|---|
| `users/{uid}` | goals sync, `register`, `SecureKeyStorage` (delete field) | `hasOnly`: id, name, email, age, weight, weightUnit, goal, gender, heightCm, startWeightKg, avatarUrl, createdAt, updatedAt, goals (map ≤35 keys), geminiKeyObfuscated. Ranges are checked. `id` is immutable; `createdAt` is immutable once set |
| `users/{uid}/dailyLogs/{YYYY-MM-DD}` | logs sync | The 9 `DailyLog` keys. `date == docId`; waterMl 0–30000; steps 0–250000; weightKg 0–500; list caps (meals 200, activities 100, waterEntries 200, weightEntries 100, stepEntries 200). List contents are not validated |
| `users/{uid}/customFoods/{id}` | `addCustomFood` / `deleteCustomFood` | 21-key allowlist; required name/kcal/macros; `id == foodId` on create |
| `users/{uid}/chatHistory/recent` | ConversationMemoryManager | messages ≤30, updatedAt |
| `users/{uid}/chatHistory/summary` | ConversationMemoryManager | text ≤2000, lastSummarizedIndex int, updatedAt |
| `users/{uid}/riaMemory/facts` | FastLoopMemoryExtractor | **No rule, so denied** (TD-H3) |
| everything else | — | default deny |

### 10.5 Cloud Storage (`storage.rules`)
- `users/{uid}/meals/{id}` and `users/{uid}/avatars/{id}`: the owner can read, write and delete. Writes must be under 1 MB and of type image/jpeg, png or webp.
- No client code writes `avatars/`.
- Everything else is denied.

### 10.6 Outbound network calls

| Destination | From | Auth |
|---|---|---|
| Firebase Auth, Firestore, Storage | JS SDK | Firebase ID token |
| Firebase Analytics, Crashlytics | RN Firebase (native builds only) | app config |
| `generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent` / `:generateContent` | `GeminiProvider` | header `x-goog-api-key` = the user's BYOK key |
| Open Food Facts v2 product API | `barcodeService` | none |
