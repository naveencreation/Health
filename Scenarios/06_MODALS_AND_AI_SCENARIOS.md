# Calorify — Modals, AI & Feature Overlays Scenarios & Test Case Matrix

> **Target Directories:** `src/features/nutrition/modals/`, `src/components/scanner/`, `src/components/modals/`, `src/features/subscription/screens/`  
> **Applicable SDK:** Expo SDK 57 / Gemini 2.5 & 1.5 Flash / Expo Camera / SecureStore / In-App Purchases  
> **Coverage:** 8 Full-Featured Modals & Overlays

---

## 1. FoodLogModal (`src/features/nutrition/modals/FoodLogModal.tsx`)

### 1.1 Architectural Role & Component Hierarchy
Full-screen modal for searching foods, filtering by food categories, scanning barcodes, taking food vision pictures, customizing serving sizes and portions, and adding foods to specific meal slots.

#### Visual Layout & Elements
* **Header Bar:**
  * Active meal indicator pill (e.g. "Breakfast", "Lunch", "Dinner", "Snack").
  * Close "X" button.
* **Search & Scan Row:**
  * Debounced Text Search Input (`testID="input-food-search"`).
  * Barcode Scanner Shortcut icon button (`onOpenBarcodeScanner`).
  * AI Camera Vision Shortcut icon button (`onOpenFoodVision`).
* **Category Pill Scrollview:**
  * "Popular", "Proteins", "Fruits", "Veggies", "Carbs", "Dairy", "Favorites", "Custom", "Recent".
* **Food Item List & Detail Drawer:**
  * Food title, brand/description, serving unit.
  * Macro breakdown badge (Calories, Protein, Carbs, Fat).
  * Serving Quantity Stepper: `0.5x`, `1.0x`, `1.5x`, `2.0x` or custom gram input.
  * Favorite toggle (Heart icon).
* **Bottom Action CTA:**
  * "Add to {Meal}" button (`testID="btn-food-log-confirm"`).

### 1.2 Test Cases: Happy Paths

| Test ID | Scenario | Actions | Expected Output |
|---|---|---|---|
| `MOD-FOOD-001` | Search and Log Food | Search "Oatmeal", select 1 bowl (150 kcal), tap "Add to Breakfast" | Adds item to daily log; increments daily calorie and carb totals; closes modal; shows confirmation feedback. |
| `MOD-FOOD-002` | Portion Multiplier | Select "Grilled Chicken", change multiplier to `1.5x` | Calories and macros scale by 1.5 in real-time (e.g. 200 kcal ➔ 300 kcal, 40g P ➔ 60g P). |
| `MOD-FOOD-003` | Create Custom Food | Switch to "Custom" tab, tap "+ Create Food", enter name, calories, macros | Saves custom food item to local/cloud user catalog; immediately available for selection. |

### 1.3 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `MOD-FOOD-NEG-001` | Zero Results Search | Search "xyznonexistentfood123" | Displays empty state: "No matching foods found. Create a custom food or scan a barcode." |
| `MOD-FOOD-NEG-002` | Zero Portion Multiplier | Enter `0` in portion quantity | Add button disabled; validation warning: "Portion must be greater than 0." |
| `MOD-FOOD-NEG-003` | Rapid Add Spamming | Tap "Add to Meal" 5 times rapidly | Button locks during insertion transaction; prevents duplicate food items being added to meal. |

---

## 2. FoodVisionModal (`src/features/nutrition/modals/FoodVisionModal.tsx`)

### 2.1 Architectural Role & Component Hierarchy
Multimodal AI food recognition system using Gemini 2.5 / 1.5 Flash. Captures photo via camera or photo library, converts to base64, queries Gemini with structured JSON schema, and presents confidence-rated macronutrient estimates.

#### Visual Layout & Elements
* **Camera / Gallery Picker View:**
  * "Take Photo" (Camera shutter) & "Choose from Library" (Gallery icon).
  * Gemini AI branding badge.
