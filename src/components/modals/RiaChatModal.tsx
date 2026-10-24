import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Bot, KeyRound } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useGoals, useDailyLog } from '@/context/HealthContext';
import { AIService, ChatMessage, ConversationRecord, UserNutritionContext } from '@/services/ai';
import { MarkdownText } from '../common/MarkdownText';

interface RiaChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onOpenBYOKSetup?: () => void;
}

type ContextualAction = {
  id: string;
  label: string;
  prompt: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const FALLBACK_ACTIONS: ContextualAction[] = [
  { label: 'Plan a high-protein dinner', prompt: 'Plan a high-protein dinner', icon: 'restaurant-outline' as const },
  { label: 'Fit biryani into today', prompt: 'Can I fit biryani into today’s calories?', icon: 'pie-chart-outline' as const },
  { label: 'Find a snack under 120 kcal', prompt: 'Find me a snack under 120 calories', icon: 'cafe-outline' as const },
].map((action, index) => ({ ...action, id: `fallback_${index}` }));

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
      { id: 'biryani_portion', label: 'How much should I eat?', prompt: 'How much biryani should I eat?', icon: 'restaurant-outline' },
      { id: 'biryani_lighter', label: 'Make this meal lighter', prompt: 'How can I make this biryani meal lighter?', icon: 'options-outline' },
      { id: 'biryani_log', label: 'Log this meal', prompt: 'Help me estimate and log this biryani meal', icon: 'add-circle-outline' },
    ];
  }

  if (conversationText.includes('snack') || conversationText.includes('hunger')) {
    return [
      { id: 'snack_protein', label: 'Show a protein snack', prompt: 'Show me a filling high-protein snack', icon: 'nutrition-outline' },
      { id: 'snack_sweet', label: 'Something sweet', prompt: 'Suggest a healthy sweet snack under 150 calories', icon: 'ice-cream-outline' },
      { id: 'snack_log', label: 'Log a snack', prompt: 'Help me estimate and log my snack', icon: 'add-circle-outline' },
    ];
  }

  if (conversationText.includes('water') || conversationText.includes('hydration')) {
    return [
      { id: 'water_now', label: 'How much should I drink?', prompt: 'How much water should I drink right now?', icon: 'water-outline' },
      { id: 'water_goal', label: 'Check my water goal', prompt: 'How am I doing against my water goal today?', icon: 'analytics-outline' },
      { id: 'water_log', label: 'Log a glass', prompt: 'Help me log a glass of water', icon: 'add-circle-outline' },
    ];
  }

  if (conversationText.includes('protein') || proteinGap >= 20) {
    return [
      { id: 'protein_dinner', label: 'Add protein to dinner', prompt: 'How can I add more protein to dinner?', icon: 'restaurant-outline' },
      { id: 'protein_snack', label: 'Find a protein snack', prompt: 'Find me a high-protein snack', icon: 'nutrition-outline' },
      { id: 'protein_target', label: 'Check my protein target', prompt: 'How much protein do I still need today?', icon: 'analytics-outline' },
    ];
  }

  if (context.remainingCalories > 0 && context.remainingCalories <= 550) {
    return [
      { id: 'remaining_meal', label: `Use my ${context.remainingCalories} kcal`, prompt: `What can I eat with ${context.remainingCalories} calories remaining?`, icon: 'pie-chart-outline' },
      { id: 'remaining_dinner', label: 'Plan a light meal', prompt: 'Plan a light meal that fits my remaining calories', icon: 'restaurant-outline' },
      { id: 'remaining_snack', label: 'Find a small snack', prompt: 'Find a snack that fits my remaining calories', icon: 'cafe-outline' },
    ];
  }

  if (context.currentHour >= 18) {
    return [
      { id: 'evening_dinner', label: 'Plan a light dinner', prompt: 'Plan a balanced light dinner for tonight', icon: 'restaurant-outline' },
      { id: 'evening_review', label: 'Review today', prompt: 'Give me a quick review of my nutrition today', icon: 'analytics-outline' },
      { id: 'evening_snack', label: 'Find an evening snack', prompt: 'Suggest a healthy evening snack', icon: 'cafe-outline' },
    ];
  }

  return FALLBACK_ACTIONS;
};

/** Store an absolute time so restored conversations retain truthful metadata. */
const messageTimestamp = () => new Date().toISOString();

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

