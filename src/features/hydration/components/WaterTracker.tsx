import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { DropletVisualizer, DropletVisualizerRef } from './DropletVisualizer';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

const DEFAULT_STEP = 250;

export interface WaterTrackerProps {
  initialWater?: number;
  maxWater?: number;
  step?: number;
  onWaterChange?: (amount: number) => void;
  onPressHeader?: () => void;
  style?: StyleProp<ViewStyle>;
}

const WaterTrackerComponent: React.FC<WaterTrackerProps> = ({
  initialWater,
  maxWater: propMaxWater,
  step: propStep,
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

  const step = propStep ?? DEFAULT_STEP;
  const dropletRef = useRef<DropletVisualizerRef>(null);

  const handlePlus = useCallback(() => {
    addWater(step, 'water');
    dropletRef.current?.triggerSlosh('up');
    onWaterChange?.(currentWater + step);
  }, [addWater, step, onWaterChange, currentWater]);

  const handleMinus = useCallback(() => {
    if (currentWater > 0) {
      const deduct = Math.min(step, currentWater);
      addWater(-deduct, 'water');
      dropletRef.current?.triggerSlosh('down');
      onWaterChange?.(Math.max(0, currentWater - deduct));
    }
  }, [addWater, step, currentWater, onWaterChange]);

  return (
    <View style={[styles.card, style]}>
      {/* 1. Left Column: Title with Navigation Chevron & Intake Statistics */}
      <Pressable
        style={({ pressed }) => [styles.leftColumn, pressed && styles.leftColumnPressed]}
        onPress={onPressHeader}
        accessibilityRole="button"
        accessibilityLabel="Open Water Tracker details"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.titleRow}>
          <View style={styles.iconBadge}>
            <Ionicons name="water" size={14} color={Colors.water} />
          </View>
          <Text style={styles.title}>Water</Text>
          <Ionicons name="chevron-forward" size={14} color="#94A3B8" style={styles.titleChevron} />
        </View>
        <View style={styles.mainStatRow}>
          <Text style={styles.mainStatText}>{currentWater.toLocaleString()}</Text>
          <Text style={styles.unitText}>mL</Text>
        </View>
        <Text style={styles.subStatText}>/ {maxWater.toLocaleString()} mL</Text>
      </Pressable>

      {/* 2. Right Column: Symmetrical Stepper Trio with 3D Teardrop Droplet */}
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
          accessibilityLabel={`Decrease water by ${step} mL`}
          hitSlop={8}
        >
          <Feather
            name="minus"
            size={20}
            color={currentWater <= 0 ? '#CBD5E1' : '#0EA5E9'}
          />
        </Pressable>

        {/* Center Droplet with Outer 3D Halo Contour & Dual Wave Simulation */}
        <Pressable
          style={styles.dropletWrapper}
          onPress={onPressHeader}
          accessibilityRole="button"
          accessibilityLabel="Water visualizer, tap for details"
        >
          <DropletVisualizer
            ref={dropletRef}
            currentWater={currentWater}
            maxWater={maxWater}
            width={58}
            height={72}
            showHalo={true}
          />
        </Pressable>

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
          accessibilityLabel={`Increase water by ${step} mL`}
          hitSlop={8}
        >
          <Feather
            name="plus"
            size={20}
            color={currentWater >= maxWater ? '#CBD5E1' : '#0EA5E9'}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 0,
    shadowOpacity: 0,
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  leftColumnPressed: {
    opacity: 0.7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderCurve: 'continuous',
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  titleChevron: {
    marginLeft: 1,
  },
  mainStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainStatText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  unitText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 16,
    color: '#334155',
    marginLeft: 4,
    lineHeight: 22,
  },
  subStatText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  rightColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.water,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  buttonDisabled: {
    borderColor: '#E2E8F0',
    opacity: 0.5,
  },
  dropletWrapper: {
    width: 58,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const WaterTracker = React.memo(WaterTrackerComponent);

