I want you to perform a **complete smoothness, animation, interaction, navigation, rendering, and performance audit** of this React Native application.

The objective is to make the application feel **fast, fluid, responsive, intentional, and native-quality**.

Do NOT simply add animations everywhere.

First inspect the entire application and determine **where the experience currently feels slow, abrupt, inconsistent, janky, or unnatural**, why that happens, and how it should be improved.

## CRITICAL INSTRUCTION

**Do not immediately modify the code.**

First perform a complete audit and produce a detailed improvement plan.

After I review the plan, we will implement the improvements systematically.

---

# 1. Establish the performance baseline

First inspect the application architecture.

Identify:

* React Native version
* Expo or bare React Native
* Navigation library
* Animation library
* Gesture library
* State-management library
* Data-fetching library
* Storage mechanisms
* List components
* Image libraries
* Native modules
* Backend/API architecture
* Current performance optimizations
* Existing animations
* Existing transitions

Determine whether the application is primarily:

* JS-thread bound
* UI-thread bound
* Rendering bound
* Network bound
* Storage bound
* Memory bound
* Image/rendering bound

Do not guess. Inspect the implementation.

---

# 2. Define what “smooth” means

Create a concrete performance standard.

Evaluate:

* Frame consistency
* Perceived responsiveness
* Touch response
* Navigation transition smoothness
* Animation smoothness
* Scroll smoothness
* Gesture responsiveness
* Screen rendering time
* API response handling
* Loading transitions
* Keyboard interactions
* Modal transitions

The goal is not merely:

> “It works.”

The goal is:

> “Every interaction feels immediate and predictable.”

Identify measurable performance targets where appropriate.

---

# 3. Audit every screen transition

Inspect **every navigation path in the application**.

For each transition determine:

* Where the user comes from
* Where the user goes
* Navigation type
* Push/pop behavior
* Stack behavior
* Tab behavior
* Modal behavior
* Presentation style
* Transition animation
* Transition duration
* Gesture behavior
* Back gesture behavior
* Header animation
* Screen lifecycle
* Data loading during transition

Check whether the transition visually makes sense.

For example:

```text
Screen A
   ↓
User taps button
   ↓
Button feedback
   ↓
Navigation begins
   ↓
Screen transition
   ↓
Screen mounts
   ↓
Data loads
   ↓
Content appears
```

Analyze every stage.

---

# 4. Navigation consistency

Make sure navigation does not feel random.

Audit:

* Forward navigation
* Back navigation
* Android hardware back
* iOS swipe-back
* Header back button
* Modal dismissal
* Tab switching
* Nested navigation
* Deep linking
* Authentication redirects
* Logout navigation
* Login navigation
* Onboarding navigation

Check whether the transition direction communicates the user's movement correctly.

Do not use arbitrary animation styles for different screens.

Create a coherent navigation motion system.

---

# 5. Button interaction audit

Inspect **every interactive button**.

For every button check:

### Before press

* Is it obviously tappable?
* Is the touch target large enough?
* Does it have the correct visual hierarchy?

### During press

* Is there immediate visual feedback?
* Does it respond instantly?
* Is there a pressed state?
* Is the feedback too subtle?
* Is it too dramatic?

### After press

* Does the correct action happen?
* Is there duplicate-trigger protection?
* Is the button disabled during operations where appropriate?
* Does loading feedback appear?
* Does the UI transition naturally?

Check for:

* Double taps
* Rapid taps
* Accidental multiple navigation
* Multiple API calls
* Button state races

---

# 6. Press animation system

Determine whether buttons should use:

* Scale
* Opacity
* Color transition
* Elevation/shadow change
* Haptic feedback
* Ripple
* Combination

Do not apply one animation blindly to every button.

Define appropriate interaction patterns for:

* Primary buttons
* Secondary buttons
* Icon buttons
* Floating buttons
* List items
* Cards
* Toggles
* Chips
* Navigation tabs

Create a consistent interaction language.

---

# 7. Touch responsiveness

Audit the entire application for touch latency.

Look for situations where:

```text
User taps
   ↓
nothing appears to happen
   ↓
action eventually occurs
```

The user should receive immediate feedback.

Identify causes such as:

