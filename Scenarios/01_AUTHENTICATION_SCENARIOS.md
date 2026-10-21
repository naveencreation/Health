# Calorify — Authentication Scenarios & Test Case Matrix

> **Target Directory:** `src/screens/auth/`  
> **Applicable SDK:** Expo SDK 57 / React Native 0.86 / Firebase Auth  
> **Coverage:** `WelcomeScreen`, `SignInScreen`, `SignUpScreen`, `ForgotPasswordScreen`

---

## 1. WelcomeScreen (`src/screens/auth/WelcomeScreen.tsx`)

### 1.1 Architectural Role & Component Hierarchy
`WelcomeScreen` is the primary authentication entrypoint and orchestrator. It manages navigation across authentication modes (`welcome`, `onboarding`, `signin`, `signup`, `forgot_password`, `age`) using an internal stack history and smooth screen transitions via `ScreenTransitionContainer`.

#### Visual Layout & Elements
* **Background & Branding Container:**
  * Top Hero Image (`assets/images/auth-welcome.png` via `expo-image`).
  * Brand Typography: Headline "Track Calories, Reach Goals", subheadline "Your intelligent companion for mindful eating".
* **Onboarding Resume Banner (Conditional):**
  * Displayed if an incomplete onboarding draft exists in `@calori_onboarding_draft_v1`.
  * Shows "Continue Setup (Step X of 17)" with a primary resume CTA and a secondary "Start Fresh" (`handleStartOver`) link.
* **Primary Action Buttons:**
  * "Get Started" (`testID="btn-welcome-get-started"`): Initiates Onboarding Wizard.
  * "I already have an account" (`testID="btn-welcome-signin"`): Transitions to `SignInScreen`.
  * "Explore Demo Mode" (`testID="btn-welcome-demo"`): Instant guest sandbox session with mock telemetry.
* **Loaders & Overlays:**
  * `BouncingDotsLoader` during demo mode initialization.

### 1.2 State & Context Bindings
* **Context:** `useAuth()` (`loginDemo`, `applyOnboardingPlan`).
* **Local State:**
  * `history: AuthScreenMode[]`: Screen back-stack.
  * `transitionDirection: 'forward' | 'backward'`: Directional slide indicator.
  * `draft: OnboardingDraft | null`: Stored progress from AsyncStorage.
  * `isDemoLoading: boolean`: Loading lock during demo initialization.
  * `demoError: string | null`: Error message on failed demo session.

### 1.3 Test Cases: Happy Paths

| Test ID | Scenario | Pre-conditions | User Actions | Expected Results |
|---|---|---|---|---|
| `AUTH-WEL-001` | First-time launch (Fresh state) | No AsyncStorage draft exists | Tap "Get Started" | Navigates forward to `OnboardingWizardScreen` (Step 1: Name Input). Backstack updates to `['welcome', 'onboarding']`. |
| `AUTH-WEL-002` | Resume existing draft | Draft saved at Step 5 (`WeightSelectionScreen`) | Tap "Continue Setup" | Directly opens `OnboardingWizardScreen` at Step 5 with preserved state. |
| `AUTH-WEL-003` | Discard existing draft | Draft saved at Step 5 | Tap "Start Fresh" | Clears `@calori_onboarding_draft_v1`, resets draft state, and opens `OnboardingWizardScreen` at Step 1. |
| `AUTH-WEL-004` | Switch to Sign In | On Welcome landing | Tap "I already have an account" | Navigates forward to `SignInScreen`. Backstack contains `['welcome', 'signin']`. |
| `AUTH-WEL-005` | Instant Demo Login | On Welcome landing | Tap "Explore Demo Mode" | Sets `isDemoLoading=true`, invokes `loginDemo()`, loads demo user profile, and unlocks main application dashboard. |

