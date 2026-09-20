import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ConversationSummary } from '../types/ai.types';
import { AI_CONFIG } from '../config/AIConfig';

class ConversationMemoryManagerService {
  private getChatKey(userId?: string): string {
    return `@calori_ria_chat_${userId || 'guest'}`;
  }

  private getSummaryKey(userId?: string): string {
    return `@calori_ria_summary_${userId || 'guest'}`;
  }

  /**
   * Retrieves short-term conversation turns from device storage.
   */
  async loadHistory(userId?: string): Promise<ChatMessage[]> {
    try {
      const raw = await AsyncStorage.getItem(this.getChatKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(-AI_CONFIG.MEMORY.MAX_PERSISTED_MESSAGES);
      }
      return [];
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to load history', err);
      return [];
    }
  }

  /**
   * Persists message array to device storage.
   */
  async saveHistory(messages: ChatMessage[], userId?: string): Promise<void> {
    try {
      const trimmed = messages.slice(-AI_CONFIG.MEMORY.MAX_PERSISTED_MESSAGES);
      await AsyncStorage.setItem(this.getChatKey(userId), JSON.stringify(trimmed));
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to save history', err);
    }
  }

  /**
   * Loads the current long-term conversation summary.
   */
  async loadSummary(userId?: string): Promise<ConversationSummary | null> {
    try {
      const raw = await AsyncStorage.getItem(this.getSummaryKey(userId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Persists updated conversation summary.
   */
  async saveSummary(summary: ConversationSummary, userId?: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getSummaryKey(userId), JSON.stringify(summary));
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to save summary', err);
    }
  }

  /**
   * Returns recent sliding-window turns for active prompt assembly.
   */
  getActiveSlidingWindow(history: ChatMessage[]): ChatMessage[] {
    return history
      .filter((m) => !m.isError)
      .slice(-AI_CONFIG.MEMORY.MAX_ACTIVE_HISTORY_TURNS);
  }

  /**
   * Clears both messages and persistent summary for the user.
   */
  async clearAll(userId?: string): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.getChatKey(userId), this.getSummaryKey(userId)]);
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to clear memory', err);
    }
  }
}

export const ConversationMemoryManager = new ConversationMemoryManagerService();