const RiaChatModalComponent: React.FC<RiaChatModalProps> = ({
  visible,
  onClose,
  initialPrompt,
  onOpenBYOKSetup,
}) => {
  const { totalConsumed, remainingCalories, totalProtein, totalCarbs, totalFat, currentLog } =
    useDailyLog();
  const { userGoals } = useGoals();
  const { currentUser } = useAuth();

  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  const [conversationActionTarget, setConversationActionTarget] = useState<ConversationRecord | null>(null);
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
    if (visible) {
      checkKeyStatus();
      loadHistory();
      loadConversationHistory();
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsStreaming(false);
      setStreamingText('');
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/) && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsStreaming(false);
        setStreamingText('');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (visible && initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [visible, initialPrompt]);

  const checkKeyStatus = async () => {
    const configured = await AIService.isKeyConfigured();
    setHasApiKey(configured);
  };

  const loadHistory = async () => {
    const saved = await AIService.loadChatHistory(currentUser?.id);
    if (saved && saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([
        {
          id: 'welcome_msg',
          sender: 'ria',
          text: `Hi ${firstName}! 👋 I am Ria, your AI Nutrition Coach. You have ${remainingCalories} kcal remaining today with ${totalProtein}g protein logged. What would you like to plan, calculate, or ask?`,
          timestamp: messageTimestamp(),
        },
      ]);
    }
  };

  const loadConversationHistory = async () => {
    const savedConversations = await AIService.loadAllConversations(currentUser?.id);
    setConversations(savedConversations);
  };

  const scrollToBottom = () => {
    setShowScrollToLatest(false);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (streamingText) {
      const partialMsg: ChatMessage = {
        id: `ria_${Date.now()}`,
        sender: 'ria',
        text: streamingText + ' [stopped]',
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

  const confirmNewConversation = async () => {
    const now = messageTimestamp();
    const archivedConversation: ConversationRecord = {
      id: `conversation_${Date.now()}`,
      title: conversationTitle(messages),
      createdAt: messages[0]?.timestamp || now,
      updatedAt: messages[messages.length - 1]?.timestamp || now,
      messages,
    };
    await AIService.saveConversation(archivedConversation, currentUser?.id);
          await loadConversationHistory();
    await AIService.clearChatHistory(currentUser?.id);
    setShowNewConversationConfirm(false);
    await loadHistory();
    setInputQuery('');
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const openConversation = async (conversation: ConversationRecord) => {
    if (messages.some(message => message.sender === 'user')) {
      const now = messageTimestamp();
      await AIService.saveConversation(
        {
          id: `conversation_${Date.now()}`,
          title: conversationTitle(messages),
          createdAt: messages[0]?.timestamp || now,
          updatedAt: messages[messages.length - 1]?.timestamp || now,
          messages,
        },
        currentUser?.id
      );
    }

    await AIService.saveChatHistory(conversation.messages, currentUser?.id);
    setMessages(conversation.messages);
    setInputQuery('');
    setShowConversationHistory(false);
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

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
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
      // 1. LIVE GEMINI 3.5 FLASH STREAMING
      setIsStreaming(true);
      setStreamingText('');
      const controller = new AbortController();
      abortControllerRef.current = controller;

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
          chunk => {
            setStreamingText(chunk);
            scrollToBottom();
          },
          controller.signal,
          currentUser?.id
        );

        const riaMsg: ChatMessage = {
          id: `ria_${Date.now()}`,
          sender: 'ria',
          text: fullResponse,
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
          id: `ria_err_${Date.now()}`,
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
      const connectionMsg: ChatMessage = {
        id: `ria_connect_${Date.now()}`,
        sender: 'ria',
        text: 'Connect Gemini to start chatting with Ria. Your nutrition tracking still works without a connection.',
        timestamp: messageTimestamp(),
        isError: true,
      };

      setMessages(prev => [...prev, connectionMsg]);
      scrollToBottom();
    }
  };

  const canSend = inputQuery.trim().length > 0 && !isStreaming;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.sheetContainer, keyboardHeight > 0 ? styles.sheetContainerKeyboard : null]}>
          <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedCloseBtn : null]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close Ria chat"
              >
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </Pressable>

              <View style={styles.headerProfile}>
                <Image
                  source={require('../../../assets/ria_avatar.webp')}
                  style={styles.headerAvatar}
                />
                <View style={styles.headerTextGroup}>
                  <Text style={styles.headerName}>Ria AI Coach</Text>
                  <Pressable
                    style={styles.headerStatusRow}
                    onPress={() => {
                      if (!hasApiKey && onOpenBYOKSetup) {
                        onClose();
                        onOpenBYOKSetup();
                      }
                    }}
                    disabled={hasApiKey !== false}
                    accessibilityRole={hasApiKey === false ? 'button' : undefined}
                    accessibilityLabel={hasApiKey === false ? 'Connect Gemini to chat with Ria' : undefined}
                  >
                    <View style={[styles.onlineDot, hasApiKey === false ? styles.offlineDot : null]} />
                    <Text style={styles.headerSub}>
                      {hasApiKey === true
                        ? 'Live coaching'
                        : hasApiKey === false
                          ? 'Connect Gemini to chat'
                          : 'Checking connection…'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => setShowConversationHistory(true)}
                  style={({ pressed }) => [
                    styles.headerActionBtn,
                    pressed ? styles.pressedCloseBtn : null,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Open conversation history"
                >
                  <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={handleNewConversation}
                  style={({ pressed }) => [
                    styles.headerActionBtn,
                    pressed ? styles.pressedCloseBtn : null,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Start a new conversation"
                >
                  <Ionicons name="add" size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Conversation timeline */}
            <View style={styles.timelineShell}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                contentInsetAdjustmentBehavior="automatic"
                scrollEventThrottle={16}
                onScroll={event => {
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  const distanceFromLatest =
                    contentSize.height - (contentOffset.y + layoutMeasurement.height);
                  setShowScrollToLatest(distanceFromLatest > 120);
                }}
                onContentSizeChange={() => {
                  if (isStreaming || keyboardHeight > 0) {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }
                }}
              >
                {messages.length > 0 && !Number.isNaN(new Date(messages[0].timestamp).getTime()) ? (
                  <View style={styles.dateDivider}>
                    <View style={styles.dateDividerLine} />
                    <Text style={styles.dateDividerLabel}>
                      {formatConversationDate(messages[0].timestamp)}
                    </Text>
                    <View style={styles.dateDividerLine} />
                  </View>
                ) : null}
              {messages.map((msg, index) => {
                const isRia = msg.sender === 'ria';
                const isGrouped = index > 0 && messages[index - 1]?.sender === msg.sender;
                const isWelcome = msg.id === 'welcome_msg';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isRia ? styles.messageRowRia : styles.messageRowUser,
                      isGrouped ? styles.messageRowGrouped : null,
                    ]}
                  >
                    {isRia && !isGrouped ? (
                      <Image
                        source={require('../../../assets/ria_avatar.webp')}
                        style={styles.bubbleAvatar}
                        contentFit="cover"
                      />
                    ) : isRia ? (
                      <View style={styles.bubbleAvatarSpacer} />
                    ) : null}
                    <View
                      style={[
                        styles.bubble,
                        isRia ? styles.bubbleRia : styles.bubbleUser,
                         isGrouped ? styles.bubbleGrouped : null,
                        msg.isError ? styles.bubbleError : null,
                        msg.id.startsWith('ria_connect_') ? styles.bubbleConnection : null,
                        isWelcome ? styles.bubbleWelcome : null,
                      ]}
                    >
                      {isWelcome ? (
                        <View style={styles.welcomeContent}>
                          <Text style={styles.welcomeEyebrow}>RIA AI COACH</Text>
                          <Text style={styles.welcomeTitle}>Let’s make today easier</Text>
                          <Text style={styles.welcomeBody}>
                            Hi {firstName}! I can help you plan meals, understand your nutrition, and stay consistent with your goals.
                          </Text>
                          <View style={styles.welcomeMetrics}>
                            <View style={styles.welcomeMetric}>
                              <Ionicons name="flame-outline" size={15} color={Colors.primary} />
                              <View>
                                <Text style={styles.welcomeMetricValue}>{remainingCalories} kcal</Text>
                                <Text style={styles.welcomeMetricLabel}>remaining today</Text>
                              </View>
                            </View>
                            <View style={styles.welcomeMetric}>
                              <Ionicons name="nutrition-outline" size={15} color={Colors.proteinDark} />
                              <View>
                                <Text style={styles.welcomeMetricValue}>{totalProtein} g</Text>
                                <Text style={styles.welcomeMetricLabel}>protein logged</Text>
                              </View>
                            </View>
                          </View>
                          <Text style={styles.welcomePrompt}>What would you like to work on?</Text>
                        </View>
                      ) : msg.id.startsWith('ria_connect_') ? (
                        <View style={styles.connectionCard}>
                          <View style={styles.connectionIconWrap}>
                            <Bot size={27} color={Colors.textSecondary} strokeWidth={1.8} />
                            <View style={styles.connectionKeyBadge}>
                              <KeyRound size={13} color={Colors.warningDark} strokeWidth={2} />
                            </View>
                          </View>
                          <View style={styles.connectionCopy}>
                            <Text style={styles.connectionTitle}>Connect Gemini to chat</Text>
                            <Text style={styles.connectionBody}>{msg.text}</Text>
                            {onOpenBYOKSetup ? (
                              <Pressable
                                style={styles.connectionAction}
                                onPress={() => {
                                  onClose();
                                  onOpenBYOKSetup();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Connect Gemini"
                              >
                                <Text style={styles.connectionActionText}>Connect Gemini</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      ) : msg.isError ? (
                        <Text style={[styles.bubbleText, styles.errorMsgText]}>{msg.text}</Text>
                      ) : (
                        <MarkdownText
                          content={msg.text}
                          isUser={!isRia}
                          baseStyle={[
                            styles.bubbleText,
                            isRia ? styles.bubbleTextRia : styles.bubbleTextUser,
                          ]}
                        />
                      )}
                      <Text
                        style={[
                          styles.timestamp,
                          isRia ? styles.timestampRia : styles.timestampUser,
                        ]}
                      >
                        {formatMessageTime(msg.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Live Streaming Response Bubble */}
              {isStreaming ? (
                <View style={[styles.messageRow, styles.messageRowRia]}>
                  <Image
                    source={require('../../../assets/ria_avatar.webp')}
                    style={styles.bubbleAvatar}
                    contentFit="cover"
                  />
                  <View style={[styles.bubble, styles.bubbleRia]}>
                    {streamingText ? (
                      <MarkdownText
                        content={streamingText}
                        isUser={false}
                        baseStyle={[styles.bubbleText, styles.bubbleTextRia]}
                      />
                    ) : null}
                    <View style={styles.streamingIndicatorRow}>
                      <View style={styles.streamingStatusDot} />
                      <Text style={styles.streamingLabel}>
                        {streamingText ? 'Ria is writing…' : 'Ria is thinking…'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
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

            {/* Stop Generation Button when Streaming */}
            {isStreaming ? (
              <View style={styles.stopGeneratingRow}>
                <Pressable style={styles.stopBtn} onPress={handleStopGenerating}>
                  <Ionicons name="stop-circle-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.stopBtnText}>Stop</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Quick Suggestion Chips */}
            {!isStreaming && inputQuery.length === 0 ? (
              <View style={styles.quickChipsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickChipsScroll}
                >
                  {contextualActions.map(chip => (
                    <Pressable
                      key={chip.label}
                      style={({ pressed }) => [
                        styles.quickChip,
                        pressed ? styles.pressedQuickChip : null,
                      ]}
                      onPress={() => handleSendMessage(chip.prompt)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ask Ria: ${chip.label}`}
                    >
                      <Ionicons name={chip.icon} size={14} color={Colors.primaryDark} />
                      <Text style={styles.quickChipText}>{chip.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Composer */}
            <View
              style={[
                styles.inputBar,
                {
                  paddingBottom:
                    keyboardHeight > 0
                      ? 10
                      : Platform.OS === 'ios'
                        ? Math.max(insets.bottom, 14)
                        : 12,
                },
              ]}
            >
              <View style={[styles.composerSurface, isInputFocused ? styles.composerSurfaceFocused : null]}>
                <View style={styles.composerField}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ask Ria about food, training, or your goals…"
                    placeholderTextColor={Colors.textMuted}
                    value={inputQuery}
                    onChangeText={setInputQuery}
                    onSubmitEditing={() => handleSendMessage()}
                    returnKeyType="send"
                    editable={!isStreaming}
                    multiline={true}
                    selectionColor={Colors.primary}
                    textAlignVertical="center"
                    onFocus={() => {
                      setIsInputFocused(true);
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 80);
                    }}
                    onBlur={() => setIsInputFocused(false)}
                  />
                </View>
              </View>
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
                <Ionicons name="arrow-up" size={19} color="#FFFFFF" />
              </Pressable>
            </View>
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
        <View style={styles.historyOverlay}>
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
                style={[styles.historyTab, historyTab === 'recent' ? styles.historyTabActive : null]}
                onPress={() => setHistoryTab('recent')}
              >
                <Text style={[styles.historyTabText, historyTab === 'recent' ? styles.historyTabTextActive : null]}>
                  Recent
                </Text>
              </Pressable>
              <Pressable
                style={[styles.historyTab, historyTab === 'archived' ? styles.historyTabActive : null]}
                onPress={() => setHistoryTab('archived')}
              >
                <Text style={[styles.historyTabText, historyTab === 'archived' ? styles.historyTabTextActive : null]}>
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
                      <Ionicons name="chatbubble-ellipses-outline" size={17} color={Colors.primary} />
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
                  {historySearch ? 'No matching conversations' : historyTab === 'archived' ? 'No archived conversations' : 'No previous conversations'}
                </Text>
                <Text style={styles.historyEmptyBody}>
                  {historySearch ? 'Try a different search term.' : 'Start a new chat and it will appear here.'}
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
                  onPress={conversationActionTarget.archived ? restoreConversation : archiveConversation}
                >
                  <Ionicons
                    name={conversationActionTarget.archived ? 'arrow-undo-outline' : 'archive-outline'}
                    size={19}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.historyActionText}>
                    {conversationActionTarget.archived ? 'Restore conversation' : 'Archive conversation'}
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flex: 1,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#E2E8F0',
        }
      : {}),
  },
  sheetContainerKeyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderInset,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  pressedCloseBtn: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
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
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
      : {}),
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
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: '#F47551',
  },
  headerTextGroup: {
    justifyContent: 'center',
  },
  headerName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderCurve: 'continuous',
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#94A3B8',
  },
  headerSub: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textSecondary,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  chatArea: {
    flex: 1,
  },
  timelineShell: {
    flex: 1,
    position: 'relative',
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 16,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
    marginBottom: 2,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderInset,
  },
  dateDividerLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    lineHeight: 14,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  scrollLatestButton: {
    position: 'absolute',
    right: 16,
    bottom: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pressedScrollLatestButton: {
    transform: [{ scale: 0.95 }],
    opacity: 0.88,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  messageRowRia: {
    justifyContent: 'flex-start',
    marginRight: 40,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
    marginLeft: 40,
  },
  messageRowGrouped: {
    marginTop: -8,
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderCurve: 'continuous',
    marginBottom: 4,
  },
  bubbleAvatarSpacer: {
    width: 28,
    height: 28,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    maxWidth: '88%',
  },
  bubbleRia: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.15)',
    elevation: 0,
    shadowOpacity: 0,
  },
  bubbleUser: {
    backgroundColor: '#F47551',
    borderBottomRightRadius: 4,
  },
  bubbleGrouped: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  bubbleError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bubbleConnection: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  bubbleWelcome: {
    backgroundColor: '#FFFCF9',
    borderColor: '#FFDCCF',
    paddingVertical: 16,
  },
  welcomeContent: {
    gap: 7,
  },
  welcomeEyebrow: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.1,
    color: Colors.primary,
  },
  welcomeTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  welcomeBody: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  welcomeMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  welcomeMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  welcomeMetricValue: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    lineHeight: 15,
    color: Colors.textPrimary,
  },
  welcomeMetricLabel: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 10,
    lineHeight: 13,
    color: Colors.textMuted,
  },
  welcomePrompt: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  connectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionKeyBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  connectionCopy: {
    flex: 1,
    gap: 4,
  },
  connectionTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.primaryDeep,
  },
  connectionBody: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#9A3412',
  },
  connectionAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.primary,
  },
  connectionActionText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.onPrimary,
  },
  errorMsgText: {
    color: '#DC2626',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
  },
  bubbleTextRia: {
    fontFamily: Fonts.urbanist.regular,
    color: '#1E293B',
  },
  bubbleTextUser: {
    fontFamily: Fonts.urbanist.medium,
    color: '#FFFFFF',
  },
  timestamp: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  timestampRia: {
    color: '#94A3B8',
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.7)',
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
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  stopGeneratingRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderCurve: 'continuous',
    gap: 6,
  },
  stopBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  quickChipsWrapper: {
    paddingTop: 8,
    paddingBottom: 7,
    backgroundColor: Colors.background,
  },
  quickChipsScroll: {
    paddingHorizontal: 16,
    paddingRight: 24,
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
    borderWidth: 1,
    borderColor: '#FFD5C6',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderCurve: 'continuous',
    gap: 6,
  },
  pressedQuickChip: {
    backgroundColor: '#FFEDE6',
    transform: [{ scale: 0.98 }],
  },
  quickChipText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#9A3412',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 2,
    backgroundColor: Colors.background,
    gap: 8,
  },
  composerSurface: {
    flex: 1,
    minHeight: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 5,
  },
  composerSurfaceFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  composerField: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#0F172A',
    minHeight: 48,
    maxHeight: 120,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderCurve: 'continuous',
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sendBtnActive: {
    backgroundColor: '#F47551',
    elevation: 0,
    shadowOpacity: 0,
  },
  pressedSendBtn: {
    transform: [{ scale: 0.94 }],
  },
});

export const RiaChatModal = React.memo(RiaChatModalComponent);
