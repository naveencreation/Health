import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDoc } from 'firebase/firestore';
import { ConversationMemoryManager } from '../ConversationMemoryManager';
import { ChatMessage, ConversationRecord } from '../../types/ai.types';

const UID = 'test_user_123';

const conversation = (id: string, archived?: boolean): ConversationRecord => ({
  id,
  title: id,
  createdAt: '2026-11-10T10:00:00.000Z',
  updatedAt: '2026-11-10T10:00:00.000Z',
  messages: [],
  ...(archived ? { archived } : {}),
});

describe('ConversationMemoryManager', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('strips undefined card fields before the Firestore backup', async () => {
    const messages: ChatMessage[] = [
      {
        id: 'ria_1',
        sender: 'ria',
        text: 'Logged',
        timestamp: '2026-11-10T10:00:00.000Z',
        card: {
          type: 'meal',
          data: { slot: 'lunch', items: [], state: 'proposed', loggedAt: undefined, entryIds: undefined },
        },
      },
    ];

    await ConversationMemoryManager.saveHistory(messages, UID);

    const payload = (setDoc as jest.Mock).mock.calls[0][1];
    const data = payload.messages[0].card.data;
    expect(data).toEqual({ slot: 'lunch', items: [], state: 'proposed' });
    expect('loggedAt' in data).toBe(false);
  });

  it('saving a reopened archived conversation replaces it instead of duplicating', async () => {
    await ConversationMemoryManager.saveConversation(conversation('c1'), UID);
    await ConversationMemoryManager.archiveConversation('c1', UID);

    await ConversationMemoryManager.saveConversation({ ...conversation('c1'), title: 'updated' }, UID);

    const all = await ConversationMemoryManager.loadAllConversations(UID);
    expect(all.filter(c => c.id === 'c1')).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: 'c1', title: 'updated' });
    expect(all[0].archived).toBeUndefined();
  });

  it('saving an active conversation again keeps a single copy', async () => {
    await ConversationMemoryManager.saveConversation(conversation('c1'), UID);
    await ConversationMemoryManager.saveConversation(conversation('c2'), UID);
    await ConversationMemoryManager.saveConversation(conversation('c1'), UID);

    const all = await ConversationMemoryManager.loadAllConversations(UID);
    expect(all.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('archives the oldest chat past 10 instead of deleting it', async () => {
    for (let n = 1; n <= 11; n++) {
      await ConversationMemoryManager.saveConversation(conversation(`c${n}`), UID);
    }

    const active = await ConversationMemoryManager.loadConversations(UID);
    const all = await ConversationMemoryManager.loadAllConversations(UID);
    expect(active).toHaveLength(10);
    expect(active.map(c => c.id)).not.toContain('c1');
    expect(all.find(c => c.id === 'c1')?.archived).toBe(true);
  });
});