* **Analysis Progress State:**
  * Image thumbnail preview with animated scanning beam.
  * "Analyzing meal with Gemini AI..." spinner.
* **Result Review Card:**
  * Detected Food Name & Confidence rating.
  * Estimated Calories, Protein, Carbs, Fat, and Fiber.
  * Meal slot picker (Breakfast, Lunch, Dinner, Snack).
  * Portion scaling stepper (0.5x, 1x, 1.5x, 2x).
  * "Save to Custom Foods" toggle.
* **BYOK Fallback Action:** Shown if free quota exhausted.

### 2.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `MOD-VIS-001` | Successful Plate Analysis | Take photo of Salmon & Rice | Gemini returns `{ name: "Salmon with Rice", calories: 520, protein: 42, carbs: 45, fat: 18 }`. Review card populates. | - |
| `MOD-VIS-002` | Accept & Log AI Meal | Tap "Log this Meal" | Adds meal to `useDailyLog`; saves photo reference locally via `mealPhotoService`; closes modal. | - |
| `MOD-VIS-NEG-001` | Non-Food Image Capture | Take photo of a laptop or chair | Gemini returns `is_food: false`; modal displays "No food detected. Please take a clear picture of a meal or plate." | Model rejection guard. |
| `MOD-VIS-NEG-002` | Rate Limit / Quota Exceeded | User exhausts daily free scans without Pro or BYOK | Catches `AIError.RATE_LIMITED`; displays dialog: "Free scan limit reached. Upgrade to Pro or add your own free Gemini API key." | Monetization / BYOK prompt. |
| `MOD-VIS-NEG-003` | Offline Camera Attempt | Take photo while device is offline | Catches network failure; displays: "Internet connection required for AI meal analysis. You can log manually." | Offline resilience. |

---

## 3. BarcodeScannerModal (`src/components/scanner/BarcodeScannerModal.tsx`)

### 3.1 Architectural Role & Component Hierarchy
Hardware camera barcode scanner utilizing `expo-camera` (`CameraView`), barcode frame overlay, flashlight toggle, audio/haptic feedback, and fallback to manual barcode entry.

#### Visual Layout & Elements
* **Camera Viewport:** Full-screen camera stream with rounded targeting crosshairs.
* **Top Controls:** Torch / Flashlight toggle button, Close button.
* **Scanning Lock Overlay:** Visual pulse animation when barcode detected.
* **ScannedProductCard:** Bottom sheet displaying matched product name, serving size, calories, and macros.
* **Manual Entry Link:** "Can't scan? Enter barcode manually" button.

### 3.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `MOD-BAR-001` | Valid Product Barcode | Point camera at yogurt barcode (UPC/EAN) | Haptic buzz; scanning locks; queries OpenFoodFacts/database; renders `ScannedProductCard` with nutritional info. | - |
| `MOD-BAR-002` | Toggle Flashlight | Tap torch icon in dark room | Turns on device LED flashlight (`isTorchOn=true`); icon changes to filled lightbulb. | Hardware control. |
| `MOD-BAR-NEG-001` | Camera Permission Denied | User denies camera access | Renders permission view: "Camera permission is required to scan barcodes" with "Grant Permission" button and manual entry option. | Permission degradation. |
| `MOD-BAR-NEG-002` | Unrecognized Barcode | Scan novel or foreign barcode | Database returns 404; displays card: "Product not found. Would you like to enter nutrition manually?" with pre-filled barcode number. | Unmatched barcode handling. |

---

## 4. RiaChatModal (`src/components/modals/RiaChatModal.tsx`)

### 4.1 Architectural Role & Component Hierarchy
Full-featured conversational AI health companion powered by Gemini. Grounded in the user's live daily calorie budget, macronutrient balance, water intake, and recent meals using Server-Sent Events (SSE) streaming.

