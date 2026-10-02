import React, { useEffect, useState, useCallback } from 'react';
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
import {
  connectHealth,
  getTodaySteps,
  hasStepsPermission,
  openHealthSettings,
} from '@/features/health';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export interface StepTrackerScreenProps {
  onBack: () => void;
  onOpenSettings?: () => void;
}

export const StepTrackerScreen: React.FC<StepTrackerScreenProps> = ({
  onBack,
  onOpenSettings,
}) => {
  const insets = useSafeAreaInsets();
  const { currentLog, addSteps } = useDailyLog();
  const { userGoals } = useGoals();

  const [steps, setSteps] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const stepGoal = userGoals?.stepGoal || 10000;
  // If Health Connect returned steps > 0, prefer it; otherwise show currentLog.steps or 0
  const displaySteps = (steps !== null && steps > 0)
    ? steps
    : (currentLog?.steps || (steps !== null ? steps : 0));
  const distanceKm = (displaySteps * 0.00076).toFixed(1);
  const stepBurnKcal = Math.round(displaySteps * 0.04);
  const percentOfGoal = stepGoal > 0 ? Math.round((displaySteps / stepGoal) * 100) : 0;

  // Check initial permission status on Android mount
  const checkInitialStatus = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      const permitted = await hasStepsPermission();
      if (permitted) {
        setIsConnected(true);
        const todayCount = await getTodaySteps();
        setSteps(todayCount);
        if (todayCount > 0) {
          setMessage(`✓ Synced ${todayCount.toLocaleString()} steps`);
        } else {
          setMessage('✓ Connected to Health Connect');
        }
      }
    } catch (e) {
      console.warn('[StepTrackerScreen] Initial status check failed:', e);
    }
  }, []);

  useEffect(() => {
    checkInitialStatus();
  }, [checkInitialStatus]);

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
      const todayCount = await getTodaySteps();
      console.log('[StepTrackerScreen] Step count received:', todayCount);
      setSteps(todayCount);

      if (todayCount > 0) {
        if (todayCount !== (currentLog?.steps || 0)) {
          addSteps(todayCount - (currentLog?.steps || 0));
        }
        setMessage(`✓ Synced ${todayCount.toLocaleString()} steps from Health Connect`);
      } else {
        setMessage('✓ Connected! 0 steps found in Health Connect today.');
      }
    } catch (error) {
      console.error('[StepTrackerScreen] Connect failed:', error);
      setMessage('Failed to read step records.');
    } finally {
      setLoading(false);
    }
  }, [currentLog?.steps, addSteps]);

  return (
    <View style={styles.container}>
      {/* 1. Header with Back Button & Screen Title */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed ? styles.btnPressed : null]}
          onPress={onBack}
          hitSlop={HIT_SLOP_10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
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

      {/* 2. Scrollable Body with Live Step Reader & Health Connect Card */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={styles.statusBadgeRow}>
          <View style={[styles.statusBadge, isConnected ? styles.badgeConnected : styles.badgeDisconnected]}>
            <Ionicons
              name={isConnected ? 'checkmark-circle' : 'radio-button-off'}
              size={14}
              color={isConnected ? '#15803D' : '#64748B'}
            />
            <Text style={[styles.statusBadgeText, isConnected ? styles.textConnected : styles.textDisconnected]}>
              {isConnected ? 'Health Connect Active' : 'Not Connected'}
            </Text>
          </View>
        </View>

        {/* Hero Today's Steps Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>TODAY'S STEPS</Text>
          <View style={styles.heroCountRow}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.steps} style={styles.loader} />
            ) : (
              <Text style={styles.heroCount}>
                {displaySteps.toLocaleString()}
              </Text>
            )}
            <Text style={styles.heroUnit}>steps</Text>
          </View>

          <Text style={styles.heroGoalText}>
            Goal: {stepGoal.toLocaleString()} steps ({percentOfGoal}%)
          </Text>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Ionicons name="navigate-outline" size={16} color="#64748B" />
              <Text style={styles.metricValue}>~{distanceKm} km</Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Ionicons name="flame-outline" size={16} color="#EA580C" />
              <Text style={styles.metricValue}>~{stepBurnKcal} kcal</Text>
              <Text style={styles.metricLabel}>Energy</Text>
            </View>
          </View>
        </View>

        {/* Connect Action Card */}
        <View style={styles.actionCard}>
          <View style={styles.actionIconWrap}>
            <Ionicons name="fitness-outline" size={28} color={Colors.steps} />
          </View>
          <Text style={styles.actionTitle}>Android Health Connect</Text>
          <Text style={styles.actionSubtitle}>
            Sync directly with on-device sensors and fitness apps for aggregated, double-count-free step counts.
          </Text>

          {message ? (
            <Text style={[styles.feedbackMessage, isConnected ? styles.feedbackSuccess : styles.feedbackNotice]}>
              {message}
            </Text>
          ) : null}

          {/* Guidance when connected but 0 steps */}
          {isConnected && displaySteps === 0 ? (
            <View style={styles.emptyNoticeBox}>
              <Ionicons name="information-circle-outline" size={18} color="#D97706" style={styles.emptyNoticeIcon} />
              <Text style={styles.emptyNoticeText}>
                Health Connect returned 0 steps for today. If you use Google Fit or Samsung Health, ensure they are synced to Health Connect.
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.connectBtn,
              isConnected ? styles.connectBtnActive : null,
              pressed ? styles.btnPressed : null,
              loading ? styles.btnDisabled : null,
            ]}
            onPress={handleConnectHealth}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isConnected ? 'Sync Health Data' : 'Connect Health Connect'}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isConnected ? 'sync-outline' : 'link-outline'}
                  size={18}
                  color="#FFFFFF"
                  style={styles.connectBtnIcon}
                />
                <Text style={styles.connectBtnText}>
                  {isConnected ? 'Sync Health Data' : 'Connect Health Connect'}
                </Text>
              </>
            )}
          </Pressable>

          {isConnected ? (
            <Pressable
              style={styles.openSettingsLink}
              onPress={openHealthSettings}
              hitSlop={HIT_SLOP_10}
            >
              <Text style={styles.openSettingsLinkText}>Manage Health Connect App & Permissions ›</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
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
    paddingBottom: 12,
    backgroundColor: '#FAF9F6',
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 19,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  statusBadgeRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeConnected: {
    backgroundColor: '#DCFCE7',
  },
  badgeDisconnected: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
  },
  textConnected: {
    color: '#15803D',
  },
  textDisconnected: {
    color: '#64748B',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroEyebrow: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroCount: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 48,
    color: '#0F172A',
    letterSpacing: -1,
    lineHeight: 56,
  },
  heroUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 18,
    color: '#64748B',
  },
  loader: {
    marginVertical: 12,
  },
  heroGoalText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#0F172A',
  },
  metricLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  actionTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 6,
  },
  actionSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  feedbackMessage: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  feedbackSuccess: {
    color: '#15803D',
  },
  feedbackNotice: {
    color: '#D97706',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.steps,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    shadowColor: Colors.steps,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  connectBtnActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
  },
  connectBtnIcon: {
    marginRight: 8,
  },
  connectBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  emptyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  emptyNoticeIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  emptyNoticeText: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
  },
  openSettingsLink: {
    marginTop: 14,
    paddingVertical: 6,
  },
  openSettingsLinkText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.steps,
    textAlign: 'center',
  },
});

export default StepTrackerScreen;
