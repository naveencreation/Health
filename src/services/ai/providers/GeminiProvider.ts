import {
  ChatMessage,
  ValidationResult,
  UserNutritionContext,
  FoodVisionResult,
  AIError,
} from '../types/ai.types';
import { NutritionContextBuilder } from '../context/NutritionContextBuilder';
import { AI_CONFIG } from '../config/AIConfig';
import { AIErrorMapper } from '../errors/AIErrorMapper';
import { AIInputValidator } from '../validation/AIInputValidator';
import { AIOutputValidator } from '../validation/AIOutputValidator';
import { EdgeImagePreprocessor } from '../validation/EdgeImagePreprocessor';
import { TokenBudgetManager } from '../memory/TokenBudgetManager';
import { AIRateLimiter } from '../gateway/AIRateLimiter';
import { AIObservability } from '../observability/AIObservability';

export const GEMINI_MODEL = AI_CONFIG.MODEL;
export const DEFAULT_GEMINI_MODEL = GEMINI_MODEL;
const GEMINI_BASE_URL = AI_CONFIG.BASE_URL;

export class GeminiProvider {
  /**
   * Sanitizes user key input by stripping quotes, env prefixes, and whitespace.
   */
  static sanitizeKey(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
    cleaned = cleaned.replace(/^(?:export\s+)?(?:GEMINI_API_KEY|GOOGLE_API_KEY|API_KEY)\s*=\s*/i, '');
    cleaned = cleaned.replace(/^Bearer\s+/i, '');
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
    return cleaned;
  }

