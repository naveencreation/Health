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
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import {
  Pace,
  previewPlans,
  UserBiometricsInput,
} from '../services/onboardingCalculator';

interface PaceSelectionScreenProps {
  onBack?: () => void;
  onContinue: (pace: Pace) => void;
  onSkip?: () => void;
  biometrics: UserBiometricsInput;
  initialPace?: Pace;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

interface PaceCardMeta {
  id: Pace;
  label: string;
  tagline: string;
  isRecommended?: boolean;
}

const PACE_META: PaceCardMeta[] = [
  {
    id: 'gentle',
    label: 'Gentle',
    tagline: 'Easy and gradual. Small changes with minimal hunger.',
  },
  {
    id: 'steady',
    label: 'Steady',
    tagline: 'Balanced and sustainable. The proven long-term sweet spot.',
    isRecommended: true,
  },
  {
    id: 'faster',
    label: 'Faster',
    tagline: 'More disciplined deficit. For focused, quicker milestones.',
  },
];

export const PaceSelectionScreen: React.FC<PaceSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  biometrics,
  initialPace = 'steady',
  sectionIndex = 2,
  totalSections = 4,
  sectionProgress = 0.5,
}) => {
  const [selectedPace, setSelectedPace] = useState<Pace>(initialPace);

  // Compute all 3 preview plans live
  const plans = useMemo(() => {
    return previewPlans(biometrics);
  }, [biometrics]);

  const handleSelect = (pace: Pace) => {
    haptics.selection();
    setSelectedPace(pace);
  };

  const handleContinue = () => {
    haptics.selection();
    onContinue(selectedPace);
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
            <Text style={styles.screenTitle}>How fast do you want to go?</Text>
            <Text style={styles.screenSubtitle}>
              Choose a pace that fits your lifestyle. You can adjust this anytime.
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            {PACE_META.map(meta => {
              const plan = plans[meta.id];
              const isSelected = selectedPace === meta.id;

              return (
                <Pressable
                  key={meta.id}
                  onPress={() => handleSelect(meta.id)}
                  style={({ pressed }) => [
                    styles.card,
                    isSelected ? styles.cardSelected : styles.cardUnselected,
                    pressed && styles.cardPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${meta.label}: ${plan.dailyCalorieBudget} calories per day`}
                  testID={`pace-card-${meta.id}`}
                >
                  {/* Top Bar with Badge */}
                  <View style={styles.cardHeader}>
                    <View style={styles.labelRow}>
                      <Text style={styles.paceLabel}>{meta.label}</Text>
                      {meta.isRecommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedBadgeText}>Recommended</Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected ? styles.radioSelected : styles.radioUnselected,
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                  </View>

                  <Text style={styles.tagline}>{meta.tagline}</Text>

                  {/* Metrics Row: Calories & Estimated Date */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricBlock}>
                      <Text style={styles.metricValue}>
                        {plan.dailyCalorieBudget.toLocaleString()}
                      </Text>
                      <Text style={styles.metricUnit}>kcal / day</Text>
                    </View>

                    {plan.goalDate ? (
                      <View style={styles.metricBlockRight}>
                        <Text style={styles.dateLabel}>Target Date</Text>
                        <Text style={styles.dateValue}>{plan.goalDate}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Safety Floor Notice */}
                  {plan.isAtSafeFloor && (
                    <View style={styles.floorNotice}>
                      <Ionicons name="shield-checkmark" size={14} color="#059669" />
                      <Text style={styles.floorNoticeText}>
                        We keep this at a safe nutritional minimum.
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to food preferences"
            testID="pace-continue-button"
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
    marginBottom: 20,
  },
  screenTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimary ?? '#1E293B',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary ?? '#64748B',
  },
  cardsContainer: {
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSelected: {
    borderColor: '#F47551',
    backgroundColor: '#FFFBF9',
    shadowColor: '#F47551',
    shadowOpacity: 0.1,
  },
  cardUnselected: {
    borderColor: '#E2E8F0',
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paceLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#1E293B',
  },
  recommendedBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F47551',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  recommendedBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: '#F47551',
    letterSpacing: 0.2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#F47551',
    backgroundColor: '#F47551',
  },
  radioUnselected: {
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  tagline: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  metricValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 26,
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#64748B',
  },
  metricBlockRight: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#94A3B8',
  },
  dateValue: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  floorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  floorNoticeText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#059669',
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
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
