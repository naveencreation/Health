I want you to perform a **deep UX, UI, data, and interaction audit** of this component before making any design or code changes.

Do not simply ask, “Does this look good?”

I want you to understand **why every piece of information, visual element, interaction, animation, and value exists**, whether it is actually necessary, how it behaves, and whether the complete experience makes sense to a mobile user.

## 1. Understand the component completely

First, inspect the existing implementation and determine:

* What this component is supposed to accomplish
* What data it receives
* Where that data comes from
* What data is calculated locally
* What data is persisted
* What data is displayed to the user
* What data is only used internally
* What changes when the user interacts with it
* What state is maintained
* What happens when the component mounts, updates, or unmounts
* What happens when the user leaves and comes back

Trace the complete flow:

**Data source → processing → state → UI → user interaction → state update → persisted result**

Do not make assumptions. Inspect the actual code and architecture.

---

## 2. Audit EVERY piece of information shown to the user

For every visible element, identify:

* What exactly is being shown?
* Where does the value come from?
* Why is it being shown?
* What decision or action does it help the user make?
* Is it necessary?
* Is it redundant?
* Could it confuse the user?
* Is the wording immediately understandable?
* Is the visual representation appropriate?
* Does it deserve the amount of visual emphasis it currently receives?

Create a breakdown such as:

| Element | Data source | Purpose | Necessary? | UX issue | Recommendation |
| ------- | ----------- | ------- | ---------- | -------- | -------------- |

Be critical.

If something exists only because “other apps usually show it,” challenge it.

If something is technically correct but provides no meaningful value to the user, recommend removing it.

If something is important but currently difficult to understand, recommend a better presentation.

---

## 3. Debate the necessity of every element

I specifically want you to **debate each visible element**, not just describe it.

For every element ask:

### Why does this exist?

### What happens if we remove it?

### Does the user actually need it?

### Is there a simpler way to communicate the same information?

### Is it helping the primary task or distracting from it?

### Does it create cognitive load?

### Is the information better shown visually, numerically, textually, or not at all?

### Is it competing with the primary value/action?

Do not be afraid to recommend removing existing UI.

**Less UI is preferable when the removed information does not meaningfully improve the user's decision or action.**

---

## 4. Verify whether the values are displayed correctly

This is extremely important.

Do not assume that because the underlying data is correct, the UI is correct.

Analyze:

* How values are calculated
* How values are rounded
* How values are converted
* How units are converted
* How decimal values are handled
* How values are formatted
* How values are interpolated between states
* How values are synchronized with animations
* How values are synchronized with gestures
* Whether the displayed value always matches the actual selected value

Look specifically for situations where:

**Visual value ≠ actual value**

For example:

* The UI visually appears to be at one value but the state contains another.
* The indicator appears between two values.
* The snapping position does not correspond exactly to the displayed number.
* A converted unit introduces rounding errors.
* Animation temporarily displays a value that is not actually selected.
* Fast scrolling causes the displayed value and selected value to become out of sync.
* State updates happen after the visual animation instead of simultaneously.
* A previously selected value is restored incorrectly.

Determine whether the component has a **single source of truth** for its selected value.

If not, recommend how it should be structured.

---

## 5. Analyze the interaction mechanism

Understand exactly how the component works mechanically.

For example:

* What happens when the user taps?
* What happens when the user swipes?
* What happens when the user drags?
* What happens when the user scrolls quickly?
* How does snapping work?
* How is the selected item determined?
* How is the center/active position calculated?
* How are neighboring values rendered?
* How does the component know which value is currently selected?
* How does the UI transition between values?
* What happens when the user stops interacting?
* What happens during rapid repeated interaction?

Explain the mechanism in simple technical terms.

I want to understand:

**Gesture → calculation → selected value → visual position → state update**

---

## 6. Analyze whether the visual representation actually communicates meaning

Do not evaluate the UI only aesthetically.

Ask:

> “If a user sees this component for the first time, will they immediately understand what it represents?”

For every visual element determine:

* What does this visual communicate?
* Is that meaning obvious?
* Does it require explanation?
* Is the visual metaphor accurate?
* Does it reinforce the selected value?
* Does it visually correspond to the underlying data?
* Is it decorative or functional?

If the component represents something physical or measurable, such as:

