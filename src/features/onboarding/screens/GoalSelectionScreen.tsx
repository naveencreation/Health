import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { GoalType } from '../services/onboardingCalculator';
import { GoalIntent } from '../services/onboardingDraft';

export type FitnessGoal = 'lose' | 'maintain' | 'gain' | 'lose_weight' | 'gain_muscle';

interface GoalSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (goal: GoalType, intent: GoalIntent) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialGoal?: GoalType | 'lose' | 'gain';
  initialIntent?: GoalIntent;
  name?: string;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

interface GoalCardItem {
  id: GoalIntent;
  goal: GoalType;
  title: string;
  subtitle: string;
  reassurance: string;
  iconName: string;
  iconFamily: 'ionicons' | 'mci';
  iconColor: string;
}

const GOAL_OPTIONS: GoalCardItem[] = [
  {
    id: 'lose',
    goal: 'lose_weight',
    title: 'Lose weight',
    subtitle: 'Caloric deficit for sustainable fat loss',
    reassurance: "We'll set a gentle calorie budget you can actually stick to.",
    iconName: 'flame',
    iconFamily: 'ionicons',
    iconColor: '#F47551',
  },
  {
    id: 'maintain',
    goal: 'maintain',
    title: 'Maintain my weight',
    subtitle: 'Equilibrium to optimize daily energy & health',
    reassurance: "We'll help you balance what you eat without restricting.",
    iconName: 'scale-balance',
    iconFamily: 'mci',
    iconColor: '#16A34A',
  },
  {
    id: 'build',
    goal: 'gain_muscle',
    title: 'Build muscle',
    subtitle: 'Caloric surplus and protein to build strength',
    reassurance: "We'll set a high-protein target and surplus to fuel gains.",
    iconName: 'barbell',
    iconFamily: 'ionicons',
    iconColor: '#4F46E5',
  },
  {
    id: 'understand',
    goal: 'maintain',
    title: 'Just understand what I eat',
    subtitle: 'Discover daily nutrition patterns without pressure',
    reassurance: 'No pressure, just clear insights on what goes on your plate.',
    iconName: 'eye-outline',
    iconFamily: 'ionicons',
    iconColor: '#0EA5E9',
  },
];

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialGoal = 'maintain',
  initialIntent,
  name,
  sectionIndex = 0,
  totalSections = 4,
  sectionProgress = 0.4,
}) => {
  // Normalize initialGoal into GoalIntent
  const defaultIntent = (): GoalIntent => {
    if (initialIntent) return initialIntent;
    if (initialGoal === 'lose' || initialGoal === 'lose_weight') return 'lose';
    if (initialGoal === 'gain' || initialGoal === 'gain_muscle') return 'build';
    return 'maintain';
  };

  const [selectedIntent, setSelectedIntent] = useState<GoalIntent>(defaultIntent);

  const handleSelectOption = (option: GoalCardItem) => {
    haptics.selection();
    setSelectedIntent(option.id);
  };

  const handleContinue = () => {
    haptics.selection();
    const selectedOption = GOAL_OPTIONS.find(o => o.id === selectedIntent) ?? GOAL_OPTIONS[0];
    if (onContinue) {
      onContinue(selectedOption.goal, selectedOption.id);
    }
  };

  const displayName = name?.trim() ? name.trim() : '';
  const screenTitle = displayName
    ? `What brings you here, ${displayName}?`
    : 'What brings you here?';

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
            <Text style={styles.screenTitle}>{screenTitle}</Text>
            <Text style={styles.screenSubtitle}>
              Calibrates your daily calorie target and macro targets.
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            {GOAL_OPTIONS.map(option => {
              const isSelected = selectedIntent === option.id;

              return (
                <View key={option.id} style={styles.cardWrapper}>
                  <Pressable
                    onPress={() => handleSelectOption(option)}
                    style={({ pressed }) => [
                      styles.goalCard,
                      isSelected ? styles.goalCardSelected : styles.goalCardUnselected,
                      pressed ? styles.goalCardPressed : null,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${option.title}: ${option.subtitle}`}
                    testID={`goal-card-${option.id}`}
                  >
                    <View style={[styles.iconBadge, getGoalIconBgStyle(option.id)]}>
                      {option.iconFamily === 'ionicons' ? (
                        <Ionicons name={option.iconName as any} size={22} color={option.iconColor} />
                      ) : (
                        <MaterialCommunityIcons
                          name={option.iconName as any}
                          size={22}
                          color={option.iconColor}
                        />
                      )}
                    </View>

                    <View style={styles.cardTextContent}>
                      <Text
                        style={[
                          styles.goalTitle,
                          isSelected ? styles.goalTitleSelected : null,
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text style={styles.goalSubtitle}>{option.subtitle}</Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        isSelected ? styles.radioSelected : styles.radioUnselected,
                      ]}
                    >
                      {isSelected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                    </View>
                  </Pressable>

                  {/* Reassurance Line appears when selected */}
                  {isSelected && (
                    <Animated.View
                      entering={FadeIn.duration(250)}
                      exiting={FadeOut.duration(150)}
                      style={styles.reassuranceBanner}
                      testID={`reassurance-${option.id}`}
                    >
                      <Ionicons name="sparkles" size={14} color="#F47551" style={styles.reassuranceIcon} />
                      <Text style={styles.reassuranceText}>{option.reassurance}</Text>
                    </Animated.View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed ? styles.continueButtonPressed : null,
            ]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to next step"
            testID="goal-continue-button"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const getGoalIconBgStyle = (intent: GoalIntent) => {
  switch (intent) {
    case 'lose':
      return { backgroundColor: '#FEE2E2' };
    case 'maintain':
      return { backgroundColor: '#DCFCE7' };
    case 'build':
      return { backgroundColor: '#EEF2FF' };
    case 'understand':
      return { backgroundColor: '#E0F2FE' };
    default:
      return { backgroundColor: '#F1F5F9' };
  }
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
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary ?? '#64748B',
  },
  cardsContainer: {
    gap: 14,
  },
  cardWrapper: {
    gap: 8,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  goalCardSelected: {
    borderColor: '#F47551',
    backgroundColor: '#FFFBF9',
    shadowColor: '#F47551',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardUnselected: {
    borderColor: '#E2E8F0',
  },
  goalCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTextContent: {
    flex: 1,
    marginRight: 10,
  },
  goalTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary ?? '#1E293B',
    marginBottom: 2,
  },
  goalTitleSelected: {
    color: '#1E293B',
  },
  goalSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary ?? '#64748B',
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
  reassuranceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  reassuranceIcon: {
    marginRight: 8,
  },
  reassuranceText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#9A3412',
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