### 1.4 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `AUTH-WEL-NEG-001` | Demo login failure | `loginDemo()` rejects (e.g. AsyncStorage quota exceeded) | `isDemoLoading` resets to `false`, `demoError` banner appears with human-readable error, retry button enabled. |
| `AUTH-WEL-NEG-002` | Rapid double-tap on "Get Started" | Rapid consecutive taps (<200ms) on CTA | Debounce logic prevents double-mounting `OnboardingWizardScreen`; single forward transition executes. |
| `AUTH-WEL-NEG-003` | Android hardware back button on sub-modes | User is on `SignInScreen` within Welcome flow | Hardware back button intercepted by `BackHandler`; pops history stack to `welcome` instead of exiting app. |
| `AUTH-WEL-NEG-004` | Corrupted draft JSON in storage | AsyncStorage returns invalid string for `@calori_onboarding_draft_v1` | `loadOnboardingDraft()` catches `JSON.parse` syntax error, clears damaged key, falls back to clean state. |
| `AUTH-WEL-NEG-005` | Dynamic Font Scaling (200%) | Device accessibility font size at maximum | Text wraps without clipping; CTAs remain fully clickable inside `ScrollView`. |

---

## 2. SignInScreen (`src/screens/auth/SignInScreen.tsx`)

### 2.1 Architectural Role & Component Hierarchy
Handles user authentication against Firebase Auth with email and password, guest fallback, and routing to registration or password recovery.

#### Visual Layout & Elements
* **Header:** `OnboardingHeader` with `onBack` button (`testID="btn-signin-back"`).
* **KeyboardAvoidingView & ScrollView:** Wraps all form elements (`keyboardShouldPersistTaps="handled"`).
* **Title & Subtitle:** "Welcome Back" / "Sign in to access your nutrition plan and tracked history."
* **Form Inputs:**
  * Email Input (`testID="input-signin-email"`): `keyboardType="email-address"`, autoCapitalize="none", autoCorrect=false.
  * Password Input (`testID="input-signin-password"`): `secureTextEntry={!showPassword}`, eye icon toggle.
* **Inline Actions:**
  * "Forgot Password?" (`testID="btn-signin-forgot-password"`): Routes to password reset.
  * "Sign In" Button (`testID="btn-signin-submit"`): Submits credentials, displays `BouncingDotsLoader` when `loading=true`.
  * "Explore Demo Mode" CTA: Quick sandbox entrance without credentials.
  * "Don't have an account? Sign Up" link: Routes to `SignUpScreen`.
* **Error Banner:** Displays Firebase Auth or validation error messages with warning icon.

### 2.2 State & Context Bindings
* **Context:** `useAuth()` (`login`, `loginDemo`).
* **Local State:**
  * `email: string`, `password: string`
  * `showPassword: boolean`
  * `focusedField: 'email' | 'password' | null`
  * `loading: boolean`
  * `errorMessage: string | null`

### 2.3 Test Cases: Happy Paths

| Test ID | Scenario | Inputs | Actions | Expected Output |
|---|---|---|---|---|
| `AUTH-IN-001` | Valid Sign-In | Email: `test@calorify.app`<br>Password: `ValidPass123!` | Tap "Sign In" | Loading indicator renders, `login()` succeeds, `onSuccess()` triggers, user session initialized, navigates to `TodayScreen`. |
| `AUTH-IN-002` | Show/Hide Password | Password entered | Tap eye toggle icon | Toggles `showPassword` state between obscured text (`•••`) and plain readable text. |
| `AUTH-IN-003` | Route to Forgot Password | Any | Tap "Forgot Password?" | Fires `onForgotPassword()`, WelcomeScreen history pushes `forgot_password`. |
| `AUTH-IN-004` | Route to Sign Up | Any | Tap "Sign Up" | Fires `onSwitchToRegister()`, WelcomeScreen history pushes `signup`. |

