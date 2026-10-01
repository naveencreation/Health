import React, { useState, useEffect, useMemo } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
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
  const startWeight = userGoals.startWeightKg ? Math.round(userGoals.startWeightKg * 10) / 10 : (userGoals.currentWeightKg || 68.0);
  const goalWeight = userGoals.targetWeightKg ? Math.round(userGoals.targetWeightKg * 10) / 10 : 65.0;

  // Convert for display if lbs
  const toDisplay = (kg: number) => (unit === 'kg' ? kg : Math.round(kg * 2.20462 * 10) / 10);
  const displayCurrent = toDisplay(currentWeight).toFixed(1);
  const displayStart = toDisplay(startWeight).toFixed(1);
  const displayGoal = toDisplay(goalWeight).toFixed(1);

  // Calculate Delta (vs previous weigh-in entry or vs startWeight)
  const delta = useMemo(() => {
    // Check if there is an entry prior to current in weightEntries
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

    // Fallback: difference from starting weight (or default 2.5kg loss from mock if matches initial)
    const diffFromStart = currentWeight - startWeight;
    return Math.round(diffFromStart * 10) / 10;
  }, [currentLog?.weightEntries, dailyLogs, selectedDate, currentWeight, startWeight]);

  const displayDelta = toDisplay(Math.abs(delta)).toFixed(1);
  const isLoss = delta < 0;
  const isGain = delta > 0;

  // Calculate progress toward goal
  // Formula: progress% = |start - current| / |start - goal| * 100
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
    // Ensure at least a slight pill curve is visible if > 0%
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
        {/* 1. Header with Title & Vibrant Coral/Pink Accent Arrow */}
        <Pressable
          style={styles.headerRow}
          onPress={onOpenFullTracker}
          accessibilityRole="button"
          accessibilityLabel="Weight Tracker details"
        >
          <Text style={styles.headerTitle}>Weight Tracker</Text>
          <Feather name="arrow-right" size={20} color={Colors.weight} />
        </Pressable>

        {/* 2. Hairline Divider */}
        <View style={styles.divider} />

        {/* 3. Metric Row: Large Weight, Directional Progress Chip, and Pencil Button */}
        <View style={styles.metricRow}>
          {/* Left: Weight & Delta Chip */}
          <View style={styles.weightAndDeltaContainer}>
            <View style={styles.weightDisplayRow}>
              <Text style={styles.weightValueText}>{displayCurrent}</Text>
              <Text style={styles.weightUnitText}>{unit}</Text>
            </View>

            {/* Directional Progress Badge Chip */}
            <View
              style={[
                styles.deltaChip,
                isLoss && styles.deltaChipLoss,
                isGain && styles.deltaChipGain,
              ]}
            >
              <View
                style={[
                  styles.deltaIconBox,
                  isLoss && styles.deltaIconBoxLoss,
                  isGain && styles.deltaIconBoxGain,
                ]}
              >
                <Ionicons
                  name={isGain ? 'arrow-up' : 'arrow-down'}
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
                {isLoss ? `- ${displayDelta} ${unit}` : isGain ? `+ ${displayDelta} ${unit}` : `0.0 ${unit}`}
              </Text>
            </View>
          </View>

          {/* Right: Circular Weigh-In Pencil Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.pencilButton,
              pressed && styles.pencilButtonPressed,
            ]}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Log weigh-in"
            hitSlop={8}
          >
            <Feather name="edit-2" size={17} color="#475569" />
          </Pressable>
        </View>

        {/* 4. Capsule Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, animatedBarStyle]} />
        </View>

        {/* 5. Range Footer: Starting Weight (Left) & Goal Weight (Right) */}
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>
            Starting: <Text style={styles.footerValue}>{displayStart} {unit}</Text>
          </Text>
          <Text style={styles.footerLabel}>
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
    padding: 24,
    marginHorizontal: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 18,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightAndDeltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  weightValueText: {
    fontSize: 34,
    fontFamily: Fonts.poppins.bold,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  weightUnitText: {
    fontSize: 16,
    fontFamily: Fonts.poppins.medium,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 4,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    gap: 6,
  },
  deltaChipLoss: {
    backgroundColor: '#ECFDF5', // Emerald 50
  },
  deltaChipGain: {
    backgroundColor: '#FFF1F2', // Rose 50
  },
  deltaIconBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#10B981', // Emerald 500
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaIconBoxLoss: {
    backgroundColor: '#10B981', // Emerald 500
  },
  deltaIconBoxGain: {
    backgroundColor: '#F43F5E', // Rose 500
  },
  deltaText: {
    fontSize: 13,
    fontFamily: Fonts.poppins.semiBold,
    fontWeight: '600',
    color: '#059669', // Emerald 600
  },
  deltaTextLoss: {
    color: '#059669',
  },
  deltaTextGain: {
    color: '#E11D48',
  },
  pencilButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  pencilButtonPressed: {
    opacity: 0.75,
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.94 }],
  },
  progressTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
    marginTop: 18,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.weight,
    borderRadius: 8,
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
    fontFamily: Fonts.poppins.semiBold,
    fontWeight: '600',
  },
});
