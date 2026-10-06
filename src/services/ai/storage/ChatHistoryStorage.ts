import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../types/ai.types';

const MAX_SAVED_MESSAGES = 20;

class ChatHistoryStorageService {
  private getStorageKey(userId?: string): string {
    const id = userId || 'guest';
    return `@calori_ria_chat_${id}`;
  }

  async loadMessages(userId?: string): Promise<ChatMessage[]> {
    try {
      const key = this.getStorageKey(userId);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(-MAX_SAVED_MESSAGES);
      }
      return [];
    } catch (error) {
      console.warn('ChatHistoryStorage: Failed to load chat history', error);
      return [];
    }
  }

  async saveMessages(messages: ChatMessage[], userId?: string): Promise<void> {
    try {
      const key = this.getStorageKey(userId);
      const trimmed = messages.slice(-MAX_SAVED_MESSAGES);
      await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('ChatHistoryStorage: Failed to save chat history', error);
    }
  }

  async clearHistory(userId?: string): Promise<void> {
    try {
      const key = this.getStorageKey(userId);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('ChatHistoryStorage: Failed to clear chat history', error);
    }
  }
}

export const ChatHistoryStorage = new ChatHistoryStorageService();
