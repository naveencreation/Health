import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  AppState,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useGoals, useDailyLog, useAnalytics } from '@/context/HealthContext';
import { useOptionalOverlay } from '@/navigation/OverlayContext';
import { BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import {
  AIService,
  ChatMessage,
  ConversationRecord,
  UserNutritionContext,
  MetabolicAdaptiveEngine,
} from '@/services/ai';
import { MarkdownText } from '../common/MarkdownText';
import { RiaCardParser, resolveContextualMealSlot } from '@/services/ai/cards/RiaCardParser';
import { RiaActionCard, RiaActionCardProps } from '@/features/ria/cards/RiaActionCard';
import {
  MealCardData,
  WaterCardData,
  WeightCardData,
  SuggestionOption,
  PlanChangeCardData,
} from '@/services/ai/types/ai.types';
import { FoodItem, MealType } from '@/types';

// Rendered as the Ria tab (App mounts it only while that tab is active)
interface RiaChatModalProps {
  onOpenBYOKSetup?: () => void;
}

type ContextualAction = {
  id: string;
  label: string;
  prompt: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const FALLBACK_ACTIONS: ContextualAction[] = [
  {
    label: 'Plan a high-protein dinner',
    prompt: 'Plan a high-protein dinner',
    icon: 'restaurant-outline' as const,
  },
  {
    label: 'Fit biryani into today',
    prompt: 'Can I fit biryani into today’s calories?',
    icon: 'pie-chart-outline' as const,
  },
  {
    label: 'Find a snack under 120 kcal',
    prompt: 'Find me a snack under 120 calories',
    icon: 'cafe-outline' as const,
  },
  {
    label: 'How did my week go?',
    prompt: 'How did my week go?',
    icon: 'bar-chart-outline' as const,
  },
].map((action, index) => ({ ...action, id: `fallback_${index}` }));

// Icon badge colours for the "Try asking" cards, in FALLBACK_ACTIONS order
const STARTER_TINTS = [
  { bg: Colors.primaryLight, fg: Colors.primaryDeep },
  { bg: Colors.carbsLight, fg: Colors.carbsDark },
  { bg: Colors.waterTrack, fg: Colors.water },
  { bg: Colors.surfaceContainer, fg: Colors.textSlate600 },
];

const RIA_FEATURES: {
  title: string;
  body: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    title: 'Log by chatting',
    body: '“Two rotis and dal” becomes a meal entry you confirm.',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    title: 'Ask before you eat',
    body: '“Can I fit biryani today?” gets an answer from your numbers.',
    icon: 'pie-chart-outline',
  },
  {
    title: 'Plans that fit',
    body: 'Meal ideas sized to the calories and protein you have left.',
    icon: 'restaurant-outline',
  },
];

const RIA_AVATAR = require('../../../assets/ria_avatar.webp');

type SuggestionContext = {
  remainingCalories: number;
  totalProtein: number;
  targetProtein?: number;
  currentHour: number;
};

const getContextualActions = (
  messages: ChatMessage[],
  context: SuggestionContext
): ContextualAction[] => {
  const latestUser = [...messages].reverse().find(message => message.sender === 'user');
  const latestRia = [...messages].reverse().find(message => message.sender === 'ria');
  if (!latestUser) return FALLBACK_ACTIONS;

  const conversationText = `${latestUser?.text || ''} ${latestRia?.text || ''}`.toLowerCase();
  const proteinGap = (context.targetProtein ?? 0) - context.totalProtein;

  if (conversationText.includes('biryani')) {
    return [
      {
        id: 'biryani_portion',
        label: 'How much should I eat?',
        prompt: 'How much biryani should I eat?',
        icon: 'restaurant-outline',
      },
      {
        id: 'biryani_lighter',
        label: 'Make this meal lighter',
        prompt: 'How can I make this biryani meal lighter?',
        icon: 'options-outline',
      },
      {
        id: 'biryani_log',
        label: 'Log this meal',
        prompt: 'Help me estimate and log this biryani meal',
        icon: 'add-circle-outline',
      },
    ];
  }

  if (conversationText.includes('snack') || conversationText.includes('hunger')) {
    return [
      {
        id: 'snack_protein',
        label: 'Show a protein snack',
        prompt: 'Show me a filling high-protein snack',
        icon: 'nutrition-outline',
      },
      {
        id: 'snack_sweet',
        label: 'Something sweet',
        prompt: 'Suggest a healthy sweet snack under 150 calories',
        icon: 'ice-cream-outline',
      },
      {
        id: 'snack_log',
        label: 'Log a snack',
        prompt: 'Help me estimate and log my snack',
        icon: 'add-circle-outline',
      },
    ];
  }

  if (conversationText.includes('water') || conversationText.includes('hydration')) {
    return [
      {
        id: 'water_now',
        label: 'How much should I drink?',
        prompt: 'How much water should I drink right now?',
        icon: 'water-outline',
      },
      {
        id: 'water_goal',
        label: 'Check my water goal',
        prompt: 'How am I doing against my water goal today?',
        icon: 'analytics-outline',
      },
      {
        id: 'water_log',
        label: 'Log a glass',
        prompt: 'Help me log a glass of water',
        icon: 'add-circle-outline',
      },
    ];
  }

  if (conversationText.includes('protein') || proteinGap >= 20) {
    return [
      {
        id: 'protein_dinner',
        label: 'Add protein to dinner',
        prompt: 'How can I add more protein to dinner?',
        icon: 'restaurant-outline',
      },
      {
        id: 'protein_snack',
        label: 'Find a protein snack',
        prompt: 'Find me a high-protein snack',
        icon: 'nutrition-outline',
      },
      {
        id: 'protein_target',
        label: 'Check my protein target',
        prompt: 'How much protein do I still need today?',
        icon: 'analytics-outline',
      },
    ];
  }

  if (context.remainingCalories > 0 && context.remainingCalories <= 550) {
    return [
      {
        id: 'remaining_meal',
        label: `Use my ${context.remainingCalories} kcal`,
        prompt: `What can I eat with ${context.remainingCalories} calories remaining?`,
        icon: 'pie-chart-outline',
      },
      {
        id: 'remaining_dinner',
        label: 'Plan a light meal',
        prompt: 'Plan a light meal that fits my remaining calories',
        icon: 'restaurant-outline',
      },
      {
        id: 'remaining_snack',
        label: 'Find a small snack',
        prompt: 'Find a snack that fits my remaining calories',
        icon: 'cafe-outline',
      },
    ];
  }

  if (context.currentHour >= 18) {
    return [
      {
        id: 'evening_dinner',
        label: 'Plan a light dinner',
        prompt: 'Plan a balanced light dinner for tonight',
        icon: 'restaurant-outline',
      },
      {
        id: 'evening_review',
        label: 'Review today',
        prompt: 'Give me a quick review of my nutrition today',
        icon: 'analytics-outline',
      },
      {
        id: 'evening_snack',
        label: 'Find an evening snack',
        prompt: 'Suggest a healthy evening snack',
        icon: 'cafe-outline',
      },
    ];
  }

  return FALLBACK_ACTIONS;
};

/** Store an absolute time so restored conversations retain truthful metadata. */
const messageTimestamp = () => new Date().toISOString();
// Event-time ids; a module helper keeps the React Compiler purity rule from flagging handlers
const newId = (prefix: string) => `${prefix}_${Date.now()}`;
const currentMinute = () => Math.floor(Date.now() / 60_000);

// Identifies a chat across saves; older chats all start with the same 'welcome_msg' id
const firstUserMessageId = (messages: ChatMessage[]): string | undefined =>
  messages.find(message => message.sender === 'user')?.id;

const conversationTitle = (messages: ChatMessage[]): string => {
  const firstUserMessage = messages.find(message => message.sender === 'user');
  if (!firstUserMessage) return 'Nutrition chat';
  const normalized = firstUserMessage.text.replace(/\s+/g, ' ').trim();
  return normalized.length > 34 ? `${normalized.slice(0, 34).trim()}…` : normalized;
};

const getDisplayFirstName = (userName?: string, goalName?: string): string => {
  const candidate = (userName || goalName || '').trim();
  const genericNames = new Set(['user', 'friend', 'there', 'guest']);
  if (!candidate || genericNames.has(candidate.toLowerCase())) return 'there';
  return candidate.split(/\s+/)[0];
};

const formatMessageTime = (timestamp: string): string => {
  const createdAt = new Date(timestamp);

  // Messages saved by earlier versions only contain the literal "Just now".
  // Do not pretend that a restored message was just sent.
  if (Number.isNaN(createdAt.getTime())) return 'Earlier today';

  const elapsedMinutes = Math.floor((Date.now() - createdAt.getTime()) / 60_000);
  if (elapsedMinutes < 1) return 'Now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  if (createdAt.toDateString() === new Date().toDateString()) {
    return createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return createdAt.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatConversationDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
};

const RIA_ACTION_BLOCK = /```(?:ria_action|json:ria_action)[\s\S]*?(?:```|$)/i;

