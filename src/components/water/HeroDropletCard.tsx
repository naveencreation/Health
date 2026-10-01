import React, { useState, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { WaterGaugeVisualizer, WaterGaugeVisualizerRef } from './WaterGaugeVisualizer';
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

export const HeroDropletCard = forwardRef<HeroDropletCardRef, HeroDropletCardProps>(
  (
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
    },
    ref
  ) => {
    const { dailyLogs, selectedDate } = useDailyLog();
    const { userGoals } = useGoals();

    const currentWater =
      typeof propWater === 'number'
        ? propWater
        : (dailyLogs[selectedDate]?.waterMl ?? 0);

    const goalWater =
      typeof propGoal === 'number'
        ? propGoal
        : (userGoals.waterGoalMl || 2500);

    const isGoalMet = currentWater >= goalWater;

    // Gauge visualizer ref for slosh physics
    const gaugeRef = useRef<WaterGaugeVisualizerRef>(null);

    // Expose triggerSlosh to parent
    useImperativeHandle(ref, () => ({
      triggerSlosh: (dir) => gaugeRef.current?.triggerSlosh(dir),
    }));

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

    // Instant, unblocked tactile tap handlers
    const handlePressDrink = () => {
      if (isFutureDate) return;
      onDrink?.(cupSize, beverageType);
    };

    const handlePressDeduct = () => {
      if (!canDeduct) return;
      onDeduct?.(cupSize, beverageType);
    };

    return (
      <View style={[styles.card, style]}>
        {/* 1. Precision 270° Radial Gauge Visualizer with Beveled Liquid Droplet and Integrated Metric */}
        <WaterGaugeVisualizer
          ref={gaugeRef}
          currentWater={currentWater}
          maxWater={goalWater}
          activeColor="#2196F3"
          onPressGoal={onOpenGoalModal}
        />

        {/* 2. Hydration Goal Celebration Status (shown only when goal is achieved) */}
        {isGoalMet && (
          <View style={styles.goalAchievedPill}>
            <Ionicons name="checkmark-circle" size={13} color="#059669" />
            <Text style={styles.goalAchievedText}>
              {currentWater > goalWater
                ? `Goal achieved! (+${currentWater - goalWater} mL)`
                : 'Daily goal achieved! 🎉'}
            </Text>
          </View>
        )}

        {/* 3. Symmetrical Stepper Trio Quick Logger: [ ( - )   [ 🥤 300 mL ▾ ]   ( + ) ] */}
        <View style={styles.stepperTrioRow}>
          {/* Left: Quick Minus Button */}
          <Pressable
            style={({ pressed }) => [
              styles.stepperMinusBtn,
              !canDeduct && styles.btnDisabled,
              pressed && canDeduct && styles.btnPressed,
            ]}
            onPress={handlePressDeduct}
            disabled={!canDeduct}
            accessibilityRole="button"
            accessibilityLabel={
              canDeduct
                ? `Deduct ${cupSize} mL ${getBeverageName(beverageType)}`
                : 'Deduct water button disabled'
            }
          >
            <Ionicons
              name="remove"
              size={22}
              color={canDeduct ? '#0284C7' : '#94A3B8'}
            />
          </Pressable>

          {/* Center: Container Size & Beverage Type Pill Selector */}
          <Pressable
            style={({ pressed }) => [
              styles.cupSelectorPill,
              pressed && styles.btnPressed,
            ]}
            onPress={onOpenCupSelector}
            accessibilityRole="button"
            accessibilityLabel={`Container size ${cupSize} mL, beverage ${getBeverageName(beverageType)}. Tap to change.`}
          >
            <View style={styles.cupIconBox}>
              {renderBeverageIconElement(beverageType, 18, '#0284C7')}
            </View>
            <Text style={styles.cupSizeText} numberOfLines={1}>
              {cupSize} mL
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color="#0284C7"
              style={styles.cupChevron}
            />
          </Pressable>

          {/* Right: Quick Plus Button */}
          <Pressable
            style={({ pressed }) => [
              styles.stepperPlusBtn,
              isFutureDate && styles.btnDisabled,
              pressed && !isFutureDate && styles.btnPressed,
            ]}
            onPress={handlePressDrink}
            disabled={isFutureDate}
            accessibilityRole="button"
            accessibilityLabel={`Add ${cupSize} mL ${getBeverageName(beverageType)}`}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 10,
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
  goalAchievedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  goalAchievedText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#059669',
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
