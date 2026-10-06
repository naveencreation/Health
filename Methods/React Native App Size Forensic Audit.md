# React Native App Size — Complete Forensic Audit & Optimization

I have a React Native application whose current app size is **over 100 MB**. I want to reduce the final production app size as much as realistically possible without breaking functionality, visual quality, performance, or reliability.

Do **not** give me generic optimization suggestions.

Perform a **complete forensic analysis of the entire codebase and Android build configuration** to determine exactly why the application is this large.

Your job is to inspect the project systematically and identify **every realistic source of application-size bloat**, quantify it where possible, and then recommend optimizations based on actual evidence from this repository.

---

# 1. FIRST: Establish What "100+ MB" Actually Means

Before changing anything, determine:

* Is the reported size:

  * Debug APK?
  * Release APK?
  * Universal APK?
  * Split APK?
  * Android App Bundle (.aab)?
  * Installed size?
  * Download size?
  * APK file size?
  * Play Store size?
* Determine the actual production artifact size.
* Build the application in the appropriate release configuration if necessary.
* Compare:

  * Debug APK
  * Release APK
  * AAB
  * ABI-specific APKs if applicable
* Determine whether the 100+ MB number is caused by development/debug artifacts rather than the actual production distribution.

Do not optimize based on an incorrect measurement.

Create a baseline report such as:

```text
Artifact                  Size
--------------------------------
Debug APK                 XX MB
Release APK               XX MB
Universal APK             XX MB
AAB                       XX MB
arm64-v8a APK             XX MB
armeabi-v7a APK           XX MB
x86_64 APK                XX MB
```

If some artifacts cannot be generated, explain why.

---

# 2. CREATE A COMPLETE SIZE BREAKDOWN

Analyze the generated release artifact and determine where the bytes are going.

Break the application down into categories such as:

```text
JavaScript bundle
Hermes bytecode
Images
Fonts
Native .so libraries
Android resources
React Native runtime
Third-party native SDKs
ML/AI models
Videos/audio
JSON/static data
Certificates/configuration
Duplicate files
Unused assets
Other
```

For every major category, identify:

* file
* location
* size
* percentage of total size
* whether it is actually required
* whether it can be reduced
* recommended action

Produce a ranked table:

```text
Rank | Component | Size | % | Why present | Can reduce? | Expected saving
```

Do not guess sizes when they can be measured.

---

# 3. ANALYZE JAVASCRIPT / TYPESCRIPT BUNDLE

Inspect the production JavaScript bundle.

Determine:

* bundle size before compression
* bundle size after compression
* Hermes bytecode size if Hermes is enabled
* whether Hermes is actually enabled in release
* duplicate dependencies
* large libraries
* unused imports
* unnecessary packages
* packages imported globally when they could be lazy-loaded
* libraries that have significantly smaller alternatives
* development-only packages accidentally included in production
* duplicated versions of the same package
* CommonJS packages preventing effective tree shaking
* packages importing entire libraries instead of individual modules

Look for patterns such as:

```ts
import _ from "lodash";
```

versus:

```ts
import debounce from "lodash/debounce";
```

Also inspect:

* package.json
* lockfile
* Metro configuration
* Babel configuration
* TypeScript configuration
* bundler configuration
* Expo configuration if applicable

Determine whether tree shaking/minification is working correctly.

---

# 4. DEPENDENCY FORENSICS

Analyze the entire dependency tree.

Do not only inspect direct dependencies.

Find:

* largest dependencies
* transitive dependencies
* duplicate package versions
* duplicate native libraries
* dependencies used by only one feature
* dependencies that are no longer used
* dependencies imported only for convenience
* libraries that have much smaller alternatives
* dependencies that include unnecessary platform code
* packages that bundle assets/models/fonts/icons internally

For each dependency, classify:

```text
Dependency
Purpose
Direct/Transitive
JS Size
Native Size
Assets
Actually Used?
Can Remove?
Can Replace?
Potential Saving
Risk
```

