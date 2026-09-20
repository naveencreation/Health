I want you to perform a **complete AI reliability, validation, context-management, limits, error-handling, safety, and observability analysis** before implementing any AI feature in this application.

The goal is not simply to “connect Gemini and make chat work.”

I want us to design the AI layer so that it behaves like a **production-grade system** even though we are initially using a BYOK Gemini API architecture.

The target model is currently:

**Gemini 3.5 Flash-Lite**

Do not assume that the model, limits, pricing, or API behavior will remain unchanged forever. Make the implementation configurable.

---

# CRITICAL INSTRUCTION

**DO NOT IMPLEMENT CODE YET.**

First inspect the existing application and produce a complete AI engineering plan.

You must identify **every important precaution, validation, limit, failure mode, and user-facing behavior** that should exist before we ship AI functionality.

Do not only discuss the obvious items below. Use them as a baseline and identify additional requirements I have missed.

---

# 1. AI INPUT VALIDATION

Every request entering the AI layer must pass through validation before being sent to Gemini.

Analyze and define validation for:

### Text validation

* Empty input
* Whitespace-only input
* Minimum input length
* Maximum input length
* Extremely long messages
* Repeated characters
* Malformed input
* Unsupported content
* Unicode handling
* Emoji-heavy input
* Copy/paste abuse
* Prompt injection attempts
* Unexpected control characters

Determine sensible limits based on the model/API rather than blindly choosing arbitrary numbers.

### Context validation

Before sending context:

* Validate context structure
* Validate context size
* Remove unnecessary context
* Remove duplicate messages
* Detect malformed history
* Ensure message ordering
* Ensure valid roles
* Ensure no accidental system-prompt corruption

### Application data

If user data is included in the AI request:

* Validate the data
* Normalize the data
* Remove unnecessary fields
* Check for missing values
* Check for invalid values
* Avoid sending sensitive information unnecessarily

Create an explicit **AI Input Validation Layer**.

---

# 2. INPUT TOKEN MANAGEMENT

Do not treat characters or message count as the only limit.

Analyze:

* Input token count
* Conversation history tokens
* System prompt tokens
* User-context tokens
* Application-context tokens
* Reserved output tokens
* Total request tokens

Design:

```text
Total Context Budget
        │
        ├── System Prompt
        ├── User Context
        ├── Conversation History
        ├── Current User Message
        └── Reserved Output
```

Determine how the application should behave when the context approaches the model's limit.

Possible strategies:

* Remove oldest messages
* Summarize older conversation
* Compress context
* Keep important messages
* Keep recent messages
* Use structured memory
* Reject the request gracefully

Do not simply truncate text randomly.

---

# 3. OUTPUT TOKEN MANAGEMENT

Define a maximum output budget.

Analyze:

* Maximum output tokens
* Default output tokens
* Feature-specific output limits
* Chat output limits
* Structured-output limits
* Long-response handling

The application should not allow one request to consume an unreasonable amount of output.

Determine how the UI behaves when the model reaches the output limit.

For example:

* Continue generation
* Show partial response
* Allow “Continue”
* Inform the user that the response was truncated

---

# 4. TOKEN BUDGET SYSTEM

Design a centralized token-budget mechanism.

Every request should know:

```text
Input Tokens
+
Reserved Output Tokens
=
Estimated Total Tokens
```

Before sending the request:

1. Estimate token usage.
2. Compare it against the configured context limit.
3. Reserve output capacity.
4. Trim/summarize context if required.
5. Reject the request if it still cannot fit.

Do not wait for Gemini to reject an oversized request if the application can detect it beforehand.

---

# 5. CONVERSATION CONTEXT / MEMORY

This is one of the most important parts.

Determine exactly:

> Where is the context stored so the AI knows what we were talking about?

Design the difference between:

### Short-term conversation context

Recent messages belonging to the current conversation.

### Long-term memory

Important information that should persist beyond one conversation.

### Application context

User information already stored by the application.

### AI-generated summary

Compressed representation of older conversation history.

Do not mix these concepts together.

---

# 6. Conversation storage architecture

Determine whether conversation history should be stored:

### On device

### In application backend/database

### Both

Compare the options based on:

* Privacy
* Security
* Offline access
* Synchronization
* Storage size
* Cost
* Multi-device support
* Data deletion
* Reliability

Then recommend the appropriate approach.

---

# 7. Context reconstruction

The AI should not blindly receive the entire database.

Design a context builder:

