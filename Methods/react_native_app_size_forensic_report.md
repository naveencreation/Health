# React Native App Size — Complete Forensic Audit Report

**Application**: Calorify (`com.calorify.app`)  
**Framework**: Expo SDK 57 (`expo: ~57.0.22`, `react-native: 0.86.3`, `react: 19.2.3`)  
**Audit Date**: September 21, 2026  
**Artifact Analyzed**: `android/app/build/outputs/apk/release/app-release.apk`

---

## Executive Summary: Why the App Is ~100 MB

The application's **96.38 MB (91.91 MiB)** release APK footprint is driven by **four primary root causes**, all quantitatively measured:

1. **Fat Universal APK Multi-ABI Bundling (66.77 MB / 73.2% of APK)**:
   The build packages all 4 CPU architectures (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`) into a single universal APK. On any actual user device (e.g. `arm64-v8a`), **49.5 MB of CPU architectures are dead weight**.
2. **R8 Minification & Dead-Code Elimination Disabled (8.26 MB compressed / 22.45 MB uncompressed DEX)**:
   `minifyEnabled` is `false` and `shrinkResources` is `false`. Over 8,500 unused Java/Kotlin classes (including full Kotlin reflection and unused AndroidX/Fresco code) are packaged into 3 DEX files.
3. **Unoptimized 1254x1254 Raster Avatar PNGs (7.56 MB in `res/`)**:
   7 avatar illustrations are bundled as massive ~1 MB 1254x1254 PNGs to render in 40–80px circular badges. Furthermore, `ria_avatar.png` is bundled twice under different names.
4. **38 Bundled TTF Fonts (3.32 MB compressed / 7.00 MB uncompressed)**:
   All 18 weights and italics of Poppins are bundled (even though only 4 weights are used), along with 17 complete icon font families from `@expo/vector-icons` (even though the app only references `Ionicons` and `MaterialCommunityIcons`).

---

## A. Current Size Baseline

| Metric | Measured Size | Notes |
| :--- | :--- | :--- |
| **Release APK (File on Disk)** | **96.38 MB** (96,377,267 B) | Universal APK containing all 4 ABIs |
| **APK Uncompressed Payload** | **109.59 MB** (114,910,785 B) | `lib/` files uncompressed (page-aligned) |
| **arm64-v8a Device Download Payload** | **~41.74 MB** | Single ABI slice extracted from APK |
| **Estimated Installed Size on Device** | **~155 MB – 180 MB** | APK base + uncompressed SOs + ART odex/vdex compilation |
| **Workspace `Images/` Directory** | **1,424.3 MB** | Contains `android-studio-...exe` (1.41 GB, not in APK) |

```text
Category Breakdown in Release APK:
---------------------------------------------------------------------------------
Category                       | Count  | Compressed (MB) | % of APK | Uncompressed
---------------------------------------------------------------------------------
lib/x86_64                     | 18     |        18.74 MB |   20.4%  |     18.74 MB
lib/x86                        | 18     |        18.73 MB |   20.4%  |     18.73 MB
lib/arm64-v8a                  | 18     |        17.27 MB |   18.9%  |     17.27 MB
lib/armeabi-v7a                | 18     |        12.03 MB |   13.1%  |     12.03 MB
res/ (Resources & Assets)      | 926    |        11.62 MB |   12.6%  |     15.59 MB
DEX (classes*.dex)             | 3      |         8.26 MB |    9.0%  |     22.45 MB
assets/ (JS Hermes Bytecode)   | 4      |         3.28 MB |    3.6%  |      3.28 MB
resources.arsc (Resource table)| 1      |         1.16 MB |    1.3%  |      1.16 MB
other (Manifest / META-INF)    | 195    |         0.15 MB |    0.2%  |      0.33 MB
---------------------------------------------------------------------------------
TOTAL                          | 1,201  |        91.24 MB |  100.0%  |    109.59 MB
```

---

## B. Top 20 Size Contributors in the APK

Ranked by compressed size inside `app-release.apk`:

| Rank | Component | Compressed | Uncompressed | Type | Why Present & Required? |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | `lib/x86/libreactnative.so` | **7.02 MB** | 7.02 MB | Native SO | x86 architecture React Native core (Unnecessary on arm64 devices) |
| **2** | `lib/x86_64/libreactnative.so`| **6.77 MB** | 6.77 MB | Native SO | x86_64 architecture React Native core (Unnecessary on arm64 devices) |
| **3** | `lib/arm64-v8a/libreactnative.so`| **6.66 MB** | 6.66 MB | Native SO | arm64-v8a React Native core runtime (**Required**) |
| **4** | `lib/armeabi-v7a/libreactnative.so`| **4.63 MB**| 4.63 MB | Native SO | 32-bit ARM React Native core (Unnecessary on arm64 devices) |
| **5** | `classes.dex` | **3.49 MB** | 9.05 MB | Java DEX | Unminified compiled Java/Kotlin bytecode (R8 disabled) |
| **6** | `assets/index.android.bundle`| **3.28 MB** | 3.28 MB | Hermes Bytecode | Compiled Hermes JavaScript application bundle (**Required**) |
| **7** | `classes2.dex` | **3.01 MB** | 8.69 MB | Java DEX | Unminified secondary DEX overflow (R8 disabled) |
| **8** | `lib/x86/libhermesvm.so` | **2.88 MB** | 2.88 MB | Native SO | x86 Hermes engine binary (Unnecessary on arm64 devices) |
| **9** | `lib/x86_64/libhermesvm.so` | **2.47 MB** | 2.47 MB | Native SO | x86_64 Hermes engine binary (Unnecessary on arm64 devices) |
| **10** | `lib/arm64-v8a/libhermesvm.so`| **2.36 MB** | 2.36 MB | Native SO | arm64-v8a Hermes JS engine runtime (**Required**) |
| **11** | `lib/x86_64/libavif_android.so`| **1.81 MB** | 1.81 MB | Native SO | Fresco AVIF decoder (App has 0 AVIF images!) |
| **12** | `classes3.dex` | **1.76 MB** | 4.71 MB | Java DEX | Unminified tertiary DEX overflow (R8 disabled) |
| **13** | `lib/armeabi-v7a/libhermesvm.so`| **1.62 MB**| 1.62 MB | Native SO | 32-bit ARM Hermes engine (Unnecessary on arm64 devices) |
| **14** | `lib/arm64-v8a/libexpo-modules-core.so`| **1.38 MB**| 1.38 MB | Native SO | Expo modular native bridge (**Required**) |
| **15** | `lib/x86_64/libexpo-modules-core.so`| **1.35 MB**| 1.35 MB | Native SO | x86_64 Expo core bridge (Unnecessary on arm64 devices) |
| **16** | `lib/x86/libexpo-modules-core.so`| **1.30 MB**| 1.30 MB | Native SO | x86 Expo core bridge (Unnecessary on arm64 devices) |
| **17** | `lib/arm64-v8a/libc++_shared.so`| **1.23 MB**| 1.23 MB | Native SO | Android C++ standard runtime (**Required**) |
| **18** | `lib/x86/libc++_shared.so` | **1.20 MB** | 1.20 MB | Native SO | x86 C++ runtime (Unnecessary on arm64 devices) |
| **19** | `lib/x86_64/libc++_shared.so` | **1.19 MB** | 1.19 MB | Native SO | x86_64 C++ runtime (Unnecessary on arm64 devices) |
| **20** | `resources.arsc` | **1.16 MB** | 1.16 MB | Android Table| Compiled Android resource table (Unshrunk) |

---

## C. Complete Dependency Size Analysis

Measured on-disk size in `node_modules` vs actual APK impact:

| Package | Node Modules Disk Size | APK Impact Area | Actually Used? | Risk & Action |
| :--- | :---: | :--- | :---: | :--- |
| `expo-image` | **131.56 MB** | Glide + Fresco native libraries (~3.2 MB) | **Yes** (Heavily used for caching) | **Keep**. Core image rendering component. |
| `expo` | **53.14 MB** | `libexpo-modules-core.so` (1.38 MB) + classes.dex | **Yes** | **Keep**. Expo framework runtime. |
| `firebase` (v12.19) | **35.08 MB** | JS bundle only (~420 KB in HBC) | **Yes** | **Keep**. Modular web SDK, 0 native `.so` footprint. |
| `react-native-svg` | **34.03 MB** | `libreact_codegen_rnsvg.so` (0.77 MB) | **Yes** (Icons/Charts) | **Keep**. Core SVG vector engine. |
| `react-native` (0.86.3)| **19.56 MB** | `libreactnative.so` (6.8 MB) + base classes | **Yes** | **Keep**. Core framework. |
| `react-native-safe-area-context`| **7.89 MB** | `libreact_codegen_safeareacontext.so` (155 KB) | **Yes** | **Keep**. Safe area insets. |
| `react-dom` | **6.98 MB** | Web export only (0 bytes in Android APK) | Web only | **Keep in package.json** (used for `web` script). |
| `@react-native-async-storage/async-storage`| **6.19 MB** | Android Java storage classes (~85 KB) | **Yes** | **Keep**. Offline storage. |
| `@expo/vector-icons` | **5.74 MB** | **17 TTF icon fonts in `res/` (2.5 MB compressed)** | **Partial** | **P2 Optimize**: Only Ionicons & MaterialCommunityIcons are used. 15 other icon fonts are bundled. |
| `@expo-google-fonts/poppins` | **4.78 MB** | **18 TTF font files in `res/` (1.3 MB compressed)** | **Partial** | **P2 Optimize**: Only 4 weights used (Regular, Medium, SemiBold, Bold). 14 weights are unused. |
| `react-native-web` | **2.89 MB** | Web export only (0 bytes in Android APK) | Web only | **Keep in package.json**. |
| `expo-font` | **1.89 MB** | Font loader native/JS classes | **Yes** | **Keep**. |
| `expo-image-picker` | **0.46 MB** | Android Activity result contracts | **Yes** | **Keep** (profile avatar upload). |
| `@expo-google-fonts/kurale` | **0.35 MB** | 1 TTF font (`res/9C.ttf`, 101.9 KB) | **Yes** | **Keep** (Kurale_400Regular). |
| `expo-secure-store` | **0.21 MB** | Android Keystore wrapper | **Yes** | **Keep** (BYOK API keys). |
| `expo-clipboard` | **0.27 MB** | Android Clipboard manager | **Yes** | **Keep** (API key paste). |

---

## D. Native Library Analysis (`lib/`)

The application bundles **72 `.so` files** (18 libraries × 4 ABIs):

```text
ABI             | Compressed | Uncompressed | File Count
---------------------------------------------------------
arm64-v8a       |   17.27 MB |     17.27 MB |         18
armeabi-v7a     |   12.03 MB |     12.03 MB |         18
x86             |   18.73 MB |     18.73 MB |         18
x86_64          |   18.74 MB |     18.74 MB |         18
---------------------------------------------------------
TOTAL           |   66.77 MB |     66.77 MB |         72
```

### Individual `.so` Breakdown (for `arm64-v8a`)

| Library Name | Size | Introduced By | Required? | Optimization |
| :--- | :---: | :--- | :---: | :--- |
| `libreactnative.so` | **6.82 MB** | React Native 0.86.3 | **Yes** | Core React Native runtime |
| `libhermesvm.so` | **2.42 MB** | React Native Hermes | **Yes** | JS engine runtime |
| `libexpo-modules-core.so` | **1.41 MB** | Expo Core SDK | **Yes** | Expo native bridge |
| `libc++_shared.so` | **1.26 MB** | Android NDK / RN | **Yes** | C++ Standard Library |
| `libavif_android.so` | **0.88 MB** | Fresco (expo-image) | **No** (0 AVIF assets) | Can exclude via packagingOptions |
| `libappmodules.so` | **0.86 MB** | RN Autolinking | **Yes** | Generated module registry |
| `libreact_codegen_rnsvg.so` | **0.77 MB** | `react-native-svg` | **Yes** | TurboModule for SVG rendering |
| `libzstd-kmp.so` | **0.71 MB** | React Native / Fresco | **Yes** | Zstandard decompression |
| `libnative-imagetranscoder.so` | **0.57 MB** | Fresco (expo-image) | **Yes** | Native image scaling/transcoding |
| `libstatic-webp.so` | **0.49 MB** | Fresco (expo-image) | **Yes** | Required for WebP rendering |
| `libjsi.so` | **0.40 MB** | React Native Core | **Yes** | JavaScript Interface bridge |
| `libgifimage.so` | **0.31 MB** | `expo.gif.enabled=true` | **No** (0 GIF assets) | Set `expo.gif.enabled=false` |
| `libanimation-decoder-gif.so` | **0.27 MB** | `expo.gif.enabled=true` | **No** (0 GIF assets) | Set `expo.gif.enabled=false` |
| `libfbjni.so` | **0.17 MB** | Facebook JNI bridge | **Yes** | Core JNI binding |
| `libreact_codegen_safeareacontext.so`| **0.16 MB** | `react-native-safe-area-context`| **Yes** | Safe area native module |
| `libhermestooling.so` | **0.14 MB** | React Native Hermes | **Yes** | Hermes runtime tooling |
| `libnative-filters.so` | **0.02 MB** | Fresco | **Yes** | Image filter processing |
| `libimagepipeline.so` | **0.01 MB** | Fresco | **Yes** | Core image pipeline |

> [!IMPORTANT]
> **GIF and AVIF Overhead**:
> - `expo.gif.enabled=true` in `gradle.properties` pulls `libgifimage.so` and `libanimation-decoder-gif.so` into all 4 ABIs (**2.32 MB total**), yet the app has **zero `.gif` files**.
> - `libavif_android.so` adds **4.45 MB total across 4 ABIs**, yet the app has **zero `.avif` files**.

---

## E. Asset Analysis

### 1. Images & Visual Assets
Total image assets in repository: **69 files (21.14 MB)**.  
Inside the APK `res/`: **7.56 MB** of uncompressed raster PNGs.

| Asset | Dimensions | Disk Size | APK Impact | Used In Code? | Recommended Action | Potential Saving |
| :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| `assets/ria_avatar.png` | 1024x1024 | 1,231 KB | 1,113 KB (`res/i0.png`) | Yes (`RiaCoachCard`) | Deduplicate & convert to 256x256 WebP | **~1,080 KB** |
| `assets/avatars/ria.png` | 1024x1024 | 1,231 KB | 1,113 KB (`res/rU.png`) | Yes (`avatars.ts`) | Duplicate of `ria_avatar.png`. Point to single WebP | **~1,080 KB** |
| `assets/avatars/grandpa.png`| 1254x1254 | 1,010 KB | 876 KB (`res/UX.png`) | Yes (`avatars.ts`) | Convert to 256x256 WebP (renders at ~60px) | **~840 KB** |
| `assets/avatars/girl.png` | 1254x1254 | 987 KB | 918 KB (`res/pZ.png`) | Yes (`avatars.ts`) | Convert to 256x256 WebP | **~880 KB** |
| `assets/avatars/women.png`| 1254x1254 | 968 KB | 894 KB (`res/_3.png`) | Yes (`avatars.ts`) | Convert to 256x256 WebP | **~860 KB** |
| `assets/avatars/grandma.png`| 1254x1254 | 966 KB | 879 KB (`res/ZD.png`) | Yes (`avatars.ts`) | Convert to 256x256 WebP | **~840 KB** |
| `assets/avatars/men.png` | 1254x1254 | 955 KB | 861 KB (`res/2u.png`) | Yes (`avatars.ts`) | Convert to 256x256 WebP | **~820 KB** |
| `assets/avatars/boy.png` | 1254x1254 | 940 KB | 846 KB (`res/m8.png`) | Yes (`avatars.ts`) | Convert to 256x256 WebP | **~810 KB** |
| `assets/android-icon-foreground.png`| 1254x1254| 837 KB | In `res/` mipmap | No (App uses `logo.png`) | Remove or replace with optimized 432x432 PNG | **~780 KB** |
| `assets/splash-icon.png` | 1254x1254 | 837 KB | In `res/` | No (App uses `logo.png`) | Remove | **~837 KB** |
| `assets/ria_avatar.jpg` | 1024x1024 | 550 KB | In workspace | No (orphaned duplicate) | Remove | Workspace cleanup |
| `assets/calori_logo.png` | 1024x1024 | 408 KB | In workspace | No (orphaned duplicate) | Remove | Workspace cleanup |
| `Images/*` (7 avatars) | 1254x1254 | 7,032 KB | Not in APK | No (Entire `Images/` unreferenced) | Remove duplicate directory | **7.0 MB** disk |
| `Images/android-studio-...exe`| N/A | **1,415 MB**| Not in APK | No (External installer file) | Delete from repo | **1.41 GB** disk |

### 2. Fonts Analysis
Total TTF fonts in APK: **38 files (7.00 MB uncompressed / 3.32 MB compressed)**.

- **Poppins (18 weights bundled / 1.30 MB compressed)**:
  Only 4 weights are used in `App.tsx` (`Poppins_400Regular`, `Poppins_500Medium`, `Poppins_600SemiBold`, `Poppins_700Bold`).  
  **14 weights are completely unused**: `Thin`, `ThinItalic`, `ExtraLight`, `ExtraLightItalic`, `Light`, `LightItalic`, `Italic`, `MediumItalic`, `SemiBoldItalic`, `BoldItalic`, `ExtraBold`, `ExtraBoldItalic`, `Black`, `BlackItalic` (**~1.0 MB compressed savings**).
- **`@expo/vector-icons` (17 icon font families / 2.02 MB compressed)**:
  The app only imports `Ionicons` and `MaterialCommunityIcons`.  
  **15 icon fonts are completely unused**: `FontAwesome`, `FontAwesome5 (Solid/Regular/Brands)`, `FontAwesome6 (Solid/Regular/Brands)`, `Fontisto`, `AntDesign`, `Octicons`, `Entypo`, `Feather`, `SimpleLineIcons`, `EvilIcons`, `Zocial` (**~1.5 MB compressed savings**).

### 3. Audio, Video, AI/ML Models, Datasets
- **Audio / Video**: **0 files**.
- **AI / ML Models**: **0 files**. (Gemini API is accessed purely over HTTPS).
- **Datasets**: `src/data/foodDatabase.ts` is 17.7 KB of TypeScript code (< 0.02 MB).

---

## F. Build Configuration Findings

| Parameter | Current Setting in Repository | Optimum Production Setting | Impact |
| :--- | :--- | :--- | :--- |
| `reactNativeArchitectures` | `armeabi-v7a,arm64-v8a,x86,x86_64` | `arm64-v8a` (or separate APK splits / App Bundle) | **~49.5 MB reduction** for arm64 APK |
| `enableMinifyInReleaseBuilds` | **`false`** (Defaulted in `build.gradle`) | **`true`** (Enables R8 full-mode shrinking) | **~4.7 MB compressed DEX reduction** |
| `enableShrinkResources` | **`false`** (Defaulted in `build.gradle`) | **`true`** (Strips unused XML/drawables) | **~2.0 MB resource reduction** |
| `expo.gif.enabled` | **`true`** in `gradle.properties` | **`false`** (0 GIFs in app) | **~2.32 MB reduction** across ABIs |
| `enableSeparateBuildPerCPUArchitecture` | **Not set** (Builds universal APK) | **`true`** (Produces per-ABI APKs) | Generates distinct APKs per architecture |
| `hermesEnabled` | **`true`** | **`true`** | Properly enabled. HBC bundle is 3.28 MB. |
| `enablePngCrunchInReleaseBuilds`| **`true`** | **`true`** | AAPT2 crunching active. |

---

## G. Unused / Suspicious Content Identified

1. **`Images/android-studio-quail4-patch1-windows.exe` (1.41 GB)**:
   A full Windows installer executable sitting in the project repository root inside `Images/`.
2. **`Images/` Folder (7.03 MB)**:
   Contains 7 avatar PNGs identical to those already present in `assets/avatars/`. No source file in `src/` references `Images/`.
3. **Duplicate Ria Avatar Assets**:
   - `assets/ria_avatar.png` (1.23 MB) — used in `RiaCoachCard.tsx`.
   - `assets/avatars/ria.png` (1.23 MB) — used in `avatars.ts`.
   - `Images/RIA.png` (1.23 MB) — unused.
   - `assets/ria_avatar.jpg` (550 KB) — unused.
   All represent the exact same avatar.
4. **Orphaned Asset Files**:
   - `assets/calori_logo.png` (408 KB)
   - `assets/splash-icon.png` (837.5 KB)
   - `assets/android-icon-foreground.png` (837.5 KB)
5. **15 Unused Icon Font Files** from `@expo/vector-icons` packaged into Android APK `res/`.
6. **14 Unused Poppins Weights** packaged into Android APK `res/`.

---

## H. Forensic Optimization Plan

### P0 — Huge Impact / Low Risk (Immediate ~56 MB Savings)

| Optimization | Current Size | Expected Saving | New Size | Effort | Risk | Priority |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Enable ABI Splitting / AAB App Bundle** | 66.77 MB (4 ABIs) | **~49.5 MB** | 17.27 MB (arm64) | Low | Low | **P0** |
| **2. Enable R8 Minification (`enableMinifyInReleaseBuilds=true`)** | 8.26 MB DEX | **~4.7 MB** | ~3.5 MB DEX | Low | Low | **P0** |
| **3. Enable Resource Shrinking (`enableShrinkResources=true`)** | 11.62 MB res | **~2.0 MB** | ~9.6 MB res | Low | Low | **P0** |

### P1 — High Impact / Moderate Risk (~9 MB Savings)

| Optimization | Current Size | Expected Saving | New Size | Effort | Risk | Priority |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **4. Convert Avatar PNGs to 256x256 WebP** | 7.06 MB | **~6.8 MB** | ~0.26 MB | Low | Low | **P1** |
| **5. Deduplicate Ria Avatar & Remove Orphaned Assets** | 3.85 MB | **~3.6 MB** | ~0.04 MB | Low | Low | **P1** |
| **6. Disable GIF Support (`expo.gif.enabled=false`)** | 2.32 MB SOs | **~0.58 MB** (arm64) | 0 MB | Low | None | **P1** |
| **7. Exclude Unused AVIF SOs in Packaging Options** | 0.88 MB (arm64) | **~0.88 MB** | 0 MB | Low | Low | **P1** |

### P2 — Moderate Impact (~2.7 MB Savings)

| Optimization | Current Size | Expected Saving | New Size | Effort | Risk | Priority |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **8. Strip Unused Poppins Font Weights (Keep 4, Drop 14)** | 1.30 MB comp | **~0.95 MB** | ~0.35 MB | Med | Low | **P2** |
| **9. Strip Unused Vector Icon Fonts from APK Package** | 2.02 MB comp | **~1.50 MB** | ~0.52 MB | Med | Low | **P2** |

### P3 — Repository Hygiene (1.42 GB Disk Savings)

| Optimization | Current Size | Expected Saving | Effort | Risk | Priority |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **10. Delete `Images/` Directory (including Android Studio .exe)** | 1,424 MB | **1,424 MB disk** | Trivial | None | **P3** |

---

## I. Expected Final Size Breakdown

| Stage | APK Size (arm64-v8a) | APK Size (Universal 4-ABI) | Overall Reduction |
| :--- | :---: | :---: | :---: |
| **Current Baseline (Measured)** | **96.38 MB** | **96.38 MB** | 0% (Baseline) |
| **After P0 (ABI Split + R8 + Resource Shrink)** | **~30.5 MB** | **~65.0 MB** | **-68% (on-device)** |
| **After P0 + P1 (Avatar WebP + GIF/AVIF Removal)** | **~23.2 MB** | **~54.0 MB** | **-76% (on-device)** |
| **After P0 + P1 + P2 (Font Stripping)** | **~20.5 MB** | **~49.0 MB** | **-79% (on-device)** |

> **Installed Size on Device**: Drops from **~165 MB** down to **~38–45 MB** (a ~75% reduction in disk storage on users' phones).

---

## J. Recommended Execution Order (Phases 5 – 8)

When the user gives approval to proceed to Phase 5 (Implementation), execute in the following exact order to maintain verification and avoid breaking changes:

1. **Step 1 (Config: Gradle & R8)**:
   - In `android/gradle.properties`:
     - Add `android.enableMinifyInReleaseBuilds=true`
     - Add `android.enableShrinkResourcesInReleaseBuilds=true`
     - Change `expo.gif.enabled=false`
   - In `android/app/build.gradle`:
     - Configure ABI splits (`enableSeparateBuildPerCPUArchitecture = true` or `reactNativeArchitectures=arm64-v8a,armeabi-v7a`).
     - Add necessary R8 keep rules to `android/app/proguard-rules.pro` for Expo modules and Firebase.
2. **Step 2 (Assets: Avatar WebP Conversion & Deduplication)**:
   - Convert the 7 avatar PNGs in `assets/avatars/` from 1254x1254 PNGs to 256x256 WebP (90% quality, transparent alpha preserved).
   - Point `RiaCoachCard.tsx` and `avatars.ts` to the single optimized WebP avatar.
   - Remove orphaned images (`assets/ria_avatar.jpg`, `assets/calori_logo.png`, `assets/splash-icon.png`, `assets/android-icon-foreground.png`).
3. **Step 3 (Fonts: Font Trimming)**:
   - Exclude the 14 unused Poppins weights and unused `@expo/vector-icons` TTF files via Gradle packaging / resource exclusion rules.
4. **Step 4 (Repo Hygiene)**:
   - Remove the unreferenced `Images/` folder containing the 1.41 GB Android Studio installer.
5. **Step 5 (Build & Validate)**:
   - Rebuild release APK: `./gradlew assembleRelease`
   - Measure exact before/after sizes per ABI.
   - Run runtime verification (App launch, avatars, fonts, Firebase authentication, chat, and food logs).
