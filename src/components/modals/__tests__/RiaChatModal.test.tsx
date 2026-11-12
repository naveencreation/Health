import React from 'react';
import { BackHandler } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { RiaChatModal } from '../RiaChatModal';
import type { ChatMessage, ConversationRecord } from '@/services/ai/types/ai.types';

const TS = '2026-11-11T09:00:00.000Z';

const mockSetSelectedDate = jest.fn();
const mockAddMealItem = jest.fn(() => ({ id: 'meal_entry_1' }));
const mockAddWater = jest.fn();
const mockDailyLog = {
  totalConsumed: 800,
  remainingCalories: 1200,
  totalProtein: 40,
  totalCarbs: 90,
  totalFat: 30,
  currentLog: { date: '2026-11-11', meals: [], waterMl: 0, steps: 0 },
  addMealItem: mockAddMealItem,
  removeMealItem: jest.fn(),
  addWater: mockAddWater,
  logWeight: jest.fn(),
  selectedDate: '2026-11-09',
  setSelectedDate: mockSetSelectedDate,
  todayStr: '2026-11-11',
};

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => mockDailyLog,
  useGoals: () => ({ userGoals: { name: 'Asha', targetProtein: 90 }, updateGoals: jest.fn() }),
  useAuth: () => ({ currentUser: { id: 'test_user_123', name: 'Asha' } }),
  useAnalytics: () => ({ dailyLogs: {} }),
}));

jest.mock('@/navigation/OverlayContext', () => ({ useOptionalOverlay: () => null }));

jest.mock('@/services/ai', () => ({
  AIService: {
    isKeyConfigured: jest.fn(),
    loadChatHistory: jest.fn(),
    loadAllConversations: jest.fn(),
    saveChatHistory: jest.fn(),
    saveConversation: jest.fn(),
    clearChatHistory: jest.fn(),
    streamChat: jest.fn(),
  },
  MetabolicAdaptiveEngine: { analyzeMetabolism: jest.fn() },
}));
const mockAI = jest.requireMock('@/services/ai').AIService as Record<string, jest.Mock>;
jest.mock('@/services/ai/cards/RiaCardParser', () => ({
  RiaCardParser: { parseMessage: jest.fn() },
  resolveContextualMealSlot: () => 'snack',
}));

// Stub card: buttons that call the chat's real handlers
jest.mock('@/features/ria/cards/RiaActionCard', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    RiaActionCard: ({ card, messageId, ...p }: any) => {
      if (card.type === 'meal')
        return (
          <>
            <Pressable testID="log-meal" onPress={() => p.onConfirmMeal(messageId, card.data)}>
              <Text>meal</Text>
            </Pressable>
            <Pressable testID="dismiss-meal" onPress={() => p.onDismissMeal(messageId, card.data)}>
              <Text>not now</Text>
            </Pressable>
          </>
        );
      if (card.type === 'water')
        return (
          <Pressable testID="undo-water" onPress={() => p.onUndoWater(messageId, card.data)}>
            <Text>water</Text>
          </Pressable>
        );
      return (
        <Pressable
          testID="log-option"
          onPress={() => p.onLogSuggestionOption(messageId, card.data.options[0])}
        >
          <Text>suggestion</Text>
        </Pressable>
      );
    },
  };
});
jest.mock('../../common/MarkdownText', () => {
  const { Text } = jest.requireActual('react-native');
  return { MarkdownText: ({ content }: any) => <Text>{content}</Text> };
});
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const chat: ChatMessage[] = [
  { id: 'user_1', sender: 'user', text: 'Plan my lunch', timestamp: TS },
  {
    id: 'ria_meal',
    sender: 'ria',
    text: 'Dal and rice',
    timestamp: TS,
    card: {
      type: 'meal',
      data: {
        slot: 'lunch',
        state: 'proposed',
        items: [
          {
            name: 'Dal',
            qty: 1,
            unit: 'katori',
            kcal: 150,
            protein: 9,
            carbs: 20,
            fat: 4,
            source: 'estimate',
          },
        ],
      },
    },
  },
  {
    id: 'ria_water',
    sender: 'ria',
    text: 'Water logged',
    timestamp: TS,
    card: { type: 'water', data: { amountMl: 250, state: 'logged', loggedAt: 1 } },
  },
  {
    id: 'ria_snack',
    sender: 'ria',
    text: 'Snack ideas',
    timestamp: TS,
    card: {
      type: 'suggestion',
      data: { options: [{ name: 'Greek yogurt', kcal: 120, protein: 12, carbs: 8, fat: 3 }] },
    },
  },
];

