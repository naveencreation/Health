import React, { useState, useMemo } from 'react';
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
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import {
  minSafeTargetKg,
  calculateGoalDate,
  GoalType,
} from '../services/onboardingCalculator';

interface TargetWeightScreenProps {
  onBack?: () => void;
  onContinue: (targetWeightKg: number) => void;
  onSkip?: () => void;
  currentWeightKg: number;
  heightCm: number;
  goal: GoalType;
  initialTargetWeightKg?: number;
  weightUnit?: 'kg' | 'lbs';
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

export const TargetWeightScreen: React.FC<TargetWeightScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  currentWeightKg,
  heightCm,
  goal,
  initialTargetWeightKg,
  weightUnit = 'kg',
  sectionIndex = 1,
  totalSections = 4,
  sectionProgress = 0.75,
}) => {
  const isLoss = goal === 'lose_weight';
  const minSafe = useMemo(() => minSafeTargetKg(heightCm), [heightCm]);

  // Sensible default: 5 kg loss or 3 kg gain
  const defaultTarget = useMemo(() => {
    if (initialTargetWeightKg) return initialTargetWeightKg;
    if (isLoss) {
      const suggested = Math.max(minSafe, currentWeightKg - 5);
      return Math.round(suggested);
    } else {
      return Math.round(currentWeightKg + 3);
    }
  }, [initialTargetWeightKg, isLoss, minSafe, currentWeightKg]);

  const [targetKg, setTargetKg] = useState<number>(defaultTarget);

  // Check if target is below safe BMI 18.5 floor for weight loss
  const isBelowSafeFloor = isLoss && targetKg < minSafe;
  const effectiveTarget = isBelowSafeFloor ? minSafe : targetKg;

  const diffKg = Math.abs(currentWeightKg - effectiveTarget);

  // Estimate weeks at steady pace: ~0.5 kg/week for loss, 0.25 kg/week for gain
  const estimatedWeeks = useMemo(() => {
    if (diffKg === 0) return 0;
    const weeklyRate = isLoss ? 0.5 : 0.25;
    return Math.max(1, Math.round(diffKg / weeklyRate));
  }, [diffKg, isLoss]);

  const goalDateStr = useMemo(() => {
    return calculateGoalDate(estimatedWeeks);
  }, [estimatedWeeks]);

  const adjustWeight = (deltaKg: number) => {
    haptics.selection();
    setTargetKg(prev => {
      const next = prev + deltaKg;
      // Absolute bounds: 35 kg to 250 kg
      return Math.max(35, Math.min(250, next));
    });
  };

  const displayTarget =
    weightUnit === 'kg' ? targetKg : Math.round(targetKg * 2.20462);

  const displayCurrent =
    weightUnit === 'kg' ? currentWeightKg : Math.round(currentWeightKg * 2.20462);

  const displayDiff =
    weightUnit === 'kg' ? diffKg : Math.round(diffKg * 2.20462);

  const handleContinue = () => {
    haptics.selection();
    // Pass the safe clamped target
    onContinue(effectiveTarget);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        <OnboardingHeader
          onBack={onBack}
          onSkip={onSkip}
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          sectionProgress={sectionProgress}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>Where would you like to be?</Text>
            <Text style={styles.screenSubtitle}>
              Starting at {displayCurrent} {weightUnit}. We'll adjust your calorie budget to get you there safely.
            </Text>
          </View>

          {/* Stepper Card */}
          <View style={styles.stepperCard}>
            <Text style={styles.targetLabel}>TARGET WEIGHT</Text>
            <View style={styles.numberRow}>
              <Pressable
                onPress={() => adjustWeight(-1)}
                style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Decrease target weight by 1"
                testID="decrease-weight-button"
              >
                <Ionicons name="remove" size={24} color="#1E293B" />
              </Pressable>

              <View style={styles.valueDisplay}>
                <Text style={styles.valueText}>{displayTarget}</Text>
                <Text style={styles.unitText}>{weightUnit}</Text>
              </View>

              <Pressable
                onPress={() => adjustWeight(1)}
                style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Increase target weight by 1"
                testID="increase-weight-button"
              >
                <Ionicons name="add" size={24} color="#1E293B" />
              </Pressable>
            </View>

            {/* Quick offset buttons */}
            <View style={styles.quickChipsRow}>
              {isLoss ? (
                <>
                  <Pressable
                    onPress={() => setTargetKg(Math.max(minSafe, currentWeightKg - 3))}
                    style={styles.quickChip}
                  >
                    <Text style={styles.quickChipText}>-3 {weightUnit}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTargetKg(Math.max(minSafe, currentWeightKg - 5))}
                    style={styles.quickChip}
                  >
                    <Text style={styles.quickChipText}>-5 {weightUnit}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTargetKg(Math.max(minSafe, currentWeightKg - 10))}
                    style={styles.quickChip}
                  >
                    <Text style={styles.quickChipText}>-10 {weightUnit}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => setTargetKg(currentWeightKg + 2)}
                    style={styles.quickChip}
                  >
                    <Text style={styles.quickChipText}>+2 {weightUnit}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTargetKg(currentWeightKg + 5)}
                    style={styles.quickChip}
                  >
                    <Text style={styles.quickChipText}>+5 {weightUnit}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Live Feedback Card */}
          <View style={styles.feedbackCard} testID="live-feedback-card">
            <View style={styles.feedbackHeader}>
              <Ionicons name="trending-up-outline" size={18} color="#F47551" />
              <Text style={styles.feedbackTitle}>Projected Timeline</Text>
            </View>
            <Text style={styles.feedbackBody}>
              {isLoss ? '-' : '+'}
              {displayDiff} {weightUnit} · about {estimatedWeeks} {estimatedWeeks === 1 ? 'week' : 'weeks'} at a steady pace · around {goalDateStr}
            </Text>
          </View>

          {/* Safety Guardrail Alert Banner */}
          {isBelowSafeFloor && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.guardrailBanner}
              testID="guardrail-warning-banner"
            >
              <Ionicons name="heart-outline" size={18} color="#D97706" style={styles.guardrailIcon} />
              <Text style={styles.guardrailText}>
                That's below a healthy range for your height, so let's aim for {minSafe} kg.
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to activity level"
            testID="target-weight-continue-button"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </Pressable>
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
    paddingTop: 16,
    paddingBottom: 20,
  },
  titleContainer: {
    marginBottom: 24,
  },
  screenTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimary ?? '#1E293B',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary ?? '#64748B',
  },
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
  },
  targetLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: '#94A3B8',
    marginBottom: 14,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.95 }],
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    minWidth: 120,
    justifyContent: 'center',
  },
  valueText: {
    fontFamily: Fonts.kurale,
    fontSize: 52,
    lineHeight: 56,
    color: '#1E293B',
  },
  unitText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 18,
    color: '#64748B',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#475569',
  },
  feedbackCard: {
    backgroundColor: '#FFFBF9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  feedbackTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#9A3412',
    letterSpacing: 0.3,
  },
  feedbackBody: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
  },
  guardrailBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  guardrailIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  guardrailText: {
    flex: 1,
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#92400E',
  },
  footerContainer: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  continueButtonText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