* height
* weight
* distance
* age
* calories
* time
* percentage

evaluate whether the visual representation actually reinforces that concept.

---

## 7. Analyze hierarchy

Determine what the user's eye should notice first, second, and third.

Evaluate:

1. Primary information
2. Secondary information
3. Interaction control
4. Supporting information
5. Navigation/action

Then compare that against the current visual hierarchy.

If a secondary element is visually stronger than the primary value, call it out.

If too many things compete for attention, recommend what should be reduced.

---

## 8. Analyze mobile UX specifically

Evaluate this component as a **mobile-first experience**.

Check:

* Thumb reachability
* Touch target size
* Gesture discoverability
* Accidental interactions
* Scroll conflicts
* One-handed usage
* Visual readability
* Small-screen behavior
* Different device widths
* Dynamic text sizes
* Safe areas
* Keyboard behavior if relevant
* Accessibility
* Haptic feedback if appropriate
* Animation performance
* Reduced-motion behavior

Ask:

> “Can someone understand and use this component comfortably with one hand without thinking about how it works?”

---

## 9. Analyze animation and feedback

For every animation, transition, haptic, or feedback mechanism determine:

* Why does it exist?
* What information does it communicate?
* Does it improve understanding?
* Does it make the interaction feel responsive?
* Is it too slow?
* Is it too fast?
* Does it create unnecessary visual noise?
* Does it interfere with reading the value?
* Does it remain synchronized with the actual state?

Do not add animation just because it looks polished.

Every animation must have a UX purpose.

---

## 10. Identify edge cases

Think through abnormal and extreme interactions.

For example:

* Minimum value
* Maximum value
* Default value
* Rapid swiping
* Repeated taps
* Interrupting an animation
* Switching units
* Rotating the device
* Returning from another screen
* Re-rendering
* App background/foreground
* Previously saved values
* Invalid values
* Floating-point/rounding issues
* Different screen sizes
* Accessibility settings
* Reduced motion

Determine whether the component behaves predictably in every case.

---

## 11. Challenge the existing design

Do not assume the current implementation is correct.

I want you to explicitly identify:

### What is unnecessary?

### What is confusing?

### What is technically fragile?

### What is visually misleading?

### What creates unnecessary cognitive load?

### What could be simplified?

### What is missing?

### What should be redesigned?

### What should remain exactly as it is?

Be brutally honest.

If the current component is over-engineered, say so.

If it is under-designed, say so.

If a feature looks impressive but provides no user value, recommend removing it.

---

## 12. Propose an improved experience

After completing the audit, design the improved version.

Explain:

* What information should remain
* What information should be removed
* What information should be added
* How the primary value should be displayed
* How the user should interact with it
* How the selected state should work
* How the visual feedback should work
* How animations should work
* How haptics should work
* How the data should flow
* How state should be managed
* How validation should work
* How the component should respond to edge cases

The final experience should prioritize:

**Clarity → Correctness → Ease of interaction → Feedback → Visual polish**

Not the other way around.

---

## 13. Final output

Do **not modify the code yet**.

First provide a structured audit with these sections:

### A. Component purpose

What this component is actually trying to accomplish.

### B. Current data flow

Where the data comes from and how it reaches the UI.

### C. Current UI inventory

Every visible element and its purpose.

### D. Necessity debate

For every element:

**Keep / Modify / Remove / Add**

with reasoning.

### E. Value correctness audit

Verify whether the displayed value, selected value, calculated value, and persisted value can ever become inconsistent.

### F. Interaction mechanics

Explain exactly how the component currently works.

### G. UX problems

List every meaningful usability issue you discover.

### H. Visual communication problems

Explain whether the component actually communicates its meaning effectively.

### I. Mobile UX analysis

Evaluate touch, gestures, readability, reachability, accessibility, and responsiveness.

### J. Proposed improved mechanism

Describe the improved technical and interaction model.

### K. Proposed improved UI

Describe exactly what the user should see and why.

### L. Edge cases

List important failure and boundary conditions.

### M. Implementation plan

List the components, files, state, utilities, calculations, animations, and logic that would need to change.

### N. Final recommendation

Give me a concise summary of what should ultimately remain on the screen and what should be removed or redesigned.

**Important: Do not code anything until this complete analysis is finished and presented for review.**
