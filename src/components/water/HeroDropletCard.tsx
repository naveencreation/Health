import React, { useRef, useImperativeHandle, forwardRef } from 'react';
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
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { DropletVisualizer, DropletVisualizerRef } from './DropletVisualizer';
import { Fonts } from '@/theme/typography';

export interface HeroDropletCardRef {
  triggerSlosh: (direction?: 'up' | 'down' | 'mount') => void;
}

export interface HeroDropletCardProps {
  currentWater?: number;
  goalWater?: number;
  onOpenGoalModal?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const HeroDropletCard = forwardRef(function HeroDropletCard(
  {
    currentWater: propWater,
    goalWater: propGoal,
    onOpenGoalModal,
    style,
  }: HeroDropletCardProps,
  ref: React.ForwardedRef<HeroDropletCardRef>
) {
  const { selectedDate, dailyLogs } = useDailyLog();
  const { userGoals } = useGoals();

  const currentWater =
    typeof propWater === 'number'
      ? propWater
      : (dailyLogs[selectedDate]?.waterMl ?? 0);

  const goalWater =
    typeof propGoal === 'number'
      ? propGoal
      : (userGoals.waterGoalMl || 2500);

  // Droplet Visualizer ref for slosh physics
  const dropletRef = useRef<DropletVisualizerRef>(null);

  // Expose triggerSlosh to parent
  useImperativeHandle(ref, () => ({
    triggerSlosh: (dir) => dropletRef.current?.triggerSlosh(dir),
  }));

  // Interactive Tap Slosh physics with squish spring
  const dropletScale = useSharedValue(1);

  const handleDropletPress = () => {
    dropletScale.value = withSequence(
      withTiming(0.95, { duration: 90 }),
      withSpring(1, { damping: 12, stiffness: 220 })
    );
    dropletRef.current?.triggerSlosh('up');
  };

  const animatedDropletStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dropletScale.value }],
  }));

  return (
    <View style={[styles.card, style]}>
      {/* 1. Scaled Droplet Visualizer with Teardrop Halo & Interactive Slosh */}
      <Pressable
        onPress={handleDropletPress}
        style={styles.dropletPressable}
        accessibilityRole="button"
        accessibilityLabel="Droplet visualizer. Tap to make water slosh"
      >
        <Animated.View style={[styles.dropletWrapper, animatedDropletStyle]}>
          <DropletVisualizer
            ref={dropletRef}
            currentWater={currentWater}
            maxWater={goalWater}
            width={170}
            height={215}
            showHalo={true}
          />
        </Animated.View>
      </Pressable>

      {/* 2. Bold Metric Readout (e.g. 300 mL or 1250 mL) */}
      <View style={styles.metricRow}>
        <Text style={styles.largeMetricNumber}>{currentWater}</Text>
        <Text style={styles.unitText}>mL</Text>
      </View>

      {/* 3. Interactive Daily Goal Row */}
      <Pressable
        style={({ pressed }) => [
          styles.goalRow,
          pressed && styles.goalRowPressed,
        ]}
        onPress={onOpenGoalModal}
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        accessibilityRole="button"
        accessibilityLabel={`Daily goal ${goalWater} mL, tap to edit`}
      >
        <Text style={styles.goalLabel}>Daily goal: </Text>
        <Text style={styles.goalValue}>{goalWater} mL</Text>
        <Ionicons
          name="pencil-outline"
          size={14}
          color="#64748B"
          style={styles.pencilIcon}
        />
      </Pressable>
    </View>
  );
});

HeroDropletCard.displayName = 'HeroDropletCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  dropletPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropletWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  largeMetricNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 48,
    lineHeight: 54,
    color: '#0F172A',
    letterSpacing: -1.2,
  },
  unitText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 18,
    color: '#64748B',
    paddingBottom: 4,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  goalRowPressed: {
    backgroundColor: '#F8FAFC',
    opacity: 0.8,
  },
  goalLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
  },
  goalValue: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#1E293B',
  },
  pencilIcon: {
    marginLeft: 4,
  },
});
