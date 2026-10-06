import { SecureKeyStorage } from './storage/SecureKeyStorage';
import { ConversationMemoryManager } from './memory/ConversationMemoryManager';
import { FirebaseAIProvider } from './providers/FirebaseAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { RemoteConfigService } from './config/RemoteConfigService';
import { AIObservability } from './observability/AIObservability';
import {
  ChatMessage,
  ValidationResult,
  UserNutritionContext,
  FoodVisionResult,
} from './types/ai.types';

class AIServiceFacade {
  private cachedInsights = new Map<string, { text: string; timestamp: number }>();

  /**
   * Checks if AI access is enabled and configured.
   * With Firebase AI Logic & App Check, this is automatically true when ria_enabled is on.
   */
  async isKeyConfigured(): Promise<boolean> {
    return RemoteConfigService.get('ria_enabled');
  }

  /**
   * Retrieves the raw key securely (legacy compatibility).
   */
  async getApiKey(): Promise<string | null> {
    return SecureKeyStorage.getApiKey();
  }

  /**
   * Retrieves the masked key for display in settings UI (legacy compatibility).
   */
  async getMaskedKey(): Promise<string> {
    const key = await SecureKeyStorage.getApiKey();
    return SecureKeyStorage.getMaskedKey(key);
  }

  /**
   * Sanitizes key input (legacy compatibility).
   */
  sanitizeKey(rawKey: string): string {
    return GeminiProvider.sanitizeKey(rawKey);
  }

  /**
   * 5-Stage validation handshake (legacy compatibility).
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
    this.cachedInsights.clear();
  }

  /**
   * Streams a conversation turn with Ria using Firebase AI Logic.
   */
  async streamChat(
    prompt: string,
    history: ChatMessage[],
    context: UserNutritionContext,
    onChunk: (accumulatedText: string) => void,
    signal?: AbortSignal,
    userId?: string
  ): Promise<string> {
    // Load active summary if available
    const activeSummary = await ConversationMemoryManager.loadSummary(userId);
    const summaryText = activeSummary?.text || '';

    // Primary: Firebase AI Logic with App Check
    return FirebaseAIProvider.streamChat(
      prompt,
      history,
      context,
      onChunk,
      signal,
      summaryText
    );
  }

  /**
   * Analyzes food from a base64 image string with Atwater consistency check using Firebase AI Logic.
   */
  async analyzeFoodImage(
    rawBase64Data: string,
    mimeType: string = 'image/jpeg'
  ): Promise<FoodVisionResult> {
    return FirebaseAIProvider.analyzeFoodImage(rawBase64Data, mimeType);
  }

  /**
   * Generates or returns cached daily insight for RiaCoachCard.
   */
  async getDailyInsight(
    context: UserNutritionContext,
    cacheKey = 'default'
  ): Promise<string | null> {
    const now = Date.now();
    // Cache insight for 4 hours to preserve quota and prevent flickering
    const cachedInsight = this.cachedInsights.get(cacheKey);
    if (cachedInsight && now - cachedInsight.timestamp < 4 * 60 * 60 * 1000) {
      return cachedInsight.text;
    }

    try {
      const insight = await FirebaseAIProvider.generateDailyInsight(context);
      if (insight) {
        this.cachedInsights.set(cacheKey, { text: insight, timestamp: now });
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
}

export const AIService = new AIServiceFacade();