```text
Conversation
      ↓
Context Manager
      ↓
Relevant Messages
      +
Conversation Summary
      +
Relevant User Context
      +
Current Message
      ↓
Token Budget Manager
      ↓
Gemini
```

Determine exactly what gets included in every request.

---

# 8. Long conversation handling

Design what happens when a conversation becomes very long.

For example:

```text
Recent messages
        +
Conversation summary
        +
Important persistent facts
```

Determine:

* When summarization happens
* What gets summarized
* How summaries are generated
* Where summaries are stored
* How summaries are updated
* How the original messages are preserved
* How the application prevents context drift

The AI should not suddenly “forget” the conversation simply because it became long.

---

# 9. Single source of truth

Determine the authoritative source for:

* Current selected user message
* Conversation messages
* Conversation summary
* User profile
* AI settings
* API key state
* Model configuration
* Token budget
* Usage counters

Avoid having multiple competing states.

For example:

```text
UI state ≠ chat state ≠ stored conversation
```

should not happen accidentally.

Define synchronization rules.

---

# 10. OUTPUT VALIDATION

Never blindly trust model output.

Create an **AI Output Validation Layer**.

Analyze validation for:

### Basic response validation

* Response exists
* Response is not empty
* Response has expected type
* Response is not malformed
* Response is within expected length

### Structured responses

If an AI feature expects JSON:

* Validate JSON syntax
* Validate schema
* Validate required fields
* Validate field types
* Validate enum values
* Validate numeric ranges
* Reject unexpected structures
* Safely recover from malformed output

Never assume:

```text
AI said it → therefore it is valid
```

---

# 11. Semantic output validation

Where appropriate, validate whether the AI response actually satisfies the requested operation.

For example:

If the AI is asked to return:

```json
{
  "recommendation": "...",
  "reason": "...",
  "confidence": 0.0
}
```

validate:

* Required fields exist
* Confidence is within the allowed range
* Recommendation is not empty
* Reason is not empty
* No unexpected data is being treated as trusted application state

Determine which AI outputs are:

### Informational

versus

### Application state-changing

The second category requires significantly stricter validation.

---

# 12. Never let AI directly control critical application state

Identify every place where AI could potentially influence:

* User profile
* Goals
* Settings
* Records
* Financial data
* Health-related information
* Account data
* Permissions
* Application configuration

Determine which operations require deterministic validation or explicit user confirmation.

AI should propose an action where appropriate, while the application remains responsible for validating and executing it.

---

# 13. Rate limiting

Design rate limiting at multiple levels.

Consider:

### Per request

Maximum request frequency.

### Per minute

Requests per minute.

### Per hour/day

Usage limits.

### Per conversation

Prevent runaway conversations.

### Per device/user

Prevent abuse.

### Retry limits

Prevent automatic retry loops.

Because this is BYOK, determine what limits should be enforced by:

**Our application**

versus

**Gemini/API provider**

Do not assume Gemini's rate limits are sufficient for application protection.

---

# 14. Retry strategy

Define which errors are retryable.

### Retry automatically

Examples:

* Temporary network failure
* Timeout
* Transient server failure

### Do not automatically retry

Examples:

* Invalid API key
* Invalid request
* Context too large
* Quota exhausted
* Permission denied
* Unsupported model

Define:

* Maximum retry attempts
* Exponential backoff
* Jitter
* Retry timeout
* User-visible behavior

Prevent:

```text
failure → retry → failure → retry → infinite loop
```

---

# 15. Timeout management

Every AI request needs timeout handling.

Define:

* Connection timeout
* Request timeout
* Streaming timeout
* Idle streaming timeout

Determine what happens when the timeout occurs.

The user should never be left staring at an infinite loading indicator.

---

# 16. Streaming response handling

If streaming is implemented, analyze:

* Partial chunks
* Chunk ordering
* Interrupted streams
* Network disconnection
* Duplicate chunks
* Empty chunks
* Malformed chunks
* Stream completion
* Stream cancellation
* User pressing Stop
* App going into background

Determine how partial responses are stored.

If generation fails halfway through, determine whether the partial response should:

* Remain visible
* Be marked incomplete
* Be discarded
* Be retried

---

# 17. Complete error taxonomy

Create a centralized AI error model.

At minimum include:

```text
NO_API_KEY
INVALID_API_KEY
EXPIRED_OR_REVOKED_KEY
MODEL_UNAVAILABLE
INVALID_REQUEST
EMPTY_INPUT
INPUT_TOO_LARGE
CONTEXT_TOO_LARGE
OUTPUT_LIMIT_REACHED
RATE_LIMITED
QUOTA_EXCEEDED
NETWORK_ERROR
TIMEOUT
STREAM_INTERRUPTED
SERVER_ERROR
SAFETY_BLOCK
MALFORMED_RESPONSE
INVALID_STRUCTURED_OUTPUT
UNKNOWN_ERROR
```

