---
name: Calorify Architectural Modernist
colors:
  surface: '#FAF9F6'
  surface-dim: '#F4F1EA'
  surface-bright: '#FAF9F6'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F8FAFC'
  surface-container: '#F1F5F9'
  surface-container-high: '#E2E8F0'
  surface-container-highest: '#CBD5E1'
  on-surface: '#0F172A'
  on-surface-variant: '#64748B'
  inverse-surface: '#1E293B'
  inverse-on-surface: '#F8FAFC'
  outline: 'rgba(15, 23, 42, 0.06)'
  outline-variant: '#E2E8F0'
  surface-tint: '#F47551'
  primary: '#F47551'
  on-primary: '#FFFFFF'
  primary-container: '#FFEDD5'
  on-primary-container: '#9A3412'
  inverse-primary: '#FFAA93'
  secondary: '#67BD6E'
  on-secondary: '#FFFFFF'
  secondary-container: '#DCFCE7'
  on-secondary-container: '#166534'
  tertiary: '#F8D558'
  on-tertiary: '#451A03'
  tertiary-container: '#FEF3C7'
  on-tertiary-container: '#92400E'
  protein: '#67BD6E'
  protein-container: '#DCFCE7'
  on-protein-container: '#166534'
  carbs: '#F8D558'
  carbs-container: '#FEF3C7'
  on-carbs-container: '#92400E'
  fat: '#E07A5F'
  fat-container: '#FFEDD5'
  on-fat-container: '#9A3412'
  fibre: '#059669'
  fibre-container: '#D1FAE5'
  on-fibre-container: '#065F46'
  water: '#0284C7'
  water-container: '#E0F2FE'
  on-water-container: '#0369A1'
  steps: '#F97316'
  steps-container: '#FED7AA'
  on-steps-container: '#C2410C'
  weight: '#F43F5E'
  weight-container: '#FFE4E6'
  on-weight-container: '#BE123C'
  error: '#EF4444'
  on-error: '#FFFFFF'
  error-container: '#FEE2E2'
  on-error-container: '#991B1B'
  background: '#FAF9F6'
  on-background: '#0F172A'
  surface-variant: '#F1F5F9'
typography:
  display-lg:
    fontFamily: Urbanist
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Urbanist
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.025em
  telemetry-hero:
    fontFamily: Urbanist
    fontSize: 42px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  telemetry-card:
    fontFamily: Urbanist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  telemetry-macro:
    fontFamily: Urbanist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  telemetry-unit:
    fontFamily: Urbanist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  headline-lg:
    fontFamily: Urbanist
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Urbanist
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Urbanist
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Urbanist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Urbanist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-sm:
    fontFamily: Urbanist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-lg:
    fontFamily: Urbanist
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Urbanist
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Urbanist
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  brand-serif:
    fontFamily: Kurale
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 38px
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  DEFAULT: 8px
  card: 10px
  modal: 16px
  pill: 14px
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.25rem
  space-2xl: 1.5rem
---

# Design System: Calorify Architectural Modernist

## 1. Visual Atmosphere & Flat Architectural Philosophy

Calorify merges **Architectural Modernism** with **Mindful Metabolic Health**. 

The design rejects both the toy-like, bulbous aesthetics of gamified fitness apps and the murky dark-neon tropes of bodybuilder tools. Instead, it feels like a well-lit Swiss or Scandinavian architectural atelier: warm, disciplined, crisp, and calm.