* Heavy synchronous JavaScript
* Expensive state updates
* Large component re-renders
* Navigation work
* Network calls before UI feedback
* Expensive calculations
* Image loading
* Blocking operations

Separate:

**Immediate UI feedback**

from:

**Expensive work**

whenever possible.

---

# 8. JS thread analysis

Audit the JavaScript thread.

Look for:

* Large computations
* Expensive loops
* JSON parsing
* Large object transformations
* Excessive state updates
* Large renders
* Synchronous storage operations
* Unnecessary re-renders
* Heavy event handlers
* Expensive navigation callbacks
* Frequent timers
* Excessive logging
* Large context providers

Identify anything that can block interaction.

---

# 9. UI thread / animation analysis

Animations should not depend unnecessarily on expensive JavaScript execution.

Determine whether existing animations run on:

* JS thread
* UI/native thread

Prefer appropriate native/UI-thread-driven animation mechanisms where possible.

Inspect:

* Animated API
* Reanimated
* Gesture Handler
* Layout animations
* Shared values
* Worklets

Identify animations that could stutter because JavaScript is busy.

---

# 10. Animation architecture

Create a consistent motion system.

Define:

### Duration

Examples:

* Micro interaction
* Button press
* Small state transition
* Screen transition
* Modal transition

### Easing

Determine appropriate easing for:

* Enter
* Exit
* Press
* Expand
* Collapse
* Movement

### Spring behavior

Determine where spring physics are appropriate.

Use spring-like motion for things that should feel physical.

Use timing-based transitions for things that should feel controlled.

Do not animate everything.

---

# 11. Animation principles

Audit whether animations follow:

### Continuity

The user should understand where an element came from and where it went.

### Hierarchy

Important elements should receive stronger motion than secondary elements.

### Responsiveness

Interaction feedback should begin immediately.

### Predictability

Similar interactions should behave similarly.

### Restraint

Animation should communicate something, not exist purely as decoration.

### Consistency

Similar components should use similar motion.

---

# 12. Screen entrance animations

For every screen determine whether it needs:

* Fade
* Slide
* Scale
* Shared-element transition
* Staggered content
* No animation

Do not automatically animate every screen.

A screen that contains simple content may need only the navigation transition.

A complex dashboard may benefit from subtle content entrance.

Analyze each screen individually.

---

# 13. Screen exit animations

Check whether content disappears naturally.

Avoid:

* Abrupt removal
* Flashing
* White/blank frames
* Double animations
* Content jumping before navigation

Ensure exit transitions do not delay navigation unnecessarily.

---

# 14. Shared-element transitions

Identify screens where an element appears in both the previous and next screen.

Potential examples:

* Profile avatar
* Food image
* Product image
* Selected card
* User statistics
* Content preview

Determine whether a shared-element transition would improve continuity.

Do not add shared-element transitions merely because they are technically possible.

---

# 15. Layout animations

Inspect dynamic UI changes such as:

* Expanding cards
* Collapsing sections
* Showing validation errors
* Changing selected values
* Adding/removing list items
* Showing loading states
* Empty → populated states
* Form validation
* Unit switching
* Progress updates

Check whether these changes:

* Jump
* Resize abruptly
* Shift neighboring content
* Cause layout flicker

Use appropriate layout transitions where they improve comprehension.

---

# 16. Loading states

Audit every async operation.

Do not allow:

```text
Tap
↓
Blank screen
↓
Wait
↓
Content suddenly appears
```

Instead determine whether the experience needs:

* Skeleton
* Spinner
* Progress indicator
* Inline loading
* Button loading state
* Placeholder
* Optimistic UI
* Cached content

Choose based on the operation.

---

# 17. Skeleton loading

Inspect screens that load data.

Determine where skeleton loading would be more appropriate than a spinner.

Check:

* Skeleton dimensions
* Content matching
* Animation smoothness
* Shimmer performance
* Reduced-motion behavior
* Transition from skeleton → actual content

Avoid skeletons that themselves cause performance problems.

---

# 18. Data loading and navigation

Analyze what happens when navigating to a screen that requires API data.

Compare:

### Bad

```text
Navigate
↓
Wait
↓
Fetch
↓
Render
```

with appropriate alternatives such as:

```text
Prefetch
↓
Navigate
↓
Render cached data
↓
Refresh
```