### 2.4 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `AUTH-IN-NEG-001` | Empty Fields | Email: `""`<br>Password: `""` | Immediate client-side validation stops request; displays "Please enter both email and password." |
| `AUTH-IN-NEG-002` | Whitespace-only Email | Email: `"   "`<br>Password: `"password"` | Trim validation stops request; displays "Please enter both email and password." |
| `AUTH-IN-NEG-003` | User Not Found | Email: `nonexistent@domain.com`<br>Password: `SomePass123` | Firebase `auth/user-not-found` caught; displays clear error banner: "No account found with this email." |
| `AUTH-IN-NEG-004` | Wrong Password | Email: `valid@user.com`<br>Password: `WrongPassword!` | Firebase `auth/wrong-password` or `auth/invalid-credential` caught; displays "Incorrect password. Please try again." |
| `AUTH-IN-NEG-005` | Account Disabled | Disabled user account | Firebase `auth/user-disabled` caught; displays "This account has been disabled. Please contact support." |
| `AUTH-IN-NEG-006` | Rate Limiting (Brute Force) | 5+ consecutive invalid sign-in attempts | Firebase `auth/too-many-requests` caught; displays "Access temporarily disabled due to many failed attempts. Try again later." |
| `AUTH-IN-NEG-007` | Network Disconnection | Device offline / airplane mode | Firebase `auth/network-request-failed` caught; displays "Network error. Please check your internet connection." |
| `AUTH-IN-NEG-008` | Double Submission Spam | User taps "Sign In" 5 times rapidly | Submit button disabled via `disabled={loading}`; only one network request emitted. |

---

## 3. SignUpScreen (`src/screens/auth/SignUpScreen.tsx`)

### 3.1 Architectural Role & Component Hierarchy
Registers new users in Firebase Auth, creates the user profile document in Cloud Firestore (`users/{uid}`), and attaches onboarding biometrics when provided.

#### Visual Layout & Elements
* **Header:** `OnboardingHeader` with `onBack` button (`testID="btn-signup-back"`).
* **KeyboardAvoidance & Auto-scroller:**
  * Uses `fieldOffsets` and `scrollViewRef` to scroll active input above keyboard on focus.
* **Form Inputs:**
  * Full Name (`testID="input-signup-name"`): Text input, capitalizes words.
  * Email Address (`testID="input-signup-email"`): Email keyboard, lowercase.
  * Password (`testID="input-signup-password"`): Secure text entry with eye toggle.
  * Confirm Password (`testID="input-signup-confirm"`): Secure text entry with eye toggle.
* **Password Strength & Validation Checklist:**
  * 4 Dynamic Badges (Green check / Grey outline):
    * 8+ characters (`hasMinLength`)
    * Contains a number (`hasNumber`)
    * Contains an uppercase letter (`hasUpper`)
    * Contains a special character (`hasSpecial`)
    * Passwords match badge (`passwordsMatch`)
* **Submit Action:**
  * "Create Account" (`testID="btn-signup-submit"`): Disabled or validates requirements.
  * "Already have an account? Sign In": Routes to `SignInScreen`.

### 3.2 State & Context Bindings
* **Context:** `useAuth()` (`register`).
* **Props:** `initialData` (biometrics: `age`, `weight`, `weightUnit`, `goal`, `gender`, `height`, `heightUnit`).
* **Local State:**
  * `name`, `email`, `password`, `confirmPassword`
  * `showPassword`, `showConfirmPassword`
  * `focusedField: 'name' | 'email' | 'password' | 'confirm' | null`
  * `loading: boolean`
  * `errorMessage: string | null`

### 3.3 Test Cases: Happy Paths

| Test ID | Scenario | Inputs | Actions | Expected Output |
|---|---|---|---|---|
| `AUTH-UP-001` | Valid Registration Without Initial Data | Name: `Jane Doe`<br>Email: `jane@example.com`<br>Pass: `SecurePass123!` | Tap "Create Account" | Form validates all 4 password rules, creates Firebase Auth record, creates Firestore document, executes `onSuccess()`. |
| `AUTH-UP-002` | Valid Registration With Onboarding Data | Valid credentials + `initialData` containing goal, weight, height | Tap "Create Account" | Creates account and saves biometric health plan directly into Firestore `users/{uid}/settings` & `profile`. |
| `AUTH-UP-003` | Real-time Rule Indicators | Typing password `P` -> `Pa1` -> `Pa1@` -> `Pa1@abcd` | Typing into password field | Badges turn green in real-time as each regex constraint is satisfied. |