#### Visual Layout & Elements
* **Header:** Ria Avatar, "Ria — AI Health Coach", active tone indicator ("Supportive" / "Scientific"), Close button.
* **Grounded Telemetry Context Pill:** Shows current day status ("1,240 / 1,950 kcal · 450ml water").
* **Quick Question Chips:**
  * "🍗 High-protein dinner idea"
  * "🍛 Can I eat biryani tonight?"
  * "🍵 Snack under 120 calories"
  * "💧 Water timing for fat loss"
* **Message Thread:** User bubbles, Ria markdown response cards with typed streaming cursor.
* **Input Area:** Multi-line text input (`testID="input-ria-prompt"`), Send button with streaming abort capability.

### 4.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `MOD-RIA-001` | Grounded Nutrition Question | Ask "What should I eat for dinner?" | Ria reads `remainingCalories` (710 kcal) and suggests a meal staying strictly within the remaining budget. | Context grounding. |
| `MOD-RIA-002` | Abort In-Flight Streaming | Tap "Stop" while Ria is streaming response | `AbortController.abort()` triggers; streaming text halts cleanly without crashing or duplicate text. | Stream cancellation. |
| `MOD-RIA-NEG-001` | App Backgrounded During Stream | Home button pressed while streaming | `AppState` listener intercepts event and safely terminates stream; on foregrounding, partial response is retained. | App lifecycle handling. |
| `MOD-RIA-NEG-002` | Token Quota Exceeded | User reaches token limit | Displays inline error bubble with "Configure Gemini API Key" CTA leading to `BYOKSetupModal`. | Error escalation. |

---

## 5. BYOKSetupModal (`src/components/modals/BYOKSetupModal.tsx`)

### 5.1 Architectural Role & Component Hierarchy
Enables users to input and validate their personal Google Gemini API key, stored encrypted in device hardware via `expo-secure-store`.

#### Visual Layout & Elements
* **Header:** Gemini Star Icon, Title "Bring Your Own Gemini Key", Close button.
* **Instruction Card:** "Get a free Gemini API key from Google AI Studio" with direct link button (`Linking.openURL`).
* **API Key Input Field:** Obscured text field with eye icon toggle, Paste from Clipboard button.
* **Validation & Status Indicators:**
  * "Validate & Save Key" CTA button (`isValidating` spinner).
  * Status: "Connected & Verified" (Green checkmark with masked key: `AIzaSy...4xQ`).
  * "Remove Key" button (Red text).

### 5.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `MOD-BYOK-001` | Valid Key Entry | Paste valid `AIzaSy...` key, tap Validate | Pings Gemini models endpoint; receives 200 OK; saves to SecureStore; updates context status. | - |
| `MOD-BYOK-002` | Remove Saved Key | Tap "Remove Key", confirm dialog | Clears key from SecureStore; reverts app to default public quota tier. | Storage cleanup. |
| `MOD-BYOK-NEG-001` | Invalid / Revoked Key | Enter expired or junk string `"my_invalid_key"` | Validation fails (400 / 403); displays error: "Invalid API key. Please check your Google AI Studio credentials." | Validation check. |
| `MOD-BYOK-NEG-002` | SecureStore Unavailable | Device with corrupted keystore / custom ROM | Catches SecureStore error; falls back to encrypted local storage with human warning. | Hardware crypto fallback. |

---

## 6. ProPaywallModal (`src/features/subscription/screens/ProPaywallModal.tsx`)

### 6.1 Architectural Role & Component Hierarchy
Presents subscription tiers (Annual vs Monthly), highlights Pro perks (unlimited AI vision, advanced macro coach, annual analytics), handles in-app purchases and receipt restoration.

#### Visual Layout & Elements
* **Header:** Crown Icon, Title "Calorify Pro", Close "X" button.
* **Feature Highlights (4 Benefit Cards):**
  * Unlimited AI Meal Vision
  * Adaptive Macro Coaching
  * Deep Metabolic Trends
  * Priority Cloud Backup
