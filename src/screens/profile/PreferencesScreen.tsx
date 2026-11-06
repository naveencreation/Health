import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Platform,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useGoals, useDailyLog } from '@/context/HealthContext';
import { AIService } from '@/services/ai';
import { BYOKSetupModal } from '@/components/modals/BYOKSetupModal';
import { GeminiIcon } from '@/components/common/GeminiIcon';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { TimePickerModal } from '@/components';
import {
  NotificationService,
  NotificationScheduler,
  NotificationStorage,
  isInsideQuietHours,
  buildSyncOptions,
} from '@/services/notifications';
import { NOTIFICATION_CHANNELS } from '@/config/notificationChannels';
import { usePro, ProPaywallModal } from '@/features/subscription';
import { PLAN_NAMES } from '@/services/payments/paymentService';

const SWITCH_TRACK_ACTIVE = `${Colors.primary}80`;
const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

interface PreferencesScreenProps {
  onBack: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const PreferencesScreen: React.FC<PreferencesScreenProps> = ({
  onBack,
  onSignIn,
  onSignOut,
}) => {
  const { currentUser, logout, deleteAccount } = useAuth();
  const { userGoals, updateGoals } = useGoals();
  const { dailyLogs, todayStr } = useDailyLog();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutUnsynced, setLogoutUnsynced] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  // Email accounts must re-enter their password before deletion
  const needsPassword = Boolean(currentUser?.email) && !currentUser?.isGuest;

  const [riaTone, setRiaTone] = useState<'supportive' | 'focused' | 'scientific'>(
    userGoals.riaTone || 'supportive'
  );
  const [waterReminder, setWaterReminder] = useState(true);
  const [mealReminder, setMealReminder] = useState(true);
  const [stepReminder, setStepReminder] = useState(true);
  const [streakReminder, setStreakReminder] = useState(true);
  const [weightReminder, setWeightReminder] = useState(false);
  const [weightTime, setWeightTime] = useState('07:30');
  const [breakfastTime, setBreakfastTime] = useState('08:30');
  const [lunchTime, setLunchTime] = useState('13:00');
  const [dinnerTime, setDinnerTime] = useState('19:30');
  const [skipsBreakfast, setSkipsBreakfast] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [timePickerConfig, setTimePickerConfig] = useState<{
    key: 'breakfast' | 'lunch' | 'dinner' | 'weight' | 'quietStart' | 'quietEnd';
    title: string;
    time: string;
    presets: string[];
  } | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [quietError, setQuietError] = useState<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  // Serialized: each save reads then writes storage, so overlapping taps would drop changes
  const saveReminders = (updates: Parameters<typeof NotificationStorage.updateSettings>[0]) => {
    const run = saveQueue.current
      .then(async () => {
        const settings = await NotificationStorage.updateSettings(updates, currentUser?.id);
        await NotificationScheduler.syncSchedules({
          ...buildSyncOptions(dailyLogs[todayStr], userGoals, currentUser?.id),
          settings,
        });
      })
      .catch(() => {});
    saveQueue.current = run;
    return run;
  };

  // Turning a reminder on needs OS permission; the switch stays off when it is denied
  const canChange = async (enabling: boolean) => {
    if (!settingsLoaded) return false;
    if (!enabling || Platform.OS === 'web') return true;
    const granted = await NotificationService.requestPermission();
    setPermissionDenied(!granted);
    return granted;
  };

  // AI BYOK Configuration States
  const [byokModalVisible, setByokModalVisible] = useState(false);
  const [aiConnected, setAiConnected] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState('');

  // Pro Subscription State
  const { isPro, activePlanId } = usePro();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const refreshAIStatus = async () => {
    const configured = await AIService.isKeyConfigured();
    setAiConnected(configured);
    if (configured) {
      const masked = await AIService.getMaskedKey();
      setMaskedApiKey(masked);
    } else {
      setMaskedApiKey('');
    }
  };

  useEffect(() => {
    setRiaTone(userGoals.riaTone || 'supportive');
    refreshAIStatus();
  }, [userGoals]);