Do not expose raw provider errors directly to users.

Map technical errors to understandable user-facing messages.

---

# 18. User-facing error UX

Define exactly what the user sees for every major failure.

For example:

### No API key

> “Connect your Gemini API key to use AI.”

Action:

**Connect key**

---

### Invalid API key

> “This Gemini API key isn’t working. Check the key and try again.”

Action:

**Update key**

---

### Rate limit

> “You’re sending requests too quickly. Please try again in a moment.”

Action:

**Try again**

---

### Quota exceeded

> “Your Gemini API usage limit has been reached.”

Action:

**Check Gemini usage**

---

### Network failure

> “We couldn’t connect to Gemini. Check your internet connection.”

Action:

**Retry**

---

### Context too large

> “This conversation is too long to process at once. We’ll shorten the older context and try again.”

The exact wording should be determined during UX design.

Create a complete mapping table:

| Technical condition | Internal error | User message | Action | Retry? |
| ------------------- | -------------- | ------------ | ------ | ------ |

---

# 19. Loading states

Never use one generic:

> “Loading...”

state.

Define meaningful states:

* Preparing request
* Sending request
* AI generating
* Receiving response
* Finalizing response
* Retrying
* Failed

However, do not expose unnecessary technical details.

The user should receive enough feedback to understand that the application is working.

---

# 20. Prompt injection protection

Analyze prompt injection risks.

The system may contain:

* User messages
* Application data
* Retrieved information
* Conversation history
* External content

Determine how untrusted content should be separated from trusted instructions.

Never assume user-provided text is trustworthy simply because it came from inside the application.

---

# 21. Sensitive data handling

Identify what information should never unnecessarily enter the AI request.

Analyze:

* Personal information
* Authentication information
* API keys
* Tokens
* Passwords
* Internal identifiers
* Private application data
* Sensitive user records

Implement a data-minimization strategy.

The AI should receive:

**only what it needs to answer the current request.**

---

# 22. API key protection

The API key must never:

* Appear in source code
* Appear in Git
* Appear in logs
* Appear in analytics
* Appear in crash reports
* Appear in error messages
* Appear in screenshots generated by debugging tools
* Be included in prompts
* Be sent unnecessarily to our backend

Determine the correct secure-storage strategy for the target platform.

Also define:

* Add key
* Validate key
* Replace key
* Remove key
* Revoke/recovery guidance
* Invalid key state

---

# 23. AI safety layer

Identify appropriate safety controls for the application.

Analyze:

* Harmful requests
* Unsafe advice
* Prompt injection
* Manipulation attempts
* Sensitive information requests
* Unsupported requests
* Hallucinated facts
* Overconfident responses

Do not assume the model's safety system alone is enough.

Determine what application-level safeguards are necessary.

---

# 24. Hallucination management

The application must distinguish between:

### AI-generated interpretation

and

### Trusted application data

Never allow an AI-generated statement to silently become trusted application data.

For important information, determine whether the AI should:

* Cite the source
* Explain uncertainty
* Say when it doesn't know
* Ask for clarification
* Use application data instead of guessing

---

# 25. Observability

Design AI-specific logging.

We need enough information to debug failures without logging secrets.

Potential metrics:

### Request metrics

* Request count
* Successful requests
* Failed requests
* Latency
* Time to first token
* Completion time
* Retry count

### Token metrics

* Input tokens
* Output tokens
* Total tokens
* Estimated tokens
* Context size
* Truncation events

### Reliability metrics

* Error rate
* Timeout rate
* Rate-limit rate
* Quota failures
* Invalid-key failures
* Streaming failures
* Output-validation failures

### UX metrics

* User stopped generation
* Retry clicked
* Response regenerated
* Conversation abandoned
* AI feature usage

Never log the actual API key or unnecessarily log private conversation content.

---

# 26. AI quality metrics

Define how we evaluate whether the AI is actually useful.

Do not measure only:

> “The API returned 200.”

A successful API response can still be a bad AI response.

Consider:

* Response relevance
* Instruction following
* Factuality where verifiable
* Structured-output validity
* Refusal correctness
* Hallucination rate
* Context retention
* Conversation consistency
* User correction rate
* Retry/regeneration rate

Design an evaluation strategy for each AI feature.

---

# 27. Deterministic vs AI logic