* **Plan Selection Cards:**
  * "Annual Plan — $39.99 / year ($3.33/mo)" (Best Value badge, 7-day free trial).
  * "Monthly Plan — $6.99 / month".
* **Action Buttons:**
  * "Start 7-Day Free Trial" / "Subscribe Now" CTA.
  * "Restore Purchases" link.
  * Terms of Service & Privacy Policy links.

### 6.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `MOD-PAY-001` | Purchase Annual Plan | Select Annual, tap "Start Free Trial" | Invokes `purchasePlan('pro_annual')`; displays native payment sheet; on success updates `isPro=true`; unlocks Pro features. | - |
| `MOD-PAY-002` | Restore Existing Purchases | Tap "Restore Purchases" | Queries store receipts; finds valid subscription; activates Pro status; displays "Purchases Restored Successfully". | Store receipt validation. |
| `MOD-PAY-NEG-001` | User Cancels Native Sheet | Dismiss App Store / Google Play payment prompt | `purchasePlan` catches user cancellation (`E_USER_CANCELLED`); reverts loading spinner without showing an error banner. | Graceful cancel handling. |
| `MOD-PAY-NEG-002` | Payment Network Timeout | Network drops during transaction verification | Displays retry prompt: "Transaction pending. Your purchase will activate automatically once connection is restored." | Transaction resilience. |

---

## 7. AvatarPickerModal (`src/components/modals/AvatarPickerModal.tsx`)

### 7.1 Architectural Role & Component Hierarchy
Modal providing user avatar selection across 6 curated character illustrations representing different ages and genders.

#### Visual Layout & Elements
* **Header:** Title "Choose Your Avatar", Close button.
* **Large Preview Avatar:** Displays currently highlighted avatar with name label.
* **Preset Grid:** 6 Preset tiles (`avatar_men`, `avatar_women`, `avatar_boy`, `avatar_girl`, `avatar_grandpa`, `avatar_grandma`).
* **Confirm Button:** "Set Avatar" CTA (`handleConfirm`).

### 7.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `MOD-AVA-001` | Select & Save Avatar | Tap `avatar_girl` preset, tap "Set Avatar" | Updates user avatar URL across header, profile card, and Cloud Firestore; modal dismisses. | - |
| `MOD-AVA-NEG-001` | Close Without Saving | Select different avatar, tap "X" without confirming | Selected preview reverts; user avatar remains unchanged. | State immutability. |

---

## 8. NotificationModal (`src/components/modals/NotificationModal.tsx`)

### 8.1 Architectural Role & Component Hierarchy
In-app notification drawer displaying contextual reminders, streak achievements, water intake alerts, and AI coach tips dynamically generated from live user telemetry.

#### Visual Layout & Elements
* **Header:** Title "Notifications", Unread badge count, "Mark all as read" button, Close button.
* **Notification Item Cards:**
  * Streak celebration (`n_streak` with flame icon).
  * Water check-in (`n_water` with droplet icon and percentage).
  * Calorie target progress (`n_calorie` with food icon).
  * Step milestone (`n_step` with shoe icon).
* **Card Interactions:** Tap item to open relevant tracker; swipe to dismiss.

### 8.2 Test Cases & Negative Paths

| Test ID | Scenario | Actions | Expected Output | Negative / Edge Case |
|---|---|---|---|---|
| `MOD-NOTIF-001` | Tap Hydration Notification | Tap water reminder card | Closes notification modal and navigates directly to `WaterTrackerScreen`. | Deep action linking. |
| `MOD-NOTIF-002` | Mark All As Read | Tap "Mark all as read" | All unread dot indicators clear; badge count on home header resets to 0. | Batch state update. |
| `MOD-NOTIF-NEG-001` | Zero Notifications State | All alerts dismissed | Renders clean empty state: "You're all caught up! No new notifications." | Empty inbox handling. |
