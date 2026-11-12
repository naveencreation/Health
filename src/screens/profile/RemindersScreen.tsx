import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useGoals, useDailyLog } from '@/context/HealthContext';
import { TimePickerModal } from '@/components/modals/TimePickerModal';
import {
  NotificationService,
  NotificationScheduler,
  NotificationStorage,
  isInsideQuietHours,
  buildSyncOptions,
} from '@/services/notifications';
import { NOTIFICATION_CHANNELS } from '@/config/notificationChannels';
import {
  SubScreenHeader,
  SettingsSection,
  SettingsRow,
  ProfileButton,
  profileScreenStyles,
} from '@/components/profile/ProfileUI';

// Fixed planner times (engine/planner.ts) for the step and streak reminders
const STEP_TIME = '17:30';
const STREAK_TIME = '21:00';

type Settings = Awaited<ReturnType<typeof NotificationStorage.loadSettings>>;
type TimeKey = 'breakfast' | 'lunch' | 'dinner' | 'weight' | 'quietStart' | 'quietEnd';

const PICKERS: Record<TimeKey, { title: string; presets: string[] }> = {
  breakfast: {
    title: 'Breakfast reminder',
    presets: ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30'],
  },
  lunch: { title: 'Lunch reminder', presets: ['12:00', '12:30', '13:00', '13:30', '14:00'] },
  dinner: {
    title: 'Dinner reminder',
    presets: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
  },
  weight: { title: 'Weigh-in reminder', presets: ['06:30', '07:00', '07:30', '08:00', '08:30'] },
  quietStart: {
    title: 'Quiet hours start',
    presets: ['21:00', '21:30', '22:00', '22:30', '23:00', '00:00'],
  },
  quietEnd: {
    title: 'Quiet hours end',
    presets: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30'],
  },
};

const SWITCH_TRACK = { false: Colors.borderMedium, true: Colors.primary };
// react-native-web paints the on-thumb teal by default; green is reserved for protein
const WEB_THUMB = { activeThumbColor: Colors.card };

const ReminderSwitch = ({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
}) => (
  <Switch
    value={value}
    onValueChange={onValueChange}
    trackColor={SWITCH_TRACK}
    thumbColor={Colors.card}
    ios_backgroundColor={Colors.borderMedium}
    accessibilityLabel={label}
    {...WEB_THUMB}
  />
);