  /**
   * Executes an HTTP request with exponential backoff and jitter for retryable errors.
   */
  private static async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = AI_CONFIG.RETRY.MAX_ATTEMPTS
  ): Promise<Response> {
    let attempt = 0;

    while (true) {
      try {
        const response = await fetch(url, options);

        // If not a retryable status code (429 rate limit or 500/503 server error), return directly
        if (response.ok || (response.status !== 429 && response.status !== 500 && response.status !== 503)) {
          return response;
        }

        if (attempt >= maxRetries) {
          return response;
        }
      } catch (err: any) {
        if (attempt >= maxRetries || err.name === 'AbortError') {
          throw err;
        }
      }

      attempt++;
      // Exponential backoff + randomized jitter
      const jitter =
        Math.floor(Math.random() * (AI_CONFIG.RETRY.JITTER_MAX_MS - AI_CONFIG.RETRY.JITTER_MIN_MS)) +
        AI_CONFIG.RETRY.JITTER_MIN_MS;
      const delay = Math.min(AI_CONFIG.RETRY.BASE_DELAY_MS * Math.pow(2, attempt) + jitter, AI_CONFIG.RETRY.MAX_DELAY_MS);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  /**
   * Validates an API key directly against gemini-3.5-flash-lite endpoint.
   */
  static async validateKey(apiKey: string): Promise<ValidationResult> {
    const sanitized = this.sanitizeKey(apiKey);

    if (!sanitized) {
      return {
        isValid: false,
        error: AIErrorMapper.createError('EMPTY_INPUT', 'API key cannot be empty. Please paste your Google Gemini key.'),
      };
    }

    if (sanitized.startsWith('sk-')) {
      return {
        isValid: false,
        error: AIErrorMapper.createError(
          'INVALID_KEY',
          'It looks like you entered an OpenAI key ("sk-..."). Calorify is powered by Google Gemini. Please get a free Gemini key from Google AI Studio (starts with "AIza...").'
        ),
      };
    }

    if (sanitized.length < 15) {
      return {
        isValid: false,
        error: AIErrorMapper.createError(
          'INVALID_KEY',
          'The key entered is too short. Google Gemini API keys are typically ~39 characters long.'
        ),
      };
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT.CONNECTION_TIMEOUT_MS);

      const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': sanitized,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: {
            maxOutputTokens: 1,
            temperature: 0.0,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        AIObservability.recordMetric({
          feature: 'key_validation',
          latencyMs,
          success: true,
        });
        return {
          isValid: true,
          model: GEMINI_MODEL,
          latencyMs,
        };
      }

      const errorText = await response.text();
      const err = AIErrorMapper.fromRawError({ statusCode: response.status, message: errorText });

      if (err.type === 'INVALID_KEY' && !sanitized.startsWith('AIza')) {
        err.message = 'Key rejected by Google. Google Gemini API keys start with "AIza...". Please get your free key from Google AI Studio.';
        err.userMessage = 'Please enter a valid Google Gemini API key starting with "AIza...".';
      }

      AIObservability.recordMetric({
        feature: 'key_validation',
        latencyMs,
        success: false,
        errorCode: err.type,
      });

      return { isValid: false, error: err };
    } catch (err: any) {
      const parsedErr = AIErrorMapper.fromRawError(err);
      return { isValid: false, error: parsedErr };
    }
  }

  /**
   * Streams chat conversation turns using Gemini SSE, guarded by token budgets, rate limits, and validators.
   */
  static async streamChat(
    apiKey: string,
    prompt: string,
    history: ChatMessage[],
    context: UserNutritionContext,
    onChunk: (accumulatedText: string) => void,
    signal?: AbortSignal,
    summaryText: string = ''
  ): Promise<string> {
    const startTime = Date.now();

    // 1. Rate Limit Check
    const rateStatus = await AIRateLimiter.checkRateLimit();
    if (!rateStatus.allowed) {
      const err = AIErrorMapper.createError('RATE_LIMIT', rateStatus.reason || 'Please wait a moment before sending.');
      throw err;
    }

    // 2. Input Validation & Clinical Safety Interceptor
    const validation = AIInputValidator.validateUserText(prompt);
    if (!validation.isValid) {
      throw validation.error || AIErrorMapper.createError('INVALID_REQUEST', 'Invalid input message.');
    }

    const safeUserText = validation.sanitizedText;
    const systemInstruction = NutritionContextBuilder.buildSystemInstruction(context);

    // 3. Token Budget Enforcement & Sliding Window Trimming
    const { trimmedHistory } = TokenBudgetManager.fitWithinBudget(
      systemInstruction,
      summaryText,
      history,
      safeUserText,
      AI_CONFIG.TOKEN_BUDGET.RESERVED_OUTPUT_CHAT
    );

    // 4. Construct Gemini Contents Payload
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Optional long-term conversation summary context
    if (summaryText) {
      contents.push({
        role: 'user',
        parts: [{ text: `[Previous Conversation Context Summary]: ${summaryText}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will remember this context.' }],
      });
    }

    // Short-term conversation history
    for (const msg of trimmedHistory) {
      if (!msg.isError) {
        contents.push({
          role: msg.sender === 'ria' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }

    // Current user prompt inside boundary delimiter
    contents.push({
      role: 'user',
      parts: [{ text: AIInputValidator.wrapUntrustedInput(safeUserText) }],
    });

    const endpoint = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

    try {
      const response = await this.fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig: {
              temperature: context.riaTone === 'scientific' ? 0.2 : 0.65,
              maxOutputTokens: AI_CONFIG.TOKEN_BUDGET.RESERVED_OUTPUT_CHAT,
            },
          }),
          signal,
        },
        AI_CONFIG.RETRY.MAX_ATTEMPTS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw AIErrorMapper.fromRawError({ statusCode: response.status, message: errorText });
      }

      await AIRateLimiter.recordRequest();

      let accumulatedText = '';
      let timeToFirstTokenMs: number | undefined;
      let lastFlushTime = 0;

      // Handle ReadableStream reader on web/compatible engines or line-by-line fallback
      if (response.body && typeof (response.body as any).getReader === 'function') {
        const reader = (response.body as any).getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          if (signal?.aborted) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                const textPiece = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (textPiece) {
                  if (timeToFirstTokenMs === undefined) {
                    timeToFirstTokenMs = Date.now() - startTime;
                  }
                  accumulatedText += textPiece;

                  const now = Date.now();
                  if (now - lastFlushTime > 40) {
                    onChunk(accumulatedText);
                    lastFlushTime = now;
                  }
                }
              } catch {}
            }
          }
        }
      } else {
        // Fallback for environments where getReader is not available
        const fullText = await response.text();
        const lines = fullText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const textPiece = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (textPiece) {
                if (timeToFirstTokenMs === undefined) {
                  timeToFirstTokenMs = Date.now() - startTime;
                }
                accumulatedText += textPiece;
              }
            } catch {}
          }
        }
      }

      // Output Validation
      const outputResult = AIOutputValidator.validateChatResponse(accumulatedText);
      const finalText = outputResult.isValid && outputResult.data ? outputResult.data : accumulatedText;

      onChunk(finalText);

      AIObservability.recordMetric({
        feature: 'chat',
        latencyMs: Date.now() - startTime,
        timeToFirstTokenMs,
        success: true,
      });

      return finalText;
    } catch (err: any) {
      const parsedErr = AIErrorMapper.fromRawError(err);
      AIObservability.recordMetric({
        feature: 'chat',
        latencyMs: Date.now() - startTime,
        success: false,
        errorCode: parsedErr.type,
      });
      throw parsedErr;
    }
  }

  /**
   * Multimodal Food Vision Analyzer with edge preprocessing and Atwater consistency validation.
   */
  static async analyzeFoodImage(
    apiKey: string,
    rawBase64Data: string,
    mimeType: string = 'image/jpeg'
  ): Promise<FoodVisionResult> {
    const startTime = Date.now();

    // 1. Edge Image Preprocessor & Bounds Validation
    const processed = EdgeImagePreprocessor.processBase64(rawBase64Data, mimeType);
    if (!processed.isValid) {
      throw processed.error || AIErrorMapper.createError('INVALID_REQUEST', 'Image could not be processed.');
    }

    // 2. Rate Limit Check
    const rateStatus = await AIRateLimiter.checkRateLimit();
    if (!rateStatus.allowed) {
      throw AIErrorMapper.createError('RATE_LIMIT', rateStatus.reason || 'Please wait a moment before sending.');
    }

    const prompt = `Analyze this food image accurately for a calorie tracking mobile app.
Identify the primary dish or food plate shown.
Estimate realistic portion size, calories, carbohydrates, protein, fat, and fiber.
Choose the closest category from: breads, curries, south_indian, rice, snacks, beverages, fruits, dairy.

Output strictly valid JSON matching this exact schema:
{
  "name": "Food Name (e.g., Paneer Butter Masala with 2 Rotis)",
  "category": "curries",
  "categoryLabel": "Curries & Gravies",
  "servingUnit": "plate (1 bowl + 2 rotis)",
  "defaultServingSize": 1,
  "calories": 420,
  "carbs": 38,
  "protein": 14,
  "fat": 22,
  "fiber": 6,
  "confidence": "high",
  "notes": "Estimated 2 whole wheat rotis and 1 medium bowl paneer curry"
}`;

    const endpoint = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`;

    try {
      const response = await this.fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: processed.mimeType,
                      data: processed.cleanBase64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: AI_CONFIG.TOKEN_BUDGET.RESERVED_OUTPUT_VISION,
            },
          }),
        },
        AI_CONFIG.RETRY.MAX_ATTEMPTS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw AIErrorMapper.fromRawError({ statusCode: response.status, message: errorText });
      }

      await AIRateLimiter.recordRequest();

      const data = await response.json();
      const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      // 3. AI Output Validator & Thermodynamic Atwater Check
      const outputValidation = AIOutputValidator.validateFoodVisionResult(rawJsonText);
      if (!outputValidation.isValid || !outputValidation.data) {
        throw (
          outputValidation.error ||
          AIErrorMapper.createError('INVALID_STRUCTURED_OUTPUT', 'Failed to calculate macros from image.')
        );
      }

      AIObservability.recordMetric({
        feature: 'vision',
        latencyMs: Date.now() - startTime,
        success: true,
        atwaterAdjusted: outputValidation.wasCorrected,
      });

      return outputValidation.data;
    } catch (err: any) {
      const parsedErr = AIErrorMapper.fromRawError(err);
      AIObservability.recordMetric({
        feature: 'vision',
        latencyMs: Date.now() - startTime,
        success: false,
        errorCode: parsedErr.type,
      });
      throw parsedErr;
    }
  }

  /**
   * Generates dynamic 2-sentence micro-insight for the Ria dashboard coach card.
   */
  static async generateDailyInsight(apiKey: string, context: UserNutritionContext): Promise<string> {
    const startTime = Date.now();
    const prompt = `You are Ria. Based on today's telemetry:
Consumed: ${context.consumedCalories} kcal / Budget: ${context.dailyCalorieBudget} kcal (Remaining: ${context.remainingCalories} kcal).
Protein: ${context.consumedProtein}g / Target: ${context.targetProtein}g.
Water: ${context.consumedWaterMl} ml / Target: ${context.targetWaterMl} ml.
Tone: ${context.riaTone}.

Give exactly 2 sentences of actionable nutrition coaching advice for this exact moment. No greetings, no signatures. Direct and impactful.`;

    const endpoint = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`;

    try {
      const response = await this.fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: AI_CONFIG.TOKEN_BUDGET.RESERVED_OUTPUT_INSIGHT,
              temperature: 0.6,
            },
          }),
        },
        AI_CONFIG.RETRY.MAX_ATTEMPTS
      );

      if (!response.ok) {
        throw new Error('Could not generate insight');
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      AIObservability.recordMetric({
        feature: 'insight',
        latencyMs: Date.now() - startTime,
        success: true,
      });

      return rawText;
    } catch (err) {
      AIObservability.recordMetric({
        feature: 'insight',
        latencyMs: Date.now() - startTime,
        success: false,
      });
      throw err;
    }
  }

  /**
   * Generates a condensed ~60-word summary of conversation history for persistent long-term memory.
   */
  static async generateConversationSummary(
    apiKey: string,
    messages: ChatMessage[],
    existingSummary?: string
  ): Promise<string> {
    const textToSummarize = messages
      .filter((m) => !m.isError)
      .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
      .join('\n');

    const prompt = `Condense these diet coaching chat messages into a crisp 3-sentence summary highlighting the user's specific food preferences, dietary goals, dislikes, or allergies mentioned.
${existingSummary ? `Incorporate with previous summary: "${existingSummary}"` : ''}

Messages:
${textToSummarize}

Output strictly the 3-sentence summary. No bullet points or conversational filler.`;

    const endpoint = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`;

    try {
      const response = await this.fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 120,
              temperature: 0.3,
            },
          }),
        },
        1
      );

      if (!response.ok) return existingSummary || '';
      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || existingSummary || '';
    } catch {
      return existingSummary || '';
    }
  }
}
