import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/services/firebase';
import { ChatMessage, ConversationRecord, ConversationSummary } from '../types/ai.types';
import { AI_CONFIG } from '../config/AIConfig';

class ConversationMemoryManagerService {
  private getChatKey(userId?: string): string {
    return `@calori_ria_chat_${userId || 'guest'}`;
  }

  private getSummaryKey(userId?: string): string {
    return `@calori_ria_summary_${userId || 'guest'}`;
  }

  private getConversationsKey(userId?: string): string {
    return `@calori_ria_conversations_${userId || 'guest'}`;
  }

  /**
   * Returns authenticated Firebase UID if active and matches requested userId.
   * Prevents premature Firestore calls before auth token restoration or in demo/guest modes.
   */
  private getAuthenticatedUid(userId?: string): string | null {
    const authUser = auth.currentUser;
    if (!authUser || !authUser.uid) return null;
    const uid = userId || authUser.uid;
    if (!uid || uid === 'guest' || uid.startsWith('demo_')) return null;
    if (authUser.uid !== uid) return null;
    return uid;
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

      // Fallback: If device cache is empty and user is actively logged in to Firebase Auth, try restoring from Firestore
      const syncUid = this.getAuthenticatedUid(userId);
      if (syncUid) {
        try {
          const snap = await getDoc(doc(db, 'users', syncUid, 'chatHistory', 'recent'));
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.messages) && data.messages.length > 0) {
              const msgs = data.messages.slice(-AI_CONFIG.MEMORY.MAX_PERSISTED_MESSAGES);
              await AsyncStorage.setItem(this.getChatKey(syncUid), JSON.stringify(msgs)).catch(
                () => {}
              );
              return msgs;
            }
          }
        } catch (fsErr) {
          console.warn(
            'ConversationMemoryManager: Firestore history restore failed (non-fatal)',
            fsErr
          );
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
      const syncUid = this.getAuthenticatedUid(userId);
      if (syncUid) {
        setDoc(
          doc(db, 'users', syncUid, 'chatHistory', 'recent'),
          {
            messages: trimmed,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(fsErr => {
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
      const syncUid = this.getAuthenticatedUid(userId);
      if (syncUid) {
        const snap = await getDoc(doc(db, 'users', syncUid, 'chatHistory', 'summary'));
        if (snap.exists()) {
          const data = snap.data() as ConversationSummary;
          if (data?.text) {
            await AsyncStorage.setItem(this.getSummaryKey(syncUid), JSON.stringify(data)).catch(
              () => {}
            );
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
      const syncUid = this.getAuthenticatedUid(userId);
      if (syncUid) {
        setDoc(doc(db, 'users', syncUid, 'chatHistory', 'summary'), summary, { merge: true }).catch(
          () => {}
        );
      }
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to save summary', err);
    }
  }

  /**
   * Returns recent sliding-window turns for active prompt assembly.
   */
  getActiveSlidingWindow(history: ChatMessage[]): ChatMessage[] {
    return history.filter(m => !m.isError).slice(-AI_CONFIG.MEMORY.MAX_ACTIVE_HISTORY_TURNS);
  }

  /**
   * Clears both messages and persistent summary for the user.
   */
  async clearAll(userId?: string): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.getChatKey(userId), this.getSummaryKey(userId)]);

      const syncUid = this.getAuthenticatedUid(userId);
      if (syncUid) {
        deleteDoc(doc(db, 'users', syncUid, 'chatHistory', 'recent')).catch(() => {});
        deleteDoc(doc(db, 'users', syncUid, 'chatHistory', 'summary')).catch(() => {});
      }
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to clear memory', err);
    }
  }

  async loadConversations(userId?: string): Promise<ConversationRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(this.getConversationsKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(item => !item.archived) : [];
    } catch {
      return [];
    }
  }

  async loadAllConversations(userId?: string): Promise<ConversationRecord[]> {
    return this.loadConversationsIncludingArchived(userId);
  }

  async saveConversation(conversation: ConversationRecord, userId?: string): Promise<void> {
    try {
      const existingAll = await this.loadConversationsIncludingArchived(userId);
      const archived = existingAll.filter(item => item.archived);
      const active = existingAll.filter(item => !item.archived && item.id !== conversation.id);
      const next = [conversation, ...active].slice(0, 10).concat(archived);
      await AsyncStorage.setItem(this.getConversationsKey(userId), JSON.stringify(next));
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to save conversation', err);
    }
  }

  async archiveConversation(conversationId: string, userId?: string): Promise<void> {
    try {
      const existing = await this.loadConversationsIncludingArchived(userId);
      const next = existing.map(item =>
        item.id === conversationId ? { ...item, archived: true } : item
      );
      await AsyncStorage.setItem(this.getConversationsKey(userId), JSON.stringify(next));
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to archive conversation', err);
    }
  }

  async restoreConversation(conversationId: string, userId?: string): Promise<void> {
    try {
      const existing = await this.loadConversationsIncludingArchived(userId);
      const next = existing.map(item =>
        item.id === conversationId ? { ...item, archived: false } : item
      );
      await AsyncStorage.setItem(this.getConversationsKey(userId), JSON.stringify(next));
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to restore conversation', err);
    }
  }

  async deleteConversation(conversationId: string, userId?: string): Promise<void> {
    try {
      const existing = await this.loadConversationsIncludingArchived(userId);
      const next = existing.filter(item => item.id !== conversationId);
      await AsyncStorage.setItem(this.getConversationsKey(userId), JSON.stringify(next));
    } catch (err) {
      console.warn('ConversationMemoryManager: Failed to delete conversation', err);
    }
  }

  private async loadConversationsIncludingArchived(userId?: string): Promise<ConversationRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(this.getConversationsKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

export const ConversationMemoryManager = new ConversationMemoryManagerService();