- **Density:** 6/10 (Daily App Balanced) — expansive negative space anchored by high-information-density metric cards.
- **Geometry:** Architectural Nearly-Square — crisp, disciplined cards bounded by a strict **10px micro-radius** with $G^2$ continuous curvature (`borderCurve: 'continuous'`).
- **Surface Elevation Physics**:
  - **Canvas Cards (Zero Float Shadow Standard):** Cards are **pure white planar surfaces resting flush on the sunlit porcelain linen canvas**, delineated exclusively by a precise $1\text{px}$ hairline whisper border (`rgba(15, 23, 42, 0.06)` or `#E2E8F0`). **All floating drop shadows and bottom shadow smudges on canvas cards are strictly removed (`elevation: 0`, `shadowOpacity: 0`).**
  - **Floating Overlays & Toasts:** Contextual anchor popovers, dropdown menus, and temporary undo snackbars that float *above* interactive content utilize a crisp $1\text{px}$ border (`rgba(15, 23, 42, 0.08)`) and controlled floating depth (`shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16`, Android `elevation: 6`).
- **Lighting & Contrast:** High daylight clarity. Contrast is achieved through crisp geometric silhouettes and hairline borders, not muddy drop shadow halos.

---

## 2. Master Functional Color System

### The Canvas & Base
- **Canvas Linen (`#FAF9F6`)**: The warm, unbleached sunlit porcelain foundation. Eliminates eye strain and clinical glare.
- **Card Surface (`#FFFFFF`)**: Pure white planar surface for all cards, logs, and sheets.
- **Surface Inset (`#F1F5F9`)**: Soft slate recessed track for segmented tab switchers, micro-steppers, and progress backgrounds.
- **Neutral Core Text (`#0F172A`)**: Deep Slate 900. Sharp, high-contrast typography without the harshness of pure `#000000`.
- **Muted Slate (`#64748B`)**: Secondary labels, unit indicators (`kcal`, `g`, `steps`, `kg`), and metadata.
- **Whisper Border (`rgba(15, 23, 42, 0.06)`)**: 1px structural hairline perimeter on all cards and containers.
- **Border Inset (`#E2E8F0`)**: 1px crisp divider inside cards and segmented controls.

### The 4 Nutrients (Macro & Micro Breakdown)
- **Protein (`#67BD6E` | Material 3 `secondary`)**: Fresh avocado/leaf green representing muscle synthesis and satiety.
  - Inactive Track: `#DCFCE7` (Soft Mint)
  - Accessible Contrast Text: `#166534`
- **Carbs (`#F8D558` | Material 3 `tertiary`)**: Sunlit honey gold representing kinetic fuel and energy reserves.
  - Inactive Track: `#FEF3C7` (Soft Honey)
  - Accessible Contrast Text: `#92400E`
- **Fat (`#E07A5F`)**: Warm ochre coral representing cellular integrity and sustained energy *(strictly distinct from calorie burn!)*.
  - Inactive Track: `#FFEDD5` (Soft Apricot)
  - Accessible Contrast Text: `#9A3412`
- **Fibre (`#059669`)**: Deep rich emerald representing digestive and metabolic balance *(distinct from leaf green protein)*.
  - Inactive Track: `#D1FAE5` (Pale Sage)
  - Accessible Contrast Text: `#065F46`

### The 4 Activity & Health Tracking Pillars
- **Calories (Food Intake & Active Burn) (`#F47551` | Material 3 `primary`)**: Warm Terracotta brand core.
  - Inactive Track: `#FFEDD5` (Soft Peach)
  - Deep Accent: `#C2410C`
- **Water (Hydration) (`#0284C7`)**: Ocean Sky Azure. Calm, mineral, refreshing.
  - Inactive Track: `#E0F2FE` (Soft Aqua Mist)
  - Deep Accent: `#0369A1`
- **Steps (Movement & Cadence) (`#F97316`)**: Vibrant Tangerine Flame. High-energy kinetic cadence.
  - Inactive Track: `#FED7AA` (Warm Amber Tint)
  - Deep Accent: `#C2410C`
- **Weight (Body Mass & Scale) (`#F43F5E`)**: Rose Coral. Distinct from step orange and calorie terracotta.
  - Inactive Track: `#FFE4E6` (Soft Rose Mist)
  - Deep Accent: `#BE123C`
  - Delta Accents: Loss = `#10B981` (Emerald), Gain = `#F43F5E` (Rose Coral).

