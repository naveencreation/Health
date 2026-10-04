import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { OnboardingHeader } from './OnboardingHeader';
import { haptics } from '@/utils/haptics';
import { CalculatedHealthPlan } from '../services/onboardingCalculator';

export interface PlanCalculationStepProps {
  plan: CalculatedHealthPlan;
  onConfirm: () => void | Promise<void>;
  onBack?: () => void;
  stepIndicator?: string;
}

export const PlanCalculationStep: React.FC<PlanCalculationStepProps> = ({
  plan,
  onConfirm,
  onBack,
  stepIndicator = 'Step 6 of 7',
}) => {
  const handleConfirm = async () => {
    await haptics.impactMedium();
    await onConfirm();
  };

  const totalMacroCalories =
    plan.targetProteinG * 4 + plan.targetCarbsG * 4 + plan.targetFatG * 9;
  const safeTotal = totalMacroCalories > 0 ? totalMacroCalories : 1;

  const proteinPct = Math.round(((plan.targetProteinG * 4) / safeTotal) * 100);
  const carbsPct = Math.round(((plan.targetCarbsG * 4) / safeTotal) * 100);
  const fatPct = Math.round(((plan.targetFatG * 9) / safeTotal) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <OnboardingHeader onBack={onBack} stepText={stepIndicator} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Badge */}
        <View style={styles.badgeWrap}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color={Colors.primary} />
            <Text style={styles.badgeText}>YOUR PERSONALIZED BLUEPRINT</Text>
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Your Custom Plan</Text>
        <Text style={styles.subtitle}>
          Scientifically calibrated with the Mifflin-St Jeor formula for sustainable, long-term results.
        </Text>

        {/* Hero Calorie Card */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieCardHeader}>
            <Text style={styles.calorieCardLabel}>DAILY CALORIE BUDGET</Text>
            <View style={styles.fireIconWrap}>
              <Ionicons name="flame" size={18} color="#FF6A3D" />
            </View>
          </View>

          <View style={styles.calorieValueRow}>
            <Text style={styles.calorieNumber}>
              {plan.dailyCalorieBudget.toLocaleString()}
            </Text>
            <Text style={styles.calorieUnit}>kcal / day</Text>
          </View>

          <View style={styles.calorieDivider} />

          <View style={styles.metabolicRow}>
            <View style={styles.metabolicItem}>
              <Text style={styles.metabolicLabel}>Basal Rate (BMR)</Text>
              <Text style={styles.metabolicValue}>{plan.bmr.toLocaleString()} kcal</Text>
            </View>
            <View style={styles.metabolicSeparator} />
            <View style={styles.metabolicItem}>
              <Text style={styles.metabolicLabel}>Maintenance (TDEE)</Text>
              <Text style={styles.metabolicValue}>{plan.tdee.toLocaleString()} kcal</Text>
            </View>
          </View>
        </View>

        {/* Macro Distribution Cards */}
        <Text style={styles.sectionHeader}>Target Macros</Text>
        <View style={styles.macroRow}>
          {/* Protein */}
          <View style={[styles.macroCard, { borderTopColor: '#3B82F6' }]}>
            <Text style={styles.macroName}>Protein</Text>
            <Text style={styles.macroGrams}>{plan.targetProteinG}g</Text>
            <Text style={[styles.macroPercent, { color: '#3B82F6' }]}>{proteinPct}%</Text>
          </View>

          {/* Carbs */}
          <View style={[styles.macroCard, { borderTopColor: '#10B981' }]}>
            <Text style={styles.macroName}>Carbs</Text>
            <Text style={styles.macroGrams}>{plan.targetCarbsG}g</Text>
            <Text style={[styles.macroPercent, { color: '#10B981' }]}>{carbsPct}%</Text>
          </View>

          {/* Fats */}
          <View style={[styles.macroCard, { borderTopColor: '#F59E0B' }]}>
            <Text style={styles.macroName}>Fats</Text>
            <Text style={styles.macroGrams}>{plan.targetFatG}g</Text>
            <Text style={[styles.macroPercent, { color: '#F59E0B' }]}>{fatPct}%</Text>
          </View>
        </View>

        {/* Daily Habits Target Cards */}
        <Text style={styles.sectionHeader}>Daily Habit Goals</Text>
        <View style={styles.habitGrid}>
          {/* Water Goal */}
          <View style={styles.habitCard}>
            <View style={[styles.habitIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="water" size={20} color="#3B82F6" />
            </View>
            <View style={styles.habitContent}>
              <Text style={styles.habitLabel}>Water Target</Text>
              <Text style={styles.habitValue}>{plan.targetWaterMl.toLocaleString()} mL</Text>
            </View>
          </View>

          {/* Step Goal */}
          <View style={styles.habitCard}>
            <View style={[styles.habitIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="footsteps" size={20} color="#10B981" />
            </View>
            <View style={styles.habitContent}>
              <Text style={styles.habitLabel}>Daily Steps</Text>
              <Text style={styles.habitValue}>{plan.stepGoal.toLocaleString()} steps</Text>
            </View>
          </View>
        </View>

        {/* Estimated Timeline Callout (if available) */}
        {plan.estimatedWeeksToGoal !== undefined && plan.estimatedWeeksToGoal > 0 && (
          <View style={styles.timelineBanner}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.timelineText}>
              Projected timeframe:{' '}
              <Text style={styles.timelineHighlight}>
                ~{plan.estimatedWeeksToGoal} weeks
              </Text>{' '}
              to reach your target weight safely.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, pressed && styles.btnPressed]}
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel="Start My Journey"
        >
          <Text style={styles.confirmBtnText}>Start My Journey</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  badgeWrap: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  badgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 20,
  },
  calorieCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: 24,
  },
  calorieCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calorieCardLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  fireIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  calorieNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 42,
    color: '#0F172A',
    letterSpacing: -1,
  },
  calorieUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 16,
    color: '#64748B',
  },
  calorieDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  metabolicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metabolicItem: {
    flex: 1,
  },
  metabolicLabel: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  metabolicValue: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#334155',
  },
  metabolicSeparator: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  sectionHeader: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 12,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 14,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
  },
  macroName: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  macroGrams: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 2,
  },
  macroPercent: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
  },
  habitGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  habitCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    gap: 10,
  },
  habitIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitContent: {
    flex: 1,
  },
  habitLabel: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  habitValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  timelineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    gap: 10,
  },
  timelineText: {
    flex: 1,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#9A3412',
    lineHeight: 18,
  },
  timelineHighlight: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.primary,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#FAF9F6',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.04)',
  },
  confirmBtn: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  confirmBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default PlanCalculationStep;