Pay particular attention to:

* UI libraries
* icon libraries
* animation libraries
* navigation
* networking
* date/time libraries
* utility libraries
* image libraries
* analytics
* crash reporting
* Firebase
* authentication SDKs
* maps
* document/PDF libraries
* video/audio libraries
* AI/ML SDKs
* camera libraries
* file-system libraries
* database libraries

Do not remove anything automatically.

First identify its usage across the codebase.

---

# 5. NATIVE ANDROID LIBRARY ANALYSIS

This is extremely important.

Inspect the generated APK/AAB and analyze:

```text
lib/
```

including:

```text
arm64-v8a/
armeabi-v7a/
x86/
x86_64/
```

Determine:

* which `.so` files exist
* their individual sizes
* which dependency introduced each library
* whether multiple ABIs are being packaged unnecessarily
* whether native libraries are duplicated
* whether unused native binaries can be excluded
* whether ABI splits are configured correctly

Create:

```text
Native Library
Size
ABI
Introduced By
Required?
Optimization
Potential Saving
```

Also investigate:

* NDK libraries
* C/C++ dependencies
* JSI libraries
* Hermes
* React Native native modules
* image processing libraries
* database engines
* crypto libraries
* ML libraries

---

# 6. ABI / APK SPLITTING ANALYSIS

Determine whether the application is shipping all CPU architectures inside one APK.

Check whether it contains:

```text
arm64-v8a
armeabi-v7a
x86
x86_64
```

If unnecessary architectures are included, determine whether:

* ABI splits can be enabled
* Play Store App Bundle delivery can provide device-specific binaries
* unnecessary architectures can be removed safely

Explain the difference between:

```text
Universal APK size
Device download size
Installed size
Play Store delivered size
```

Do not assume the user needs every ABI.

---

# 7. HERMES ANALYSIS

Determine:

* Is Hermes enabled?
* Is Hermes being used in release?
* Is Hermes bytecode generated?
* Is Hermes actually reducing the final distribution size?
* Is any configuration causing unnecessary duplication?
* Are source maps accidentally included in the final artifact?

Check React Native's current configuration rather than assuming.

---

# 8. IMAGE AND ASSET FORENSICS

Scan the entire repository for:

```text
.png
.jpg
.jpeg
.webp
.avif
.gif
.svg
.bmp
.heic
.webp
```

and other media formats.

Calculate:

* total number of assets
* total asset size
* largest assets
* duplicate images
* visually identical images
* unused images
* oversized images
* images with unnecessarily high resolution
* images using inefficient formats

Create a report:

```text
Asset
Dimensions
Format
Size
Used?
Recommended Format
Recommended Dimensions
Potential Saving
```

Investigate whether assets can be converted to:

* WebP
* AVIF where appropriate
* optimized JPEG
* optimized PNG

Do NOT blindly convert every image.

Preserve transparency where required.

Also check:

* splash screens
* app icons
* onboarding images
* food images
* profile images
* background images
* illustrations
* bundled thumbnails
* cached/static images

---

# 9. FONT ANALYSIS

Find every font in the project.

Inspect:

```text
.ttf
.otf
.woff
.woff2
```

Determine:

* font file size
* font family
* number of weights
* number of styles
* whether all weights are actually used
* whether full Unicode fonts are being bundled unnecessarily

For example, investigate whether the app really needs:

```text
Regular
Medium
SemiBold
Bold
ExtraBold
Black
Italic
```

or whether some can be removed.

Check for:

* duplicate fonts
* unused fonts
* icon fonts
* huge Unicode fonts

---

# 10. ICON ANALYSIS

Inspect:

* icon libraries
* bundled icon fonts
* SVG packs
* PNG icon collections
* local icon assets

Determine whether the application is importing entire icon sets when only a few icons are used.

Look for cases where something like:

```text
Entire icon font/package
```

is included when the application only needs a small subset.

Determine whether tree-shaking or individual SVG/icon imports are possible.

---

# 11. VIDEO / AUDIO ANALYSIS