  // Load notification settings from NotificationStorage (seed from userGoals on first load)
  useEffect(() => {
    NotificationStorage.loadSettings(currentUser?.id, userGoals)
      .then(settings => {
        setWaterReminder(settings.water.enabled);
        setMealReminder(settings.meals.enabled);
        setStepReminder(settings.steps.enabled);
        setStreakReminder(settings.streak.enabled);
        setWeightReminder(settings.weight?.enabled ?? false);
        setWeightTime(settings.weight?.time || '07:30');
        setBreakfastTime(settings.meals.breakfast);
        setLunchTime(settings.meals.lunch);
        setDinnerTime(settings.meals.dinner);
        setSkipsBreakfast(settings.meals.skipsBreakfast);
        setQuietHoursStart(settings.quietHours.start);
        setQuietHoursEnd(settings.quietHours.end);
        const anyOn =
          settings.water.enabled ||
          settings.meals.enabled ||
          settings.steps.enabled ||
          settings.streak.enabled ||
          settings.weight?.enabled;
        if (anyOn && Platform.OS !== 'web') {
          NotificationService.getPermissionStatus()
            .then(granted => setPermissionDenied(!granted))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true));
  }, [currentUser?.id]);

  const handleSelectTone = (tone: 'supportive' | 'focused' | 'scientific') => {
    setRiaTone(tone);
    updateGoals({ riaTone: tone });
  };

  const handleToggleWater = async (val: boolean) => {
    if (!(await canChange(val))) return;
    setWaterReminder(val);
    // Flag only, so the interval chosen in Hydration settings is kept
    await saveReminders({ waterReminder: val });
  };

  const handleToggleMeal = async (val: boolean) => {
    if (!(await canChange(val))) return;
    setMealReminder(val);
    await saveReminders({ mealReminder: val });
  };

  const handleToggleStep = async (val: boolean) => {
    if (!(await canChange(val))) return;
    setStepReminder(val);
    await saveReminders({ stepReminder: val });
  };

  const handleToggleStreak = async (val: boolean) => {
    if (!(await canChange(val))) return;
    setStreakReminder(val);
    await saveReminders({ streakReminder: val });
  };

  const handleToggleWeight = async (val: boolean) => {
    if (!(await canChange(val))) return;
    setWeightReminder(val);
    await saveReminders({ weight: { enabled: val, time: weightTime } });
  };

  const handleToggleSkipBreakfast = async (val: boolean) => {
    if (!settingsLoaded) return;
    setSkipsBreakfast(val);
    await saveReminders({
      meals: {
        enabled: mealReminder,
        breakfast: breakfastTime,
        lunch: lunchTime,
        dinner: dinnerTime,
        skipsBreakfast: val,
      },
    });
  };

  const handleSavePickedTime = async (newTime: string) => {
    if (!timePickerConfig || !settingsLoaded) return;
    const { key } = timePickerConfig;
    // Equal start and end would make quiet hours a zero-length window
    if (
      (key === 'quietStart' && newTime === quietHoursEnd) ||
      (key === 'quietEnd' && newTime === quietHoursStart)
    ) {
      setQuietError('Quiet hours need different start and end times.');
      return;
    }
    if (key === 'quietStart' || key === 'quietEnd') setQuietError(null);

    const updatedMeals = {
      enabled: mealReminder,
      breakfast: breakfastTime,
      lunch: lunchTime,
      dinner: dinnerTime,
      skipsBreakfast,
    };
    const updatedQuiet = {
      start: quietHoursStart,
      end: quietHoursEnd,
    };
    const updatedWeight = {
      enabled: weightReminder,
      time: weightTime,
    };

    if (key === 'breakfast') {
      setBreakfastTime(newTime);
      updatedMeals.breakfast = newTime;
    } else if (key === 'lunch') {
      setLunchTime(newTime);
      updatedMeals.lunch = newTime;
    } else if (key === 'dinner') {
      setDinnerTime(newTime);
      updatedMeals.dinner = newTime;
    } else if (key === 'weight') {
      setWeightTime(newTime);
      updatedWeight.time = newTime;
    } else if (key === 'quietStart') {
      setQuietHoursStart(newTime);
      updatedQuiet.start = newTime;
    } else if (key === 'quietEnd') {
      setQuietHoursEnd(newTime);
      updatedQuiet.end = newTime;
    }

    await saveReminders({
      meals: updatedMeals,
      quietHours: updatedQuiet,
      weight: updatedWeight,
    });
  };

  const checkTimeInQuiet = useCallback(
    (timeStr: string) => {
      const [h, m] = (timeStr || '12:00').split(':').map(Number);
      const d = new Date();
      d.setHours(h || 0, m || 0, 0, 0);
      return isInsideQuietHours(d, quietHoursStart, quietHoursEnd);
    },
    [quietHoursStart, quietHoursEnd]
  );

  const isBreakfastInQuiet = useMemo(
    () => checkTimeInQuiet(breakfastTime),
    [checkTimeInQuiet, breakfastTime]
  );
  const isLunchInQuiet = useMemo(
    () => checkTimeInQuiet(lunchTime),
    [checkTimeInQuiet, lunchTime]
  );
  const isDinnerInQuiet = useMemo(
    () => checkTimeInQuiet(dinnerTime),
    [checkTimeInQuiet, dinnerTime]
  );
  const isWeightInQuiet = useMemo(
    () => checkTimeInQuiet(weightTime),
    [checkTimeInQuiet, weightTime]
  );
  // Fixed planner times for steps (17:30) and streak (21:00)
  const isStepInQuiet = checkTimeInQuiet('17:30');
  const isStreakInQuiet = checkTimeInQuiet('21:00');

  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [testNotifSuccess, setTestNotifSuccess] = useState(false);
  const [testNotifFailed, setTestNotifFailed] = useState(false);

  const handleSendTestNotification = async () => {
    try {
      setIsTestingNotif(true);
      setTestNotifSuccess(false);
      setTestNotifFailed(false);

      const granted = await NotificationService.requestPermission();
      if (!granted) {
        if (Platform.OS !== 'web') setPermissionDenied(true);
        setTestNotifFailed(true);
        setIsTestingNotif(false);
        return;
      }

      const id = await NotificationService.scheduleNotification({
        title: '🍳 Lunch Time Reminder (Test)',
        body: 'Tap here to test 1-tap Food Vision camera launch!',
        triggerSeconds: 5,
        channelId: NOTIFICATION_CHANNELS.MEALS.id,
        data: {
          route: 'food_vision',
          reminderType: 'meal_lunch',
        },
      });
      if (!id) {
        setTestNotifFailed(true);
        setIsTestingNotif(false);
        return;
      }

      setTestNotifSuccess(true);
      setTimeout(() => {
        setIsTestingNotif(false);
      }, 5500);
      setTimeout(() => {
        setTestNotifSuccess(false);
      }, 10000);
    } catch {
      setTestNotifFailed(true);
      setIsTestingNotif(false);
    }
  };

  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLogoutPress = () => {
    setConfirmAction('logout');
    setDeleteError(null);
  };

  const handleDeletePress = () => {
    setConfirmAction('delete');
    setDeleteError(null);
    setDeletePassword('');
  };

  const handleExecuteLogout = async () => {
    setIsSigningOut(true);
    // Second tap after an unsynced warning signs out anyway
    const done = await logout(logoutUnsynced);
    setIsSigningOut(false);
    if (!done) {
      setLogoutUnsynced(true);
      return;
    }
    setLogoutUnsynced(false);
    setConfirmAction(null);
    onBack();
    if (onSignOut) onSignOut();
  };

  const handleExecuteDelete = async () => {
    if (needsPassword && !deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteAccount(needsPassword ? deletePassword : undefined);
    setIsDeleting(false);
    if (res.success) {
      setDeletePassword('');
      setConfirmAction(null);
      onBack();
      if (onSignOut) onSignOut();
    } else {
      setDeleteError(res.error || 'Failed to delete account.');
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* 1. Unified Top Navigation Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [styles.headerBackBtn, pressed ? styles.btnPressed : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Go back to profile"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.iconNavy} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Preferences & Account
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              AI coach style, notifications & security
            </Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Ria AI Coaching Tone */}
        <Text style={styles.sectionHeader}>Ria AI Coaching Style</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.personalityCard,
              riaTone === 'supportive' ? styles.personalityCardActive : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => handleSelectTone('supportive')}
            accessibilityRole="radio"
            accessibilityState={{ checked: riaTone === 'supportive' }}
            accessibilityLabel="Warm and encouraging tone: Ria celebrates your wins and coaches with positive reinforcement"
          >
            <View style={[styles.personalityIconBox, styles.personalityIconSupportive]}>
              <Ionicons name="sparkles" size={16} color={Colors.warningDark} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.personalityTitle}>Warm & Encouraging</Text>
              <Text style={styles.personalityDesc}>
                Ria celebrates your wins and coaches with positive reinforcement.
              </Text>
            </View>
            {riaTone === 'supportive' ? (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            ) : null}
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [
              styles.personalityCard,
              riaTone === 'focused' ? styles.personalityCardActive : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => handleSelectTone('focused')}
            accessibilityRole="radio"
            accessibilityState={{ checked: riaTone === 'focused' }}
            accessibilityLabel="Disciplined and direct tone: Ria gives firm accountability and straightforward calorie targets"
          >
            <View style={[styles.personalityIconBox, styles.personalityIconFocused]}>
              <Ionicons name="flame" size={16} color={Colors.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.personalityTitle}>Disciplined & Direct</Text>
              <Text style={styles.personalityDesc}>
                Ria gives firm accountability and straightforward calorie targets.
              </Text>
            </View>
            {riaTone === 'focused' ? (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            ) : null}
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [
              styles.personalityCard,
              riaTone === 'scientific' ? styles.personalityCardActive : null,
              pressed ? styles.pressedSubtle : null,
            ]}
            onPress={() => handleSelectTone('scientific')}
            accessibilityRole="radio"
            accessibilityState={{ checked: riaTone === 'scientific' }}
            accessibilityLabel="Nutritional scientist tone: Deep analytical focus on glycemic response, micronutrients, recovery"
          >
            <View style={[styles.personalityIconBox, styles.personalityIconScientific]}>
              <Ionicons name="flask" size={16} color={Colors.waterDark} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.personalityTitle}>Nutritional Scientist</Text>
              <Text style={styles.personalityDesc}>
                Deep analytical focus on glycemic response, micronutrients, recovery.
              </Text>
            </View>
            {riaTone === 'scientific' ? (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            ) : null}
          </Pressable>
        </View>

