import React, { useState, useRef, useEffect } from 'react';
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
  LayoutAnimation,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
import { AIService, ChatMessage, UserNutritionContext } from '@/services/ai';
import { MarkdownText } from '../common/MarkdownText';

interface RiaChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onOpenBYOKSetup?: () => void;
}

const QUICK_QUESTIONS = [
  '🍗 High-protein dinner idea',
  '🍛 Can I eat biryani tonight?',
  '🍵 Snack under 120 calories',
  '💧 Water timing for fat loss',
];

const RiaChatModalComponent: React.FC<RiaChatModalProps> = ({
  visible,
  onClose,
  initialPrompt,
  onOpenBYOKSetup,
}) => {
  const {
    userGoals,
    currentUser,
    totalConsumed,
    remainingCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    currentLog,
  } = useHealth();

  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const firstName = (userGoals.name || currentUser?.name || 'there').split(' ')[0];

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e?.endCoordinates?.height || 0;
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setKeyboardHeight(height);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === 'ios' ? 50 : 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
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
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsStreaming(false);
      setStreamingText('');
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
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
          timestamp: 'Just now',
        },
      ]);
    }
  };

  const scrollToBottom = () => {
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
        timestamp: 'Just now',
      };
      setMessages((prev) => {
        const next = [...prev, partialMsg];
        AIService.saveChatHistory(next, currentUser?.id);
        return next;
      });
    }
    setIsStreaming(false);
    setStreamingText('');
  };

  const handleClearChat = () => {
    Alert.alert('Clear Chat History?', 'This will reset your conversation with Ria.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await AIService.clearChatHistory(currentUser?.id);
          loadHistory();
        },
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
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
        loggedMealsToday: currentLog.meals.map((m) => ({
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
          (chunk) => {
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
          timestamp: 'Just now',
        };

        setMessages((prev) => {
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
          text: err?.userMessage || err?.message || 'Sorry, I had trouble generating a response. Please check your Gemini connection.',
          timestamp: 'Just now',
          isError: true,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsStreaming(false);
        setStreamingText('');
        scrollToBottom();
      }
    } else {
      // 2. OFFLINE HEURISTIC FALLBACK (Rule-based)
      setTimeout(() => {
        let reply = '';
        const q = text.toLowerCase();

        if (q.includes('protein') || q.includes('high-protein')) {
          reply = `For a strong protein boost, go with Paneer Bhurji (200g ~ 18g P) or 2 Grilled Chicken Breasts with steamed broccoli (~34g P). Pair with 1 multi-grain roti for sustained fullness!`;
        } else if (q.includes('biryani')) {
          reply = `Yes, you can! A 1-cup portion of Chicken or Vegetable Biryani is around 290–350 kcal. Eat it with a large katori of cucumber raita to add volume and control portion size.`;
        } else if (q.includes('snack') || q.includes('120') || q.includes('hunger')) {
          reply = `Try 30g of dry roasted chana (115 kcal, 6g protein) or a medium apple with a sprinkle of cinnamon (~95 kcal). Both provide steady energy without blood sugar spikes!`;
        } else if (q.includes('water') || q.includes('hydration')) {
          reply = `Drink 1 tall glass (300 ml) 30 minutes before your meals. This primes digestion and reduces overeating naturally. Aim for at least 2.5L throughout the day!`;
        } else if (q.includes('dinner')) {
          reply = `With ${remainingCalories} kcal remaining, a light dinner like 2 whole wheat rotis + Dal Tadka + cucumber salad is ideal (~360 kcal, 14g P, 8g fiber).`;
        } else {
          reply = `Great question! Staying consistent with your ${userGoals.dailyCalorieBudget} kcal budget is the #1 lever for sustainable body recomposition. Prioritize whole foods, fiber, and lean protein!`;
        }

        const riaMsg: ChatMessage = {
          id: `ria_${Date.now()}`,
          sender: 'ria',
          text: reply,
          timestamp: 'Just now',
        };

        setMessages((prev) => {
          const updated = [...prev, riaMsg];
          AIService.saveChatHistory(updated, currentUser?.id);
          return updated;
        });
        scrollToBottom();
      }, 500);
    }
  };

  const canSend = inputQuery.trim().length > 0 && !isStreaming;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss Ria chat modal backdrop"
        />
        <View
          style={[
            styles.sheetContainer,
            keyboardHeight > 0 ? styles.sheetContainerKeyboard : null,
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={styles.dragHandle} />
          </View>
          <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedCloseBtn : null]}
                hitSlop={8}
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
                  <View style={styles.headerNameRow}>
                    <Text style={styles.headerName}>Ria AI Coach</Text>
                    <View style={[styles.onlineDot, !hasApiKey ? styles.offlineDot : null]} />
                  </View>
                  <Text style={styles.headerSub}>
                    {hasApiKey ? 'AI Coach • Active' : 'Offline Mode'}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleClearChat}
                style={({ pressed }) => [styles.clearChatBtn, pressed ? styles.pressedCloseBtn : null]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear chat history"
              >
                <Ionicons name="trash-outline" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Unconfigured Key Banner */}
            {hasApiKey === false ? (
              <View style={styles.offlineBanner}>
                <Ionicons name="sparkles" size={14} color="#F47551" />
                <Text style={styles.offlineBannerText}>
                  Ria is in offline mode. Connect your Gemini key for live conversational AI.
                </Text>
                {onOpenBYOKSetup ? (
                  <Pressable
                    style={styles.connectPill}
                    onPress={() => {
                      onClose();
                      onOpenBYOKSetup();
                    }}
                  >
                    <Text style={styles.connectPillText}>Connect</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Chat Scroll Area */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              contentInsetAdjustmentBehavior="automatic"
              onContentSizeChange={() => {
                if (isStreaming || keyboardHeight > 0) {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }
              }}
            >
              {messages.map((msg) => {
                const isRia = msg.sender === 'ria';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isRia ? styles.messageRowRia : styles.messageRowUser,
                    ]}
                  >
                    {isRia ? (
                      <Image
                        source={require('../../../assets/ria_avatar.webp')}
                        style={styles.bubbleAvatar}
                        contentFit="cover"
                      />
                    ) : null}
                    <View
                      style={[
                        styles.bubble,
                        isRia ? styles.bubbleRia : styles.bubbleUser,
                        msg.isError ? styles.bubbleError : null,
                      ]}
                    >
                      {msg.isError ? (
                        <Text style={[styles.bubbleText, styles.errorMsgText]}>
                          {msg.text}
                        </Text>
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
                      <Text style={[styles.timestamp, isRia ? styles.timestampRia : styles.timestampUser]}>
                        {msg.timestamp}
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
                    ) : (
                      <Text style={[styles.bubbleText, styles.bubbleTextRia]}>
                        Thinking...
                      </Text>
                    )}
                    <View style={styles.streamingIndicatorRow}>
                      <ActivityIndicator size="small" color="#F47551" />
                      <Text style={styles.streamingLabel}>Ria is typing...</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            {/* Stop Generation Button when Streaming */}
            {isStreaming ? (
              <View style={styles.stopGeneratingRow}>
                <Pressable style={styles.stopBtn} onPress={handleStopGenerating}>
                  <Ionicons name="stop-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.stopBtnText}>Stop Generating</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Quick Suggestion Chips */}
            {!isStreaming && inputQuery.length === 0 ? (
              <View style={styles.quickChipsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsScroll}>
                  {QUICK_QUESTIONS.map((chip, idx) => (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [styles.quickChip, pressed ? styles.pressedQuickChip : null]}
                      onPress={() => handleSendMessage(chip)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ask Ria: ${chip}`}
                    >
                      <Text style={styles.quickChipText}>{chip}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Input Bar */}
            <View
              style={[
                styles.inputBar,
                {
                  paddingBottom: keyboardHeight > 0
                    ? 10
                    : Platform.OS === 'ios'
                    ? Math.max(insets.bottom, 14)
                    : 12,
                },
              ]}
            >
              <TextInput
                style={styles.textInput}
                placeholder="Ask Ria about food, calories, or workouts..."
                placeholderTextColor="#94A3B8"
                value={inputQuery}
                onChangeText={setInputQuery}
                onSubmitEditing={() => handleSendMessage()}
                returnKeyType="send"
                editable={!isStreaming}
                multiline={true}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 80);
                }}
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
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 100,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '94%',
    height: '90%',
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
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
    height: '100%',
    maxHeight: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    borderCurve: 'continuous',
    backgroundColor: '#CBD5E1',
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  clearChatBtn: {
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
  pressedCloseBtn: {
    opacity: 0.7,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
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
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#64748B',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEDD5',
    gap: 8,
  },
  offlineBannerText: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#EA580C',
  },
  connectPill: {
    backgroundColor: '#F47551',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  connectPillText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowRia: {
    justifyContent: 'flex-start',
    marginRight: 40,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
    marginLeft: 40,
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderCurve: 'continuous',
    marginBottom: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderCurve: 'continuous',
    maxWidth: '90%',
  },
  bubbleRia: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: '#F47551',
    borderBottomRightRadius: 4,
  },
  bubbleError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  errorMsgText: {
    color: '#DC2626',
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  bubbleTextRia: {
    fontFamily: Fonts.poppins.regular,
    color: '#1E293B',
  },
  bubbleTextUser: {
    fontFamily: Fonts.poppins.medium,
    color: '#FFFFFF',
  },
  timestamp: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9.5,
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
    marginTop: 6,
  },
  streamingLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#F47551',
  },
  stopGeneratingRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderCurve: 'continuous',
    gap: 6,
  },
  stopBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  quickChipsWrapper: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  pressedQuickChip: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.98 }],
  },
  quickChipText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#475569',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontFamily: Fonts.poppins.regular,
    fontSize: 13.5,
    lineHeight: 18,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 100,
    textAlignVertical: 'center',
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
  },
  sendBtnActive: {
    backgroundColor: '#F47551',
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  pressedSendBtn: {
    transform: [{ scale: 0.94 }],
  },
});

export const RiaChatModal = React.memo(RiaChatModalComponent);
