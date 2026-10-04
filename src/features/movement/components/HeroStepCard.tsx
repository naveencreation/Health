import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { StepGaugeVisualizer, StepGaugeVisualizerRef } from './StepGaugeVisualizer';

export interface HeroStepCardRef {
  triggerSquish: () => void;
}

export interface HeroStepCardProps {
  currentSteps?: number;
  goalSteps?: number;
  onOpenGoalModal?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const HeroStepCard = forwardRef<HeroStepCardRef, HeroStepCardProps>(
  (
    {
      currentSteps: propSteps,
      goalSteps: propGoal,
      onOpenGoalModal,
      style,
    },
    ref
  ) => {
    const { dailyLogs, selectedDate } = useDailyLog();
    const { userGoals } = useGoals();

    const gaugeRef = useRef<StepGaugeVisualizerRef>(null);

    useImperativeHandle(ref, () => ({
      triggerSquish: () => gaugeRef.current?.triggerSquish(),
    }));

    // Step count resolution
    const logSteps = dailyLogs[selectedDate]?.steps ?? 0;
    const currentSteps = typeof propSteps === 'number' ? propSteps : logSteps;
    const goalSteps = typeof propGoal === 'number' ? propGoal : (userGoals.stepGoal || 10000);

    const isGoalMet = currentSteps >= goalSteps && goalSteps > 0;
    const percentOfGoal = goalSteps > 0 ? Math.round((currentSteps / goalSteps) * 100) : 0;

    // Derived micro-metrics
    const distanceKm = (currentSteps * 0.00076).toFixed(1);
    const stepBurnKcal = Math.round(currentSteps * 0.04);
    // Standard brisk walking pace estimate (~100 steps per minute)
    const activeMinutes = Math.round(currentSteps / 100);

    return (
      <View style={[styles.card, style]}>
        {/* 1. Header Row (Tracker Label & Goal Progress Pill) */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardEyebrow}>DAILY STEP GOAL</Text>
          {isGoalMet ? (
            <View style={styles.celebrationPill}>
              <Ionicons name="sparkles" size={12} color="#B45309" />
              <Text style={styles.celebrationText}>Goal Smashed! ({percentOfGoal}%)</Text>
            </View>
          ) : (
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>{percentOfGoal}% of goal</Text>
            </View>
          )}
        </View>

        {/* 2. Scaled 270° Radial Instrument Gauge with Vector Shoe */}
        <StepGaugeVisualizer
          ref={gaugeRef}
          currentSteps={currentSteps}
          maxSteps={goalSteps}
          activeColor={Colors.steps}
          onPressGoal={onOpenGoalModal}
        />

        {/* 3. Hairline Divider */}
        <View style={styles.divider} />

        {/* 4. Bottom Micro-Metrics Bar: Steps | Time | Calories | Distance */}
        <View style={styles.metricsBar}>
          {/* A. Steps Metric */}
          <View style={styles.metricItem}>
            <View style={[styles.metricIconCircle, { backgroundColor: Colors.stepsTrack }]}>
              <Ionicons name="footsteps" size={15} color={Colors.steps} />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>
              {currentSteps.toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>STEPS</Text>
          </View>

          <View style={styles.verticalDivider} />

          {/* B. Active Time Metric */}
          <View style={styles.metricItem}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="time" size={15} color="#0284C7" />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>
              {activeMinutes} min
            </Text>
            <Text style={styles.metricLabel}>TIME</Text>
          </View>

          <View style={styles.verticalDivider} />

          {/* C. Calories Burned Metric */}
          <View style={styles.metricItem}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="flame" size={15} color="#F97316" />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>
              {stepBurnKcal} kcal
            </Text>
            <Text style={styles.metricLabel}>CALORIES</Text>
          </View>

          <View style={styles.verticalDivider} />

          {/* D. Distance Metric */}
          <View style={styles.metricItem}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="navigate" size={15} color="#16A34A" />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>
              {distanceKm} km
            </Text>
            <Text style={styles.metricLabel}>DISTANCE</Text>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    shadowOpacity: 0,
    elevation: 0,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  cardEyebrow: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.8,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#F1F5F9',
  },
  progressPillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: '#475569',
  },
  celebrationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#FEF3C7',
  },
  celebrationText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#B45309',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  // 4-Column Micro-Metrics Bar
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#0F172A',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  metricLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 9.5,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F1F5F9',
  },
});