        {/* 2. AI Intelligence Engine (BYOK) */}
        <Text style={styles.sectionHeader}>Gemini AI Engine (BYOK)</Text>
        <View style={styles.byokCard}>
          <View style={styles.byokHeaderRow}>
            <View style={styles.byokIconBox}>
              <GeminiIcon size={24} />
            </View>
            <View style={styles.flex1}>
              <View style={styles.byokTitleRow}>
                <Text style={styles.byokTitle}>Gemini AI</Text>
                <View
                  style={[
                    styles.statusPill,
                    aiConnected ? styles.statusPillActive : styles.statusPillInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      aiConnected ? styles.statusDotActive : styles.statusDotInactive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      aiConnected ? styles.statusTextActive : styles.statusTextInactive,
                    ]}
                  >
                    {aiConnected ? 'Active' : 'Not Connected'}
                  </Text>
                </View>
              </View>
              <Text style={styles.byokDesc}>
                {aiConnected
                  ? 'Powers Ria 1-on-1 coaching & AI camera food vision.'
                  : 'Connect your personal Google Gemini API key to enable live coaching and food vision.'}
              </Text>
            </View>
          </View>

          {aiConnected && maskedApiKey ? (
            <View style={styles.byokKeyChip}>
              <View style={styles.byokKeyChipLeft}>
                <Ionicons name="key-outline" size={13} color={Colors.primary} />
                <Text style={styles.byokKeyChipLabel}>Key:</Text>
                <Text style={styles.byokKeyChipValue}>{maskedApiKey}</Text>
              </View>
              {/* Web keeps the key in plain localStorage, so no encryption claim there */}
              {Platform.OS !== 'web' ? (
                <View style={styles.byokSecureTag}>
                  <Ionicons name="shield-checkmark" size={11} color={Colors.success} />
                  <Text style={styles.byokSecureText}>Encrypted</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.byokActionBtn,
              pressed ? styles.byokActionBtnPressed : null,
            ]}
            onPress={() => setByokModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Manage Gemini API key"
          >
            <View style={styles.byokActionLeft}>
              <View style={styles.byokActionIconCircle}>
                <Ionicons
                  name={aiConnected ? 'settings-outline' : 'key-outline'}
                  size={14}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.byokActionBtnText}>
                {aiConnected ? 'Manage Key & Settings' : 'Connect Personal Gemini Key'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={Colors.primary} />
          </Pressable>
        </View>

        {/* 2.5. Calorify Pro Membership */}
        <Text style={styles.sectionHeader}>Calorify Pro</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={[styles.switchIconBox, { backgroundColor: Colors.carbsLight }]}>
              <Ionicons name="star" size={18} color={Colors.carbsDark} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.accountLabel}>Membership Status</Text>
              <Text style={styles.accountValue}>
                {isPro
                  ? `Calorify Pro (${activePlanId ? PLAN_NAMES[activePlanId] : 'Active'})`
                  : 'Free Tier (Standard)'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.proManageBtn, pressed ? styles.pressedSubtle : null]}
              onPress={() => setPaywallVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={isPro ? 'Manage Pro Subscription' : 'Upgrade to Calorify Pro'}
            >
              <Text style={styles.proManageBtnText}>{isPro ? 'Manage' : 'Upgrade'}</Text>
            </Pressable>
          </View>
        </View>

        {/* 3. Notification Reminders */}
        <Text style={styles.sectionHeader}>Reminders & Alerts</Text>
        <View style={styles.card}>
          {permissionDenied ? (
            <Pressable
              style={styles.quietWarningBox}
              onPress={() => Linking.openSettings().catch(() => {})}
              accessibilityRole="button"
              accessibilityLabel="Notifications are blocked, so reminders cannot fire. Open system settings to allow them."
            >
              <Ionicons name="notifications-off-outline" size={14} color={Colors.dangerDark} />
              <Text style={styles.quietWarningText}>
                Notifications are blocked, so reminders cannot fire. Tap to open settings.
              </Text>
              <Ionicons name="open-outline" size={14} color={Colors.dangerDark} />
            </Pressable>
          ) : null}
          <View style={styles.switchRow}>
            <View style={[styles.switchIconBox, styles.switchIconWater]}>
              <Ionicons name="water-outline" size={18} color={Colors.water} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.switchTitle}>Water Reminders</Text>
              <Text style={styles.switchDesc}>Prompt to log hydration throughout the day</Text>
            </View>
            <Switch
              value={waterReminder}
              onValueChange={handleToggleWater}
              trackColor={{ false: Colors.borderMedium, true: SWITCH_TRACK_ACTIVE }}
              thumbColor={waterReminder ? Colors.primary : Colors.surfaceLow}
              accessibilityLabel="Toggle water reminders"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={[styles.switchIconBox, styles.switchIconMeal]}>
              <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.switchTitle}>Meal Logging Reminders</Text>
              <Text style={styles.switchDesc}>Breakfast, lunch, and dinner nudges</Text>
            </View>
            <Switch
              value={mealReminder}
              onValueChange={handleToggleMeal}
              trackColor={{ false: Colors.borderMedium, true: SWITCH_TRACK_ACTIVE }}
              thumbColor={mealReminder ? Colors.primary : Colors.surfaceLow}
              accessibilityLabel="Toggle meal logging reminders"
            />
          </View>

