import { app } from '@/services/firebase';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import {
  ChatMessage,
  UserNutritionContext,
  FoodVisionResult,
} from '../types/ai.types';
import { NutritionContextBuilder } from '../context/NutritionContextBuilder';
import { AI_CONFIG } from '../config/AIConfig';
import { RemoteConfigService } from '../config/RemoteConfigService';
import { AIErrorMapper } from '../errors/AIErrorMapper';
import { AIInputValidator } from '../validation/AIInputValidator';
import { AIOutputValidator } from '../validation/AIOutputValidator';
import { EdgeImagePreprocessor } from '../validation/EdgeImagePreprocessor';
import { TokenBudgetManager } from '../memory/TokenBudgetManager';
import { GeminiTokenEstimator } from '../memory/GeminiTokenEstimator';
import { AIRateLimiter } from '../gateway/AIRateLimiter';
import { AIObservability } from '../observability/AIObservability';

export class FirebaseAIProvider {
  private static aiInstance: any = null;

  /**
   * Lazily initializes and returns the Firebase AI instance.
   */
  private static getAIInstance() {
    if (!this.aiInstance) {
      try {
        this.aiInstance = getAI(app, {
          backend: new GoogleAIBackend(),
          useLimitedUseAppCheckTokens: true,
        });
      } catch {
        this.aiInstance = getAI(app);
      }
    }
    return this.aiInstance;
  }

  /**
   * Streams chat conversation turns using Firebase AI Logic.
   * Model and max tokens are dynamically driven by Remote Config.
   */
  static async streamChat(
    prompt: string,
    history: ChatMessage[],
    context: UserNutritionContext,
    onChunk: (accumulatedText: string) => void,
    signal?: AbortSignal,
    summaryText: string = ''
  ): Promise<string> {
    const startTime = Date.now();

    // 0. Kill switch check from Remote Config
    if (RemoteConfigService.get('ria_pool_degraded')) {
      const err = AIErrorMapper.createError(
        'SERVER_ERROR',
        'Ria is resting. Back around tomorrow.'
      );
      throw err;
    }

    // 1. Rate Limit Check
    const rateStatus = await AIRateLimiter.checkRateLimit();
    if (!rateStatus.allowed) {
      const err = AIErrorMapper.createError(
        'RATE_LIMIT',
        rateStatus.reason || 'Please wait a moment before sending.'
      );
      throw err;
    }

    // 2. Input Validation
    const validation = AIInputValidator.validateUserText(prompt);
    if (!validation.isValid) {
      throw (
        validation.error || AIErrorMapper.createError('INVALID_REQUEST', 'Invalid input message.')
      );
    }

    const safeUserText = validation.sanitizedText;
    const systemInstruction = NutritionContextBuilder.buildSystemInstruction(context);
    const maxOutputTokens = RemoteConfigService.get('ria_max_output_tokens');

    // 3. Token Budget Enforcement & Sliding Window Trimming
    const { trimmedHistory } = TokenBudgetManager.fitWithinBudget(
      systemInstruction,
      summaryText,
      history,
      safeUserText,
      maxOutputTokens
    );

    // 4. Construct Contents Payload
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

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

    for (const msg of trimmedHistory) {
      if (!msg.isError) {
        contents.push({
          role: msg.sender === 'ria' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: AIInputValidator.wrapUntrustedInput(safeUserText) }],
    });

    const modelName = RemoteConfigService.get('ria_model_chat');

    try {
      const ai = this.getAIInstance();
      const model = getGenerativeModel(ai, {
        model: modelName,
        generationConfig: {
          temperature: context.riaTone === 'scientific' ? 0.2 : 0.65,
          maxOutputTokens,
        },
        systemInstruction,
      });

      await AIRateLimiter.recordRequest();

      const responseStream = await model.generateContentStream({
        contents,
      });

      let accumulatedText = '';
      let timeToFirstTokenMs: number | undefined;
      let lastFlushTime = 0;

      for await (const chunk of responseStream.stream) {
        if (signal?.aborted) {
          break;
        }

        const piece = chunk.text();
        if (piece) {
          if (timeToFirstTokenMs === undefined) {
            timeToFirstTokenMs = Date.now() - startTime;
          }
          accumulatedText += piece;

          const now = Date.now();
          if (now - lastFlushTime > 40) {
            onChunk(accumulatedText);
            lastFlushTime = now;
          }
        }
      }

      // Final flush
      onChunk(accumulatedText);

      AIObservability.recordMetric({
        feature: 'chat',
        latencyMs: Date.now() - startTime,
        timeToFirstTokenMs,
        success: true,
        outputTokens: GeminiTokenEstimator.estimateTextTokens(accumulatedText),
      });

      return accumulatedText;
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw err;
      }

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
   * Generates a 2-sentence personalized daily coaching tip for the home card.
   */
  static async generateDailyInsight(context: UserNutritionContext): Promise<string> {
    if (!RemoteConfigService.get('ria_insight_enabled')) {
      return `Stay hydrated and focus on hitting your ${context.targetProtein}g protein target today!`;
    }

    const startTime = Date.now();
    const prompt = `You are Ria. Based on today's telemetry:
Consumed: ${context.consumedCalories} kcal / Budget: ${context.dailyCalorieBudget} kcal (Remaining: ${context.remainingCalories} kcal).
Protein: ${context.consumedProtein}g / Target: ${context.targetProtein}g.
Water: ${context.consumedWaterMl} ml / Target: ${context.targetWaterMl} ml.
Tone: ${context.riaTone}.

Give exactly 2 sentences of actionable nutrition coaching advice for this exact moment. No greetings, no signatures. Direct and impactful.`;

    const modelName = RemoteConfigService.get('ria_model_chat');

    try {
      const ai = this.getAIInstance();
      const model = getGenerativeModel(ai, {
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 120,
        },
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      });

      const tip = result.response.text().trim();

      AIObservability.recordMetric({
        feature: 'insight',
        latencyMs: Date.now() - startTime,
        success: true,
        outputTokens: GeminiTokenEstimator.estimateTextTokens(tip),
      });

      return tip;
    } catch (err: any) {
      const parsedErr = AIErrorMapper.fromRawError(err);
      AIObservability.recordMetric({
        feature: 'insight',
        latencyMs: Date.now() - startTime,
        success: false,
        errorCode: parsedErr.type,
      });

      // Graceful fallback
      return `Prioritize whole foods and hit your ${context.targetProtein}g protein goal today!`;
    }
  }

