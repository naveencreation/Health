import { SecureKeyStorage } from './storage/SecureKeyStorage';
import { ConversationMemoryManager } from './memory/ConversationMemoryManager';
import { GeminiProvider } from './providers/GeminiProvider';
import { AIErrorMapper } from './errors/AIErrorMapper';
import { AIObservability } from './observability/AIObservability';
import {
  ChatMessage,
  ValidationResult,
  UserNutritionContext,
  FoodVisionResult,
  AIError,
} from './types/ai.types';

class AIServiceFacade {
  private cachedInsight: { text: string; timestamp: number } | null = null;

  /**
   * Checks if user has a valid stored Gemini key.
   */
  async isKeyConfigured(): Promise<boolean> {
    return SecureKeyStorage.hasApiKey();
  }

  /**
   * Retrieves the raw key securely (internal use only).
   */
  async getApiKey(): Promise<string | null> {
    return SecureKeyStorage.getApiKey();
  }

  /**
   * Retrieves the masked key for display in settings UI.
   */
  async getMaskedKey(): Promise<string> {
    const key = await SecureKeyStorage.getApiKey();
    return SecureKeyStorage.getMaskedKey(key);
  }

  /**
   * Sanitizes user key input by stripping quotes, env prefixes, and whitespace.
   */
  sanitizeKey(rawKey: string): string {
    return GeminiProvider.sanitizeKey(rawKey);
  }

  /**
   * 5-Stage validation handshake, saving only on success.
   */
  async validateAndSaveKey(rawKey: string): Promise<ValidationResult> {
    const sanitized = GeminiProvider.sanitizeKey(rawKey);
    const validation = await GeminiProvider.validateKey(sanitized);
    if (validation.isValid) {
      await SecureKeyStorage.saveApiKey(sanitized);
    }
    return validation;
  }

  /**
   * Removes key from hardware storage and invalidates cache.
   */
  async disconnectKey(): Promise<void> {
    await SecureKeyStorage.removeApiKey();
    this.cachedInsight = null;
  }

  /**
   * Streams a conversation turn with Ria with full memory & budget protection.
   */
  async streamChat(
    prompt: string,
    history: ChatMessage[],
    context: UserNutritionContext,
    onChunk: (accumulatedText: string) => void,
    signal?: AbortSignal,
    userId?: string
  ): Promise<string> {
    const apiKey = await SecureKeyStorage.getApiKey();
    if (!apiKey) {
      throw AIErrorMapper.createError('NO_KEY_CONFIGURED', 'Please connect your Gemini API key in Settings to chat with Ria.');
    }

    // Load active summary if available
    const activeSummary = await ConversationMemoryManager.loadSummary(userId);
    const summaryText = activeSummary?.text || '';

    const completedText = await GeminiProvider.streamChat(
      apiKey,
      prompt,
      history,
      context,
      onChunk,
      signal,
      summaryText
    );

    // Trigger non-blocking background summarization if history is getting long
    if (history.length >= 10) {
      this.triggerBackgroundSummarization(apiKey, history, summaryText, userId).catch(() => {});
    }

    return completedText;
  }

  /**
   * Analyzes food from a base64 image string with Atwater consistency check.
   */
  async analyzeFoodImage(rawBase64Data: string, mimeType: string = 'image/jpeg'): Promise<FoodVisionResult> {
    const apiKey = await SecureKeyStorage.getApiKey();
    if (!apiKey) {
      throw AIErrorMapper.createError('NO_KEY_CONFIGURED', 'Please connect your Gemini API key to use the AI Food Camera.');
    }

    return GeminiProvider.analyzeFoodImage(apiKey, rawBase64Data, mimeType);
  }

  /**
   * Generates or returns cached daily insight for RiaCoachCard.
   */
  async getDailyInsight(context: UserNutritionContext): Promise<string | null> {
    const apiKey = await SecureKeyStorage.getApiKey();
    if (!apiKey) return null;

    const now = Date.now();
    // Cache insight for 4 hours to preserve user quota and prevent flickering
    if (this.cachedInsight && now - this.cachedInsight.timestamp < 4 * 60 * 60 * 1000) {
      return this.cachedInsight.text;
    }

    try {
      const insight = await GeminiProvider.generateDailyInsight(apiKey, context);
      if (insight) {
        this.cachedInsight = { text: insight, timestamp: now };
        return insight;
      }
    } catch {
      // Gracefully return null to let UI use local rule fallback
    }

    return null;
  }

  // Conversation history persistence delegates
  async loadChatHistory(userId?: string): Promise<ChatMessage[]> {
    return ConversationMemoryManager.loadHistory(userId);
  }

  async saveChatHistory(messages: ChatMessage[], userId?: string): Promise<void> {
    return ConversationMemoryManager.saveHistory(messages, userId);
  }

  async clearChatHistory(userId?: string): Promise<void> {
    return ConversationMemoryManager.clearAll(userId);
  }

  /**
   * Returns current client-side observability metrics.
   */
  getObservabilityMetrics() {
    return AIObservability.getSummary();
  }

  /**
   * Background task to condense older messages into a summary without blocking UI.
   */
  private async triggerBackgroundSummarization(
    apiKey: string,
    history: ChatMessage[],
    existingSummary: string,
    userId?: string
  ): Promise<void> {
    try {
      const oldestTurns = history.slice(0, 6);
      const newSummary = await GeminiProvider.generateConversationSummary(apiKey, oldestTurns, existingSummary);
      if (newSummary) {
        await ConversationMemoryManager.saveSummary(
          {
            text: newSummary,
            lastSummarizedIndex: 6,
            updatedAt: new Date().toISOString(),
          },
          userId
        );
      }
    } catch {
      // Silent background catch
    }
  }
}

export const AIService = new AIServiceFacade();
export * from './types/ai.types';
export { SecureKeyStorage } from './storage/SecureKeyStorage';
export { AI_CONFIG } from './config/AIConfig';
export { AIErrorMapper } from './errors/AIErrorMapper';
export { AIInputValidator } from './validation/AIInputValidator';
export { AIOutputValidator } from './validation/AIOutputValidator';