Search the entire repository for:

```text
.mp4
.mov
.webm
.mp3
.wav
.m4a
.aac
```

Measure their sizes.

Determine whether each media file actually needs to be bundled into the application.

For large media:

Consider whether it should instead be:

```text
remote CDN
S3
CloudFront
streamed/downloaded on demand
```

Do not move assets remotely if they are required for offline-first functionality without considering that requirement.

---

# 12. JSON / STATIC DATA ANALYSIS

Search for:

```text
.json
.csv
.txt
.xml
```

and other bundled datasets.

Identify:

* large datasets
* static food databases
* localization files
* configuration files
* seed data
* API response mocks
* unnecessary development data

Determine whether these can be:

* downloaded on demand
* compressed
* split
* stored remotely
* generated dynamically
* removed from production

---

# 13. AI / ML MODEL ANALYSIS

This is particularly important if the app has AI/ML functionality.

Search for:

```text
.tflite
.onnx
.pt
.pth
.bin
.gguf
.safetensors
.mlmodel
```

and other model formats.

Determine whether any AI model is bundled inside the application.

If so:

* model size
* model purpose
* quantization
* whether the model is actually required offline
* whether it can be downloaded after installation
* whether a smaller model can be used
* whether inference can move to a backend
* whether the model can be split or lazy-downloaded

Do not remove models without checking functionality.

---

# 14. FIREBASE ANALYSIS

If Firebase is present, inspect exactly which Firebase modules are installed.

For example:

* Analytics
* Auth
* Firestore
* Realtime Database
* Storage
* Messaging
* Crashlytics
* Remote Config
* App Check
* Performance

Determine whether unused Firebase modules are installed.

Do not assume Firebase itself is the problem.

Measure the actual native contribution of each relevant dependency where possible.

---

# 15. GOOGLE / ANDROID SDK ANALYSIS

Inspect dependencies related to:

* Google Play Services
* Google Maps
* Location
* Places
* ML Kit
* Camera
* Billing
* Sign-In

Determine whether full SDKs are being included when only smaller modules are required.

---

# 16. DEBUG / DEVELOPMENT ARTIFACT CONTAMINATION

Search for accidentally bundled:

* source maps
* test files
* mock data
* development JSON
* `.map`
* debug assets
* screenshots
* documentation
* README files
* test fixtures
* Storybook
* development-only dependencies
* console/debug tooling
* development certificates
* profiling/debug libraries

Check whether:

```text
__DEV__
development
debug
test
storybook
mock
```

related code/assets are reaching the release bundle.

---

# 17. PROGUARD / R8 / MINIFICATION

Inspect Android release configuration.

Determine:

* Is R8 enabled?
* Is minification enabled?
* Is resource shrinking enabled?
* Is code shrinking enabled?
* Is obfuscation enabled?
* Are release builds actually using these settings?
* Are keep rules excessively broad?

Check:

```gradle
minifyEnabled
shrinkResources
proguardFiles
```

Do not simply enable aggressive shrinking.

First determine whether libraries require keep rules.

Identify:

* unnecessarily preserved classes
* broad keep rules
* libraries preventing shrinking
* resources that remain because of overly broad references

Explain the trade-offs and test requirements.

---

# 18. ANDROID RESOURCE ANALYSIS

Inspect:

```text
res/
assets/
drawable/
mipmap/
values/
xml/
raw/
```

Find:

* unused resources
* duplicate resources
* oversized drawables
* unnecessary densities
* multiple copies of assets
* obsolete splash assets
* old icons
* unused XML resources
* unnecessary localized resources

Check whether resource shrinking is removing unused resources correctly.

---

# 19. LOCALIZATION ANALYSIS

If the app supports multiple languages:

Determine:

* number of locales
* size of localization files
* whether every locale is required
* whether Android resources contain unnecessary translations

Do not remove languages without verifying product requirements.

---

# 20. METRO / BUNDLER CONFIGURATION

Inspect Metro configuration carefully.

