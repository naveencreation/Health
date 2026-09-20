import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/services/firebase';
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
   * Retrieves short-term conversation turns from device storage (or Firestore backup if device cache empty).
   */
  async loadHistory(userId?: string): Promise<ChatMessage[]> {
    try {
      const raw = await AsyncStorage.getItem(this.getChatKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(-AI_CONFIG.MEMORY.MAX_PERSISTED_MESSAGES);
        }
      }

      // Fallback: If device cache is empty and user is logged in, try restoring from Firestore
      const uid = userId || auth.currentUser?.uid;
      if (uid && uid !== 'guest') {
        try {
          const snap = await getDoc(doc(db, 'users', uid, 'chatHistory', 'recent'));
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.messages) && data.messages.length > 0) {
              const msgs = data.messages.slice(-AI_CONFIG.MEMORY.MAX_PERSISTED_MESSAGES);
              await AsyncStorage.setItem(this.getChatKey(uid), JSON.stringify(msgs)).catch(() => {});
              return msgs;
            }
          }
        } catch (fsErr) {
          console.warn('ConversationMemoryManager: Firestore history restore failed (non-fatal)', fsErr);
        }
      }

      return [];
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to load history', err);
      return [];
    }
  }

  /**
   * Persists message array to device storage and backs up to Firestore.
   */
  async saveHistory(messages: ChatMessage[], userId?: string): Promise<void> {
    try {
      const trimmed = messages.slice(-AI_CONFIG.MEMORY.MAX_PERSISTED_MESSAGES);
      await AsyncStorage.setItem(this.getChatKey(userId), JSON.stringify(trimmed));

      // Backup to Firestore
      const uid = userId || auth.currentUser?.uid;
      if (uid && uid !== 'guest') {
        setDoc(
          doc(db, 'users', uid, 'chatHistory', 'recent'),
          {
            messages: trimmed,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch((fsErr) => {
          console.warn('ConversationMemoryManager: Firestore backup failed (non-fatal)', fsErr);
        });
      }
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
      if (raw) return JSON.parse(raw);

      // Fallback: Check Firestore
      const uid = userId || auth.currentUser?.uid;
      if (uid && uid !== 'guest') {
        const snap = await getDoc(doc(db, 'users', uid, 'chatHistory', 'summary'));
        if (snap.exists()) {
          const data = snap.data() as ConversationSummary;
          if (data?.text) {
            await AsyncStorage.setItem(this.getSummaryKey(uid), JSON.stringify(data)).catch(() => {});
            return data;
          }
        }
      }
      return null;
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

      // Backup to Firestore
      const uid = userId || auth.currentUser?.uid;
      if (uid && uid !== 'guest') {
        setDoc(doc(db, 'users', uid, 'chatHistory', 'summary'), summary, { merge: true }).catch(() => {});
      }
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

      const uid = userId || auth.currentUser?.uid;
      if (uid && uid !== 'guest') {
        deleteDoc(doc(db, 'users', uid, 'chatHistory', 'recent')).catch(() => {});
        deleteDoc(doc(db, 'users', uid, 'chatHistory', 'summary')).catch(() => {});
      }
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to clear memory', err);
    }
  }
}

export const ConversationMemoryManager = new ConversationMemoryManagerService();
