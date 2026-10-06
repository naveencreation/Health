/**
 * ChatHistoryStorage.test.ts
 * 
 * Unit tests for ChatHistoryStorage:
 * - Thread persistence up to 50 messages
 * - Legacy ChatMessage normalization to RiaMessage
 * - Guest thread migration to user account
 * - Clearing history
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatHistoryStorage } from '../ChatHistoryStorage';
import { RiaMessage } from '../../types/ai.types';

describe('ChatHistoryStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('loads empty array when no thread exists', async () => {
    const thread = await ChatHistoryStorage.loadThread('user_1');
    expect(thread).toEqual([]);
  });

  it('saves and loads up to 50 RiaMessages', async () => {
    const messages: RiaMessage[] = Array.from({ length: 60 }).map((_, i) => ({
      id: `msg_${i}`,
      role: i % 2 === 0 ? 'user' : 'ria',
      kind: 'text',
      text: `Hello ${i}`,
      createdAt: Date.now() + i * 1000,
      status: 'done',
    }));

    await ChatHistoryStorage.saveThread(messages, 'user_1');
    const loaded = await ChatHistoryStorage.loadThread('user_1');

    // Clamped to 50
    expect(loaded.length).toBe(50);
    // Preserves the latest 50
    expect(loaded[0].id).toBe('msg_10');
    expect(loaded[49].id).toBe('msg_59');
  });

  it('normalizes legacy ChatMessage format into RiaMessage format', async () => {
    const legacy = [
      {
        id: 'legacy_1',
        sender: 'user',
        text: 'What should I eat?',
        timestamp: '10:00 AM',
      },
      {
        id: 'legacy_2',
        sender: 'ria',
        text: 'Eat an apple.',
        timestamp: '10:01 AM',
      },
    ];

    await AsyncStorage.setItem('@calori_ria_chat_user_1', JSON.stringify(legacy));

    const loaded = await ChatHistoryStorage.loadThread('user_1');
    expect(loaded.length).toBe(2);
    expect(loaded[0].role).toBe('user');
    expect(loaded[0].text).toBe('What should I eat?');
    expect(loaded[1].role).toBe('ria');
    expect(loaded[1].text).toBe('Eat an apple.');
  });

  it('migrates guest thread to user on signup', async () => {
    const guestMessages: RiaMessage[] = [
      {
        id: 'guest_msg_1',
        role: 'user',
        kind: 'text',
        text: 'Guest query',
        createdAt: 1000,
        status: 'done',
      },
    ];

    await ChatHistoryStorage.saveThread(guestMessages, 'guest');

    await ChatHistoryStorage.migrateGuestThread('user_registered');

    const userThread = await ChatHistoryStorage.loadThread('user_registered');
    expect(userThread.length).toBe(1);
    expect(userThread[0].text).toBe('Guest query');

    // Guest thread cleared
    const guestAfter = await ChatHistoryStorage.loadThread('guest');
    expect(guestAfter).toEqual([]);
  });

  it('clears history cleanly', async () => {
    const messages: RiaMessage[] = [
      {
        id: 'msg_1',
        role: 'user',
        kind: 'text',
        text: 'Sample',
        createdAt: 1000,
        status: 'done',
      },
    ];

    await ChatHistoryStorage.saveThread(messages, 'user_1');
    await ChatHistoryStorage.clearHistory('user_1');

    const loaded = await ChatHistoryStorage.loadThread('user_1');
    expect(loaded).toEqual([]);
  });
});
