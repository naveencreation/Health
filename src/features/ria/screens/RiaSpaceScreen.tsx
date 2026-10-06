/**
 * RiaSpaceScreen.tsx
 * 
 * Calorify Ria Space: Dedicated full-screen AI nutrition coaching experience.
 * Replaces the legacy modal with a full-screen route, rich streaming states,
 * daily limit gating, shared capacity handling, contextual nutrition telemetry,
 * static suggestion starters, and device-only user-scoped thread persistence.
 * 
 * Spec: RIA_Chat.md sections 4, 5, 6, 7, 8, 9, 10, 12, 14.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Keyboard,
  Platform,
  AppState,
  BackHandler,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { useAuth, useGoals, useDailyLog } from '@/context/HealthContext';
import { usePro } from '@/features/subscription/hooks/usePro';
import { LoggedMealItem } from '@/types';
import {
  AIService,
  RiaMessage,
  UserNutritionContext,
  ChatMessage,
  ConversationMemoryManager,
  MealCardData,
  MealCardSlot,
  WaterCardData,
  WeightCardData,
  SuggestionOption,
  PlanChangeCardData,
  AIErrorMapper,
  RiaDuplicateChecker,
  RiaSafetyService,
  AIOutputValidator,
} from '@/services/ai';
import { RiaCardParser } from '@/services/ai/cards/RiaCardParser';
import { NutritionContextBuilder } from '@/services/ai/context/NutritionContextBuilder';
import { ChatHistoryStorage } from '@/services/ai/storage/ChatHistoryStorage';
import {
  RiaUsageCounter,
  RiaUsageRecord,
  getLocalDateKey,
} from '@/services/ai/limits/RiaUsageCounter';
import {
  canSendChatMessage,
  canPerformScan,
  shouldShowRemainingNotice,
  getLimitReachedInfo,
  getCapacityNoticeInfo,
} from '@/services/ai/limits/RiaLimitGate';
import { RemoteConfigService } from '@/services/ai/config/RemoteConfigService';
import { RiaContextStrip } from '../components/RiaContextStrip';
import { RiaSuggestionRow } from '../components/RiaSuggestionRow';
import { RiaMessageBubble } from '../components/RiaMessageBubble';
import { RiaComposer } from '../components/RiaComposer';
import { LimitReachedCard } from '../components/LimitReachedCard';
import { CapacityNoticeCard } from '../components/CapacityNoticeCard';

export interface RiaSpaceScreenProps {
  onBack: () => void;
  initialPrompt?: string;
  onOpenFoodVision?: () => void;
  onOpenPaywall?: () => void;
  testID?: string;
}

export const RiaSpaceScreen: React.FC<RiaSpaceScreenProps> = ({
  onBack,
  initialPrompt,
  onOpenFoodVision,
  onOpenPaywall,
  testID = 'ria-space-screen',
}) => {
  const insets = useSafeAreaInsets();
  const {
    totalConsumed,
    remainingCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    currentLog,
    batchAddLoggedMeals,
    batchRemoveMealItems,
    addWater,
    logWeight,
  } = useDailyLog();
  const { userGoals, updateGoals } = useGoals();
  const { currentUser } = useAuth();
  const { isPro } = usePro();

  const flatListRef = useRef<FlatList<RiaMessage>>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const thinkingTimer15sRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingTimer30sRef = useRef<NodeJS.Timeout | null>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<RiaMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingNotice, setThinkingNotice] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [usage, setUsage] = useState<RiaUsageRecord>({ chat: 0, scan: 0, updatedAt: '' });
  const [copiedToast, setCopiedToast] = useState(false);
  const [isSensitiveMode, setIsSensitiveMode] = useState(false);

  const firstName = (userGoals.name || currentUser?.name || 'there').split(' ')[0];
  const proteinRemaining = Math.max(0, (userGoals.targetProtein || 0) - totalProtein);

  // Sync usage on load
  const refreshUsage = useCallback(async () => {
    const current = await RiaUsageCounter.getUsage(currentUser?.id);
    setUsage(current);
  }, [currentUser?.id]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Load thread history and sensitive mode from local device storage
  useEffect(() => {
    let isMounted = true;
    ChatHistoryStorage.loadThread(currentUser?.id).then(saved => {
      if (!isMounted) return;
      if (saved && saved.length > 0) {
        setMessages(saved);
      }
    });

    RiaSafetyService.isSensitiveModeActive(currentUser?.id).then(active => {
      if (!isMounted) return;
      setIsSensitiveMode(active);
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const handleToggleSensitiveMode = useCallback(async () => {
    const nextVal = !isSensitiveMode;
    setIsSensitiveMode(nextVal);
    await RiaSafetyService.setSensitiveModeActive(nextVal, currentUser?.id);
    haptics.selection();
    setMenuVisible(false);
  }, [isSensitiveMode, currentUser?.id]);

  // Handle hardware Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [onBack]);

  // Keyboard height listener for smooth layout adjustments
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Handle app backgrounding mid-stream
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/) && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsStreaming(false);
        setIsThinking(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Send initial prompt if provided
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
    }
  }, [initialPrompt]);

  // Clear timers helper
  const clearThinkingTimers = useCallback(() => {
    if (thinkingTimer15sRef.current) {
      clearTimeout(thinkingTimer15sRef.current);
      thinkingTimer15sRef.current = null;
    }
    if (thinkingTimer30sRef.current) {
      clearTimeout(thinkingTimer30sRef.current);
      thinkingTimer30sRef.current = null;
    }
    setThinkingNotice(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearThinkingTimers();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearThinkingTimers]);

  // Calculate current gate status
  const gateStatus = useMemo(() => {
    return canSendChatMessage({
      currentUsage: usage.chat,
      inFlightCount: RiaUsageCounter.getInFlightCount('chat'),
      isPro,
      freeDailyLimit: RemoteConfigService.get('ria_free_chat_daily'),
      proDailyLimit: RemoteConfigService.get('ria_pro_chat_daily'),
      isPoolDegraded: RemoteConfigService.get('ria_pool_degraded'),
      isRiaEnabled: RemoteConfigService.get('ria_enabled'),
      isCrisisMessage: false,
    });
  }, [usage.chat, isPro]);

  // Save thread to storage helper
  const persistThread = useCallback(
    async (updated: RiaMessage[]) => {
      setMessages(updated);
      await ChatHistoryStorage.saveThread(updated, currentUser?.id);
    },
    [currentUser?.id]
  );

  // Send message pipeline
  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isStreaming || isThinking) return;

    // Spec: 1. Local Crisis Pre-Check (RIA_Chat.md Section 11 & Section 10 Step 2)
    // Self-harm/crisis wording bypasses AI, limits, and kill switches. 0 tokens, no usage increment.
    const crisisCheck = RiaSafetyService.checkCrisisPreCheck(trimmed);
    if (crisisCheck.isCrisis) {
      setInputQuery('');
      Keyboard.dismiss();
      const now = Date.now();
      const userMsg: RiaMessage = {
        id: `usr_${now}`,
        role: 'user',
        kind: 'text',
        text: trimmed,
        createdAt: now,
        status: 'done',
      };
      const careMsg: RiaMessage = {
        id: `ria_care_${now + 1}`,
        role: 'ria',
        kind: 'text',
        text: crisisCheck.careMessage || '',
        createdAt: now + 1,
        status: 'done',
      };
      await persistThread([...messages, userMsg, careMsg]);
      haptics.selection();
      return;
    }

    // Spec: 2. Disordered Eating & Sensitive Mode Pre-Check
    const deCheck = RiaSafetyService.checkDisorderedEating(trimmed);
    if (deCheck.shouldActivateSensitiveMode && !isSensitiveMode) {
      setIsSensitiveMode(true);
      await RiaSafetyService.setSensitiveModeActive(true, currentUser?.id);
    }
    if (deCheck.isDisorderedEating && deCheck.guidanceMessage) {
      setInputQuery('');
      Keyboard.dismiss();
      const now = Date.now();
      const userMsg: RiaMessage = {
        id: `usr_${now}`,
        role: 'user',
        kind: 'text',
        text: trimmed,
        createdAt: now,
        status: 'done',
      };
      const guidanceMsg: RiaMessage = {
        id: `ria_de_${now + 1}`,
        role: 'ria',
        kind: 'text',
        text: deCheck.guidanceMessage,
        createdAt: now + 1,
        status: 'done',
      };
      await persistThread([...messages, userMsg, guidanceMsg]);
      haptics.selection();
      return;
    }

    // Spec: 3. Calorie Floor Enforcement / Extreme Restriction Pre-Check
    const restrictionCheck = RiaSafetyService.checkRestrictionQuery(trimmed, userGoals.gender);
    if (restrictionCheck.isBelowSafetyFloor && restrictionCheck.guidanceMessage) {
      setInputQuery('');
      Keyboard.dismiss();
      const now = Date.now();
      const userMsg: RiaMessage = {
        id: `usr_${now}`,
        role: 'user',
        kind: 'text',
        text: trimmed,
        createdAt: now,
        status: 'done',
      };
      const restrMsg: RiaMessage = {
        id: `ria_restr_${now + 1}`,
        role: 'ria',
        kind: 'text',
        text: restrictionCheck.guidanceMessage,
        createdAt: now + 1,
        status: 'done',
      };
      await persistThread([...messages, userMsg, restrMsg]);
      haptics.selection();
      return;
    }

    // Spec: 4. Supplements & Steroids Guard Pre-Check
    const steroidCheck = RiaSafetyService.checkSupplementsAndSteroids(trimmed);
    if (steroidCheck.isDangerousSubstance && steroidCheck.warningMessage) {
      setInputQuery('');
      Keyboard.dismiss();
      const now = Date.now();
      const userMsg: RiaMessage = {
        id: `usr_${now}`,
        role: 'user',
        kind: 'text',
        text: trimmed,
        createdAt: now,
        status: 'done',
      };
      const steroidMsg: RiaMessage = {
        id: `ria_ped_${now + 1}`,
        role: 'ria',
        kind: 'text',
        text: steroidCheck.warningMessage,
        createdAt: now + 1,
        status: 'done',
      };
      await persistThread([...messages, userMsg, steroidMsg]);
      haptics.selection();
      return;
    }

    // Spec: 5. Prompt Injection Defense
    const injectionResult = RiaSafetyService.checkPromptInjection(trimmed);
    const sanitizedPrompt = injectionResult.sanitizedText;

    // Spec: 6. Limit Gate & Kill switch pre-check
    const gateCheck = canSendChatMessage({
      currentUsage: usage.chat,
      inFlightCount: RiaUsageCounter.getInFlightCount('chat'),
      isPro,
      freeDailyLimit: RemoteConfigService.get('ria_free_chat_daily'),
      proDailyLimit: RemoteConfigService.get('ria_pro_chat_daily'),
      isPoolDegraded: RemoteConfigService.get('ria_pool_degraded'),
      isRiaEnabled: RemoteConfigService.get('ria_enabled'),
      isCrisisMessage: false,
    });

    if (!gateCheck.allowed) {
      if (gateCheck.reason === 'limit_reached') {
        // Daily allowance exhausted
        haptics.error();
        return;
      }
      if (gateCheck.reason === 'capacity_resting') {
        // Shared pool degraded
        haptics.error();
        return;
      }
    }

    // Clear input
    setInputQuery('');
    Keyboard.dismiss();

    // Append user message
    const userMsg: RiaMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      kind: 'text',
      text: trimmed,
      createdAt: Date.now(),
      status: 'done',
    };

    const newMessages = [...messages, userMsg];
    await persistThread(newMessages);

    // Reserve in-flight count
    RiaUsageCounter.reservePending('chat');
    setIsThinking(true);
    setThinkingNotice(null);
    setStreamingText('');

    // Setup 15s soft notice and 30s timeout
    clearThinkingTimers();
    thinkingTimer15sRef.current = setTimeout(() => {
      setThinkingNotice('Taking longer than usual...');
    }, 15000);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    thinkingTimer30sRef.current = setTimeout(() => {
      controller.abort();
      clearThinkingTimers();
      setIsThinking(false);
      setIsStreaming(false);
      RiaUsageCounter.releasePending('chat');

      const timeoutMsg: RiaMessage = {
        id: `ria_err_${Date.now()}`,
        role: 'ria',
        kind: 'error',
        text: 'Request timed out. Please check your connection and try again.',
        createdAt: Date.now(),
        status: 'failed',
      };
      persistThread([...newMessages, timeoutMsg]);
    }, 30000);

    // Build fresh telemetry context with Pro rolling memory if entitled
    const memorySummary = isPro
      ? (await ConversationMemoryManager.loadSummary(currentUser?.id))?.text
      : undefined;

    const telemetryContext = NutritionContextBuilder.createContext({
      userGoals: {
        ...userGoals,
        name: firstName,
      },
      currentLog,
      remainingCalories,
      totalCalories: totalConsumed,
      totalProtein,
      totalCarbs,
      totalFat,
      memorySummary,
      isSensitiveMode,
    });

    let firstTokenReceived = false;
    let accumulated = '';

    // Convert messages to ChatMessage format for AIService
    const chatHistoryForAI: ChatMessage[] = newMessages.map(m => ({
      id: m.id,
      sender: m.role === 'user' ? 'user' : 'ria',
      text: m.text || '',
      timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    try {
      const fullResponse = await AIService.streamChat(
        sanitizedPrompt,
        chatHistoryForAI,
        telemetryContext,
        (chunk: string) => {
          accumulated = chunk;
          if (!firstTokenReceived) {
            firstTokenReceived = true;
            clearThinkingTimers();
            setIsThinking(false);
            setIsStreaming(true);

            // Spec: Atomic increment only after first token received
            RiaUsageCounter.incrementUsage('chat', currentUser?.id).then(updated => {
              setUsage(updated);
            });
            RiaUsageCounter.releasePending('chat');
          }
          setStreamingText(RiaCardParser.parseMessage(chunk).cleanText);
          flatListRef.current?.scrollToEnd({ animated: true });
        },
        controller.signal,
        currentUser?.id
      );

      clearThinkingTimers();
      setIsStreaming(false);
      setStreamingText('');

      const rawResponse = fullResponse || accumulated;
      // Output validation & medical disclaimer append
      const validatedChat = AIOutputValidator.validateChatResponse(rawResponse);
      let textToParse = validatedChat.isValid && validatedChat.data ? validatedChat.data : rawResponse;

      const medicalScopeCheck = RiaSafetyService.checkMedicalScope(trimmed);
      if (medicalScopeCheck.requiresDisclaimer && !textToParse.includes('Medical Notice')) {
        textToParse += medicalScopeCheck.disclaimer;
      }

      const parsed = RiaCardParser.parseMessage(textToParse, currentLog, userGoals);

      // Minor protection: ages 13-17 maintain only, no plan change cards
      let resolvedCard = parsed.card;
      if (resolvedCard?.type === 'plan_change') {
        const minorCheck = RiaSafetyService.checkMinorPolicy(userGoals.age);
        if (minorCheck.isMinor && !minorCheck.allowDeficitOrPlanChange) {
          resolvedCard = undefined;
        }
      }

      const riaMsg: RiaMessage = {
        id: `ria_${Date.now()}`,
        role: 'ria',
        kind: 'text',
        text: parsed.cleanText,
        card: resolvedCard,
        createdAt: Date.now(),
        status: 'done',
      };

      await persistThread([...newMessages, riaMsg]);
      haptics.selection();
    } catch (err: any) {
      clearThinkingTimers();
      setIsThinking(false);
      setIsStreaming(false);

      if (!firstTokenReceived) {
        RiaUsageCounter.releasePending('chat');
      }

      // Check if aborted by user
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        if (accumulated) {
          const interruptedMsg: RiaMessage = {
            id: `ria_int_${Date.now()}`,
            role: 'ria',
            kind: 'text',
            text: accumulated,
            createdAt: Date.now(),
            status: 'interrupted',
          };
          await persistThread([...newMessages, interruptedMsg]);
        }
        return;
      }

      // Error state
      const errorMsg: RiaMessage = {
        id: `ria_err_${Date.now()}`,
        role: 'ria',
        kind: 'error',
        text:
          err?.userMessage ||
          'Ria encountered an issue responding. Please try sending your message again.',
        createdAt: Date.now(),
        status: 'failed',
      };
      await persistThread([...newMessages, errorMsg]);
    }
  };

  // Stop button handler
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearThinkingTimers();
    setIsThinking(false);
    setIsStreaming(false);
  };

  // Retry failed or interrupted message
  const handleRetryMessage = (failedMsg: RiaMessage) => {
    // If it's a Ria error bubble, resend the last user message
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser && lastUser.text) {
      // Remove the failed message and resend
      const filtered = messages.filter(m => m.id !== failedMsg.id);
      persistThread(filtered).then(() => {
        handleSendMessage(lastUser.text!);
      });
    }
  };

  // Clear history menu action
  const handleClearHistory = async () => {
    setMenuVisible(false);
    await ChatHistoryStorage.clearHistory(currentUser?.id);
    setMessages([]);
    haptics.impactLight();
  };

  const handleCopyText = (text: string) => {
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  // Starter card press
  const handleStarterPress = (starterPrompt: string) => {
    handleSendMessage(starterPrompt);
  };

  // Phase R6: In-Chat Photo Scan Pipeline & Camera Handlers
  const handlePressPhoto = async () => {
    // 1. Scan limit pre-check
    const scanGate = canPerformScan({
      currentScanUsage: usage.scan,
      inFlightScanCount: RiaUsageCounter.getInFlightCount('scan'),
      scanDailyLimit: RemoteConfigService.get('scan_free_daily'),
      isPoolDegraded: RemoteConfigService.get('ria_pool_degraded'),
      isRiaEnabled: RemoteConfigService.get('ria_enabled'),
    });

    if (!scanGate.allowed) {
      if (scanGate.reason === 'limit_reached') {
        Alert.alert(
          'Daily Scan Limit Reached',
          `You've reached your ${scanGate.totalAllowed} free scans for today. Resets at midnight.`,
          isPro
            ? [{ text: 'OK' }]
            : [
                { text: 'Upgrade to Pro', onPress: onOpenPaywall },
                { text: 'OK', style: 'cancel' },
              ]
        );
      } else if (scanGate.reason === 'capacity_resting') {
        Alert.alert(
          'Ria Is Resting',
          "Ria's meal vision is currently at capacity. Please check back shortly."
        );
      }
      return;
    }

    onOpenFoodVision?.();
    setPhotoSheetVisible(true);
  };

  const handleLaunchCamera = async () => {
    setPhotoSheetVisible(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Access Required',
          'Calorify needs camera access to snap and analyze your meals.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await handleProcessPhotoScan(result.assets[0]);
      }
    } catch (err) {
      console.warn('[RiaSpaceScreen] Camera launch error:', err);
    }
  };

  const handleLaunchGallery = async () => {
    setPhotoSheetVisible(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Access Required',
          'Calorify needs photo library access to select meal photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await handleProcessPhotoScan(result.assets[0]);
      }
    } catch (err) {
      console.warn('[RiaSpaceScreen] Gallery launch error:', err);
    }
  };

  const handleProcessPhotoScan = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      Alert.alert('Image Error', 'Could not read image data from photo. Please try another photo.');
      return;
    }

    // 1. Scan limit gate check
    const scanGate = canPerformScan({
      currentScanUsage: usage.scan,
      inFlightScanCount: RiaUsageCounter.getInFlightCount('scan'),
      scanDailyLimit: RemoteConfigService.get('scan_free_daily'),
      isPoolDegraded: RemoteConfigService.get('ria_pool_degraded'),
      isRiaEnabled: RemoteConfigService.get('ria_enabled'),
    });

    if (!scanGate.allowed) {
      if (scanGate.reason === 'limit_reached') {
        Alert.alert(
          'Daily Scan Limit Reached',
          `You've reached your ${scanGate.totalAllowed} free scans for today. Resets at midnight.`,
          isPro
            ? [{ text: 'OK' }]
            : [
                { text: 'Upgrade to Pro', onPress: onOpenPaywall },
                { text: 'OK', style: 'cancel' },
              ]
        );
      }
      return;
    }

    // 2. Reserve in-flight scan
    RiaUsageCounter.reservePending('scan');

    // 3. Add User message with photo thumbnail (local only)
    const userMsgId = `msg_${Date.now()}_user`;
    const userPhotoMsg: RiaMessage = {
      id: userMsgId,
      role: 'user',
      kind: 'photo',
      photoThumbUri: asset.uri,
      text: 'Scanned a meal photo',
      status: 'done',
      createdAt: Date.now(),
    };
    const threadWithUser = [...messages, userPhotoMsg];
    await persistThread(threadWithUser);

    // 4. Ria thinking state
    setIsThinking(true);
    setThinkingNotice('Analyzing your meal photo...');

    try {
      const mimeType = asset.mimeType || 'image/jpeg';
      const visionResult = await AIService.analyzeFoodImage(asset.base64, mimeType);

      // 5. Increment scan counter only on successful response
      const updatedUsage = await RiaUsageCounter.incrementUsage('scan', currentUser?.id);
      setUsage(updatedUsage);
      RiaUsageCounter.releasePending('scan');

      // 6. Non-food fallback detection
      if ((visionResult as any).isFood === false || visionResult.name.toLowerCase() === 'not food') {
        const nonFoodMsg: RiaMessage = {
          id: `msg_${Date.now()}_ria`,
          role: 'ria',
          kind: 'text',
          text: "I couldn't detect any food or beverage in that photo. Could you try taking a clearer photo from directly above with good lighting?",
          status: 'done',
          createdAt: Date.now(),
        };
        await persistThread([...threadWithUser, nonFoodMsg]);
        return;
      }

      // 7. Context-aware slot selection based on time of day
      const currentHour = new Date().getHours();
      let slot: MealCardSlot = 'snack';
      if (currentHour >= 5 && currentHour < 11) slot = 'breakfast';
      else if (currentHour >= 11 && currentHour < 16) slot = 'lunch';
      else if (currentHour >= 16 && currentHour < 19) slot = 'snack';
      else slot = 'dinner';

      // 8. 10-Minute duplicate check
      let duplicateWarning: string | undefined;
      if (currentLog?.meals) {
        const dupCheck = RiaDuplicateChecker.check(visionResult.name, currentLog.meals, slot);
        if (dupCheck.isDuplicate) {
          duplicateWarning = `You logged ${dupCheck.matchedMealName} ${dupCheck.minutesAgo}m ago. Add again?`;
        }
      }

      // 9. Build proposed MealCardData with local photo thumbnail
      const mealCardData: MealCardData = {
        slot,
        items: [
          {
            name: visionResult.name,
            qty: visionResult.defaultServingSize || 1,
            unit: visionResult.servingUnit || 'portion',
            kcal: visionResult.calories,
            protein: visionResult.protein,
            carbs: visionResult.carbs,
            fat: visionResult.fat,
            source: 'estimate',
          },
        ],
        assumption: visionResult.notes || `Estimated 1 ${visionResult.servingUnit || 'portion'}`,
        state: 'proposed',
        photoThumbUri: asset.uri,
        duplicateWarning,
      };

      const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1);
      const riaMsg: RiaMessage = {
        id: `msg_${Date.now()}_ria`,
        role: 'ria',
        kind: 'meal_card',
        text: `I've analyzed your photo as **${visionResult.name}** (~${visionResult.calories} kcal). Review and tap **Add to ${slotLabel}** to log it.`,
        card: { type: 'meal', data: mealCardData },
        photoThumbUri: asset.uri,
        status: 'done',
        createdAt: Date.now(),
      };

      await persistThread([...threadWithUser, riaMsg]);
    } catch (err: any) {
      RiaUsageCounter.releasePending('scan');
      const mapped = AIErrorMapper.fromRawError(err);
      const errorMsg: RiaMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'ria',
        kind: 'error',
        text: mapped.userMessage || 'Could not analyze this photo. Please try again.',
        status: 'failed',
        createdAt: Date.now(),
      };
      await persistThread([...threadWithUser, errorMsg]);
    } finally {
      setIsThinking(false);
      setThinkingNotice(null);
    }
  };

  // Action Card Handlers
  const handleConfirmMeal = useCallback(
    async (messageId: string, mealData: MealCardData) => {
      const slot = mealData.slot === 'snack' ? 'snacks' : mealData.slot;
      const nowIso = new Date().toISOString();
      const createdItems: LoggedMealItem[] = mealData.items.map(item => ({
        id: item.id || `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        foodId: 'ria_ai_item',
        name: item.name,
        mealType: slot,
        servingUnit: item.unit || 'serving',
        quantity: item.qty || 1,
        calories: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: 0,
        loggedAt: nowIso,
      }));

      batchAddLoggedMeals(createdItems);

      const now = Date.now();
      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'meal') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'logged' as const,
                loggedAt: now,
                undoUntil: now + 10000,
                entryIds: createdItems.map(i => i.id),
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [batchAddLoggedMeals, messages, persistThread]
  );

  const handleUndoMeal = useCallback(
    async (messageId: string, mealData: MealCardData) => {
      if (mealData.entryIds && mealData.entryIds.length > 0) {
        batchRemoveMealItems(mealData.entryIds);
      }

      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'meal') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'undone' as const,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [batchRemoveMealItems, messages, persistThread]
  );

  const handleEditMeal = useCallback(
    async (messageId: string, mealData: MealCardData) => {
      // Prompt Ria to edit this meal
      const itemNames = mealData.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(', ');
      handleSendMessage(`I want to change the portion for: ${itemNames}`);
    },
    [handleSendMessage]
  );

  const handleDismissMeal = useCallback(
    async (messageId: string, _mealData: MealCardData) => {
      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'meal') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'dismissed' as const,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [messages, persistThread]
  );

  const handleConfirmWater = useCallback(
    async (messageId: string, amountMl: number, _waterData: WaterCardData) => {
      addWater(amountMl);
      const now = Date.now();
      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'water') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                amountMl,
                state: 'logged' as const,
                loggedAt: now,
                undoUntil: now + 10000,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [addWater, messages, persistThread]
  );

  const handleUndoWater = useCallback(
    async (messageId: string, waterData: WaterCardData) => {
      addWater(-waterData.amountMl);
      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'water') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'undone' as const,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [addWater, messages, persistThread]
  );

  const handleDismissWater = useCallback(
    async (messageId: string, _waterData: WaterCardData) => {
      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'water') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'dismissed' as const,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [messages, persistThread]
  );

  const handleConfirmWeight = useCallback(
    async (messageId: string, weightData: WeightCardData) => {
      logWeight(weightData.weightKg);
      const now = Date.now();
      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'weight') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'logged' as const,
                loggedAt: now,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [logWeight, messages, persistThread]
  );

  const handleDismissWeight = useCallback(
    async (messageId: string, _weightData: WeightCardData) => {
      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'weight') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'dismissed' as const,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [messages, persistThread]
  );

  const handleLogSuggestionOption = useCallback(
    async (_messageId: string, option: SuggestionOption) => {
      handleSendMessage(`Log this: ${option.name} (${option.kcal} kcal)`);
    },
    [handleSendMessage]
  );

  const handleApplyPlanChange = useCallback(
    async (messageId: string, planData: PlanChangeCardData) => {
      // Minor protection: ages 13-17 maintain only
      const minorCheck = RiaSafetyService.checkMinorPolicy(userGoals.age);
      if (minorCheck.isMinor && !minorCheck.allowDeficitOrPlanChange) {
        Alert.alert(
          'Protected Nutrition Plan',
          minorCheck.guidanceMessage || 'Calorify provides maintain-only nutrition guidance for teens aged 13–17.'
        );
        return;
      }

      // Calorie safety floor enforcement
      const floorCheck = RiaSafetyService.checkRestrictionQuery(
        `plan ${planData.calories} calories`,
        userGoals.gender
      );
      if (floorCheck.isBelowSafetyFloor) {
        Alert.alert(
          'Calorie Floor Notice',
          floorCheck.guidanceMessage || 'Calorie targets cannot fall below clinical safety floors.'
        );
        return;
      }

      updateGoals({
        dailyCalorieBudget: planData.calories,
        targetProtein: planData.protein,
        targetCarbs: planData.carbs,
        targetFat: planData.fat,
      });

      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'plan_change') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'applied' as const,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [updateGoals, messages, persistThread]
  );

  const handleDismissPlanChange = useCallback(
    async (messageId: string, _planData: PlanChangeCardData) => {
      const updated = messages.map(m => {
        if (m.id === messageId && m.card?.type === 'plan_change') {
          return {
            ...m,
            card: {
              ...m.card,
              data: {
                ...m.card.data,
                state: 'dismissed' as const,
              },
            },
          };
        }
        return m;
      });

      setMessages(updated);
      await persistThread(updated);
    },
    [messages, persistThread]
  );

  // Render header
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
      <Pressable
        style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}
        onPress={onBack}
        testID="ria-back-btn"
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={22} color="#0F172A" />
      </Pressable>

      <View style={styles.headerTitleRow}>
        <View style={styles.avatarHalo}>
          <Image
            source={require('../../../../assets/ria_avatar.webp')}
            style={styles.headerAvatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={styles.onlineDot} />
        </View>
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.headerTitle}>Ria</Text>
            {isPro && (
              <View style={styles.proPill}>
                <Ionicons name="sparkles" size={9} color="#D97706" />
                <Text style={styles.proPillText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle}>Knows your day</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}
        onPress={() => setMenuVisible(true)}
        testID="ria-menu-btn"
        accessibilityRole="button"
        accessibilityLabel="Chat options"
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#0F172A" />
      </Pressable>
    </View>
  );

  // Render empty state (First open)
  const renderEmptyState = () => (
    <View style={styles.emptyContainer} testID="ria-empty-state">
      <View style={styles.emptyAvatarHalo}>
        <Image
          source={require('../../../../assets/ria_avatar.webp')}
          style={styles.emptyAvatar}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>
      <Text style={styles.emptyGreeting}>Hi {firstName}, I'm Ria.</Text>
      <Text style={styles.emptyBio}>
        I can log meals from text, review your day, suggest what to eat, or explain your calorie and macro plan.
      </Text>

      <View style={styles.startersSection}>
        <Text style={styles.startersHeader}>Ask me anything to start</Text>
        <Pressable
          style={styles.starterCard}
          onPress={() => handleStarterPress('What is a healthy high-protein dinner idea for tonight?')}
          testID="starter-card-dinner"
        >
          <Text style={styles.starterIcon}>🥗</Text>
          <Text style={styles.starterText}>What should I eat for dinner?</Text>
          <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
        </Pressable>

        <Pressable
          style={styles.starterCard}
          onPress={() => handleStarterPress('How is my calorie and protein progress looking today?')}
          testID="starter-card-review"
        >
          <Text style={styles.starterIcon}>📊</Text>
          <Text style={styles.starterText}>Review my calories and protein today</Text>
          <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
        </Pressable>

        <Pressable
          style={styles.starterCard}
          onPress={() => handleStarterPress('How many calories are in a cup of filter coffee or chai?')}
          testID="starter-card-coffee"
        >
          <Text style={styles.starterIcon}>☕</Text>
          <Text style={styles.starterText}>Check calories in tea or coffee</Text>
          <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
        </Pressable>
      </View>
    </View>
  );

  // Render single message item in FlatList
  const renderMessageItem = useCallback(
    ({ item }: { item: RiaMessage }) => {
      return (
        <RiaMessageBubble
          message={item}
          onRetry={handleRetryMessage}
          onCopy={handleCopyText}
          onConfirmMeal={handleConfirmMeal}
          onUndoMeal={handleUndoMeal}
          onEditMeal={handleEditMeal}
          onDismissMeal={handleDismissMeal}
          onConfirmWater={handleConfirmWater}
          onUndoWater={handleUndoWater}
          onDismissWater={handleDismissWater}
          onConfirmWeight={handleConfirmWeight}
          onDismissWeight={handleDismissWeight}
          onLogSuggestionOption={handleLogSuggestionOption}
          onApplyPlanChange={handleApplyPlanChange}
          onDismissPlanChange={handleDismissPlanChange}
        />
      );
    },
    [
      handleRetryMessage,
      handleCopyText,
      handleConfirmMeal,
      handleUndoMeal,
      handleEditMeal,
      handleDismissMeal,
      handleConfirmWater,
      handleUndoWater,
      handleDismissWater,
      handleConfirmWeight,
      handleDismissWeight,
      handleLogSuggestionOption,
      handleApplyPlanChange,
      handleDismissPlanChange,
    ]
  );

  // Remaining messages notice
  const remainingNotice = useMemo(() => {
    if (isPro) return null;
    const remaining = gateStatus.allowed ? gateStatus.remaining : 0;
    const total = gateStatus.totalAllowed;
    if (shouldShowRemainingNotice(remaining, total)) {
      return `${remaining} message${remaining === 1 ? '' : 's'} left today`;
    }
    return null;
  }, [isPro, gateStatus]);

  // Is composer blocked by daily limit or capacity?
  const isLimitReached = !gateStatus.allowed && gateStatus.reason === 'limit_reached';
  const isCapacityResting = !gateStatus.allowed && gateStatus.reason === 'capacity_resting';

  return (
    <View style={styles.container} testID={testID}>
      {renderHeader()}

      {/* Real-time nutrition context strip */}
      <RiaContextStrip
        remainingCalories={remainingCalories}
        proteinRemaining={proteinRemaining}
        isSensitiveMode={isSensitiveMode}
      />

      {/* Toast alert on copy */}
      {copiedToast && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>Copied to clipboard</Text>
        </View>
      )}

      {/* Message thread virtualized list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          <>
            {isThinking && (
              <RiaMessageBubble
                message={{
                  id: 'thinking_temp',
                  role: 'ria',
                  kind: 'text',
                  createdAt: Date.now(),
                  status: 'streaming',
                }}
                isThinking={true}
                thinkingNotice={thinkingNotice}
              />
            )}
            {isStreaming && Boolean(streamingText) && (
              <RiaMessageBubble
                message={{
                  id: 'streaming_temp',
                  role: 'ria',
                  kind: 'text',
                  text: streamingText,
                  createdAt: Date.now(),
                  status: 'streaming',
                }}
                isStreaming={true}
              />
            )}
          </>
        }
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (messages.length > 0 || isStreaming) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />

      {/* Bottom Area: Suggestion chips + Remaining notice + Composer / Limit Card / Capacity Card */}
      <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 12) + keyboardHeight }]}>
        {isLimitReached ? (
          <LimitReachedCard
            isPro={isPro}
            limit={gateStatus.totalAllowed}
            onUpgradePress={onOpenPaywall}
          />
        ) : isCapacityResting ? (
          <CapacityNoticeCard
            retryAfter={(gateStatus as any)?.retryAfter}
            onRetryPress={refreshUsage}
          />
        ) : (
          <>
            {remainingNotice && (
              <View style={styles.remainingPill} testID="remaining-notice-pill">
                <Ionicons name="time-outline" size={11} color="#B45309" />
                <Text style={styles.remainingPillText}>{remainingNotice}</Text>
              </View>
            )}

            {!isStreaming && (
              <RiaSuggestionRow
                onSelectSuggestion={handleSendMessage}
                userStruggles={userGoals.struggles || []}
              />
            )}

            <RiaComposer
              value={inputQuery}
              onChangeText={setInputQuery}
              onSend={handleSendMessage}
              onStop={handleStopStreaming}
              onPhotoPress={handlePressPhoto}
              isStreaming={isStreaming || isThinking}
              placeholder="Ask Ria anything about food, nutrition..."
            />
          </>
        )}
      </View>

      {/* Overflow Options Modal Sheet */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuSheet}>
            <Pressable
              style={styles.menuOption}
              onPress={handleToggleSensitiveMode}
              testID="menu-sensitive-mode-btn"
              accessibilityRole="button"
              accessibilityLabel={`Toggle sensitive mode, currently ${isSensitiveMode ? 'on' : 'off'}`}
            >
              <Ionicons
                name={isSensitiveMode ? 'heart' : 'heart-outline'}
                size={18}
                color={isSensitiveMode ? Colors.protein : '#0F172A'}
              />
              <Text style={styles.menuOptionText}>
                {isSensitiveMode ? 'Sensitive Mode: On' : 'Sensitive Mode: Off'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                setMessages([]);
                ChatHistoryStorage.clearHistory(currentUser?.id);
                haptics.selection();
              }}
              testID="menu-new-chat-btn"
            >
              <Ionicons name="create-outline" size={18} color="#0F172A" />
              <Text style={styles.menuOptionText}>New Chat</Text>
            </Pressable>

            <Pressable
              style={styles.menuOption}
              onPress={handleClearHistory}
              testID="menu-clear-history-btn"
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={[styles.menuOptionText, { color: Colors.error }]}>Clear History</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Phase R6: Photo Source Selection Bottom Sheet */}
      <Modal
        visible={photoSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoSheetVisible(false)}
      >
        <Pressable style={styles.photoModalOverlay} onPress={() => setPhotoSheetVisible(false)}>
          <View style={styles.photoSheetContainer}>
            <View style={styles.photoSheetHandle} />
            <Text style={styles.photoSheetTitle}>Scan Meal Photo</Text>
            <Text style={styles.photoSheetSubtitle}>
              Snap your plate or label to automatically log nutrition
            </Text>

            <Pressable
              style={({ pressed }) => [styles.photoSheetOption, pressed && styles.photoSheetOptionPressed]}
              onPress={handleLaunchCamera}
              testID="photo-sheet-camera-btn"
              accessibilityRole="button"
              accessibilityLabel="Take Photo with camera"
            >
              <View style={[styles.photoOptionIconCircle, { backgroundColor: '#FFF5F1' }]}>
                <Ionicons name="camera" size={20} color="#F47551" />
              </View>
              <View style={styles.photoOptionTextCol}>
                <Text style={styles.photoOptionTitle}>Take Photo</Text>
                <Text style={styles.photoOptionDesc}>Snap a live picture of your food or plate</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.photoSheetOption, pressed && styles.photoSheetOptionPressed]}
              onPress={handleLaunchGallery}
              testID="photo-sheet-gallery-btn"
              accessibilityRole="button"
              accessibilityLabel="Choose photo from library"
            >
              <View style={[styles.photoOptionIconCircle, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="images" size={20} color="#0284C7" />
              </View>
              <View style={styles.photoOptionTextCol}>
                <Text style={styles.photoOptionTitle}>Photo Library</Text>
                <Text style={styles.photoOptionDesc}>Select an existing photo from your library</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.photoSheetCancelBtn}
              onPress={() => setPhotoSheetVisible(false)}
              testID="photo-sheet-cancel-btn"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.photoSheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FAF9F6',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarHalo: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE9E1',
    overflow: 'hidden',
  },
  headerAvatar: {
    width: 36,
    height: 36,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.protein,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  proPillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 9,
    color: '#B45309',
  },
  headerSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11.5,
    color: '#64748B',
  },
  toastContainer: {
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 4,
    zIndex: 50,
  },
  toastText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  emptyAvatarHalo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE9E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFD5C6',
  },
  emptyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  emptyGreeting: {
    fontFamily: Fonts.kurale,
    fontSize: 24,
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyBio: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
  },
  startersSection: {
    width: '100%',
    gap: 8,
  },
  startersHeader: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 4,
  },
  starterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  starterIcon: {
    fontSize: 16,
  },
  starterText: {
    flex: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#334155',
  },
  bottomArea: {
    backgroundColor: '#FAF9F6',
  },
  remainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 5,
    marginBottom: 4,
  },
  remainingPillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: '#B45309',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    width: 180,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  menuOptionText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13.5,
    color: '#0F172A',
  },

  // Photo Source Sheet (Phase R6)
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  photoSheetContainer: {
    width: '100%',
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  photoSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  photoSheetTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 4,
  },
  photoSheetSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  photoSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  photoSheetOptionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  photoOptionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionTextCol: {
    flex: 1,
  },
  photoOptionTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14.5,
    color: '#0F172A',
  },
  photoOptionDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  photoSheetCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  photoSheetCancelText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#64748B',
  },
});
