/**
 * ChatHistoryStorage.ts
 * 
 * Manages device-only Ria Space thread persistence keyed by user ID.
 * Supports up to 50 messages, migration from guest upon sign-up,
 * and clean deletion on logout or account deletion.
 * 
 * Spec: RIA_Chat.md sections 7, 10, 12.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, RiaMessage } from '../types/ai.types';

const MAX_SAVED_MESSAGES = 50;

class ChatHistoryStorageService {
  private getStorageKey(userId?: string | null): string {
    const id = userId && userId !== 'guest' ? userId : 'guest';
    return `@calori_ria_thread_${id}`;
  }

  private getLegacyStorageKey(userId?: string | null): string {
    const id = userId && userId !== 'guest' ? userId : 'guest';
    return `@calori_ria_chat_${id}`;
  }

  /**
   * Loads the current user's Ria Space thread (last 50 messages).
   * Migrates from legacy format if necessary.
   */
  async loadThread(userId?: string | null): Promise<RiaMessage[]> {
    try {
      const threadKey = this.getStorageKey(userId);
      let raw = await AsyncStorage.getItem(threadKey);

      // Check legacy storage key fallback if threadKey not yet populated
      if (!raw) {
        const legacyKey = this.getLegacyStorageKey(userId);
        raw = await AsyncStorage.getItem(legacyKey);
      }

      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized: RiaMessage[] = parsed.map((item: any, index: number) => {
          // Normalize legacy ChatMessage format if present
          if (item.sender) {
            return {
              id: item.id || `msg_${Date.now()}_${index}`,
              role: item.sender === 'user' ? 'user' : 'ria',
              kind: item.isError ? 'error' : 'text',
              text: item.text || '',
              createdAt: item.createdAt || Date.now(),
              status: item.isError
                ? 'failed'
                : item.isInterrupted
                  ? 'interrupted'
                  : 'done',
            };
          }
          return item as RiaMessage;
        });

        return normalized.slice(-MAX_SAVED_MESSAGES);
      }
      return [];
    } catch (error) {
      console.warn('ChatHistoryStorage: Failed to load thread', error);
      return [];
    }
  }

  /**
   * Persists the active thread to local device storage.
   */
  async saveThread(messages: RiaMessage[], userId?: string | null): Promise<void> {
    try {
      const key = this.getStorageKey(userId);
      const trimmed = messages.slice(-MAX_SAVED_MESSAGES);
      await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('ChatHistoryStorage: Failed to save thread', error);
    }
  }

  /**
   * Migrates guest thread into the user's account upon signup/login.
   */
  async migrateGuestThread(userId: string): Promise<void> {
    if (!userId || userId === 'guest') return;
    try {
      const guestKey = this.getStorageKey('guest');
      const guestRaw = await AsyncStorage.getItem(guestKey);
      if (!guestRaw) return;

      const guestThread = JSON.parse(guestRaw);
      if (Array.isArray(guestThread) && guestThread.length > 0) {
        const userThread = await this.loadThread(userId);
        const merged = [...guestThread, ...userThread].slice(-MAX_SAVED_MESSAGES);
        await this.saveThread(merged, userId);
        await AsyncStorage.removeItem(guestKey);
      }
    } catch (error) {
      console.warn('ChatHistoryStorage: Failed to migrate guest thread', error);
    }
  }

  /**
   * Clears chat history for the given user.
   */
  async clearHistory(userId?: string | null): Promise<void> {
    try {
      const key = this.getStorageKey(userId);
      const legacyKey = this.getLegacyStorageKey(userId);
      await AsyncStorage.removeItem(key);
      await AsyncStorage.removeItem(legacyKey);
    } catch (error) {
      console.warn('ChatHistoryStorage: Failed to clear history', error);
    }
  }

  /**
   * Backward-compatibility methods for existing ChatMessage callers
   */
  async loadMessages(userId?: string): Promise<ChatMessage[]> {
    const thread = await this.loadThread(userId);
    return thread.map(m => ({
      id: m.id,
      sender: m.role === 'user' ? 'user' : 'ria',
      text: m.text || '',
      timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isError: m.status === 'failed',
      isStreaming: m.status === 'streaming',
      isInterrupted: m.status === 'interrupted',
    }));
  }

  async saveMessages(messages: ChatMessage[], userId?: string): Promise<void> {
    const thread: RiaMessage[] = messages.map(m => ({
      id: m.id,
      role: m.sender === 'user' ? 'user' : 'ria',
      kind: m.isError ? 'error' : 'text',
      text: m.text,
      createdAt: Date.now(),
      status: m.isError ? 'failed' : m.isInterrupted ? 'interrupted' : 'done',
    }));
    await this.saveThread(thread, userId);
  }
}

export const ChatHistoryStorage = new ChatHistoryStorageService();