Check:

* resolver configuration
* asset extensions
* source extensions
* transformer configuration
* minification
* tree shaking
* module resolution
* duplicate module resolution
* aliases
* monorepo dependencies

Look for configuration that causes unnecessary files to enter the bundle.

---

# 21. BABEL ANALYSIS

Inspect Babel configuration.

Determine whether:

* unnecessary plugins are enabled
* development plugins run in production
* transformations prevent optimization
* duplicate transformations exist
* React Native recommended configuration is being overridden incorrectly

---

# 22. SOURCE MAP ANALYSIS

Determine whether source maps are:

* generated
* packaged
* uploaded externally
* accidentally included in the distributable

Source maps can be large.

If they are needed for crash debugging, determine whether they can be uploaded to the relevant service rather than packaged into the APK.

---

# 23. NATIVE MODULE USAGE ANALYSIS

Create a list of every React Native native module.

For each:

```text
Module
Purpose
JS Usage
Native Dependency Size
Required?
Alternative
Potential Saving
```

Look specifically for modules that are:

* installed but unused
* used only in one optional screen
* pulling in large native dependencies
* replaceable with platform APIs
* replaceable with lightweight libraries

---

# 24. OPTIONAL FEATURES / FEATURE BUNDLING

Analyze whether large features are bundled into the initial application unnecessarily.

Examples:

```text
PDF viewer
video processing
AI models
advanced analytics
large food database
offline database
OCR
image editor
maps
charts
```

Determine whether these can be:

* lazy loaded
* downloaded on demand
* server-side processed
* feature modules
* dynamically delivered

For React Native specifically, explain what is realistically possible and what is NOT.

Do not recommend web-style code splitting blindly if the React Native architecture does not support the proposed approach.

---

# 25. DATABASE ANALYSIS

If the app bundles:

* SQLite databases
* Realm databases
* WatermelonDB data
* seed databases
* food databases
* offline datasets

measure their size.

Determine whether:

* the full database is required
* it can be downloaded after installation
* it can be compressed
* only a subset can be bundled
* unused tables/data can be removed

---

# 26. THIRD-PARTY SDK FORENSICS

Inspect every major third-party SDK.

Especially:

* analytics
* ads
* authentication
* payments
* maps
* social login
* notifications
* media
* camera
* document scanning
* AI
* OCR
* databases
* monitoring
* crash reporting

For each SDK determine its approximate contribution and whether a lighter implementation exists.

Do not recommend replacing libraries purely because they are large. Consider functionality and engineering cost.

---

# 27. DUPLICATE DEPENDENCY ANALYSIS

Inspect the dependency graph for situations like:

```text
package A → library X v1
package B → library X v2
package C → library X v1
```

Identify:

* duplicate JS packages
* duplicate native libraries
* multiple versions
* duplicate fonts
* duplicate assets
* duplicate resources

Recommend safe deduplication where possible.

---

# 28. BUILD CONFIGURATION ANALYSIS

Inspect all relevant files including, where applicable:

```text
package.json
yarn.lock / package-lock.json / pnpm-lock.yaml
android/build.gradle
android/app/build.gradle
gradle.properties
settings.gradle
gradle/libs.versions.toml
proguard-rules.pro
metro.config.js
babel.config.js
react-native.config.js
app.json
app.config.js
eas.json
```

Also inspect:

```text
gradle.properties
AndroidManifest.xml
```

and any native module configuration.

Do not modify anything before completing the audit.

---

# 29. GENERATE A "SIZE BUDGET"

After analysis, create a target size budget.

For example:

```text
Category                  Current      Target
------------------------------------------------
JS/Hermes                 XX MB        XX MB
Native libraries          XX MB        XX MB
Images                    XX MB        XX MB
Fonts                     XX MB        XX MB
Models                    XX MB        XX MB
Resources                 XX MB        XX MB
Other                     XX MB        XX MB
------------------------------------------------
Total                     XX MB        XX MB
```

Base the target on what is realistically achievable from this codebase.

