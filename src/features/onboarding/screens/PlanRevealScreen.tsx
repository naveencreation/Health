import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { CalculatedHealthPlan } from '../services/onboardingCalculator';
import { Struggle } from '../services/onboardingDraft';

interface PlanRevealScreenProps {
  plan: CalculatedHealthPlan;
  name?: string;
  firstStruggle?: Struggle;
  targetWeightKg?: number;
  weightUnit?: 'kg' | 'lbs';
  onLogFirstMeal: () => void;
  onAdjustPlan?: () => void;
  onBack?: () => void;
}

export const PlanRevealScreen: React.FC<PlanRevealScreenProps> = ({
  plan,
  name,
  firstStruggle,
  targetWeightKg,
  weightUnit = 'kg',
  onLogFirstMeal,
  onAdjustPlan,
  onBack,
}) => {
  const displayName = name?.trim() ? name.trim() : 'friend';
  const [isCalculatedExpanded, setIsCalculatedExpanded] = useState<boolean>(false);
  const [displayedCalories, setDisplayedCalories] = useState<number>(0);

  // Smooth count-up animation for calories
  useEffect(() => {
    const target = plan.dailyCalorieBudget;
    const duration = 1000;
    const steps = 25;
    const stepDuration = duration / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += 1;
      const progress = current / steps;
      const eased = Math.round(target * Math.min(1, progress));
      setDisplayedCalories(eased);

      if (current >= steps) {
        clearInterval(interval);
        setDisplayedCalories(target);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [plan.dailyCalorieBudget]);

  const handleLogPress = () => {
    haptics.impactMedium();
    onLogFirstMeal();
  };

  const handleAdjustPress = () => {
    haptics.selection();
    if (onAdjustPlan) {
      onAdjustPlan();
    }
  };

  const toggleCalculated = () => {
    haptics.selection();
    setIsCalculatedExpanded(prev => !prev);
  };

  // Macro calorie math for segmented circle
  const proteinCals = plan.targetProteinG * 4;
  const carbsCals = plan.targetCarbsG * 4;
  const fatCals = plan.targetFatG * 9;
  const totalCals = Math.max(1, proteinCals + carbsCals + fatCals);

  const proteinPct = Math.round((proteinCals / totalCals) * 100);
  const carbsPct = Math.round((carbsCals / totalCals) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  // SVG ring circumference (radius = 64)
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12
  const proteinStroke = (proteinPct / 100) * circumference;
  const carbsStroke = (carbsPct / 100) * circumference;
  const fatStroke = (fatPct / 100) * circumference;

  // Personalized struggle insight text
  const getInsightText = (struggle?: Struggle) => {
    switch (struggle) {
      case 'portions':
        return 'You said portion sizes are hard. Scan estimates them from a photo so you don’t have to weigh your food.';
      case 'protein':
        return `Your protein target is ${plan.targetProteinG}g. We’ll show your progress and easy protein suggestions after every meal.`;
      case 'consistency':
        return 'Staying consistent is easier with rhythm. We’ll gently nudge you around your meal times, not randomly.';
      case 'home_cooked':
        return 'Home-cooked dishes can be tricky to count. Calorify’s AI recognizes traditional home cooking without complicated recipes.';
      case 'eating_out':
        return 'Eating out often? Snap a photo of the restaurant plate or menu and we’ll accurately calculate your portions.';
      case 'late_snacking':
        return 'To tackle late snacking, we’ve prioritized higher protein and fiber to keep you full and energized into the night.';
      case 'not_sure':
        return 'Tracking shouldn’t be stressful. Every meal log takes under 3 seconds so you can build healthy habits effortlessly.';
      default:
        return 'Every meal you log brings you one step closer to your goal. Let’s make it sustainable and simple.';
    }
  };

  const isGoalTarget = targetWeightKg && targetWeightKg > 0 && plan.goalDate;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        <OnboardingHeader
          onBack={onBack}
          sectionIndex={3}
          totalSections={4}
          sectionProgress={1.0}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>{displayName}, your plan is ready.</Text>
            {isGoalTarget ? (
              <View style={styles.goalTrackBadge}>
                <Ionicons name="sparkles" size={14} color="#F47551" />
                <Text style={styles.goalTrackText}>
                  On track for {targetWeightKg} {weightUnit} by {plan.goalDate}.
                </Text>
              </View>
            ) : (
              <Text style={styles.screenSubtitle}>
                Scientifically calibrated to match your metabolism and daily rhythm.
              </Text>
            )}
          </View>

          {/* Hero Calorie Segmented Ring Card */}
          <View style={styles.heroCard}>
            <View style={styles.ringContainer}>
              <Svg width={160} height={160} viewBox="0 0 160 160">
                {/* Background Track */}
                <Circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#F1F5F9"
                  strokeWidth="12"
                  fill="none"
                />

                {/* Protein Segment (Green) */}
                <Circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#67BD6E"
                  strokeWidth="12"
                  strokeDasharray={`${proteinStroke} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 80 80)"
                />

                {/* Carbs Segment (Yellow) */}
                <Circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#F8D558"
                  strokeWidth="12"
                  strokeDasharray={`${carbsStroke} ${circumference}`}
                  strokeDashoffset={-proteinStroke}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 80 80)"
                />

                {/* Fat Segment (Coral) */}
                <Circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#F47551"
                  strokeWidth="12"
                  strokeDasharray={`${fatStroke} ${circumference}`}
                  strokeDashoffset={-(proteinStroke + carbsStroke)}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 80 80)"
                />
              </Svg>

              <View style={styles.ringCenterText}>
                <Text style={styles.calorieNumber}>
                  {displayedCalories.toLocaleString()}
                </Text>
                <Text style={styles.calorieUnit}>kcal / day</Text>
              </View>
            </View>

            {/* Three Macro Tiles */}
            <View style={styles.macroRow}>
              {/* Protein Tile */}
              <View style={[styles.macroTile, { borderColor: 'rgba(103, 189, 110, 0.3)' }]}>
                <View style={[styles.macroDot, { backgroundColor: '#67BD6E' }]} />
                <Text style={styles.macroGramText}>{plan.targetProteinG}g</Text>
                <Text style={styles.macroLabel}>Protein ({proteinPct}%)</Text>
              </View>

              {/* Carbs Tile */}
              <View style={[styles.macroTile, { borderColor: 'rgba(248, 213, 88, 0.4)' }]}>
                <View style={[styles.macroDot, { backgroundColor: '#F8D558' }]} />
                <Text style={styles.macroGramText}>{plan.targetCarbsG}g</Text>
                <Text style={styles.macroLabel}>Carbs ({carbsPct}%)</Text>
              </View>

              {/* Fat Tile */}
              <View style={[styles.macroTile, { borderColor: 'rgba(244, 117, 81, 0.3)' }]}>
                <View style={[styles.macroDot, { backgroundColor: '#F47551' }]} />
                <Text style={styles.macroGramText}>{plan.targetFatG}g</Text>
                <Text style={styles.macroLabel}>Fat ({fatPct}%)</Text>
              </View>
            </View>

            {/* Lifestyle Target Chips */}
            <View style={styles.supportChipsRow}>
              <View style={styles.supportChip}>
                <Ionicons name="water-outline" size={14} color="#0284C7" />
                <Text style={styles.supportChipText}>
                  {(plan.targetWaterMl ?? 2500).toLocaleString()} mL water
                </Text>
              </View>
              <View style={styles.supportChip}>
                <Ionicons name="footsteps-outline" size={14} color="#F97316" />
                <Text style={styles.supportChipText}>
                  {(plan.stepGoal ?? 10000).toLocaleString()} daily steps
                </Text>
              </View>
            </View>
          </View>

          {/* Personal Insight Card */}
          <View style={styles.insightCard} testID="personal-insight-card">
            <View style={styles.insightHeader}>
              <Ionicons name="bulb-outline" size={18} color="#9A3412" />
              <Text style={styles.insightTitle}>Personalized Insight</Text>
            </View>
            <Text style={styles.insightBody}>
              {getInsightText(firstStruggle)}
            </Text>
          </View>

          {/* Expandable "How we calculated this" Accordion */}
          <View style={styles.accordionCard}>
            <Pressable
              onPress={toggleCalculated}
              style={styles.accordionHeader}
              accessibilityRole="button"
              accessibilityLabel="Toggle how we calculated this breakdown"
            >
              <Text style={styles.accordionTitle}>How we calculated this</Text>
              <Ionicons
                name={isCalculatedExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#64748B"
              />
            </Pressable>

            {isCalculatedExpanded && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                style={styles.accordionBody}
              >
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Formula</Text>
                  <Text style={styles.calcValue}>Mifflin-St Jeor Equation</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Basal Metabolic Rate (BMR)</Text>
                  <Text style={styles.calcValue}>{plan.bmr.toLocaleString()} kcal</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Maintenance Energy (TDEE)</Text>
                  <Text style={styles.calcValue}>{plan.tdee.toLocaleString()} kcal</Text>
                </View>
                {plan.pace && (
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Pace Strategy</Text>
                    <Text style={styles.calcValue}>
                      {plan.pace.charAt(0).toUpperCase() + plan.pace.slice(1)}
                    </Text>
                  </View>
                )}

                <Text style={styles.calcDisclaimer}>
                  Estimates based on physiological data, not medical advice.
                </Text>
              </Animated.View>
            )}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={handleLogPress}
            accessibilityRole="button"
            accessibilityLabel="Log my first meal"
            testID="btn-log-first-meal"
          >
            <Text style={styles.primaryButtonText}>Log my first meal</Text>
          </Pressable>

          {onAdjustPlan && (
            <Pressable
              onPress={handleAdjustPress}
              style={({ pressed }) => [
                styles.adjustButton,
                pressed && styles.adjustButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Adjust plan manually"
              testID="btn-adjust-plan"
            >
              <Text style={styles.adjustButtonText}>Adjust my plan</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  titleContainer: {
    marginBottom: 18,
  },
  screenTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 36,
    color: '#1E293B',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
  },
  goalTrackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  goalTrackText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#9A3412',
  },

  // Hero Card with Ring
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  ringContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  ringCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 38,
    lineHeight: 44,
    color: '#0F172A',
    letterSpacing: -1,
  },
  calorieUnit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#64748B',
  },

  // Macro Row
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  macroTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroGramText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 2,
  },
  macroLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },

  // Support Chips (Water & Steps)
  supportChipsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  supportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  supportChipText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#334155',
  },

  // Insight Card
  insightCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  insightTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#9A3412',
    letterSpacing: 0.2,
  },
  insightBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#431407',
  },

  // Accordion Card
  accordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#334155',
  },
  accordionBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#64748B',
  },
  calcValue: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  calcDisclaimer: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },

  // Footer Actions
  footerContainer: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  adjustButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  adjustButtonPressed: {
    opacity: 0.7,
  },
  adjustButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#64748B',
  },
});