### Progress Bar Duo Rule
Every progress indicator uses a matched pair:
1. **Active Fill**: 100% saturated domain color.
2. **Inactive Track**: 10%–15% soft pastel container tint of the exact same domain family. Never sterile neutral gray.

---

## 3. Typographic Architecture: 100% Pure Urbanist

Calorify deploys **pure Urbanist** across all screens, controls, numbers, and telemetry.

### Typeface Roles
- **Primary Typeface (Urbanist)**: Drives 100% of the UI, telemetry numbers, headings, onboarding pickers, and body copy.
  - `Urbanist_800ExtraBold`: Display titles (`44px` / `34px`).
  - `Urbanist_700Bold`: Headlines (`28px` / `22px` / `18px`), Hero & Card telemetry numbers (`42px` / `32px`), and action button labels (`16px`).
  - `Urbanist_600SemiBold`: Card section subtitles (`15px`), secondary telemetry (`22px`), and segmented tab labels (`13px`).
  - `Urbanist_500Medium`: Body descriptions (`14px` / `12px`) and telemetry unit tags (`13px` `#64748B`).
  - `Urbanist_400Regular`: Extended paragraph copy and disclaimers.
- **Brand Wordmark Only (Kurale)**: Restricted exclusively to the solitary `"Calorify"` logo text mark on splash and auth welcome headers. Banned from all numerical data, wheel pickers, tables, and telemetry.

### Telemetry Scale (The Numbers Hierarchy)
- **`telemetry-hero` (`42px`, Urbanist Bold 700)**: Single hero readout per screen (Hero Water `1,750`, Hero Step `6,420`, Hero Weight `72.4`).
- **`telemetry-card` (`32px`, Urbanist Bold 700)**: Primary card telemetry (Calorie remaining `1,280`, BMI `22.4`, Total duration `54`).
- **`telemetry-macro` (`22px`, Urbanist SemiBold 600)**: 3-macro numbers (Protein `110g`, Carbs `180g`, Fat `45g`) and list row values.
- **`telemetry-unit` (`13px`, Urbanist Medium 500, `#64748B`)**: Baseline-aligned unit labels (`kcal`, `mL`, `steps`, `kg`), paired with a 3px horizontal margin from numeric glyphs.

---

## 4. Card Geometry & Flat Surface Physics: The 10px Standard

The defining visual signature of Calorify is the **10px Architectural Squircle** with **Flat Depth**.

### The Anatomy of a Card
- **Corner Radius**: Strictly **`10px`** across all primary, secondary, and sub-screen cards.
- **Curvature Continuity**: `borderCurve: 'continuous'` ($G^2$ superellipse curve). Eliminates circular arc bumps, creating seamless architectural corners.
- **Border Treatment**: 1px solid `rgba(15, 23, 42, 0.06)`. Crisp, refined, architectural.
- **Elevation Physics**:
  - `shadowOpacity: 0` (iOS / Web).
  - `elevation: 0` (Android).
  - All bottom floating shadow halos and smudges on canvas cards are completely eliminated. Depth is defined cleanly by the pure white plane sitting on unbleached linen canvas with its 1px whisper border.
- **Inner Concentricity Formula**: Nested sub-elements calculate inner radius:
  $$R_{\text{inner}} = \max(R_{\text{outer}} - \text{Padding}, 4\text{px}) = 6\text{px} - 8\text{px}$$

---

## 5. Component Specifications & Interaction Behaviors

### 1. Calorie Hero Card
- **Surface**: 10px nearly-square flat card with 18px internal padding.
- **Visual Centerpiece**: Dual-mode interactive slider:
  - **Slide 0**: Circular SVG progress ring (remaining calories, animated fill) flanking Eaten/Burned stack and 3-macro progress matrix (Carbs, Protein, Fat).
  - **Slide 1**: 7-Day interactive trend canvas with bezier spline curve and daily pill selectors.