or:

```text
Navigate
↓
Immediate shell
↓
Progressive content
```

Determine what makes sense for each screen.

---

# 19. Lists and scrolling

Audit every:

* FlatList
* SectionList
* FlashList
* ScrollView
* VirtualizedList

Check:

* Number of rendered items
* Item complexity
* `keyExtractor`
* `renderItem`
* `extraData`
* Memoization
* Stable references
* Image loading
* Item height
* Layout measurement
* `getItemLayout` where appropriate
* Viewability callbacks
* Pagination
* Infinite scrolling
* Pull-to-refresh

Identify unnecessary `ScrollView` usage for large datasets.

---

# 20. List item animations

Check whether list items animate when:

* Entering
* Leaving
* Updating
* Being selected
* Being deleted

Prevent animations from causing:

* Dropped frames
* Layout thrashing
* Excessive re-renders

Use virtualization appropriately.

---

# 21. Image performance

Audit every image.

Check:

* Image size
* Resolution
* Compression
* Format
* Remote/local loading
* Caching
* Placeholder
* Lazy loading
* Preloading
* Resize strategy
* Memory usage

Prevent large images from unnecessarily consuming memory.

Analyze whether image transitions need:

* Fade-in
* Placeholder transition
* Blur-up
* Crossfade

---

# 22. State management and re-render audit

Identify components that re-render unnecessarily.

Look for:

* Large global state subscriptions
* Context causing entire trees to re-render
* Inline objects
* Inline callbacks
* Unstable props
* Missing memoization
* Incorrect dependency arrays
* Derived state recalculation
* State updates inside loops
* Parent updates causing unnecessary child renders

Determine where optimization actually matters.

Do not add `memo`, `useMemo`, or `useCallback` everywhere without evidence.

---

# 23. Component architecture

Identify components that are:

* Too large
* Doing too many things
* Rendering expensive UI unnecessarily
* Holding unnecessary state
* Causing cascading renders

Recommend splitting components where it improves:

* Rendering performance
* Maintainability
* Animation control
* State isolation

Do not split components purely for the sake of smaller files.

---

# 24. Gesture performance

Audit:

* Swipes
* Drags
* Bottom sheets
* Pickers
* Sliders
* Carousels
* Swipe-to-delete
* Pull-to-refresh
* Interactive cards

Check:

* Gesture recognition
* Gesture conflicts
* Scroll conflicts
* JS-thread dependency
* Cancellation
* Velocity handling
* Snap points
* Resistance
* Overscroll
* Haptic feedback

Gestures should feel directly connected to the user's finger.

---

# 25. Keyboard experience

Audit every form.

Check:

* Keyboard opening
* Keyboard dismissal
* Input focus
* Screen movement
* Keyboard avoiding behavior
* Submit behavior
* Next-field navigation
* Scroll-to-input
* Button visibility
* Keyboard animation synchronization

Avoid screens where the keyboard causes sudden layout jumps.

---

# 26. Modal and bottom-sheet experience

Audit:

* Modal entrance
* Modal exit
* Backdrop animation
* Bottom-sheet movement
* Drag-to-dismiss
* Snap points
* Keyboard interaction
* Background interaction
* Gesture conflicts
* Accessibility

The modal should feel physically connected to the user's gesture.

---

# 27. Tab navigation

Check:

* Tab switching
* Active indicator
* Icon animation
* Label transitions
* Screen persistence
* Scroll position preservation
* State preservation

Determine whether tab transitions should animate.

Avoid excessive tab animations that slow navigation.

---

# 28. Micro-interactions

Audit opportunities for useful micro-interactions:

* Toggle
* Checkbox
* Radio selection
* Favorite
* Save
* Delete
* Copy
* Success
* Error
* Validation
* Progress
* Increment/decrement
* Picker selection

For every proposed micro-interaction ask:

> What does this animation communicate?

If the answer is “nothing,” remove it.

---

# 29. Haptic feedback

Determine where haptics would improve the experience.

Potential areas:

* Button confirmation
* Toggle
* Picker selection
* Slider
* Successful action
* Error
* Destructive action

Avoid excessive haptics.

Every haptic should reinforce an interaction rather than become noise.

---