type CardHandlers = Omit<RiaActionCardProps, 'card' | 'messageId' | 'testID'>;

// Memoized so a streamed token re-renders only the live bubble, not every past message.
// `minute` refreshes the relative timestamps.
const MessageRow = React.memo(function MessageRow({
  msg,
  handlers,
}: {
  msg: ChatMessage;
  handlers: CardHandlers;
  minute: number;
}) {
  const isRia = msg.sender === 'ria';
  return (
    <View style={isRia ? styles.riaMessage : styles.userBubble}>
      {msg.isError ? (
        <Text style={[styles.messageText, styles.errorMsgText]}>{msg.text}</Text>
      ) : isRia ? (
        <>
          {msg.text ? (
            <MarkdownText
              content={msg.text}
              isUser={false}
              baseStyle={[styles.messageText, styles.messageTextRia]}
            />
          ) : null}
          {msg.card ? (
            <View style={styles.cardWrapper}>
              <RiaActionCard card={msg.card} messageId={msg.id} {...handlers} />
            </View>
          ) : null}
        </>
      ) : (
        <Text style={[styles.messageText, styles.messageTextUser]}>{msg.text}</Text>
      )}
      <Text style={[styles.timestamp, isRia ? null : styles.timestampUser]}>
        {formatMessageTime(msg.timestamp)}
      </Text>
    </View>
  );
});

