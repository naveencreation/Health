import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { StepLogEntry } from '@/types';
import { TopDateStrip } from '@/components/dashboard/TopDateStrip';
import { HeroStepCard } from '../components/HeroStepCard';
import { StepHistoryCard } from '../components/StepHistoryCard';
import { HealthConnectSyncCard } from '../components/HealthConnectSyncCard';
import {
  connectHealth,
  getTodaySteps,
  getTodayStepsRecords,
  hasStepsPermission,
  openHealthSettings,
  syncRolling48Hours,
  backfillPastSevenDays,
  isBackfillCompleted,
  fetchSingleDaySteps,
} from '@/features/health';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export interface StepTrackerScreenProps {
  onBack: () => void;
  onOpenSettings?: () => void;
}

export const StepTrackerScreen: React.FC<StepTrackerScreenProps> = ({ onBack, onOpenSettings }) => {
  const insets = useSafeAreaInsets();
  const { currentLog, dailyLogs, selectedDate, addSteps, removeStepEntry, batchUpdateDailySteps } =
    useDailyLog();
  const { userGoals } = useGoals();

  const [steps, setSteps] = useState<number | null>(null);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const fetchedDatesRef = useRef<Set<string>>(new Set());
  const initialCheckDoneRef = useRef(false);
  const dailyLogsRef = useRef(dailyLogs);
  dailyLogsRef.current = dailyLogs;

  const stepGoal = userGoals?.stepGoal || 10000;

  // Resolve steps for currently selected date
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const isViewingToday = selectedDate === todayStr;
  const historicalSteps = dailyLogs[selectedDate]?.steps ?? 0;

  const displaySteps = isViewingToday
    ? steps !== null && steps > 0
      ? steps
      : currentLog?.steps || (steps !== null ? steps : 0)
    : historicalSteps;

  // Tier 2: Check initial permission status on Android mount & run rolling 48h sync
  const checkInitialStatus = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      const permitted = await hasStepsPermission();
      if (permitted) {
        setIsConnected(true);

        // Tier 1: Check if one-time 7-day backfill is needed on initial load
        try {
          const alreadyBackfilled = await isBackfillCompleted();
          if (!alreadyBackfilled) {
            const backfilledDays = await backfillPastSevenDays();
            if (backfilledDays && backfilledDays.length > 0 && batchUpdateDailySteps) {
              batchUpdateDailySteps(backfilledDays);
            }
          }
        } catch (backfillErr) {
          console.warn('[StepTrackerScreen] Initial backfill error:', backfillErr);
        }

        let todayCount = 0;
        let records: any[] = [];

        try {
          const rolling = await syncRolling48Hours();
          todayCount = rolling?.today?.steps ?? 0;
          records = rolling?.today?.records ?? [];

          const updates: Array<{ dateStr: string; steps: number; records?: any[] }> = [];
          if (rolling?.today) {
            updates.push(rolling.today);
          }
          if (rolling?.yesterday && rolling.yesterday.steps > 0) {
            const currentYesterday = dailyLogsRef.current[rolling.yesterday.dateStr]?.steps ?? 0;
            if (rolling.yesterday.steps > currentYesterday) {
              updates.push(rolling.yesterday);
            }
          }
          if (updates.length > 0 && batchUpdateDailySteps) {
            batchUpdateDailySteps(updates);
          }
        } catch {
          todayCount = await getTodaySteps();
          records = await getTodayStepsRecords();
        }

        setSteps(todayCount);
        setHealthRecords(records);
        if (todayCount > 0) {
          setMessage(`✓ Synced ${todayCount.toLocaleString()} steps`);
        } else {
          setMessage('✓ Connected to Health Connect');
        }
      }
    } catch (e) {
      console.warn('[StepTrackerScreen] Initial status check failed:', e);
    }
  }, [batchUpdateDailySteps]);

  useEffect(() => {
    if (initialCheckDoneRef.current) return;
    initialCheckDoneRef.current = true;
    checkInitialStatus();
  }, [checkInitialStatus]);

  // Tier 3: On-Demand Single-Day Lazy Fetch when browsing historical dates with 0 steps
  useEffect(() => {
    if (Platform.OS !== 'android' || !isConnected) return;
    if (selectedDate === todayStr) return;

    const dayLog = dailyLogs[selectedDate];
    const hasSteps = (dayLog?.steps ?? 0) > 0;

    if (!hasSteps && !fetchedDatesRef.current.has(selectedDate)) {
      fetchedDatesRef.current.add(selectedDate);

      fetchSingleDaySteps(selectedDate)
        .then(result => {
          if (result && result.steps > 0 && batchUpdateDailySteps) {
            batchUpdateDailySteps([
              {
                dateStr: selectedDate,
                steps: result.steps,
                records: result.records,
              },
            ]);
          }
        })
        .catch(err => {
          console.warn(`[StepTrackerScreen] Tier 3 lazy fetch failed for ${selectedDate}:`, err);
        });
    }
  }, [selectedDate, isConnected, todayStr, dailyLogs, batchUpdateDailySteps]);

  // Android hardware back press support
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  const handleConnectHealth = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setMessage('Health Connect is only supported on Android devices.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const connection = await connectHealth();

      if (!connection.success) {
        setIsConnected(false);
        if (connection.reason === 'HEALTH_CONNECT_UNAVAILABLE') {
          setMessage('Health Connect is not available on this device.');
        } else if (connection.reason === 'STEPS_PERMISSION_DENIED') {
          setMessage('Steps permission was not granted.');
        } else {
          setMessage('Could not connect to Health Connect.');
        }
        return;
      }

      setIsConnected(true);

      // Tier 1: Initial 7-Day Backfill on first connect
      let backfilledCount = 0;
      try {
        const alreadyBackfilled = await isBackfillCompleted();
        if (!alreadyBackfilled) {
          const backfilledDays = await backfillPastSevenDays();
          if (backfilledDays && backfilledDays.length > 0 && batchUpdateDailySteps) {
            batchUpdateDailySteps(backfilledDays);
            backfilledCount = backfilledDays.length;
          }
        }
      } catch (backfillErr) {
        console.warn('[StepTrackerScreen] Backfill check error:', backfillErr);
      }

      // Tier 2: Rolling 48-Hour Sync (Today + Yesterday)
      let todayCount = 0;
      let records: any[] = [];
      try {
        const rolling = await syncRolling48Hours();
        todayCount = rolling?.today?.steps ?? 0;
        records = rolling?.today?.records ?? [];

        const updates: Array<{ dateStr: string; steps: number; records?: any[] }> = [];
        if (rolling?.today) {
          updates.push(rolling.today);
        }
        if (rolling?.yesterday && rolling.yesterday.steps > 0) {
          const currentYesterday = dailyLogs[rolling.yesterday.dateStr]?.steps ?? 0;
          if (rolling.yesterday.steps > currentYesterday) {
            updates.push(rolling.yesterday);
          }
        }
        if (updates.length > 0 && batchUpdateDailySteps) {
          batchUpdateDailySteps(updates);
        }
      } catch {
        todayCount = await getTodaySteps();
        records = await getTodayStepsRecords();
      }

      console.log('[StepTrackerScreen] Step count received:', todayCount);
      setSteps(todayCount);
      setHealthRecords(records);

      if (todayCount > 0) {
        if (todayCount !== (currentLog?.steps || 0)) {
          addSteps(todayCount - (currentLog?.steps || 0));
        }
        if (backfilledCount > 0) {
          setMessage(
            `✓ Connected! Backfilled past ${backfilledCount} days & synced ${todayCount.toLocaleString()} steps`
          );
        } else {
          setMessage(`✓ Synced ${todayCount.toLocaleString()} steps from Health Connect`);
        }
      } else {
        if (backfilledCount > 0) {
          setMessage(`✓ Connected! Backfilled past ${backfilledCount} days`);
        } else {
          setMessage('✓ Connected! 0 steps found in Health Connect today.');
        }
      }
    } catch (error) {
      console.error('[StepTrackerScreen] Connect failed:', error);
      setMessage('Failed to read step records.');
    } finally {
      setLoading(false);
    }
  }, [currentLog?.steps, addSteps, batchUpdateDailySteps, dailyLogs]);

  return (
    <View style={styles.container}>
      <View style={styles.mobileContainer}>
        {/* 1. Header with Back Button & Screen Title */}
        <View style={[styles.header, { paddingTop: 6 }]}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed ? styles.btnPressed : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>

          <Text style={styles.headerTitle}>Step Tracker</Text>

          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed ? styles.btnPressed : null]}
            onPress={onOpenSettings || openHealthSettings}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Step settings"
          >
            <Ionicons name="settings-outline" size={20} color="#0F172A" />
          </Pressable>
        </View>

        {/* 2. Scrollable Body with Date Picker, Circular Hero Gauge & Health Connect Card */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom + 16, 90) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Date Strip in Steps Mode */}
          <TopDateStrip metric="steps" />

          {/* 270° Instrument Hero Step Card with Vector Running Shoe & 4 Micro-Metrics */}
          <HeroStepCard
            currentSteps={displaySteps}
            goalSteps={stepGoal}
            onOpenGoalModal={onOpenSettings}
          />

          {/* Step History Card with Outline Vector Icons */}
          <StepHistoryCard
            dateStr={selectedDate}
            totalSteps={displaySteps}
            rawHealthRecords={isViewingToday ? healthRecords : []}
            customEntries={dailyLogs[selectedDate]?.stepEntries}
            dailyLogs={dailyLogs}
            onDeleteEntry={(entry: StepLogEntry) => removeStepEntry(entry.id, selectedDate)}
          />

          {/* Minimalist Health Connect Setup & Sync Component with Official Logo */}
          <HealthConnectSyncCard
            isConnected={isConnected}
            loading={loading}
            syncedCount={displaySteps}
            feedbackMessage={message}
            onConnect={handleConnectHealth}
            onOpenSettings={openHealthSettings}
          />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FAF9F6',
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 6,
    paddingBottom: 90,
  },
});

export default StepTrackerScreen;