# 30. Success and error transitions

Audit how the UI communicates state changes.

For example:

```text
Submitting
↓
Success
```

should not simply replace one text label with another instantly.

Determine whether appropriate:

* Icon transition
* Color transition
* Scale
* Fade
* Checkmark
* Toast
* Inline feedback

would improve comprehension.

Do the same for errors.

---

# 31. Navigation race conditions

Look specifically for:

* Double navigation
* Multiple button taps
* Navigation during API calls
* Navigation after component unmount
* Async callback updating an unmounted component
* Multiple API requests
* Duplicate screen instances
* Back button during transition

Design protections against these issues.

---

# 32. Async operation UX

For every asynchronous operation determine:

```text
Idle
↓
Started
↓
Loading
↓
Success / Error / Cancelled
```

Every state should have a deliberate UI representation.

Never leave the user in an ambiguous state.

---

# 33. Optimistic UI

Identify actions where optimistic updates make sense.

Examples:

* Favorite
* Toggle
* Mark complete
* Save preference

Determine:

* When to update immediately
* How to rollback
* How to show failure
* How to prevent inconsistent state

Do not use optimistic UI for operations where correctness requires server confirmation.

---

# 34. Offline and poor-network experience

Analyze behavior when:

* Internet is slow
* Internet disappears
* API takes several seconds
* Request fails
* App returns online

The UI should not feel frozen simply because the network is slow.

Separate network latency from UI responsiveness.

---

# 35. Caching and prefetching

Identify screens/data that can benefit from:

* Cache
* Prefetch
* Background refresh
* Stale-while-revalidate

Determine where prefetching would make navigation feel instant.

Do not preload everything.

---

# 36. App lifecycle

Audit:

* Cold launch
* Warm launch
* Background
* Foreground
* App switching
* Screen locking
* Returning to the app

Check whether animations, timers, network requests, and state behave correctly.

---

# 37. Startup performance

Analyze:

```text
App launch
↓
JS initialization
↓
Navigation initialization
↓
Authentication check
↓
Data initialization
↓
First screen
```

Identify what can delay the first meaningful frame.

Do not block the initial UI with unnecessary work.

---

# 38. Memory performance

Look for:

* Large images
* Large arrays
* Long chat histories
* Unbounded state
* Event listeners
* Timers
* Animation loops
* Subscriptions
* Screens remaining mounted unnecessarily

Identify possible memory leaks.

---

# 39. Animation cleanup

Every animation should properly clean up:

* Timers
* Shared values
* Listeners
* Gesture handlers
* Async callbacks
* Animation frames

Check what happens when the user leaves the screen during an animation.

---

# 40. Reduced-motion accessibility

Respect reduced-motion preferences.

Determine how the app behaves when users prefer reduced motion.

Animations should degrade gracefully rather than breaking the experience.

---

# 41. Accessibility and animation

Check:

* Screen-reader behavior
* Focus transitions
* Dynamic content announcements
* Animation-related confusion
* Touch target size
* Contrast
* Reduced motion

An animation should never be the only way information is communicated.

---

# 42. Device-size testing

Test the design conceptually across:

* Small phones
* Standard phones
* Large phones
* Different aspect ratios
* Different pixel densities

Look for:

* Clipping
* Overflow
* Layout jumps
* Button movement
* Text wrapping
* Animation problems

---

# 43. Performance profiling

Identify what tools should be used to verify improvements.

Inspect appropriate tools such as:

* React DevTools
* React Native Performance Monitor
* Flipper where applicable
* Android Studio Profiler
* Xcode Instruments
* Hermes profiling
* Reanimated performance tooling
* Network inspection
* Memory profiling

Do not claim performance improvements without measurement.

---

# 44. Define performance budgets

Establish reasonable targets for:

* App startup
* Screen transition
* Button feedback
* Frame consistency
* Scroll performance
* Animation duration
* API feedback
* Time to first content
* Image loading

The exact values should be selected based on the app and platform rather than arbitrary numbers.

---

# 45. Create a motion design system

Instead of individually inventing animations, define reusable motion primitives.

For example:

```text
Motion
├── Press
├── Fade
├── Slide
├── Scale
├── Spring
├── Expand
├── Collapse
├── Modal
├── Screen transition
├── List insertion
├── List removal
└── Success/Error feedback
```

