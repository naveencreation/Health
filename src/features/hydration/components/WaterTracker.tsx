import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DropletVisualizer, DropletVisualizerRef } from './DropletVisualizer';
import { useHydration } from '../hooks/useHydration';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { IconSizes, ActionIcons } from '@/theme/icons';

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
  const { currentWaterMl, targetWaterMl, addWater } = useHydration();

  const currentWater = typeof initialWater === 'number' ? initialWater : currentWaterMl;

  const maxWater = typeof propMaxWater === 'number' ? propMaxWater : targetWaterMl;

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
            <Ionicons name="water" size={IconSizes.compact} color={Colors.water} />
          </View>
          <Text style={styles.title}>Water</Text>
          <Ionicons name={ActionIcons.chevronRight} size={IconSizes.compact} color={Colors.textMuted} style={styles.titleChevron} />
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
          <Ionicons name={ActionIcons.minus} size={IconSizes.standard} color={currentWater <= 0 ? Colors.textLight : Colors.water} />
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
          <Ionicons name={ActionIcons.plus} size={IconSizes.standard} color={currentWater >= maxWater ? Colors.textLight : Colors.water} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
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
    backgroundColor: Colors.waterTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    letterSpacing: -0.6,
  },
  unitText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
    lineHeight: 18,
  },
  subStatText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.card,
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  buttonDisabled: {
    borderColor: Colors.borderInset,
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
