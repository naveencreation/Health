import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { LogWeightModal } from '@/components/modals/LogWeightModal';

export interface WeightTrackerCardProps {
  onOpenFullTracker?: () => void;
  onWeightLogged?: (weightKg: number) => void;
  style?: StyleProp<ViewStyle>;
}

export const WeightTrackerCard: React.FC<WeightTrackerCardProps> = ({
  onOpenFullTracker,
  onWeightLogged,
  style,
}) => {
  const { currentLog, dailyLogs, selectedDate } = useDailyLog();
  const { userGoals } = useGoals();
  const [modalVisible, setModalVisible] = useState(false);

  const unit = userGoals.weightUnit || 'kg';

  // Current weight: check today's logged weight first, then fallback to goal's currentWeightKg, then default 68.0
  const currentWeightRaw = currentLog?.weightKg ?? userGoals.currentWeightKg ?? 68.0;
  const currentWeight = Math.round(currentWeightRaw * 10) / 10;

  // Starting weight and goal weight (unified with user goals)
  const startWeight = userGoals.startWeightKg
    ? Math.round(userGoals.startWeightKg * 10) / 10
    : (userGoals.currentWeightKg || 68.0);
  const goalWeight = userGoals.targetWeightKg
    ? Math.round(userGoals.targetWeightKg * 10) / 10
    : 65.0;

  // Convert for display if lbs
  const toDisplay = (kg: number) => (unit === 'kg' ? kg : Math.round(kg * 2.20462 * 10) / 10);
  const displayCurrent = toDisplay(currentWeight).toFixed(1);
  const displayStart = toDisplay(startWeight).toFixed(1);
  const displayGoal = toDisplay(goalWeight).toFixed(1);

  // Calculate Delta (vs previous weigh-in entry or vs startWeight)
  const delta = useMemo(() => {
    const entries = currentLog?.weightEntries || [];
    if (entries.length > 1) {
      const diff = entries[0].weightKg - entries[1].weightKg;
      return Math.round(diff * 10) / 10;
    }

    // Look for previous day with weight logged
    const sortedDates = Object.keys(dailyLogs)
      .filter((d) => d < selectedDate && dailyLogs[d]?.weightKg)
      .sort((a, b) => b.localeCompare(a));

    if (sortedDates.length > 0) {
      const prevDayWeight = dailyLogs[sortedDates[0]].weightKg!;
      const diff = currentWeight - prevDayWeight;
      return Math.round(diff * 10) / 10;
    }

    // Fallback: difference from starting weight
    const diffFromStart = currentWeight - startWeight;
    return Math.round(diffFromStart * 10) / 10;
  }, [currentLog?.weightEntries, dailyLogs, selectedDate, currentWeight, startWeight]);

  const displayDelta = toDisplay(Math.abs(delta)).toFixed(1);
  const isLoss = delta < 0;
  const isGain = delta > 0;
  const isZero = delta === 0;

  // Calculate progress toward goal: progress% = |start - current| / |start - goal| * 100
  const progressPct = useMemo(() => {
    const totalSpan = Math.abs(startWeight - goalWeight);
    if (totalSpan === 0) return 100;

    let completed = 0;
    if (startWeight >= goalWeight) {
      completed = startWeight - currentWeight;
    } else {
      completed = currentWeight - startWeight;
    }

    const pct = Math.max(0, Math.min(100, (completed / totalSpan) * 100));
    return pct > 0 ? Math.max(4, pct) : 0;
  }, [startWeight, goalWeight, currentWeight]);

  // Smooth Reanimated fill
  const progressSV = useSharedValue(0);

  useEffect(() => {
    progressSV.value = withTiming(progressPct, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressPct, progressSV]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progressSV.value}%`,
  }));

  const handleSaveModal = (savedKg: number) => {
    onWeightLogged?.(savedKg);
  };

  return (
    <>
      <View style={[styles.card, style]}>
        {/* 1. Header & Metric Row with Update Pill Button */}
        <View style={styles.topRow}>
          {/* Left Column: Title & Metric with inline delta badge */}
          <Pressable
            style={({ pressed }) => [styles.leftColumn, pressed && styles.pressedSubtle]}
            onPress={onOpenFullTracker}
            accessibilityRole="button"
            accessibilityLabel="Open Weight Tracker details"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.titleRow}>
              <Text style={styles.title}>Weight</Text>
              <Feather name="chevron-right" size={17} color="#FF5B26" style={styles.titleChevron} />
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.weightValueText}>{displayCurrent}</Text>
              <Text style={styles.weightUnitText}>{unit}</Text>

              {/* Inline Directional Delta Badge */}
              <View
                style={[
                  styles.deltaBadge,
                  isLoss && styles.deltaBadgeLoss,
                  isGain && styles.deltaBadgeGain,
                  isZero && styles.deltaBadgeZero,
                ]}
              >
                <View
                  style={[
                    styles.deltaCircle,
                    isLoss && styles.deltaCircleLoss,
                    isGain && styles.deltaCircleGain,
                    isZero && styles.deltaCircleZero,
                  ]}
                >
                  <Ionicons
                    name={isGain ? 'chevron-up' : isZero ? 'remove' : 'chevron-down'}
                    size={10}
                    color="#FFFFFF"
                  />
                </View>
                <Text
                  style={[
                    styles.deltaText,
                    isLoss && styles.deltaTextLoss,
                    isGain && styles.deltaTextGain,
                    isZero && styles.deltaTextZero,
                  ]}
                >
                  {isLoss ? `- ${displayDelta} ${unit}` : isGain ? `+ ${displayDelta} ${unit}` : `0.0 ${unit}`}
                </Text>
              </View>
            </View>
          </Pressable>

          {/* Right Action: Vibrant Orange Update Button */}
          <Pressable
            style={({ pressed }) => [
              styles.updateButton,
              pressed && styles.updateButtonPressed,
            ]}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Update weight"
            hitSlop={8}
          >
            <Text style={styles.updateButtonText}>Update</Text>
          </Pressable>
        </View>

        {/* 2. Chunky Orange Capsule Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, animatedBarStyle]} />
        </View>

        {/* 3. Range Footer: Starting Weight (Left) & Goal Weight (Right) */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            Starting: <Text style={styles.footerValue}>{displayStart} {unit}</Text>
          </Text>
          <Text style={styles.footerText}>
            Goal: <Text style={styles.footerValue}>{displayGoal} {unit}</Text>
          </Text>
        </View>
      </View>

      {/* Quick Weigh-In Modal */}
      <LogWeightModal
        visible={modalVisible}
        initialWeight={currentWeight}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveModal}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  pressedSubtle: {
    opacity: 0.7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  titleChevron: {
    marginLeft: 3,
    marginTop: 1,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightValueText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  weightUnitText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 16,
    color: '#334155',
    marginLeft: 4,
    marginRight: 10,
    lineHeight: 22,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deltaBadgeLoss: {},
  deltaBadgeGain: {},
  deltaBadgeZero: {},
  deltaCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaCircleLoss: {
    backgroundColor: '#22C55E', // Vibrant Emerald green
  },
  deltaCircleGain: {
    backgroundColor: '#EF4444', // Coral Red
  },
  deltaCircleZero: {
    backgroundColor: '#94A3B8', // Slate
  },
  deltaText: {
    fontSize: 13,
    fontFamily: Fonts.poppins.medium,
  },
  deltaTextLoss: {
    color: '#16A34A',
  },
  deltaTextGain: {
    color: '#DC2626',
  },
  deltaTextZero: {
    color: '#94A3B8',
  },
  updateButton: {
    backgroundColor: '#FF5B26', // Vibrant Orange matching reference
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingVertical: 9,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FF5B26',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  updateButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  updateButtonText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  progressTrack: {
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
    marginTop: 14,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF5B26', // Vibrant Orange matching Update button
    borderRadius: 6.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    fontFamily: Fonts.poppins.regular,
    color: '#64748B',
  },
  footerValue: {
    fontFamily: Fonts.poppins.medium,
    color: '#334155',
  },
});
