import React, { useState, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { DropletVisualizer, DropletVisualizerRef } from './DropletVisualizer';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { getBeverageName, renderBeverageIconElement } from '@/utils/beverageUtils';

export interface HeroDropletCardRef {
  triggerSlosh: (direction?: 'up' | 'down' | 'mount') => void;
}

export interface HeroDropletCardProps {
  currentWater?: number;
  goalWater?: number;
  cupSize?: number;
  beverageType?: string;
  isFutureDate?: boolean;
  onOpenGoalModal?: () => void;
  onOpenCupSelector?: () => void;
  onDrink?: (amount: number, beverage: string) => void;
  onDeduct?: (amount: number, beverage?: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const HeroDropletCard = forwardRef(function HeroDropletCard(
  {
    currentWater: propWater,
    goalWater: propGoal,
    cupSize = 300,
    beverageType = 'water',
    isFutureDate = false,
    onOpenGoalModal,
    onOpenCupSelector,
    onDrink,
    onDeduct,
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

  const percentage = Math.round((currentWater / Math.max(1, goalWater)) * 100);
  const remainingMl = Math.max(0, goalWater - currentWater);
  const isGoalMet = currentWater >= goalWater;

  const [isDrinking, setIsDrinking] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);

  // Check if today contains logged entries matching the active beverage
  const hasMatchingBeverage = useMemo(() => {
    const entries = dailyLogs[selectedDate]?.waterEntries;
    if (!entries || entries.length === 0) {
      return currentWater > 0;
    }
    const targetType = (beverageType || 'water').toLowerCase();
    return entries.some(
      (e) => (e.beverageType || 'water').toLowerCase() === targetType && e.amountMl > 0
    );
  }, [dailyLogs, selectedDate, beverageType, currentWater]);

  const canDeduct = hasMatchingBeverage && currentWater > 0 && !isFutureDate;

  const handlePressDrink = () => {
    if (isDrinking || isFutureDate) return;
    setIsDrinking(true);
    onDrink?.(cupSize, beverageType);
    dropletRef.current?.triggerSlosh('up');
    dropletScale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 220 })
    );
    setTimeout(() => {
      setIsDrinking(false);
    }, 350);
  };

  const handlePressDeduct = () => {
    if (!canDeduct || isDeducting) return;
    setIsDeducting(true);
    onDeduct?.(cupSize, beverageType);
    dropletRef.current?.triggerSlosh('down');
    dropletScale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 220 })
    );
    setTimeout(() => {
      setIsDeducting(false);
    }, 350);
  };


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
            width={145}
            height={185}
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

      {/* 4. Hydration Goal Progress & Celebration Status */}
      {isGoalMet ? (
        <View style={styles.goalAchievedPill}>
          <Ionicons name="checkmark-circle" size={13} color="#059669" />
          <Text style={styles.goalAchievedText}>
            {currentWater > goalWater
              ? `Goal achieved! (+${currentWater - goalWater} mL)`
              : 'Daily goal achieved! 🎉'}
          </Text>
        </View>
      ) : (
        <Text style={styles.progressSubText}>
          {percentage}% · {remainingMl} mL remaining
        </Text>
      )}

      {/* 5. Symmetrical Stepper Trio Quick Logger: [ ( - )   [ 🥤 300 mL ▾ ]   ( + ) ] */}
      <View style={styles.stepperTrioRow}>
        {/* Left: Quick Minus Button */}
        <Pressable
          style={({ pressed }) => [
            styles.stepperMinusBtn,
            !canDeduct && styles.btnDisabled,
            isDeducting && styles.btnDeducting,
            pressed && canDeduct && styles.btnPressed,
          ]}
          onPress={handlePressDeduct}
          disabled={!canDeduct || isDeducting}
          accessibilityRole="button"
          accessibilityLabel={
            canDeduct
              ? `Deduct ${cupSize} mL ${getBeverageName(beverageType)}`
              : `No ${getBeverageName(beverageType)} logged today`
          }
        >
          <Ionicons
            name="remove"
            size={22}
            color={canDeduct ? (isDeducting ? '#FFFFFF' : Colors.water) : '#CBD5E1'}
          />
        </Pressable>

        {/* Center: Container & Beverage Capsule Pill */}
        <Pressable
          style={({ pressed }) => [
            styles.cupSelectorPill,
            isFutureDate && styles.btnDisabled,
            pressed && !isFutureDate && styles.btnPressed,
          ]}
          onPress={isFutureDate ? undefined : onOpenCupSelector}
          disabled={isFutureDate}
          accessibilityRole="button"
          accessibilityLabel={`Change container, currently ${cupSize} mL ${getBeverageName(beverageType)}`}
        >
          <View style={styles.cupIconBox}>
            {renderBeverageIconElement(beverageType, 18)}
          </View>
          <Text style={styles.cupSizeText}>{cupSize} mL</Text>
          <Ionicons name="chevron-down" size={13} color={Colors.water} style={styles.cupChevron} />
        </Pressable>

        {/* Right: Quick Add Button */}
        <Pressable
          style={({ pressed }) => [
            styles.stepperPlusBtn,
            isFutureDate && styles.btnDisabled,
            isDrinking && styles.btnDrinking,
            pressed && !isFutureDate && styles.btnPressed,
          ]}
          onPress={handlePressDrink}
          disabled={isDrinking || isFutureDate}
          accessibilityRole="button"
          accessibilityLabel={`Add ${cupSize} mL ${getBeverageName(beverageType)}`}
        >
          <Ionicons
            name={isDrinking ? 'checkmark' : 'add'}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </View>
  );
});

HeroDropletCard.displayName = 'HeroDropletCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingVertical: 16,
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
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  largeMetricNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 42,
    lineHeight: 46,
    color: '#0F172A',
    letterSpacing: -1,
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
  goalAchievedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  goalAchievedText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#059669',
  },
  progressSubText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  stepperTrioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.05)',
    width: '100%',
  },
  stepperMinusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  btnDeducting: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  cupSelectorPill: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: '#F0F9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cupIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cupSizeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cupChevron: {
    marginLeft: -1,
  },
  stepperPlusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: Colors.water,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.water,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDrinking: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
  btnDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
});