export const RemindersScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const { userGoals } = useGoals();
  const { dailyLogs, todayStr } = useDailyLog();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [quietError, setQuietError] = useState<string | null>(null);
  const [picker, setPicker] = useState<TimeKey | null>(null);
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const load = useCallback(() => {
    return NotificationStorage.loadSettings(currentUser?.id, userGoals)
      .then(s => {
        setSettings(s);
        const anyOn =
          s.water.enabled ||
          s.meals.enabled ||
          s.steps.enabled ||
          s.streak.enabled ||
          s.weight?.enabled;
        if (anyOn && Platform.OS !== 'web') {
          NotificationService.getPermissionStatus()
            .then(granted => setPermissionDenied(!granted))
            .catch(() => {});
        }
      })
      .catch(() => setLoadFailed(true));
    // userGoals only seeds first-time defaults; reloading on every goal edit would clobber taps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Serialized: each save reads then writes storage, so overlapping taps would drop changes.
  // On failure the screen reloads what storage really holds instead of showing a false state.
  const save = (
    optimistic: Settings,
    updates: Parameters<typeof NotificationStorage.updateSettings>[0]
  ) => {
    setSettings(optimistic);
    setSaveError(null);
    const run = saveQueue.current.then(async () => {
      try {
        const saved = await NotificationStorage.updateSettings(updates, currentUser?.id);
        await NotificationScheduler.syncSchedules({
          ...buildSyncOptions(dailyLogs[todayStr], userGoals, currentUser?.id),
          settings: saved,
        });
      } catch {
        setSaveError("Couldn't save that change. Try again.");
        await load();
      }
    });
    saveQueue.current = run;
    return run;
  };

  // Turning a reminder on needs OS permission; the switch stays off when it is denied
  const canEnable = async (enabling: boolean) => {
    if (!enabling || Platform.OS === 'web') return true;
    const granted = await NotificationService.requestPermission();
    setPermissionDenied(!granted);
    return granted;
  };

  if (!settings) {
    return (
      <View style={profileScreenStyles.root}>
        <SubScreenHeader
          title="Reminders"
          subtitle="Local notifications on this phone"
          onBack={onBack}
        />
        <View style={styles.center}>
          {loadFailed ? (
            <>
              <Text style={styles.centerText}>{"Couldn't load your reminder settings."}</Text>
              <ProfileButton
                label="Try again"
                onPress={() => {
                  setLoadFailed(false);
                  load();
                }}
              />
            </>
          ) : (
            <ActivityIndicator color={Colors.primary} accessibilityLabel="Loading reminders" />
          )}
        </View>
      </View>
    );
  }

  const s = settings;
  const weight = s.weight;
  const inQuiet = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return isInsideQuietHours(d, s.quietHours.start, s.quietHours.end);
  };
  const quietHint = (time: string, on = true) =>
    on && inQuiet(time) ? "Inside quiet hours, so it won't ring" : undefined;

  const toggle = async (key: 'water' | 'meals' | 'steps' | 'streak' | 'weight', val: boolean) => {
    if (!(await canEnable(val))) return;
    if (key === 'water')
      save({ ...s, water: { ...s.water, enabled: val } }, { waterReminder: val });
    if (key === 'meals') save({ ...s, meals: { ...s.meals, enabled: val } }, { mealReminder: val });
    if (key === 'steps') save({ ...s, steps: { ...s.steps, enabled: val } }, { stepReminder: val });
    if (key === 'streak')
      save({ ...s, streak: { ...s.streak, enabled: val } }, { streakReminder: val });
    if (key === 'weight') {
      const next = { enabled: val, time: weight.time };
      save({ ...s, weight: next }, { weight: next });
    }
  };

  const toggleSkipBreakfast = (val: boolean) => {
    const meals = { ...s.meals, skipsBreakfast: val };
    save({ ...s, meals }, { meals });
  };

  const currentTime = (key: TimeKey) =>
    key === 'quietStart'
      ? s.quietHours.start
      : key === 'quietEnd'
        ? s.quietHours.end
        : key === 'weight'
          ? weight.time
          : s.meals[key];

  const savePickedTime = (time: string) => {
    if (!picker) return;
    // Equal start and end would make quiet hours a zero-length window
    if (
      (picker === 'quietStart' && time === s.quietHours.end) ||
      (picker === 'quietEnd' && time === s.quietHours.start)
    ) {
      setQuietError('Quiet hours need different start and end times.');
      return;
    }
    setQuietError(null);
    const meals = { ...s.meals };
    const quietHours = { ...s.quietHours };
    const nextWeight = { ...weight };
    if (picker === 'quietStart') quietHours.start = time;
    else if (picker === 'quietEnd') quietHours.end = time;
    else if (picker === 'weight') nextWeight.time = time;
    else meals[picker] = time;
    save(
      { ...s, meals, quietHours, weight: nextWeight },
      { meals, quietHours, weight: nextWeight }
    );
  };

  const sendTest = async () => {
    setTestState('sending');
    try {
      const granted = await NotificationService.requestPermission();
      if (!granted) {
        if (Platform.OS !== 'web') setPermissionDenied(true);
        setTestState('failed');
        return;
      }
      const id = await NotificationService.scheduleNotification({
        title: 'Lunch reminder (test)',
        body: 'Tap to open the food camera.',
        triggerSeconds: 5,
        channelId: NOTIFICATION_CHANNELS.MEALS.id,
        data: { route: 'food_vision', reminderType: 'meal_lunch' },
      });
      setTestState(id ? 'sent' : 'failed');
      if (id) timers.current.push(setTimeout(() => setTestState('idle'), 10000));
    } catch {
      setTestState('failed');
    }
  };

  const timeBtn = (key: TimeKey, label: string) => {
    const time = currentTime(key);
    const warn = key !== 'quietStart' && key !== 'quietEnd' && inQuiet(time);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.timeBtn,
          warn && styles.timeBtnWarn,
          pressed && styles.pressed,
        ]}
        onPress={() => setPicker(key)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${time}. Change time`}
      >
        <Text style={styles.timeText}>{time}</Text>
      </Pressable>
    );
  };

  return (
    <View style={profileScreenStyles.root}>
      <SubScreenHeader
        title="Reminders"
        subtitle="Local notifications on this phone"
        onBack={onBack}
      />
      <ScrollView
        style={profileScreenStyles.scroll}
        contentContainerStyle={profileScreenStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {permissionDenied ? (
          <View style={styles.banner} accessibilityRole="alert">
            <Text style={styles.bannerText}>Notifications are blocked for Calorify.</Text>
            <Pressable
              style={({ pressed }) => [styles.bannerBtn, pressed && styles.pressedOpacity]}
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open system settings to allow notifications"
            >
              <Text style={styles.bannerBtnText}>Open settings</Text>
            </Pressable>
          </View>
        ) : null}
        {saveError ? (
          <View style={styles.banner} accessibilityRole="alert">
            <Text style={styles.bannerText}>{saveError}</Text>
          </View>
        ) : null}

        <SettingsSection title="Meals">
          <SettingsRow
            icon="restaurant-outline"
            iconColor={Colors.primaryDark}
            iconBackground={Colors.burnLight}
            title="Meal reminders"
            subtitle="A nudge to log each meal"
            trailing={
              <ReminderSwitch
                value={s.meals.enabled}
                onValueChange={v => toggle('meals', v)}
                label={'Meal reminders'}
              />
            }
          />
          {s.meals.enabled ? (
            <SettingsRow
              title="Skip breakfast"
              subtitle="No breakfast reminder"
              trailing={
                <ReminderSwitch
                  value={s.meals.skipsBreakfast}
                  onValueChange={toggleSkipBreakfast}
                  label={'Skip breakfast'}
                />
              }
            />
          ) : null}
          {s.meals.enabled && !s.meals.skipsBreakfast ? (
            <SettingsRow
              title="Breakfast"
              subtitle={quietHint(s.meals.breakfast)}
              trailing={timeBtn('breakfast', 'Breakfast reminder')}
            />
          ) : null}
          {s.meals.enabled ? (
            <SettingsRow
              title="Lunch"
              subtitle={quietHint(s.meals.lunch)}
              trailing={timeBtn('lunch', 'Lunch reminder')}
            />
          ) : null}
          {s.meals.enabled ? (
            <SettingsRow
              title="Dinner"
              subtitle={quietHint(s.meals.dinner)}
              trailing={timeBtn('dinner', 'Dinner reminder')}
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title="Daily habits">
          <SettingsRow
            icon="water-outline"
            iconColor={Colors.waterDark}
            iconBackground={Colors.waterTrack}
            title="Water"
            subtitle="Every few hours while you're awake"
            trailing={
              <ReminderSwitch
                value={s.water.enabled}
                onValueChange={v => toggle('water', v)}
                label={'Water reminders'}
              />
            }
          />
          <SettingsRow
            icon="footsteps-outline"
            iconColor={Colors.stepsDark}
            iconBackground={Colors.stepsLight}
            title="Steps"
            subtitle={
              quietHint(STEP_TIME, s.steps.enabled) ?? `Daily at ${STEP_TIME} if you're behind`
            }
            trailing={
              <ReminderSwitch
                value={s.steps.enabled}
                onValueChange={v => toggle('steps', v)}
                label={'Step reminder'}
              />
            }
          />
          <SettingsRow
            icon="scale-outline"
            iconColor={Colors.weightDark}
            iconBackground={Colors.weightLight}
            title="Morning weigh-in"
            subtitle={quietHint(weight.time, weight.enabled) ?? 'Same time each day'}
            trailing={
              <ReminderSwitch
                value={weight.enabled}
                onValueChange={v => toggle('weight', v)}
                label={'Weigh-in reminder'}
              />
            }
          />
          {weight.enabled ? (
            <SettingsRow title="Weigh-in time" trailing={timeBtn('weight', 'Weigh-in reminder')} />
          ) : null}
          <SettingsRow
            icon="flame-outline"
            iconColor={Colors.warningDark}
            iconBackground={Colors.warningLight}
            title="Streak saver"
            subtitle={
              quietHint(STREAK_TIME, s.streak.enabled) ?? `At ${STREAK_TIME} if nothing's logged`
            }
            trailing={
              <ReminderSwitch
                value={s.streak.enabled}
                onValueChange={v => toggle('streak', v)}
                label={'Streak reminder'}
              />
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Quiet hours"
          footer={quietError ?? 'Reminders that fall in this window are skipped.'}
        >
          <SettingsRow title="From" trailing={timeBtn('quietStart', 'Quiet hours start')} />
          <SettingsRow title="Until" trailing={timeBtn('quietEnd', 'Quiet hours end')} />
        </SettingsSection>

        <View>
          <ProfileButton
            label={
              testState === 'sending'
                ? 'Sending…'
                : testState === 'sent'
                  ? 'Sent, arriving in 5 seconds'
                  : 'Send a test notification'
            }
            onPress={sendTest}
            disabled={testState === 'sending'}
          />
          {testState === 'failed' ? (
            <Text style={styles.testError} accessibilityRole="alert">
              {"Couldn't send it. Check that notifications are allowed."}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <TimePickerModal
        visible={picker !== null}
        title={picker ? PICKERS[picker].title : 'Select time'}
        initialTime={picker ? currentTime(picker) : '12:00'}
        presets={picker ? PICKERS[picker].presets : undefined}
        onSave={savePickedTime}
        onClose={() => setPicker(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  centerText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
  },
  bannerText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.onErrorContainer,
  },
  bannerBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: Colors.dangerDark,
  },
  bannerBtnText: { fontFamily: Fonts.urbanist.bold, fontSize: 14, color: Colors.textInverse },
  timeBtn: {
    minWidth: 76,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  timeBtnWarn: { borderColor: Colors.stepsBorder, backgroundColor: Colors.stepsLight },
  timeText: { fontFamily: Fonts.urbanist.bold, fontSize: 15, color: Colors.textPrimary },
  pressed: { backgroundColor: Colors.surfaceContainer },
  pressedOpacity: { opacity: 0.85 },
  testError: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.dangerDark,
    marginTop: 8,
    marginHorizontal: 4,
  },
});