### 2. Meal Cards (Breakfast, Lunch, Dinner, Snacks)
- **Container**: 10px nearly-square flat card, 14px vertical and 16px horizontal padding.
- **Thumbnail Circle**: 46×46px circular thumbnail with 1px border.
- **Add Button**: 38×38px circular action trigger (`borderRadius: 19px`) filled with `Colors.proteinLight` (`#DCFCE7`) and `#166534` vector plus icon.
- **Accordion Expansion**: Smooth UI-thread max-height interpolation (220ms duration) revealing logged meal items with swipe-to-delete.

### 3. Habit Trackers (Water, Steps, Weight, BMI)
- **Container**: 10px nearly-square flat white cards with 1px whisper border and zero drop shadow.
- **Left Column**: Metric name in `Urbanist Bold 18px` + large readout in `Urbanist Bold 32px` with baseline unit.
- **Right Column**: Interactive progress dial, droplet visualizer, or mini line trend.

### 4. Segment Switchers & Timeframe Selectors
- **Track**: `#F1F5F9` soft slate track with 12px radius and 2.5px inset padding.
- **Active Pill**: Pure white `#FFFFFF` floating segment with 10px radius, 1px hairline border, and `Urbanist SemiBold 13px` dark text.

### 5. Buttons Hierarchy
- **Primary CTA**: Height `52px`, `borderRadius: 10px`, background `#F47551`, pure white text `Urbanist Bold 16px`. Zero drop shadow.
- **Secondary / Ghost CTA**: Height `48px`, `borderRadius: 10px`, background `#FFFFFF`, 1px border `rgba(15, 23, 42, 0.12)`, text `#0F172A` `Urbanist SemiBold 15px`.
- **Circular Header Action**: `38×38px`, `borderRadius: 19px`, pure white fill, 1px border `rgba(15, 23, 42, 0.08)`, icon `#0F172A` size `20px`.
- **Domain Action Triggers**: `38×38px`, `borderRadius: 19px`, filled with soft domain container tint (`#DCFCE7`, `#E0F2FE`), deep domain vector icon (`#166534`, `#0369A1`).

### 6. Modal Bottom Sheets
- **Container**: Top corner radius strictly **`16px`** (`borderTopLeftRadius: 16`, `borderTopRightRadius: 16`, `borderCurve: 'continuous'`).
- **Drag Handle**: Centered capsule `36×4px`, `borderRadius: 2px`, color `#E2E8F0`, top margin `10px`, bottom margin `16px`.
- **Backdrop**: Scrim overlay `rgba(15, 23, 42, 0.4)`.

### 7. Form Controls, Search Inputs & Micro-Steppers
- **Text Search / Input Field**: Height `48px`, `borderRadius: 10px` squircle, background `#F8FAFC`, border `1px solid rgba(15, 23, 42, 0.08)`, horizontal padding `14px`, text `Urbanist Medium 15px` (`#0F172A`), placeholder `#94A3B8`.
- **Micro-Steppers `[-]` / `[+]`**: `40×40px`, `borderRadius: 10px`, background `#F1F5F9`, border `1px solid rgba(15, 23, 42, 0.06)`, text `#0F172A` `Urbanist Bold 18px`.

### 8. Bottom Navigation Bar & Center Floating FAB
- **Bar Dimensions**: Height `64px` (+ hardware safe area bottom insets).
- **Surface**: Pure white `#FFFFFF` with $1\text{px}$ hairline top border `rgba(15, 23, 42, 0.06)`. Zero muddy drop shadow.
- **Tab Triggers**: Active icon/label in `#0F172A` (`Urbanist Bold 11px`); Inactive icon/label in `#94A3B8` (`Urbanist Medium 11px`).
- **Center Floating FAB (+)**: `52×52px` circular floating trigger in Lime Accent `#CDE26D` (or Terracotta `#F47551`) with a $3\text{px}$ pure white protective halo ring, elevated `-16px` above the navigation bar line.