Each should have documented:

* Duration
* Easing
* Spring parameters where applicable
* Use case
* Reduced-motion behavior

---

# 46. Create an interaction design system

Define consistent behavior for:

### Buttons

### Cards

### Inputs

### Pickers

### Toggles

### Lists

### Tabs

### Modals

### Bottom sheets

### Navigation

### Loading

### Errors

### Success states

Similar interactions should feel similar throughout the application.

---

# 47. Remove bad animations

Explicitly search for animations that should be removed.

Examples:

* Animation that delays a user's task
* Animation that causes frame drops
* Repeated decorative animations
* Excessive bouncing
* Long transitions
* Multiple simultaneous animations
* Animation that communicates nothing
* Animation that conflicts with navigation

Do not assume more animation means better UX.

---

# 48. Final audit report

After inspecting the application, produce:

## A. Current performance architecture

What is currently responsible for rendering, navigation, gestures, animations, and state.

## B. Screen-by-screen audit

For every screen:

| Screen | Transition | Interaction | Animation | Performance issue | Recommendation |
| ------ | ---------- | ----------- | --------- | ----------------- | -------------- |

## C. Navigation audit

Document every major navigation path and identify inconsistent transitions.

## D. Interaction audit

Document every major interactive element and its feedback behavior.

## E. Animation audit

List:

* Existing animations
* Missing animations
* Excessive animations
* Broken animations
* Animations that should be replaced

## F. Rendering audit

Identify unnecessary renders and expensive components.

## G. JS-thread audit

Identify work that could block interaction.

## H. UI-thread/animation audit

Identify animations/gestures that need better architecture.

## I. List and image audit

Identify scrolling and image-performance problems.

## J. Network/loading audit

Identify places where network latency damages perceived performance.

## K. Memory audit

Identify possible leaks and excessive memory usage.

## L. Accessibility audit

Include reduced motion and interaction accessibility.

## M. Motion system

Propose the reusable animation system.

## N. Interaction system

Propose the reusable interaction-feedback system.

## O. Performance priorities

Classify issues as:

**P0 — Causes broken/janky interaction**

**P1 — Noticeable UX degradation**

**P2 — Polish improvement**

Do not use this classification to hide serious issues behind visual polish.

## P. Implementation roadmap

Create phases:

### Phase 1 — Measurement

Profile before changing anything.

### Phase 2 — Critical performance fixes

Fix frame drops, blocking work, rendering problems, navigation problems.

### Phase 3 — Interaction improvements

Improve buttons, gestures, inputs, lists, and feedback.

### Phase 4 — Navigation motion

Standardize screen transitions and navigation behavior.

### Phase 5 — Motion system

Implement reusable animation primitives.

### Phase 6 — Loading/network UX

Improve skeletons, optimistic updates, caching, and async states.

### Phase 7 — Micro-interactions

Add meaningful haptics and subtle feedback.

### Phase 8 — Accessibility

Reduced motion, screen readers, touch targets, and accessibility validation.

### Phase 9 — Final profiling

Measure again and compare against the baseline.

---

# FINAL RULES

Do not make the application “smooth” by blindly adding animations.

**Smoothness = performance + responsiveness + continuity + predictability + appropriate motion.**

Before changing anything:

1. Inspect the existing code.
2. Measure/profile where possible.
3. Identify the actual bottleneck.
4. Determine whether the problem is UX, rendering, JS, UI thread, navigation, network, memory, or architecture.
5. Choose the smallest change that solves the problem.
6. Avoid unnecessary dependencies.
7. Avoid unnecessary re-renders.
8. Avoid unnecessary animations.
9. Keep animation logic reusable.
10. Respect reduced motion.
11. Test both Android and iOS behavior where applicable.
12. Verify that performance improvements do not introduce navigation or state bugs.

**Do not modify the code yet.**

First return the complete audit and prioritized implementation plan.

I want you to be extremely critical. If an animation is unnecessary, say so. If a screen transition is already correct, leave it alone. If the real problem is architecture rather than animation, identify that instead.

The goal is not to make the application look more animated.

The goal is to make the application **feel exceptionally fast, fluid, responsive, and professionally engineered.**