  /**
   * Analyzes an image of food using Firebase AI Logic vision models with Atwater validation.
   */
  static async analyzeFoodImage(
    rawBase64Data: string,
    mimeType: string = 'image/jpeg'
  ): Promise<FoodVisionResult> {
    const startTime = Date.now();

    // 1. Edge Image Preprocessor & Bounds Validation
    const processed = EdgeImagePreprocessor.processBase64(rawBase64Data, mimeType);
    if (!processed.isValid) {
      throw (
        processed.error ||
        AIErrorMapper.createError('INVALID_REQUEST', 'Image could not be processed.')
      );
    }

    // 2. Rate Limit Check
    const rateStatus = await AIRateLimiter.checkRateLimit();
    if (!rateStatus.allowed) {
      throw AIErrorMapper.createError(
        'RATE_LIMIT',
        rateStatus.reason || 'Please wait a moment before sending.'
      );
    }

    const prompt = `Analyze this food image accurately for a calorie tracking mobile app.
Identify the primary dish or food plate shown. If a packaged food or Nutrition Facts label is visible, read the printed portion, calories, and macronutrient values directly from the label.
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
}

If the image clearly does not contain any food, meal, or beverage (e.g. an object, gadget, pet, person, document, or blank scenery), output strictly:
{
  "isFood": false,
  "name": "Not Food",
  "category": "snacks",
  "categoryLabel": "Other",
  "servingUnit": "item",
  "defaultServingSize": 1,
  "calories": 0,
  "carbs": 0,
  "protein": 0,
  "fat": 0,
  "fiber": 0,
  "confidence": "low",
  "notes": "No recognizable food or beverage detected in this photo."
}`;

    const modelName = RemoteConfigService.get('ria_model_vision');

    try {
      const ai = this.getAIInstance();
      const model = getGenerativeModel(ai, {
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: AI_CONFIG.TOKEN_BUDGET.RESERVED_OUTPUT_VISION,
          responseMimeType: 'application/json',
        },
      });

      await AIRateLimiter.recordRequest();

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
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
      });

      const responseText = result.response.text();
      const outputValidation = AIOutputValidator.validateFoodVisionResult(responseText);

      if (!outputValidation.isValid || !outputValidation.data) {
        throw (
          outputValidation.error ||
          AIErrorMapper.createError(
            'INVALID_STRUCTURED_OUTPUT',
            'Failed to calculate macros from image.'
          )
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
}