### 9. Chart & Graph Rendering Tokens (Report Visuals)
- **Chart Container**: 10px nearly-square flat card, 18px padding, 1px whisper border.
- **Horizontal Gridlines**: $1\text{px}$ stroke `rgba(15, 23, 42, 0.04)` with dashed stroke (`strokeDasharray="4, 4"`).
- **Goal Benchmark Line**: Horizontal dashed line in Domain Color with `strokeDasharray="6, 5"`.
- **Axis Typography**: `Urbanist Medium 11px`, `#94A3B8`, tabular numbers.
- **Bar Geometry**: Width $24\text{px}\text{–}28\text{px}$, top corner radius $6\text{px}$ (`borderRadius: 6`). Inactive fill is domain container tint (e.g. `#FED7AA` for steps), active fill is $100\%$ domain color (`#F97316`).
- **Tooltip Pin Badge**: Speech-bubble badge anchored above active node/bar with downward needle pointer ($6\times6\text{px}$). Background `#0F172A`, text `#FFFFFF` `Urbanist Bold 12px`, zero Android polygon tessellation (`elevation: 0`, `borderWidth: 0`).

---

## 6. Layout, Safe Areas & Viewport Strategy

- **Mobile Viewport Target**: 390px – 448px portrait width.
- **Desktop / Web Responsive Wrapper**: Centered phone viewport (`maxWidth: 480px`) floating above warm neutral `#F4F1EA` desktop canvas with subtle vertical borders.
- **Outer Margins**: Fixed 16px horizontal gutters on mobile.
- **Vertical Rhythm**: 14px to 16px gap between stacked cards.
- **Safe Area Insets**:
  - Top: Hardware safe area (`SafeAreaView edges={['top']}`) containing the unified 38×38px circular navigation header.
  - Bottom: Dynamic `paddingBottom: Math.max(insets.bottom, 16)` ensuring sticky action bars float comfortably above the iOS home indicator bar (34px) and Android gesture bar.

---

## 7. Motion Philosophy & Timing

- **Tactile Feedback**: Press interactions use predictable, snappy timing: `withTiming` (~80–120ms) with subtle scale transform:
  $$\text{Scale: } 1.0 \to 0.96 \quad \text{Opacity: } 1.0 \to 0.85$$
- **No Over-Springing**: Bouncy springs are banned for core navigation and press states; UI controls must feel solid and responsive.
- **Accordion Reveals**: 220ms smooth ease-out expansion.
- **Tooltips & Popovers**: 150–180ms opacity crossfade.
- **Hardware Acceleration**: 100% of animations execute on the UI thread via React Native Reanimated worklets (`transform` and `opacity` only).

---

## 8. Explicit Anti-Patterns (Banned Design Clichés)

1. **No Card Float Drop Shadows**: Cards resting on the canvas must be clean, flat architectural planes with 1px hairline borders (`elevation: 0`, `shadowOpacity: 0`). No bottom shadow halos or smudges.
2. **No Bulbous Toy Cards**: Card `borderRadius > 12px` is strictly forbidden. All cards must adhere to the **10px** architectural standard.
3. **No Neon / AI Purple Glows**: Never use purple glows, neon gradients, or electric outer rings.
4. **No Pure Black**: `#000000` is forbidden for body text, backgrounds, or borders. Use `#0F172A` (Slate 900) or `#1E293B`.
5. **No Mixed Fonts for Data**: `Kurale` is strictly banned for numbers, data, wheel pickers, or telemetry. All telemetry must be **pure Urbanist**.
6. **No Stiff Circular Corners**: Standard un-smoothed circular arc corners are forbidden where squircle curvature is possible.
7. **No Gray Progress Tracks**: Never use dull gray tracks for nutrient or activity progress bars; always use the calibrated 10%–15% pastel container tint.
8. **No AI Copywriting Clichés**: Avoid words like *"Elevate"*, *"Seamless"*, *"Unleash"*, *"Next-Gen"*. Use calm, direct, supportive health language.