### 3.4 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `AUTH-UP-NEG-001` | Missing Full Name | Name: `""`, valid email/pass | Stops submission; displays "Please enter your full name." |
| `AUTH-UP-NEG-002` | Malformed Email | Email: `janedoe@`, `user@domain` | Stops submission; displays "Please enter a valid email address." |
| `AUTH-UP-NEG-003` | Weak Password Submission | Pass: `abc12` (fails length/special) | Form rejects submission; displays "Please meet all password requirements before proceeding." |
| `AUTH-UP-NEG-004` | Password Mismatch | Pass: `SecurePass123!`, Confirm: `SecurePass456!` | Stops submission; displays "Passwords do not match." |
| `AUTH-UP-NEG-005` | Email Already Registered | Existing email: `existing@calorify.app` | Firebase `auth/email-already-in-use` caught; displays "An account with this email already exists. Please sign in." |
| `AUTH-UP-NEG-006` | Firestore Write Failure After Auth Creation | Auth succeeds but device goes offline before Firestore profile write | Reversion/retry handler runs; transaction safely cleans up or caches locally in offline persistence. |
| `AUTH-UP-NEG-007` | Special Characters in Name | Name: `<script>alert(1)</script>` or emojis | Input sanitized; stored safely as string without executing or breaking Firestore document format. |

---

## 4. ForgotPasswordScreen (`src/screens/auth/ForgotPasswordScreen.tsx`)

### 4.1 Architectural Role & Component Hierarchy
Allows users to trigger a password reset email via Firebase Auth `sendPasswordResetEmail`.

#### Visual Layout & Elements
* **Header:** `OnboardingHeader` with `onBack` button.
* **Form View (Before Sent):**
  * Icon: Lock & key graphic.
  * Title: "Reset Password".
  * Subtitle: "Enter the email associated with your account and we will send you a reset link."
  * Email Input (`testID="input-forgot-email"`).
  * Send Reset Email Button (`testID="btn-forgot-submit"`).
* **Success View (After Sent):**
  * Success Checkmark Icon.
  * Confirmation Text: "Reset link sent to {email}".
  * "Resend Email" button (with cooldown spinner).
  * "Back to Sign In" CTA (`testID="btn-forgot-return"`).

### 4.2 State & Context Bindings
* **Firebase Direct:** `sendPasswordResetEmail(auth, email)`.
* **Local State:**
  * `email: string`
  * `loading: boolean`, `resending: boolean`
  * `isSent: boolean`
  * `errorMessage: string | null`

### 4.3 Test Cases: Happy Paths

| Test ID | Scenario | Inputs | Actions | Expected Output |
|---|---|---|---|---|
| `AUTH-FP-001` | Send Reset Email | Registered Email: `user@calorify.app` | Tap "Send Reset Email" | Triggers Firebase reset email, toggles `isSent=true`, displays confirmation card. |
| `AUTH-FP-002` | Resend Email | Email already sent | Tap "Resend Email" | Sets `resending=true`, re-invokes API, shows toast "Reset link resent successfully." |
| `AUTH-FP-003` | Return to Sign In | Success card displayed | Tap "Back to Sign In" | Invokes `onSuccess()` / `onBack()`, returning user to `SignInScreen`. |

### 4.4 Negative Paths & Edge Cases

| Test ID | Scenario / Failure Mode | Trigger / Input | Expected System Behavior & UI State |
|---|---|---|---|
| `AUTH-FP-NEG-001` | Empty Email | Email: `""` | Stops submission; displays "Please enter your email address." |
| `AUTH-FP-NEG-002` | Unregistered Email | Email: `unregistered@test.org` | Firebase `auth/user-not-found` caught; displays "No account found with this email address." |
| `AUTH-FP-NEG-003` | Invalid Email Format | Email: `notanemail` | Firebase `auth/invalid-email` caught; displays "Please enter a valid email address." |
| `AUTH-FP-NEG-004` | Spam Resend Rate Limit | Tapping "Resend Email" 10 times consecutively | Firebase `auth/too-many-requests` caught; displays "Too many reset attempts. Please wait a few minutes." |
| `AUTH-FP-NEG-005` | Offline Network Error | Device disconnected | Firebase `auth/network-request-failed` caught; displays "Network error. Please check your internet connection." |