          {/* Meal Times Configuration */}
          {mealReminder && (
            <View style={styles.subSettingsContainer}>
              {/* Skip Breakfast Switch */}
              <View style={styles.subRow}>
                <View style={styles.flex1}>
                  <Text style={styles.subRowTitle}>Skip Breakfast</Text>
                  <Text style={styles.subRowDesc}>Never remind for morning breakfast</Text>
                </View>
                <Switch
                  value={skipsBreakfast}
                  onValueChange={handleToggleSkipBreakfast}
                  trackColor={{ false: Colors.borderMedium, true: SWITCH_TRACK_ACTIVE }}
                  thumbColor={skipsBreakfast ? Colors.primary : Colors.surfaceLow}
                  accessibilityLabel="Toggle skip breakfast"
                />
              </View>

              {/* Breakfast Time */}
              {!skipsBreakfast && (
                <View style={styles.timePickerRowContainer}>
                  <View style={styles.subRow}>
                    <Text style={styles.subRowTitle}>Breakfast Time</Text>
                    <Pressable
                      style={styles.timeBadge}
                      onPress={() =>
                        setTimePickerConfig({
                          key: 'breakfast',
                          title: 'Breakfast Reminder Time',
                          time: breakfastTime,
                          presets: ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30'],
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Change breakfast time from ${breakfastTime}`}
                    >
                      <Ionicons name="time-outline" size={14} color={Colors.primary} />
                      <Text style={styles.timeBadgeText}>{breakfastTime}</Text>
                    </Pressable>
                  </View>
                  {isBreakfastInQuiet && (
                    <View style={styles.quietWarningBox}>
                      <Ionicons name="moon-outline" size={14} color="#EA580C" />
                      <Text style={styles.quietWarningText}>
                        Breakfast at {breakfastTime} falls inside Quiet Hours ({quietHoursStart} – {quietHoursEnd}) and will not fire.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Lunch Time */}
              <View style={styles.timePickerRowContainer}>
                <View style={styles.subRow}>
                  <Text style={styles.subRowTitle}>Lunch Time</Text>
                  <Pressable
                    style={styles.timeBadge}
                    onPress={() =>
                      setTimePickerConfig({
                        key: 'lunch',
                        title: 'Lunch Reminder Time',
                        time: lunchTime,
                        presets: ['12:00', '12:30', '13:00', '13:30', '14:00'],
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Change lunch time from ${lunchTime}`}
                  >
                    <Ionicons name="time-outline" size={14} color={Colors.primary} />
                    <Text style={styles.timeBadgeText}>{lunchTime}</Text>
                  </Pressable>
                </View>
                {isLunchInQuiet && (
                  <View style={styles.quietWarningBox}>
                    <Ionicons name="moon-outline" size={14} color="#EA580C" />
                    <Text style={styles.quietWarningText}>
                      Lunch at {lunchTime} falls inside Quiet Hours ({quietHoursStart} – {quietHoursEnd}) and will not fire.
                    </Text>
                  </View>
                )}
              </View>

              {/* Dinner Time */}
              <View style={styles.timePickerRowContainer}>
                <View style={styles.subRow}>
                  <Text style={styles.subRowTitle}>Dinner Time</Text>
                  <Pressable
                    style={styles.timeBadge}
                    onPress={() =>
                      setTimePickerConfig({
                        key: 'dinner',
                        title: 'Dinner Reminder Time',
                        time: dinnerTime,
                        presets: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Change dinner time from ${dinnerTime}`}
                  >
                    <Ionicons name="time-outline" size={14} color={Colors.primary} />
                    <Text style={styles.timeBadgeText}>{dinnerTime}</Text>
                  </Pressable>
                </View>
                {isDinnerInQuiet && (
                  <View style={styles.quietWarningBox}>
                    <Ionicons name="moon-outline" size={14} color="#EA580C" />
                    <Text style={styles.quietWarningText}>
                      Dinner at {dinnerTime} falls inside Quiet Hours ({quietHoursStart} – {quietHoursEnd}) and will not fire.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={[styles.switchIconBox, styles.switchIconStep]}>
              <Ionicons name="footsteps-outline" size={18} color={Colors.steps} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.switchTitle}>Step Milestone Alerts</Text>
              <Text style={styles.switchDesc}>Daily 17:30 movement and progress check</Text>
            </View>
            <Switch
              value={stepReminder}
              onValueChange={handleToggleStep}
              trackColor={{ false: Colors.borderMedium, true: SWITCH_TRACK_ACTIVE }}
              thumbColor={stepReminder ? Colors.primary : Colors.surfaceLow}
              accessibilityLabel="Toggle step milestone alerts"
            />
          </View>
          {stepReminder && isStepInQuiet ? (
            <View style={styles.quietWarningBox}>
              <Ionicons name="moon-outline" size={14} color="#EA580C" />
              <Text style={styles.quietWarningText}>
                The 17:30 step check falls inside Quiet Hours ({quietHoursStart} – {quietHoursEnd})
                and will not fire.
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Morning Weigh-In Alerts Toggle */}
          <View style={styles.switchRow}>
            <View style={[styles.switchIconBox, styles.switchIconWeight]}>
              <Ionicons name="scale-outline" size={18} color="#8B5CF6" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.switchTitle}>Morning Weigh-In</Text>
              <Text style={styles.switchDesc}>Consistent daily check-in to track weight trends</Text>
            </View>
            <Switch
              value={weightReminder}
              onValueChange={handleToggleWeight}
              trackColor={{ false: Colors.borderMedium, true: SWITCH_TRACK_ACTIVE }}
              thumbColor={weightReminder ? Colors.primary : Colors.surfaceLow}
              accessibilityLabel="Toggle morning weigh-in alerts"
            />
          </View>

          {weightReminder && (
            <View style={styles.subSettingsContainer}>
              <View style={styles.timePickerRowContainer}>
                <View style={styles.subRow}>
                  <Text style={styles.subRowTitle}>Weigh-In Time</Text>
                  <Pressable
                    style={styles.timeBadge}
                    onPress={() =>
                      setTimePickerConfig({
                        key: 'weight',
                        title: 'Weigh-In Reminder Time',
                        time: weightTime,
                        presets: ['06:30', '07:00', '07:30', '08:00', '08:30'],
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Change weigh-in time from ${weightTime}`}
                  >
                    <Ionicons name="time-outline" size={14} color={Colors.primary} />
                    <Text style={styles.timeBadgeText}>{weightTime}</Text>
                  </Pressable>
                </View>
                {isWeightInQuiet && (
                  <View style={styles.quietWarningBox}>
                    <Ionicons name="moon-outline" size={14} color="#EA580C" />
                    <Text style={styles.quietWarningText}>
                      Weigh-in at {weightTime} falls inside Quiet Hours ({quietHoursStart} – {quietHoursEnd}) and will not fire.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Streak Protection Alerts Toggle */}
          <View style={styles.switchRow}>
            <View style={[styles.switchIconBox, styles.switchIconStreak]}>
              <Ionicons name="flame-outline" size={18} color="#EA580C" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.switchTitle}>Streak Protection Alerts</Text>
              <Text style={styles.switchDesc}>Evening 21:00 reminder when streak is at risk</Text>
            </View>
            <Switch
              value={streakReminder}
              onValueChange={handleToggleStreak}
              trackColor={{ false: Colors.borderMedium, true: SWITCH_TRACK_ACTIVE }}
              thumbColor={streakReminder ? Colors.primary : Colors.surfaceLow}
              accessibilityLabel="Toggle streak protection alerts"
            />
          </View>
          {streakReminder && isStreakInQuiet ? (
            <View style={styles.quietWarningBox}>
              <Ionicons name="moon-outline" size={14} color="#EA580C" />
              <Text style={styles.quietWarningText}>
                The 21:00 streak alert falls inside Quiet Hours ({quietHoursStart} – {quietHoursEnd})
                and will not fire.
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Quiet Hours Configuration */}
          <View style={styles.quietHoursContainer}>
            <View style={styles.quietHoursHeaderRow}>
              <Ionicons name="moon" size={16} color={Colors.textSecondary} />
              <Text style={styles.quietHoursHeaderTitle}>Quiet Hours (Do Not Disturb)</Text>
            </View>
            <Text style={styles.quietHoursDesc}>
              Reminders falling inside this window will not fire to protect your rest.
            </Text>
            <View style={styles.quietHoursTimesRow}>
              <View style={styles.quietHourBlock}>
                <Text style={styles.quietHourLabel}>STARTS</Text>
                <Pressable
                  style={styles.timeBadge}
                  onPress={() =>
                    setTimePickerConfig({
                      key: 'quietStart',
                      title: 'Quiet Hours Start',
                      time: quietHoursStart,
                      presets: ['21:00', '21:30', '22:00', '22:30', '23:00', '00:00'],
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Change quiet hours start from ${quietHoursStart}`}
                >
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={styles.timeBadgeText}>{quietHoursStart}</Text>
                </Pressable>
              </View>
              <Text style={styles.quietHourArrow}>→</Text>
              <View style={styles.quietHourBlock}>
                <Text style={styles.quietHourLabel}>ENDS</Text>
                <Pressable
                  style={styles.timeBadge}
                  onPress={() =>
                    setTimePickerConfig({
                      key: 'quietEnd',
                      title: 'Quiet Hours End',
                      time: quietHoursEnd,
                      presets: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30'],
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Change quiet hours end from ${quietHoursEnd}`}
                >
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={styles.timeBadgeText}>{quietHoursEnd}</Text>
                </Pressable>
              </View>
            </View>
            {quietError ? (
              <Text style={styles.quietWarningText} accessibilityLiveRegion="polite">
                {quietError}
              </Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Test Notification Trigger */}
          <Pressable
            style={({ pressed }) => [
              styles.testNotifBtn,
              pressed ? styles.testNotifBtnPressed : null,
              isTestingNotif ? styles.testNotifBtnActive : null,
            ]}
            onPress={handleSendTestNotification}
            disabled={isTestingNotif}
            accessibilityRole="button"
            accessibilityLabel="Send Test Notification in 5 seconds"
          >
            <View style={styles.testNotifLeft}>
              <View
                style={[
                  styles.testNotifIconCircle,
                  testNotifSuccess ? styles.testNotifIconCircleSuccess : null,
                ]}
              >
                <Ionicons
                  name={testNotifSuccess ? 'checkmark' : 'notifications-outline'}
                  size={18}
                  color={testNotifSuccess ? Colors.success : Colors.primary}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.testNotifTitle}>
                  {isTestingNotif
                    ? 'Firing alert in 5s...'
                    : testNotifSuccess
                    ? 'Alert scheduled! (5s)'
                    : testNotifFailed
                    ? 'Test alert could not be sent'
                    : 'Send Test Notification (5s)'}
                </Text>
                <Text style={styles.testNotifSubtitle}>
                  {isTestingNotif
                    ? 'Lock screen or wait 5s to test banner & camera tap'
                    : testNotifFailed
                    ? Platform.OS === 'web'
                      ? 'Notifications are not available on web'
                      : 'Allow notifications for Calorify, then try again'
                    : 'Tests foreground alert, sound, and 1-tap Food Vision'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
          </Pressable>
        </View>

        {/* 4. Account & Security */}
        <Text style={styles.sectionHeader}>Account & Security</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={[styles.switchIconBox, styles.switchIconAccount]}>
              <Ionicons name="mail-outline" size={18} color={Colors.textSlate600} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.accountLabel}>Signed In As</Text>
              <Text style={styles.accountValue} numberOfLines={1}>
                {currentUser?.email || (currentUser?.isGuest ? 'Guest (this device only)' : 'No email on file')}
              </Text>
            </View>
            <View style={[styles.statusTag, currentUser?.isGuest ? styles.statusTagGuest : null]}>
              <Text
                style={[
                  styles.statusTagText,
                  currentUser?.isGuest ? styles.statusTagTextGuest : null,
                ]}
              >
                {currentUser?.isGuest ? 'GUEST' : 'ACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Guests never sync, so the backup row would be false for them */}
          {!currentUser?.isGuest ? (
            <>
              <View style={styles.accountRow}>
                <View style={[styles.switchIconBox, styles.switchIconBackup]}>
                  <Ionicons name="cloud-done-outline" size={18} color={Colors.success} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.accountLabel}>Cloud Backup</Text>
                  <Text style={styles.accountValue}>Auto-synced with Calorify Cloud</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              </View>

              <View style={styles.divider} />
            </>
          ) : null}

          {/* Sign In or Sign Out Button */}
          {currentUser?.isGuest ? (
            onSignIn ? (
              <Pressable
                style={({ pressed }) => [styles.authBtn, pressed ? styles.pressedSubtle : null]}
                onPress={() => {
                  onBack();
                  onSignIn();
                }}
                accessibilityRole="button"
                accessibilityLabel="Sign in or create account"
              >
                <Ionicons name="log-in-outline" size={18} color={Colors.primary} />
                <Text style={styles.authBtnText}>Sign In / Create Account</Text>
              </Pressable>
            ) : null
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [styles.signOutBtn, pressed ? styles.pressedSubtle : null]}
                onPress={handleLogoutPress}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Sign out of Calorify"
              >
                <Ionicons name="log-out-outline" size={18} color={Colors.dangerDark} />
                <Text style={styles.signOutBtnText}>Sign Out of Calorify</Text>
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressedSubtle : null]}
                onPress={handleDeletePress}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Delete Account Permanently"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={Colors.dangerDark} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color={Colors.dangerDark} />
                    <Text style={styles.deleteBtnText}>Delete Account Permanently</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sub-modals for BYOK & Account Actions */}
      <BYOKSetupModal
        visible={byokModalVisible}
        onClose={() => {
          setByokModalVisible(false);
          refreshAIStatus();
        }}
        onKeyConfigured={refreshAIStatus}
      />

      <ProPaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />

      <ConfirmationModal
        visible={confirmAction === 'logout'}
        title="Sign Out of Calorify?"
        message={
          logoutUnsynced
            ? "Some recent changes haven't reached the cloud yet. Connect to the internet and try again, or sign out anyway and lose them."
            : 'Your logs are saved to your account and load again when you sign back in. They are removed from this device.'
        }
        confirmText={logoutUnsynced ? 'Sign Out Anyway' : 'Sign Out'}
        cancelText="Cancel"
        confirmStyle="destructive"
        iconName="log-out-outline"
        isLoading={isSigningOut}
        onConfirm={handleExecuteLogout}
        onCancel={() => {
          setConfirmAction(null);
          setLogoutUnsynced(false);
        }}
      />

      <ConfirmationModal
        visible={confirmAction === 'delete'}
        title="Delete Account Permanently?"
        message={
          deleteError
            ? deleteError
            : 'This permanently erases your account, logs, weight history, custom foods, Ria chats and streak, in the cloud and on this device.'
        }
        confirmText="Delete Permanently"
        cancelText="Cancel"
        confirmStyle="destructive"
        iconName="trash-outline"
        isLoading={isDeleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => {
          setConfirmAction(null);
          setDeleteError(null);
          setDeletePassword('');
        }}
      >
        {needsPassword && (
          <TextInput
            style={styles.deletePasswordInput}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!isDeleting}
            accessibilityLabel="Password, required to delete your account"
          />
        )}
      </ConfirmationModal>

      <TimePickerModal
        visible={Boolean(timePickerConfig)}
        title={timePickerConfig?.title || 'Select Time'}
        initialTime={timePickerConfig?.time || '12:00'}
        presets={timePickerConfig?.presets}
        onSave={handleSavePickedTime}
        onClose={() => setTimePickerConfig(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  deletePasswordInput: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    marginBottom: 16,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 56,
    justifyContent: 'center',
    zIndex: 10,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    shadowOpacity: 0,
    elevation: 0,
  },
  headerPlaceholder: {
    width: 38,
    height: 38,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginTop: 1,
    includeFontPadding: false,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 16,
  },
  sectionHeader: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    shadowOpacity: 0,
    elevation: 0,
  },
  proManageBtn: {
    backgroundColor: Colors.carbsLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.carbsBorder,
  },
  proManageBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.carbsDark,
  },
  personalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 12,
  },
  personalityCardActive: {
    backgroundColor: Colors.fatLight,
  },
  personalityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalityIconSupportive: {
    backgroundColor: Colors.carbsLight,
  },
  personalityIconFocused: {
    backgroundColor: Colors.fatLight,
  },
  personalityIconScientific: {
    backgroundColor: Colors.waterLight,
  },
  personalityTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  personalityDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  byokCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    shadowOpacity: 0,
    elevation: 0,
    gap: 12,
  },
  byokHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  byokIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.fatLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  byokTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  byokTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  byokDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: Colors.successLight,
  },
  statusPillInactive: {
    backgroundColor: Colors.surfaceInset,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: Colors.success,
  },
  statusDotInactive: {
    backgroundColor: Colors.textMuted,
  },
  statusPillText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
  },
  statusTextActive: {
    color: Colors.successDark,
  },
  statusTextInactive: {
    color: Colors.textSecondary,
  },
  byokKeyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  byokKeyChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  byokKeyChipLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  byokKeyChipValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: Colors.textPrimary,
  },
  byokSecureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  byokSecureText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10,
    color: Colors.success,
  },
  byokActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.stepsLight,
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  byokActionBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  byokActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  byokActionIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  byokActionBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  switchIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchIconWater: {
    backgroundColor: Colors.waterTrack,
  },
  switchIconMeal: {
    backgroundColor: Colors.primaryLight,
  },
  switchIconStep: {
    backgroundColor: Colors.successLight,
  },
  switchIconStreak: {
    backgroundColor: Colors.primaryLight,
  },
  switchIconWeight: {
    backgroundColor: '#EDE9FE',
  },
  switchIconAccount: {
    backgroundColor: Colors.surfaceInset,
  },
  switchIconBackup: {
    backgroundColor: Colors.successLight,
  },
  switchTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  switchDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  accountLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  accountValue: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  statusTag: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagGuest: {
    backgroundColor: Colors.carbsLight,
  },
  statusTagText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    color: Colors.successDark,
  },
  statusTagTextGuest: {
    color: Colors.carbsDark,
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.stepsLight,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginTop: 6,
  },
  authBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginTop: 6,
  },
  signOutBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.dangerDark,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  deleteBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.dangerDark,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderWhisper,
    marginVertical: 4,
  },
  pressedSubtle: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  flex1: {
    flex: 1,
  },
  testNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  testNotifBtnPressed: {
    opacity: 0.7,
  },
  testNotifBtnActive: {
    backgroundColor: Colors.burnLight,
  },
  testNotifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  testNotifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.burnLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testNotifIconCircleSuccess: {
    backgroundColor: Colors.successLight,
  },
  testNotifTitle: {
    fontSize: 14,
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textPrimary,
  },
  testNotifSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.urbanist.regular,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  subSettingsContainer: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subRowTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  subRowDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  timePickerRowContainer: {
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  timeBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  quietWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.stepsLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  quietWarningText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.primaryDeep,
    lineHeight: 15,
  },
  quietHoursContainer: {
    paddingVertical: 8,
    gap: 6,
  },
  quietHoursHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quietHoursHeaderTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  quietHoursDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  quietHoursTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    marginTop: 6,
  },
  quietHourBlock: {
    gap: 4,
  },
  quietHourLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  quietHourArrow: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 16,
  },
});