const conversation = (id: string, messages: ChatMessage[]): ConversationRecord => ({
  id,
  title: id,
  createdAt: TS,
  updatedAt: TS,
  messages,
});
const otherChat = [{ id: 'user_2', sender: 'user' as const, text: 'Old question', timestamp: TS }];

const lastSaved = (): ChatMessage[] => {
  const calls = mockAI.saveChatHistory.mock.calls as unknown as [ChatMessage[]][];
  return calls[calls.length - 1][0];
};
const card = (messages: ChatMessage[], id: string) =>
  messages.find(m => m.id === id)!.card!.data as any;

describe('RiaChatModal (Ria tab)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAI.isKeyConfigured.mockResolvedValue(true);
    mockAI.saveChatHistory.mockResolvedValue(undefined);
    mockAI.saveConversation.mockResolvedValue(undefined);
    mockAI.loadChatHistory.mockResolvedValue(chat);
    mockAI.loadAllConversations.mockResolvedValue([
      conversation('conv_current', chat.slice(0, 1)),
      conversation('conv_other', otherChat),
    ]);
  });

  it('switches the selected date to today, so Ria reads and logs today', async () => {
    const screen = await render(<RiaChatModal />);
    await screen.findByTestId('log-meal');
    expect(mockSetSelectedDate).toHaveBeenCalledWith('2026-11-11');
  });

  it('saves the logged meal state with the chat', async () => {
    const screen = await render(<RiaChatModal />);
    await fireEvent.press(await screen.findByTestId('log-meal'));

    expect(mockAddMealItem).toHaveBeenCalledTimes(1);
    // kcal is the total for the qty, so the item is logged once (TD-H1)
    expect(mockAddMealItem).toHaveBeenCalledWith(
      'lunch',
      expect.objectContaining({ calories: 150, servingUnit: '1 katori' }),
      1
    );
    const saved = card(lastSaved(), 'ria_meal');
    expect(saved.state).toBe('logged');
    expect(saved.entryIds).toEqual(['meal_entry_1']);
  });

  it('Not now saves the meal card as dismissed without logging', async () => {
    const screen = await render(<RiaChatModal />);
    await fireEvent.press(await screen.findByTestId('dismiss-meal'));

    expect(mockAddMealItem).not.toHaveBeenCalled();
    expect(card(lastSaved(), 'ria_meal').state).toBe('dismissed');
  });

  it('water Undo removes the water and saves the card as not logged', async () => {
    const screen = await render(<RiaChatModal />);
    await fireEvent.press(await screen.findByTestId('undo-water'));

    expect(mockAddWater).toHaveBeenCalledWith(-250);
    expect(card(lastSaved(), 'ria_water').state).toBe('proposed');
  });

  it('remembers which suggestion options were logged', async () => {
    const screen = await render(<RiaChatModal />);
    await fireEvent.press(await screen.findByTestId('log-option'));

    expect(mockAddMealItem).toHaveBeenCalledWith('snacks', expect.anything(), 1);
    expect(card(lastSaved(), 'ria_snack').loggedOptions).toEqual(['Greek yogurt']);
  });

  it('opening another chat updates the current chat record instead of adding a copy', async () => {
    const screen = await render(<RiaChatModal />);
    await screen.findByTestId('log-meal');
    await fireEvent.press(screen.getByLabelText('Chat history'));
    await fireEvent.press(screen.getByLabelText('Open conversation conv_other'));

    expect(mockAI.saveConversation).toHaveBeenCalledTimes(1);
    expect((mockAI.saveConversation.mock.calls[0] as any)[0].id).toBe('conv_current');
    expect(lastSaved()).toEqual(otherChat);
  });

  it('opening the chat that is already open just closes the list', async () => {
    const screen = await render(<RiaChatModal />);
    await screen.findByTestId('log-meal');
    await fireEvent.press(screen.getByLabelText('Chat history'));
    await fireEvent.press(screen.getByLabelText('Open conversation conv_current'));

    expect(mockAI.saveConversation).not.toHaveBeenCalled();
    expect(screen.queryByText('Recent conversations')).toBeNull();
  });

  it('Android back closes the history sheet instead of leaving the tab', async () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    const screen = await render(<RiaChatModal />);
    await screen.findByTestId('log-meal');
    await fireEvent.press(screen.getByLabelText('Chat history'));
    expect(screen.getByText('Recent conversations')).toBeTruthy();

    const handler = addListener.mock.calls[addListener.mock.calls.length - 1][1] as () => boolean;
    let handled = false;
    await act(async () => {
      handled = handler();
    });

    expect(handled).toBe(true);
    expect(screen.queryByText('Recent conversations')).toBeNull();
    addListener.mockRestore();
  });
});