For every proposed AI feature, ask:

> “Does this actually require an LLM?”

If the task can be solved reliably with:

* Normal application logic
* SQL
* Rules
* Calculations
* Validation
* Search
* Existing APIs

prefer deterministic logic.

Use AI where it provides meaningful value.

---

# 28. AI feature contract

Every AI feature should define:

```text
Input
↓
Input Validation
↓
Context Construction
↓
Token Budget Validation
↓
Rate Limit Check
↓
Gemini Request
↓
Streaming / Response
↓
Output Validation
↓
Semantic Validation
↓
Application State Update
↓
User Presentation
```

Treat this as the standard pipeline.

---

# 29. Central AI service architecture

Design a centralized AI layer rather than scattering Gemini calls throughout the application.

For example:

```text
UI
 ↓
AI Feature
 ↓
AI Service
 ↓
Validation
 ↓
Context Manager
 ↓
Token Manager
 ↓
Rate Limiter
 ↓
Provider
 ↓
Gemini
 ↓
Response Validator
 ↓
AI Feature
 ↓
UI
```

Every AI feature should use this pipeline.

---

# 30. Configuration

Do not hardcode AI limits throughout the application.

Create centralized configuration for:

* Model
* Maximum input size
* Maximum output tokens
* Context window
* Timeout
* Retry count
* Backoff
* Rate limits
* Conversation history size
* Summary threshold
* Feature-specific limits

This allows the model or provider to change later without rewriting the application.

---

# 31. Testing strategy

Before implementation is considered complete, define tests for:

### Input

* Empty input
* Huge input
* Invalid characters
* Prompt injection
* Rapid requests

### Context

* Empty history
* One message
* Long conversation
* Context overflow
* Summary generation
* Corrupted history

### Output

* Empty response
* Valid response
* Malformed JSON
* Invalid schema
* Extremely long response
* Partial streaming response

### API

* Invalid key
* Revoked key
* Rate limit
* Quota exhaustion
* Timeout
* Network failure
* Server error
* Model unavailable

### UX

* Retry
* Cancel
* Regenerate
* Continue response
* App background/foreground
* Navigation during generation

### Security

* Key leakage
* Log leakage
* Storage access
* Debug logging
* Prompt injection
* Sensitive-data leakage

---

# 32. Final AI readiness checklist

At the end of the analysis, produce a checklist covering:

### Input

* [ ] Input validation
* [ ] Input size limit
* [ ] Token estimation
* [ ] Prompt injection handling

### Context

* [ ] Conversation storage
* [ ] Context reconstruction
* [ ] Context compression
* [ ] Conversation summarization
* [ ] Context token budget

### Output

* [ ] Output validation
* [ ] Schema validation
* [ ] Semantic validation
* [ ] Output token limit
* [ ] Partial-response handling

### Reliability

* [ ] Rate limiting
* [ ] Retry strategy
* [ ] Timeout
* [ ] Streaming failure handling
* [ ] Error taxonomy

### Security

* [ ] Secure API-key storage
* [ ] No key logging
* [ ] No key exposure
* [ ] Sensitive-data filtering
* [ ] Prompt injection protection

### UX

* [ ] Loading states
* [ ] Error messages
* [ ] Retry UX
* [ ] Cancel UX
* [ ] Empty state
* [ ] Long-response handling

### Observability

* [ ] Latency metrics
* [ ] Token metrics
* [ ] Error metrics
* [ ] AI quality metrics
* [ ] Privacy-safe logging

### Testing

* [ ] Input tests
* [ ] Context tests
* [ ] Output tests
* [ ] API failure tests
* [ ] Security tests
* [ ] UX tests

---

# FINAL REQUIREMENT

I want you to **think beyond this list**.

These are the minimum requirements I have identified. You are responsible for finding additional AI-specific precautions, failure modes, architectural problems, security risks, UX problems, and reliability issues that I have not considered.

Do not simply confirm that my list is correct.

**Challenge it. Expand it. Find what I missed.**

Then provide:

1. Complete AI architecture
2. Complete request lifecycle
3. Complete context/memory strategy
4. Input validation strategy
5. Output validation strategy
6. Token management strategy
7. Rate-limit strategy
8. Retry/timeout strategy
9. Error taxonomy and UX
10. Security strategy
11. Privacy/data-minimization strategy
12. AI quality/evaluation strategy
13. Observability strategy
14. Testing strategy
15. Implementation phases

**Do not write production code yet.**

The objective of this phase is to establish a **production-grade AI foundation before implementing Gemini chat or other AI features.**