Do NOT invent target numbers before measuring.

---

# 30. PRIORITIZE OPTIMIZATIONS

After completing the audit, divide recommendations into:

## P0 — Huge impact / low risk

Examples:

* removing unused dependencies
* removing duplicate assets
* enabling proper release shrinking
* removing unnecessary ABIs
* fixing accidental debug artifacts

## P1 — High impact / moderate risk

Examples:

* replacing large dependencies
* optimizing large image sets
* removing unnecessary native SDKs
* restructuring bundled datasets

## P2 — Moderate impact

Examples:

* font optimization
* icon optimization
* JSON optimization
* resource cleanup

## P3 — Small optimization

Do not waste engineering time on tiny optimizations while a 20–50 MB dependency or model is sitting in the app.

---

# 31. CALCULATE EXPECTED SAVINGS

For every recommendation provide:

```text
Optimization
Current Size
Expected Saving
New Estimated Size
Implementation Difficulty
Risk
User Impact
Priority
```

Example:

```text
Remove unused ML SDK
Current: 28 MB
Expected saving: 22 MB
Risk: Medium
Effort: Low
Priority: P0
```

Only provide numbers that are measured or clearly marked as estimates.

---

# 32. BEFORE/AFTER VALIDATION

After applying optimizations, rebuild the production application.

Compare:

```text
Before
After
Absolute reduction
Percentage reduction
```

Also verify:

* application launches
* navigation works
* authentication works
* API calls work
* images work
* fonts work
* notifications work
* Firebase works
* deep links work
* native modules work
* release build works
* no runtime crashes
* no missing assets
* no missing resources

Do not consider the optimization successful simply because the APK became smaller.

---

# 33. IMPORTANT: DO NOT MAKE BLIND CHANGES

Follow this process:

### Phase 1 — Audit

Only inspect and measure.

### Phase 2 — Report

Show me the complete findings.

### Phase 3 — Prioritize

Identify the highest-impact changes.

### Phase 4 — Ask for approval

Do not make destructive dependency removals or architecture changes automatically.

### Phase 5 — Implement

Apply approved optimizations one group at a time.

### Phase 6 — Rebuild

Generate the release artifact.

### Phase 7 — Measure

Compare exact before/after sizes.

### Phase 8 — Regression test

Verify functionality.

---

# FINAL DELIVERABLE

At the end of the audit, give me a report containing:

## A. Current Size

```text
Production artifact:
Size:
Device download size:
Installed size:
```

## B. Top 20 Size Contributors

Rank them by actual size.

## C. Complete Dependency Size Analysis

Show the largest dependencies and their impact.

## D. Native Library Analysis

Show `.so` files and ABI contribution.

## E. Asset Analysis

Show the largest images, fonts, videos, datasets, and models.

## F. Build Configuration Findings

Show every relevant release/build optimization opportunity.

## G. Unused / Suspicious Content

Identify files, dependencies, resources, and modules that appear unnecessary.

## H. Optimization Plan

Rank every optimization by:

```text
Impact
Risk
Effort
Expected Saving
Priority
```

## I. Expected Final Size

Provide:

```text
Current:
Expected after P0:
Expected after P0 + P1:
Potential optimized range:
```

Clearly distinguish measured values from estimates.

## J. Recommended Execution Order

Give me the exact sequence in which I should make the changes.

---

# CRITICAL RULE

Do not stop after checking `package.json`.

I want a **full application-size forensic audit**, including:

**JavaScript → Metro → dependencies → native modules → Android → Gradle → R8 → resources → ABI → images → fonts → icons → video/audio → JSON → databases → AI/ML models → Firebase → Google SDKs → source maps → debug artifacts → build configuration → final APK/AAB contents.**

The goal is not merely to make the code "cleaner."

The goal is to answer:

> **"Exactly what is making this application over 100 MB, how many MB does each component contribute, and what is the safest way to remove/reduce those bytes?"**

Do not give generic advice until you have inspected the actual project.
