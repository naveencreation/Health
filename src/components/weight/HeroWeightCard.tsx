import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

export interface HeroWeightCardProps {
  onOpenUpdateModal?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const HeroWeightCard: React.FC<HeroWeightCardProps> = ({
  onOpenUpdateModal,
  style,
}) => {
  const { currentLog, dailyLogs, selectedDate } = useDailyLog();
  const { userGoals } = useGoals();

  const unit = userGoals.weightUnit || 'kg';

  // 1. Current Weight resolution: check today's logged weight first, then fallback to goal's currentWeightKg, then default 68.0
  const currentWeightRaw = currentLog?.weightKg ?? userGoals.currentWeightKg ?? 68.0;
  const currentWeight = Math.round(currentWeightRaw * 10) / 10;

  // 2. Starting weight and goal weight resolution (unified with user goals)
  const startWeightRaw = userGoals.startWeightKg ? userGoals.startWeightKg : (userGoals.currentWeightKg || 68.0);
  const goalWeightRaw = userGoals.targetWeightKg ? userGoals.targetWeightKg : 65.0;

  const startWeight = Math.round(startWeightRaw * 10) / 10;
  const goalWeight = Math.round(goalWeightRaw * 10) / 10;

  // Convert for display if lbs
  const toDisplay = (kg: number) => (unit === 'kg' ? kg : Math.round(kg * 2.20462 * 10) / 10);
  const displayCurrent = toDisplay(currentWeight).toFixed(1);
  const displayStart = toDisplay(startWeight).toFixed(1);
  const displayGoal = toDisplay(goalWeight).toFixed(1);

  // 3. Calculate Delta vs previous entry
  const delta = useMemo(() => {
    // Check if there are multiple entries on current date
    const entries = currentLog?.weightEntries || [];
    if (entries.length > 1) {
      const diff = entries[0].weightKg - entries[1].weightKg;
      return Math.round(diff * 10) / 10;
    }

    // Look for most recent prior day with logged weight
    const sortedDates = Object.keys(dailyLogs)
      .filter((d) => d < selectedDate && typeof dailyLogs[d]?.weightKg === 'number' && dailyLogs[d]!.weightKg! > 0)
      .sort((a, b) => b.localeCompare(a));

    if (sortedDates.length > 0) {
      const prevDayWeight = dailyLogs[sortedDates[0]].weightKg!;
      const diff = currentWeight - prevDayWeight;
      return Math.round(diff * 10) / 10;
    }

    // Fallback: difference from start weight
    const diffFromStart = currentWeight - startWeight;
    return Math.round(diffFromStart * 10) / 10;
  }, [currentLog?.weightEntries, dailyLogs, selectedDate, currentWeight, startWeight]);

  const displayDelta = toDisplay(Math.abs(delta)).toFixed(1);
  const isLoss = delta < 0;
  const isGain = delta > 0;

  // 4. Calculate progress toward goal percentage
  const progressPct = useMemo(() => {
    const totalSpan = Math.abs(startWeight - goalWeight);
    if (totalSpan === 0) return 100;

    let completed = 0;
    if (startWeight >= goalWeight) {
      // Weight loss goal
      completed = startWeight - currentWeight;
    } else {
      // Weight gain goal
      completed = currentWeight - startWeight;
    }

    const pct = Math.max(0, Math.min(100, (completed / totalSpan) * 100));
    return pct > 0 ? Math.max(4, pct) : 0;
  }, [startWeight, goalWeight, currentWeight]);

  // Smooth Reanimated 4 fill animation
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

  return (
    <View style={[styles.card, style]}>
      {/* 1. Card Title: "Current" */}
      <Text style={styles.cardTitle}>Current</Text>

      {/* 2. Metric Row: Large Weight & Directional Delta Chip */}
      <View style={styles.metricRow}>
        <View style={styles.weightTextGroup}>
          <Text style={styles.weightValueText}>{displayCurrent}</Text>
          <Text style={styles.weightUnitText}>{unit}</Text>
        </View>

        {/* Directional Delta Chip (Green for loss/flat, Rose for gain) */}
        <View
          style={[
            styles.deltaBadge,
            isLoss && styles.deltaBadgeLoss,
            isGain && styles.deltaBadgeGain,
          ]}
        >
          <View
            style={[
              styles.deltaIconCircle,
              isLoss && styles.deltaIconCircleLoss,
              isGain && styles.deltaIconCircleGain,
            ]}
          >
            <Ionicons
              name={isGain ? 'chevron-up' : 'chevron-down'}
              size={12}
              color="#FFFFFF"
            />
          </View>
          <Text
            style={[
              styles.deltaText,
              isLoss && styles.deltaTextLoss,
              isGain && styles.deltaTextGain,
            ]}
          >
            {isLoss ? `- ${displayDelta} ${unit}` : isGain ? `+ ${displayDelta} ${unit}` : `- 0.0 ${unit}`}
          </Text>
        </View>
      </View>

      {/* 3. Chunky Capsule Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, animatedBarStyle]} />
      </View>

      {/* 4. Goal Range Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.footerLabel}>
          Starting: <Text style={styles.footerValue}>{displayStart} {unit}</Text>
        </Text>
        <Text style={styles.footerLabel}>
          Goal: <Text style={styles.footerValue}>{displayGoal} {unit}</Text>
        </Text>
      </View>

      {/* 5. Full-Width "Update" Pill Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.updateButton,
          pressed && styles.updateButtonPressed,
        ]}
        onPress={onOpenUpdateModal}
        accessibilityRole="button"
        accessibilityLabel="Update weight"
      >
        <Text style={styles.updateButtonText}>Update</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightTextGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  weightValueText: {
    fontSize: 36,
    fontFamily: Fonts.poppins.bold,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.6,
  },
  weightUnitText: {
    fontSize: 16,
    fontFamily: Fonts.poppins.medium,
    fontWeight: '500',
    color: '#1C1C1E',
    marginLeft: 4,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 6,
  },
  deltaBadgeLoss: {},
  deltaBadgeGain: {},
  deltaIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981', // Emerald 500
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaIconCircleLoss: {
    backgroundColor: '#10B981',
  },
  deltaIconCircleGain: {
    backgroundColor: '#F43F5E', // Rose 500
  },
  deltaText: {
    fontSize: 13,
    fontFamily: Fonts.poppins.semiBold,
    fontWeight: '600',
    color: '#10B981',
  },
  deltaTextLoss: {
    color: '#10B981',
  },
  deltaTextGain: {
    color: '#F43F5E',
  },
  progressTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
    marginTop: 16,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF5722', // Mockup's vibrant coral-orange
    borderRadius: 7,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  footerLabel: {
    fontSize: 13,
    fontFamily: Fonts.poppins.medium,
    fontWeight: '500',
    color: '#8E8E93',
  },
  footerValue: {
    color: '#64748B',
    fontFamily: Fonts.poppins.medium,
    fontWeight: '500',
  },
  updateButton: {
    backgroundColor: '#FF5722', // Mockup's vibrant coral-orange
    height: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  updateButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  updateButtonText: {
    fontSize: 16,
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
