import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { DropletVisualizer, DropletVisualizerRef } from '@/components/water/DropletVisualizer';
import { Fonts } from '@/theme/typography';

const DEFAULT_STEP = 100;

export interface WaterTrackerProps {
  initialWater?: number;
  maxWater?: number;
  step?: number;
  onWaterChange?: (amount: number) => void;
  onPressHeader?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  initialWater,
  maxWater: propMaxWater,
  step = DEFAULT_STEP,
  onWaterChange,
  onPressHeader,
  style,
}) => {
  const { selectedDate, dailyLogs, addWater } = useDailyLog();
  const { userGoals } = useGoals();

  const currentWater =
    typeof initialWater === 'number'
      ? initialWater
      : (dailyLogs[selectedDate]?.waterMl ?? 0);

  const maxWater =
    typeof propMaxWater === 'number'
      ? propMaxWater
      : (userGoals.waterGoalMl || 2500);

  const dropletRef = useRef<DropletVisualizerRef>(null);

  const handlePlus = () => {
    addWater(step, 'water');
    dropletRef.current?.triggerSlosh('up');
    onWaterChange?.(currentWater + step);
  };

  const handleMinus = () => {
    if (currentWater > 0) {
      const deduct = Math.min(step, currentWater);
      addWater(-deduct, 'water');
      dropletRef.current?.triggerSlosh('down');
      onWaterChange?.(Math.max(0, currentWater - deduct));
    }
  };

  const percentage = maxWater > 0 ? Math.round((currentWater / maxWater) * 100) : 0;

  return (
    <View style={[styles.card, style]}>
      {/* 1. Header */}
      <Pressable
        style={styles.headerRow}
        onPress={onPressHeader}
        accessibilityRole="button"
        accessibilityLabel="Water Tracker details"
      >
        <Text style={styles.headerTitle}>Water Tracker</Text>
        <Feather name="arrow-right" size={20} color="#007AFF" />
      </Pressable>

      {/* 2. Divider */}
      <View style={styles.divider} />

      {/* 3. Body: 2-Column Row */}
      <View style={styles.bodyRow}>
        {/* Left Column: Text Statistics */}
        <View style={styles.leftColumn}>
          <View style={styles.mainStatRow}>
            <Text style={styles.mainStatText}>{currentWater}</Text>
            <Text style={styles.unitText}>mL</Text>
          </View>
          <Text style={styles.subStatText}>/ {maxWater} mL</Text>
          <Text style={styles.percentageText}>{percentage}% completed</Text>
        </View>

        {/* Right Column: Interactive Controls */}
        <View style={styles.rightColumn}>
          {/* Minus Button */}
          <Pressable
            style={({ pressed }) => [
              styles.controlButton,
              pressed ? styles.buttonPressed : null,
              currentWater <= 0 ? styles.buttonDisabled : null,
            ]}
            onPress={handleMinus}
            disabled={currentWater <= 0}
            accessibilityRole="button"
            accessibilityLabel="Decrease water by 100 mL"
            hitSlop={8}
          >
            <Feather
              name="minus"
              size={20}
              color={currentWater <= 0 ? '#C7C7CC' : '#007AFF'}
            />
          </Pressable>

          {/* Animated SVG Droplet with Dual Wave Liquid Simulation */}
          <View style={styles.dropletContainer}>
            <DropletVisualizer
              ref={dropletRef}
              currentWater={currentWater}
              maxWater={maxWater}
              width={76}
              height={96}
            />
          </View>

          {/* Plus Button */}
          <Pressable
            style={({ pressed }) => [
              styles.controlButton,
              pressed ? styles.buttonPressed : null,
              currentWater >= maxWater ? styles.buttonDisabled : null,
            ]}
            onPress={handlePlus}
            disabled={currentWater >= maxWater}
            accessibilityRole="button"
            accessibilityLabel="Increase water by 100 mL"
            hitSlop={8}
          >
            <Feather
              name="plus"
              size={20}
              color={currentWater >= maxWater ? '#C7C7CC' : '#007AFF'}
            />
          </Pressable>
        </View>
      </View>
    </View>
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
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 18,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  mainStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainStatText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '500',
    marginLeft: 4,
  },
  subStatText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  percentageText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  rightColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  buttonDisabled: {
    borderColor: '#E5E5EA',
    opacity: 0.5,
  },
  dropletContainer: {
    width: 76,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