const RiaChatModalComponent: React.FC<RiaChatModalProps> = ({ onOpenBYOKSetup }) => {
  const {
    totalConsumed,
    remainingCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    currentLog,
    addMealItem,
    removeMealItem,
    addWater,
    logWeight,
    selectedDate,
    setSelectedDate,
    todayStr,
  } = useDailyLog();
  const { userGoals, updateGoals } = useGoals();
  const { currentUser } = useAuth();
  const { dailyLogs } = useAnalytics();

  const scrollViewRef = useRef<ScrollView>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Follow new content only while the user is at the bottom, so reading back isn't yanked down
  const atBottomRef = useRef(true);
  // Set synchronously, so a double tap can't start two replies before isStreaming renders
  const sendingRef = useRef(false);

  const [inputQuery, setInputQuery] = useState('');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showNewConversationConfirm, setShowNewConversationConfirm] = useState(false);
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [conversationActionTarget, setConversationActionTarget] =
    useState<ConversationRecord | null>(null);
  const [showDeleteConversationConfirm, setShowDeleteConversationConfirm] = useState(false);
  const [historyTab, setHistoryTab] = useState<'recent' | 'archived'>('recent');
  const [historySearch, setHistorySearch] = useState('');

  const firstName = getDisplayFirstName(currentUser?.name, userGoals.name);
  const contextualActions = useMemo(
    () =>
      getContextualActions(messages, {
        remainingCalories,
        totalProtein,
        targetProtein: userGoals.targetProtein,
        currentHour: new Date().getHours(),
      }),
    [messages, remainingCalories, totalProtein, userGoals.targetProtein]
  );
  const visibleConversations = useMemo(() => {
    const search = historySearch.trim().toLowerCase();
    return conversations.filter(conversation => {
      if (historyTab === 'archived' ? !conversation.archived : conversation.archived) return false;
      if (!search) return true;
      return (
        conversation.title.toLowerCase().includes(search) ||
        conversation.messages.some(message => message.text.toLowerCase().includes(search))
      );
    });
  }, [conversations, historySearch, historyTab]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      setTimeout(
        () => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        },
        Platform.OS === 'ios' ? 50 : 100
      );
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    loadHistory();
    loadConversationHistory();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/) && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsStreaming(false);
        setStreamingText('');
      }
    });

    return () => {
      subscription.remove();
      // Leaving the tab unmounts the chat; stop a reply that is still streaming
      abortControllerRef.current?.abort();
    };
  }, []);

  // Re-check the key whenever no overlay is open, e.g. after the Gemini setup sheet closes
  const activeOverlay = useOptionalOverlay()?.activeModal ?? null;
  useEffect(() => {
    if (activeOverlay === null) checkKeyStatus();
  }, [activeOverlay]);

  // Ria has no date strip: her numbers and the cards she logs are always for today,
  // even if the Today tab was left on another day
  useEffect(() => {
    if (selectedDate !== todayStr) setSelectedDate(todayStr);
  }, [selectedDate, todayStr, setSelectedDate]);

  // Android back closes Ria's own sheets first; otherwise App's handler switches to Today
  const hasOpenSheet =
    showConversationHistory || showNewConversationConfirm || conversationActionTarget !== null;
  useEffect(() => {
    if (!hasOpenSheet) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (conversationActionTarget) {
        setShowDeleteConversationConfirm(false);
        setConversationActionTarget(null);
      } else if (showConversationHistory) {
        setShowConversationHistory(false);
      } else {
        setShowNewConversationConfirm(false);
      }
      return true;
    });
    return () => subscription.remove();
  }, [hasOpenSheet, conversationActionTarget, showConversationHistory]);

  const checkKeyStatus = async () => {
    const configured = await AIService.isKeyConfigured();
    setHasApiKey(configured);
  };

  const loadHistory = async () => {
    const saved = await AIService.loadChatHistory(currentUser?.id);
    setMessages(saved && saved.length > 0 ? saved : []);
  };

  const loadConversationHistory = async () => {
    const savedConversations = await AIService.loadAllConversations(currentUser?.id);
    setConversations(savedConversations);
  };

  const scrollToBottom = () => {
    atBottomRef.current = true;
    setShowScrollToLatest(false);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // An unfinished card block would show as raw JSON, so keep only the prose
    const partialText = streamingText.replace(RIA_ACTION_BLOCK, '').trim();
    if (partialText) {
      const partialMsg: ChatMessage = {
        id: newId('ria'),
        sender: 'ria',
        text: partialText + ' [stopped]',
        timestamp: messageTimestamp(),
      };
      setMessages(prev => {
        const next = [...prev, partialMsg];
        AIService.saveChatHistory(next, currentUser?.id);
        return next;
      });
    }
    setIsStreaming(false);
    setStreamingText('');
  };

  const handleNewConversation = () => {
    const hasUserMessages = messages.some(message => message.sender === 'user');
    if (!hasUserMessages) {
      setInputQuery('');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setShowNewConversationConfirm(true);
  };

  // Saves the open chat to history. A chat reopened from history keeps its record,
  // so it isn't stored twice.
  const saveCurrentConversation = async () => {
    const now = messageTimestamp();
    const currentId = firstUserMessageId(messages);
    const existing = currentId
      ? conversations.find(c => firstUserMessageId(c.messages) === currentId)
      : undefined;
    await AIService.saveConversation(
      {
        id: existing?.id ?? newId('conversation'),
        title: existing?.title ?? conversationTitle(messages),
        createdAt: existing?.createdAt ?? (messages[0]?.timestamp || now),
        updatedAt: messages[messages.length - 1]?.timestamp || now,
        messages,
      },
      currentUser?.id
    );
    await loadConversationHistory();
  };

  // A reply still streaming would land in the next chat, so drop it when switching
  const cancelStream = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingText('');
  };

  const confirmNewConversation = async () => {
    cancelStream();
    await saveCurrentConversation();
    await AIService.clearChatHistory(currentUser?.id);
    setShowNewConversationConfirm(false);
    await loadHistory();
    setInputQuery('');
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const openConversation = async (conversation: ConversationRecord) => {
    // Already open: keep the live messages (they may be newer than the saved copy)
    const currentId = firstUserMessageId(messages);
    if (currentId && currentId === firstUserMessageId(conversation.messages)) {
      setShowConversationHistory(false);
      return;
    }
    cancelStream();
    if (messages.some(message => message.sender === 'user')) {
      await saveCurrentConversation();
    }

    // The memory summary belongs to the chat being left; keeping it would mix chats in the prompt
    await AIService.clearChatHistory(currentUser?.id);
    await AIService.saveChatHistory(conversation.messages, currentUser?.id);
    setMessages(conversation.messages);
    setInputQuery('');
    setShowConversationHistory(false);
    atBottomRef.current = true;
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 60);
  };

  const archiveConversation = async () => {
    if (!conversationActionTarget) return;
    await AIService.archiveConversation(conversationActionTarget.id, currentUser?.id);
    setShowDeleteConversationConfirm(false);
    setConversationActionTarget(null);
    await loadConversationHistory();
  };

  const restoreConversation = async () => {
    if (!conversationActionTarget) return;
    await AIService.restoreConversation(conversationActionTarget.id, currentUser?.id);
    setShowDeleteConversationConfirm(false);
    setConversationActionTarget(null);
    await loadConversationHistory();
  };

  const deleteConversation = async () => {
    if (!conversationActionTarget) return;
    await AIService.deleteConversation(conversationActionTarget.id, currentUser?.id);
    setShowDeleteConversationConfirm(false);
    setConversationActionTarget(null);
    await loadConversationHistory();
  };

  const requestDeleteConversation = () => {
    setShowDeleteConversationConfirm(true);
  };

  // Card state is saved with the chat, so coming back to the tab can't offer "Log" again
  const updateMessage = (messageId: string, update: (message: ChatMessage) => ChatMessage) => {
    const next = messages.map(m => (m.id === messageId ? update(m) : m));
    setMessages(next);
    AIService.saveChatHistory(next, currentUser?.id);
  };

  const handleConfirmMeal = (messageId: string, cardData: MealCardData) => {
    const entryIds: string[] = [];
    const targetSlot: MealType = cardData.slot === 'snack' ? 'snacks' : (cardData.slot as MealType);

    for (const item of cardData.items) {
      const foodItem: FoodItem = {
        id: item.id || `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        category: 'snacks',
        categoryLabel: 'Logged Meal',
        servingUnit: `${item.qty} ${item.unit || 'portion'}`,
        defaultServingSize: 1,
        calories: item.kcal,
        carbs: item.carbs,
        protein: item.protein,
        fat: item.fat,
        fiber: 0,
        icon: '🍱',
      };
      // item.kcal and macros are totals for item.qty, so log one serving of that total (TD-H1)
      const logged = addMealItem(targetSlot, foodItem, 1);
      if (logged?.id) entryIds.push(logged.id);
    }

    const loggedAt = Date.now();
    updateMessage(messageId, m =>
      m.card?.type === 'meal'
        ? {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'logged',
                loggedAt,
                undoUntil: loggedAt + 10000,
                entryIds,
              },
            },
          }
        : m
    );
  };

  const handleUndoMeal = (messageId: string, cardData: MealCardData) => {
    if (cardData.entryIds) {
      for (const id of cardData.entryIds) {
        removeMealItem(id);
      }
    }

    updateMessage(messageId, m =>
      m.card?.type === 'meal'
        ? {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'proposed',
                loggedAt: undefined,
                undoUntil: undefined,
                entryIds: undefined,
              },
            },
          }
        : m
    );
  };

  const handleConfirmWater = (messageId: string, amountMl: number) => {
    addWater(amountMl);
    const loggedAt = Date.now();
    // Undo removes the newest water entry, so it is only safe right after logging
    const undoUntil = loggedAt + 10000;
    updateMessage(messageId, m =>
      m.card?.type === 'water'
        ? {
            ...m,
            card: { ...m.card, data: { ...m.card.data, state: 'logged', loggedAt, undoUntil } },
          }
        : m
    );
  };

  const handleDismissCard = (messageId: string) => {
    updateMessage(messageId, m =>
      m.card?.type === 'meal' || m.card?.type === 'weight' || m.card?.type === 'plan_change'
        ? ({ ...m, card: { ...m.card, data: { ...m.card.data, state: 'dismissed' } } } as typeof m)
        : m
    );
  };

  // A negative addWater removes the newest water entries, i.e. the one this card logged
  const handleUndoWater = (messageId: string, cardData: WaterCardData) => {
    addWater(-cardData.amountMl);
    updateMessage(messageId, m =>
      m.card?.type === 'water'
        ? {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'proposed',
                loggedAt: undefined,
                undoUntil: undefined,
              },
            },
          }
        : m
    );
  };

  const handleConfirmWeight = (messageId: string, cardData: WeightCardData) => {
    logWeight(cardData.weightKg);
    updateGoals({ currentWeightKg: cardData.weightKg });
    const loggedAt = Date.now();
    updateMessage(messageId, m =>
      m.card?.type === 'weight'
        ? { ...m, card: { ...m.card, data: { ...m.card.data, state: 'logged', loggedAt } } }
        : m
    );
  };

  const handleApplyPlanChange = (messageId: string, cardData: PlanChangeCardData) => {
    updateGoals({
      dailyCalorieBudget: cardData.calories,
      targetProtein: cardData.protein,
      targetCarbs: cardData.carbs,
      targetFat: cardData.fat,
    });
    updateMessage(messageId, m =>
      m.card?.type === 'plan_change'
        ? { ...m, card: { ...m.card, data: { ...m.card.data, state: 'applied' } } }
        : m
    );
  };

  const handleLogSuggestionOption = (messageId: string, option: SuggestionOption) => {
    const foodItem: FoodItem = {
      id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: option.name,
      category: 'snacks',
      categoryLabel: 'Suggestion',
      servingUnit: option.portion || 'portion',
      defaultServingSize: 1,
      calories: option.kcal,
      carbs: option.carbs,
      protein: option.protein,
      fat: option.fat,
      fiber: 0,
      icon: '🍱',
    };
    // Same rule the card uses to name the meal
    const cardSlot = resolveContextualMealSlot();
    const slot: MealType = cardSlot === 'snack' ? 'snacks' : cardSlot;
    addMealItem(slot, foodItem, 1);
    updateMessage(messageId, m =>
      m.card?.type === 'suggestion'
        ? {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                loggedOptions: [...(m.card.data.loggedOptions ?? []), option.name],
              },
            },
          }
        : m
    );
  };

  // Memoized rows keep these across renders, so they forward to the newest closures (fresh state)
  const latestHandlersRef = useRef<CardHandlers>({});
  useLayoutEffect(() => {
    latestHandlersRef.current = {
      onConfirmMeal: handleConfirmMeal,
      onUndoMeal: handleUndoMeal,
      onDismissMeal: handleDismissCard,
      onConfirmWater: handleConfirmWater,
      onUndoWater: handleUndoWater,
      onConfirmWeight: handleConfirmWeight,
      onDismissWeight: handleDismissCard,
      onLogSuggestionOption: handleLogSuggestionOption,
      onApplyPlanChange: handleApplyPlanChange,
      onDismissPlanChange: handleDismissCard,
    };
  });
  const lastTapRef = useRef({ key: '', at: 0 });
  const cardHandlers = useMemo<CardHandlers>(() => {
    const h = latestHandlersRef;
    // A double tap lands before the card re-renders as logged, which would log twice
    // shortcut: drops a repeat of the same action within 600 ms; move to per-card pending state if it misfires
    const once = (key: string, run: () => void) => {
      const now = Date.now();
      if (lastTapRef.current.key === key && now - lastTapRef.current.at < 600) return;
      lastTapRef.current = { key, at: now };
      run();
    };
    return {
      onConfirmMeal: (id, data) => once(`meal:${id}`, () => h.current.onConfirmMeal?.(id, data)),
      onUndoMeal: (id, data) => once(`undo:${id}`, () => h.current.onUndoMeal?.(id, data)),
      onDismissMeal: (id, data) => h.current.onDismissMeal?.(id, data),
      onConfirmWater: (id, ml, data) =>
        once(`water:${id}`, () => h.current.onConfirmWater?.(id, ml, data)),
      onUndoWater: (id, data) => once(`undo:${id}`, () => h.current.onUndoWater?.(id, data)),
      onConfirmWeight: (id, data) =>
        once(`weight:${id}`, () => h.current.onConfirmWeight?.(id, data)),
      onDismissWeight: (id, data) => h.current.onDismissWeight?.(id, data),
      onLogSuggestionOption: (id, opt) =>
        once(`opt:${id}:${opt.name}`, () => h.current.onLogSuggestionOption?.(id, opt)),
      onApplyPlanChange: (id, data) =>
        once(`plan:${id}`, () => h.current.onApplyPlanChange?.(id, data)),
      onDismissPlanChange: (id, data) => h.current.onDismissPlanChange?.(id, data),
    };
  }, []);
  const minute = currentMinute();

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isStreaming || sendingRef.current) return;
    sendingRef.current = true;
    try {
      await sendMessage(text);
    } finally {
      sendingRef.current = false;
    }
  };

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: newId('user'),
      sender: 'user',
      text,
      timestamp: messageTimestamp(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputQuery('');
    scrollToBottom();

    // Check if BYOK Gemini Key is available
    const keyAvailable = await AIService.isKeyConfigured();
    setHasApiKey(keyAvailable);

    if (keyAvailable) {
      AIService.saveChatHistory(newMessages, currentUser?.id);
      // 1. LIVE GEMINI 3.5 FLASH STREAMING
      setIsStreaming(true);
      setStreamingText('');
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const recentLogs = Object.values(dailyLogs || {});
      const metabolicInsight = MetabolicAdaptiveEngine.analyzeMetabolism(recentLogs, userGoals);

      const telemetryContext: UserNutritionContext = {
        name: firstName,
        riaTone: userGoals.riaTone || 'supportive',
        dailyCalorieBudget: userGoals.dailyCalorieBudget,
        remainingCalories,
        consumedCalories: totalConsumed,
        targetProtein: userGoals.targetProtein,
        consumedProtein: totalProtein,
        targetCarbs: userGoals.targetCarbs,
        consumedCarbs: totalCarbs,
        targetFat: userGoals.targetFat,
        consumedFat: totalFat,
        targetWaterMl: userGoals.waterGoalMl,
        consumedWaterMl: currentLog.waterMl,
        stepGoal: userGoals.stepGoal,
        currentSteps: currentLog.steps,
        currentWeightKg: userGoals.currentWeightKg,
        targetWeightKg: userGoals.targetWeightKg,
        heightCm: userGoals.heightCm,
        age: userGoals.age,
        gender: userGoals.gender,
        metabolicInsight,
        loggedMealsToday: currentLog.meals.map(m => ({
          name: m.name,
          mealType: m.mealType,
          calories: m.calories,
          protein: m.protein,
        })),
      };

      try {
        const fullResponse = await AIService.streamChat(
          text,
          messages,
          telemetryContext,
          // Following the reply is handled by onContentSizeChange, which respects scroll-up
          setStreamingText,
          controller.signal,
          currentUser?.id
        );

        const parsed = RiaCardParser.parseMessage(fullResponse, currentLog, userGoals);

        const riaMsg: ChatMessage = {
          id: newId('ria'),
          sender: 'ria',
          text: parsed.cleanText || fullResponse,
          card: parsed.card,
          timestamp: messageTimestamp(),
        };

        setMessages(prev => {
          const updated = [...prev, riaMsg];
          AIService.saveChatHistory(updated, currentUser?.id);
          return updated;
        });
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          // Handled in handleStopGenerating
          return;
        }

        const errorMsg: ChatMessage = {
          id: newId('ria_err'),
          sender: 'ria',
          text:
            err?.userMessage ||
            err?.message ||
            'Sorry, I had trouble generating a response. Please check your Gemini connection.',
          timestamp: messageTimestamp(),
          isError: true,
        };

        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsStreaming(false);
        setStreamingText('');
        scrollToBottom();
      }
    } else {
      // The connect screen takes over; put the text back so it isn't lost
      setMessages(messages);
      setInputQuery(text);
    }
  };

  const canSend = inputQuery.trim().length > 0 && !isStreaming;
  const hasUserMessages = messages.some(message => message.sender === 'user');
  const isNewChat = !hasUserMessages && !isStreaming;
  // Chats saved before the Ria tab start with a canned welcome bubble; the new-chat view replaces it
  const timeline = messages.filter(message => message.id !== 'welcome_msg');
  const recentConversations = conversations.filter(c => !c.archived).slice(0, 2);
  const proteinTarget = userGoals.targetProtein || BIOMETRIC_DEFAULTS.targetProtein;
  const isOver = remainingCalories < 0;
  const caloriesLeft = Math.round(Math.abs(remainingCalories)).toLocaleString();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Key check still running: render nothing rather than flash the chat before the connect screen
  if (hasApiKey === null) return <View style={styles.screen} />;

  // No Gemini key yet: explain Ria and offer setup instead of a chat that can't answer
  if (hasApiKey === false) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.connectContent}
        showsVerticalScrollIndicator={false}
      >
        <Image source={RIA_AVATAR} style={styles.connectAvatar} contentFit="cover" />
        <Text style={styles.connectTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          Meet Ria, your nutrition coach
        </Text>
        <Text style={styles.connectBody}>
          Ria knows your goals and what you ate today, so her answers fit your day.
        </Text>

        <View style={styles.featureList}>
          {RIA_FEATURES.map(feature => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={18} color={Colors.textPrimary} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureBody}>{feature.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.connectSpacer} />
        <View style={styles.connectCard}>
          <Text style={styles.connectCardTitle}>Connect Gemini to start</Text>
          <Text style={styles.connectCardBody}>
            Ria runs on Google Gemini with your own API key. Setup takes about a minute.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed ? styles.primaryBtnPressed : null]}
            onPress={onOpenBYOKSetup}
            accessibilityRole="button"
            accessibilityLabel="Connect Gemini"
          >
            <Text style={styles.primaryBtnText}>Connect Gemini</Text>
          </Pressable>
          <View style={styles.keyNote}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.keyNoteText}>Your key is stored only on this device.</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      {/* 'padding' on Android too: with edge-to-edge the window may not resize for the keyboard,
          and KeyboardAvoidingView adds no padding when it already has */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {/* Header */}
        <View style={styles.header}>
          <Image source={RIA_AVATAR} style={styles.headerAvatar} contentFit="cover" />
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerName} accessibilityRole="header">
              Ria
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              Your nutrition coach
            </Text>
          </View>
          <Pressable
            onPress={() => setShowConversationHistory(true)}
            style={({ pressed }) => [
              styles.headerActionBtn,
              pressed ? styles.pressedCloseBtn : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Chat history"
          >
            <Ionicons name="time-outline" size={20} color={Colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={handleNewConversation}
            style={({ pressed }) => [
              styles.headerActionBtn,
              pressed ? styles.pressedCloseBtn : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="New chat"
          >
            <Ionicons name="create-outline" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* What Ria knows about today */}
        {hasUserMessages ? (
          <View
            style={styles.todayStrip}
            accessible
            accessibilityLabel={`Today: ${caloriesLeft} kcal ${isOver ? 'over' : 'left'}, protein ${Math.round(totalProtein)} of ${proteinTarget} grams`}
          >
            <Ionicons name="today-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.todayStripText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              <Text style={styles.todayStripValue}>{caloriesLeft}</Text> kcal{' '}
              {isOver ? 'over' : 'left'}
            </Text>
            <View style={styles.todayStripDivider} />
            <Text style={styles.todayStripText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              Protein <Text style={styles.todayStripValue}>{Math.round(totalProtein)}</Text>/
              {proteinTarget} g
            </Text>
          </View>
        ) : null}

        {/* Conversation timeline, or the new-chat screen */}
        <View style={styles.timelineShell}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.flex}
            contentContainerStyle={isNewChat ? styles.newChatContent : styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            scrollEventThrottle={16}
            onScroll={event => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              const distanceFromLatest =
                contentSize.height - (contentOffset.y + layoutMeasurement.height);
              atBottomRef.current = distanceFromLatest <= 120;
              setShowScrollToLatest(!isNewChat && !atBottomRef.current);
            }}
            onContentSizeChange={() => {
              if (!isNewChat && atBottomRef.current) {
                scrollViewRef.current?.scrollToEnd({ animated: !isStreaming });
              }
            }}
          >
            {isNewChat ? (
              <>
                <View style={styles.greetingBlock}>
                  <Text style={styles.greetingTitle} maxFontSizeMultiplier={1.3}>
                    {greeting}, {firstName}
                  </Text>
                  <Text style={styles.greetingBody}>
                    {isOver ? 'You’re ' : 'You have '}
                    <Text style={styles.greetingStrong}>{caloriesLeft} kcal</Text>
                    {isOver ? ' over today.' : ' left today.'} Ask me anything, or tell me what you
                    ate.
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">
                    Try asking
                  </Text>
                  <View style={styles.starterGrid}>
                    {FALLBACK_ACTIONS.map((action, index) => {
                      const tint = STARTER_TINTS[index % STARTER_TINTS.length];
                      return (
                        <Pressable
                          key={action.id}
                          style={({ pressed }) => [
                            styles.starterCard,
                            pressed ? styles.starterCardPressed : null,
                          ]}
                          onPress={() => handleSendMessage(action.prompt)}
                          accessibilityRole="button"
                          accessibilityLabel={`Ask Ria: ${action.label}`}
                        >
                          <View style={[styles.starterIcon, { backgroundColor: tint.bg }]}>
                            <Ionicons name={action.icon} size={18} color={tint.fg} />
                          </View>
                          <Text style={styles.starterText}>{action.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {recentConversations.length > 0 ? (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle} accessibilityRole="header">
                        Recent
                      </Text>
                      <Pressable
                        onPress={() => setShowConversationHistory(true)}
                        style={styles.seeAllBtn}
                        accessibilityRole="button"
                        accessibilityLabel="See all conversations"
                      >
                        <Text style={styles.seeAllText}>See all</Text>
                      </Pressable>
                    </View>
                    <View style={styles.recentList}>
                      {recentConversations.map((conversation, index) => (
                        <Pressable
                          key={conversation.id}
                          style={({ pressed }) => [
                            styles.recentRow,
                            index > 0 ? styles.recentRowDivider : null,
                            pressed ? styles.recentRowPressed : null,
                          ]}
                          onPress={() => openConversation(conversation)}
                          accessibilityRole="button"
                          accessibilityLabel={`Open conversation ${conversation.title}`}
                        >
                          <View style={styles.recentCopy}>
                            <Text style={styles.recentTitle} numberOfLines={1}>
                              {conversation.title}
                            </Text>
                            <Text style={styles.recentDate}>
                              {formatConversationDate(conversation.updatedAt)}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {timeline.length > 0 && !Number.isNaN(new Date(timeline[0].timestamp).getTime()) ? (
                  <Text style={styles.dateLabel}>
                    {formatConversationDate(timeline[0].timestamp)}
                  </Text>
                ) : null}

                {timeline.map(msg => (
                  <MessageRow key={msg.id} msg={msg} handlers={cardHandlers} minute={minute} />
                ))}

                {/* Live streaming reply */}
                {isStreaming ? (
                  <View style={styles.riaMessage}>
                    {streamingText ? (
                      <MarkdownText
                        content={streamingText.replace(RIA_ACTION_BLOCK, '').trim() || 'Thinking…'}
                        isUser={false}
                        baseStyle={[styles.messageText, styles.messageTextRia]}
                      />
                    ) : null}
                    <View style={styles.streamingIndicatorRow}>
                      <View style={styles.streamingStatusDot} />
                      <Text style={styles.streamingLabel}>
                        {streamingText ? 'Ria is writing…' : 'Ria is thinking…'}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
          {showScrollToLatest ? (
            <Pressable
              style={({ pressed }) => [
                styles.scrollLatestButton,
                pressed ? styles.pressedScrollLatestButton : null,
              ]}
              onPress={scrollToBottom}
              accessibilityRole="button"
              accessibilityLabel="Scroll to latest message"
            >
              <Ionicons name="chevron-down" size={18} color={Colors.textPrimary} />
            </Pressable>
          ) : null}
        </View>

        {/* Stop generating */}
        {isStreaming ? (
          <View style={styles.stopGeneratingRow}>
            <Pressable
              style={({ pressed }) => [styles.stopBtn, pressed ? styles.pressedCloseBtn : null]}
              onPress={handleStopGenerating}
              accessibilityRole="button"
              accessibilityLabel="Stop Ria's reply"
            >
              <Ionicons name="stop-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.stopBtnText}>Stop</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Follow-up suggestions (the new-chat view has its own starters) */}
        {!isNewChat && !isStreaming && inputQuery.length === 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickChipsWrapper}
            contentContainerStyle={styles.quickChipsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {contextualActions.map(chip => (
              <Pressable
                key={chip.id}
                style={({ pressed }) => [
                  styles.quickChip,
                  pressed ? styles.pressedQuickChip : null,
                ]}
                onPress={() => handleSendMessage(chip.prompt)}
                accessibilityRole="button"
                accessibilityLabel={`Ask Ria: ${chip.label}`}
              >
                <Text style={styles.quickChipText}>{chip.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Composer */}
        <View style={[styles.inputBar, keyboardHeight > 0 ? styles.inputBarKeyboard : null]}>
          <View
            style={[styles.composerSurface, isInputFocused ? styles.composerSurfaceFocused : null]}
          >
            <TextInput
              style={styles.textInput}
              placeholder="Ask Ria or log a meal"
              placeholderTextColor={Colors.textMuted}
              value={inputQuery}
              onChangeText={setInputQuery}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
              multiline
              maxFontSizeMultiplier={1.3}
              selectionColor={Colors.primary}
              cursorColor={Colors.primaryDeep}
              textAlignVertical="center"
              accessibilityLabel="Message Ria"
              onFocus={() => {
                setIsInputFocused(true);
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 80);
              }}
              onBlur={() => setIsInputFocused(false)}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                canSend ? styles.sendBtnActive : null,
                pressed && canSend ? styles.pressedSendBtn : null,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend }}
              accessibilityLabel="Send message to Ria"
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={canSend ? Colors.onPrimary : Colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {showNewConversationConfirm ? (
        <View style={styles.confirmOverlay}>
          <Pressable
            style={styles.confirmBackdrop}
            onPress={() => setShowNewConversationConfirm(false)}
            accessibilityLabel="Dismiss new conversation confirmation"
          />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmEyebrow}>NEW CONVERSATION</Text>
            <Text style={styles.confirmTitle}>Start fresh with Ria?</Text>
            <Text style={styles.confirmBody}>
              Your current conversation will be saved in recent history.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancel}
                onPress={() => setShowNewConversationConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Keep chatting</Text>
              </Pressable>
              <Pressable style={styles.confirmPrimary} onPress={confirmNewConversation}>
                <Text style={styles.confirmPrimaryText}>Start new</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {showConversationHistory ? (
        // The screen doesn't shrink for the keyboard (Android edge-to-edge, iOS), so lift the sheet above it
        <View
          style={[
            styles.historyOverlay,
            keyboardHeight > 0 ? { paddingBottom: keyboardHeight + 12 } : null,
          ]}
        >
          <Pressable
            style={styles.confirmBackdrop}
            onPress={() => setShowConversationHistory(false)}
            accessibilityLabel="Dismiss conversation history"
          />
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.confirmEyebrow}>RIA AI COACH</Text>
                <Text style={styles.historyTitle}>Recent conversations</Text>
              </View>
              <Pressable
                style={styles.historyClose}
                onPress={() => setShowConversationHistory(false)}
                accessibilityRole="button"
                accessibilityLabel="Close conversation history"
              >
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.historyTabs}>
              <Pressable
                style={[
                  styles.historyTab,
                  historyTab === 'recent' ? styles.historyTabActive : null,
                ]}
                onPress={() => setHistoryTab('recent')}
              >
                <Text
                  style={[
                    styles.historyTabText,
                    historyTab === 'recent' ? styles.historyTabTextActive : null,
                  ]}
                >
                  Recent
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.historyTab,
                  historyTab === 'archived' ? styles.historyTabActive : null,
                ]}
                onPress={() => setHistoryTab('archived')}
              >
                <Text
                  style={[
                    styles.historyTabText,
                    historyTab === 'archived' ? styles.historyTabTextActive : null,
                  ]}
                >
                  Archived
                </Text>
              </Pressable>
            </View>
            <View style={styles.historySearchField}>
              <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.historySearchInput}
                value={historySearch}
                onChangeText={setHistorySearch}
                placeholder="Search conversations"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="search"
              />
            </View>
            {visibleConversations.length > 0 ? (
              <ScrollView
                style={styles.historyList}
                contentContainerStyle={styles.historyListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {visibleConversations.map(conversation => (
                  <Pressable
                    key={conversation.id}
                    style={({ pressed }) => [
                      styles.historyItem,
                      pressed ? styles.historyItemPressed : null,
                    ]}
                    onPress={() => openConversation(conversation)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open conversation ${conversation.title}`}
                  >
                    <View style={styles.historyItemIcon}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={17}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={styles.historyItemCopy}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>
                        {conversation.title}
                      </Text>
                      <Text style={styles.historyItemDate}>
                        {formatConversationDate(conversation.updatedAt)}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.historyItemMenu}
                      onPress={event => {
                        event.stopPropagation();
                        setConversationActionTarget(conversation);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Manage conversation ${conversation.title}`}
                    >
                      <Ionicons name="ellipsis-horizontal" size={17} color={Colors.textSecondary} />
                    </Pressable>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.historyEmpty}>
                <Ionicons name="time-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.historyEmptyTitle}>
                  {historySearch
                    ? 'No matching conversations'
                    : historyTab === 'archived'
                      ? 'No archived conversations'
                      : 'No previous conversations'}
                </Text>
                <Text style={styles.historyEmptyBody}>
                  {historySearch
                    ? 'Try a different search term.'
                    : 'Start a new chat and it will appear here.'}
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : null}
      {conversationActionTarget ? (
        <View style={styles.historyActionOverlay}>
          <Pressable
            style={styles.confirmBackdrop}
            onPress={() => {
              setShowDeleteConversationConfirm(false);
              setConversationActionTarget(null);
            }}
            accessibilityLabel="Dismiss conversation actions"
          />
          <View style={styles.historyActionCard}>
            <Text style={styles.confirmEyebrow}>CONVERSATION</Text>
            <Text style={styles.historyActionTitle} numberOfLines={1}>
              {conversationActionTarget.title}
            </Text>
            {showDeleteConversationConfirm ? (
              <>
                <Text style={styles.historyDeleteBody}>
                  This conversation will be permanently removed from this device.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={styles.confirmCancel}
                    onPress={() => setShowDeleteConversationConfirm(false)}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.historyDeleteButton} onPress={deleteConversation}>
                    <Text style={styles.confirmPrimaryText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.historyActionRow}
                  onPress={
                    conversationActionTarget.archived ? restoreConversation : archiveConversation
                  }
                >
                  <Ionicons
                    name={
                      conversationActionTarget.archived ? 'arrow-undo-outline' : 'archive-outline'
                    }
                    size={19}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.historyActionText}>
                    {conversationActionTarget.archived
                      ? 'Restore conversation'
                      : 'Archive conversation'}
                  </Text>
                </Pressable>
                <Pressable style={styles.historyActionRow} onPress={requestDeleteConversation}>
                  <Ionicons name="trash-outline" size={19} color="#DC2626" />
                  <Text style={styles.historyDeleteText}>Delete conversation</Text>
                </Pressable>
              </>
            )}
            <Pressable
              style={styles.historyActionCancel}
              onPress={() => {
                setShowDeleteConversationConfirm(false);
                setConversationActionTarget(null);
              }}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  // --- No key: connect screen ---
  connectContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  connectAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderCurve: 'continuous',
    marginBottom: 16,
  },
  connectTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.7,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  connectBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSlate600,
  },
  featureList: {
    marginTop: 24,
    gap: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  featureBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  // Pushes the connect card to the bottom on tall screens, keeps a gap on short ones
  connectSpacer: {
    flexGrow: 1,
    minHeight: 28,
  },
  connectCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 16,
    gap: 12,
  },
  connectCardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  connectCardBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.onPrimary,
  },
  keyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keyNoteText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
  },
  headerTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  pressedCloseBtn: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  todayStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
  },
  todayStripText: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSlate600,
  },
  todayStripValue: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
  },
  todayStripDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.borderSubtle,
  },
  // --- Timeline / new chat ---
  timelineShell: {
    flex: 1,
    position: 'relative',
  },
  newChatContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 24,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },
  greetingBlock: {
    gap: 6,
  },
  greetingTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: Colors.textPrimary,
  },
  greetingBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSlate600,
  },
  greetingStrong: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  // Two cards per row at any phone width: each grows from a 40% basis to fill the row
  starterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  starterCard: {
    flexGrow: 1,
    flexBasis: '40%',
    minHeight: 108,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
  },
  starterCardPressed: {
    backgroundColor: Colors.cardHover,
    transform: [{ scale: 0.985 }],
  },
  starterIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  seeAllText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.primaryDeep,
  },
  recentList: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recentRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
  },
  recentRowPressed: {
    backgroundColor: Colors.cardHover,
  },
  recentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  recentTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  recentDate: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  dateLabel: {
    alignSelf: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Ria replies read as plain text at full width; only the user's turns are bubbles
  riaMessage: {
    alignSelf: 'stretch',
    paddingRight: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    backgroundColor: Colors.primaryLight,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    includeFontPadding: false,
  },
  messageTextRia: {
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textPrimary,
  },
  messageTextUser: {
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textPrimary,
  },
  errorMsgText: {
    fontFamily: Fonts.urbanist.medium,
    color: '#DC2626',
  },
  cardWrapper: {
    marginTop: 10,
    width: '100%',
  },
  timestamp: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
    color: Colors.textSecondary,
  },
  timestampUser: {
    textAlign: 'right',
    color: Colors.textSlate600,
  },
  streamingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  streamingStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  streamingLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scrollLatestButton: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  pressedScrollLatestButton: {
    transform: [{ scale: 0.95 }],
    opacity: 0.88,
  },
  stopGeneratingRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 18,
    borderCurve: 'continuous',
  },
  stopBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  // --- Suggestions + composer ---
  quickChipsWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  quickChipsScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 8,
  },
  quickChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 18,
    borderCurve: 'continuous',
  },
  pressedQuickChip: {
    backgroundColor: Colors.cardHover,
    transform: [{ scale: 0.98 }],
  },
  quickChipText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
  },
  inputBarKeyboard: {
    paddingBottom: 8,
  },
  composerSurface: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    backgroundColor: Colors.card,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  composerSurfaceFocused: {
    borderColor: Colors.primary,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 0,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textPrimary,
    includeFontPadding: false,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  sendBtnActive: {
    backgroundColor: Colors.primaryDeep,
  },
  pressedSendBtn: {
    transform: [{ scale: 0.94 }],
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 20,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  confirmEyebrow: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    color: Colors.primary,
  },
  confirmTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 19,
    lineHeight: 24,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  confirmBody: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  confirmCancel: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  confirmCancelText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  confirmPrimary: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.primary,
  },
  confirmPrimaryText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.onPrimary,
  },
  historyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    zIndex: 21,
  },
  historyCard: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '72%',
    flexShrink: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderInset,
  },
  historyTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 19,
    lineHeight: 24,
    color: Colors.textPrimary,
    marginTop: 5,
  },
  historyTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 12,
  },
  historyTab: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 15,
    borderCurve: 'continuous',
  },
  historyTabActive: {
    backgroundColor: '#FFF3EE',
  },
  historyTabText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  historyTabTextActive: {
    color: Colors.primaryDeep,
  },
  historySearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    marginTop: 8,
    paddingHorizontal: 10,
    gap: 7,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceLow,
  },
  historySearchInput: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 0,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textPrimary,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  historyClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyList: {
    flexGrow: 0,
    flexShrink: 1,
  },
  historyListContent: {
    paddingTop: 8,
    gap: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 10,
  },
  historyItemPressed: {
    backgroundColor: Colors.surfaceLow,
  },
  historyItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: 'continuous',
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItemCopy: {
    flex: 1,
    gap: 2,
  },
  historyItemTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textPrimary,
  },
  historyItemDate: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textMuted,
  },
  historyItemMenu: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmpty: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
    gap: 6,
  },
  historyEmptyTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  historyEmptyBody: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  historyActionOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 22,
    zIndex: 22,
  },
  historyActionCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderInset,
    gap: 4,
  },
  historyActionTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    lineHeight: 21,
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: 8,
  },
  historyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    gap: 10,
    paddingHorizontal: 4,
  },
  historyActionText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  historyDeleteText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#DC2626',
  },
  historyDeleteBody: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  historyDeleteButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#DC2626',
  },
  historyActionCancel: {
    alignItems: 'center',
    minHeight: 38,
    justifyContent: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderInset,
  },
});

export const RiaChatModal = React.memo(RiaChatModalComponent);
