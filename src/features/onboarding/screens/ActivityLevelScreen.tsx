import React, { useState } from 'react';
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
import { ActivityLevel } from '../services/onboardingCalculator';

interface ActivityLevelScreenProps {
  onBack?: () => void;
  onContinue: (activityLevel: ActivityLevel) => void;
  onSkip?: () => void;
  initialActivityLevel?: ActivityLevel;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

interface ActivityOption {
  id: ActivityLevel;
  title: string;
  description: string;
  stepGoal: number;
  icon: string;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'sedentary',
    title: 'Mostly sitting',
    description: 'Desk job, little intentional exercise',
    stepGoal: 6000,
    icon: 'desktop-outline',
  },
  {
    id: 'lightly_active',
    title: 'Light',
    description: 'Casual walks or 1 to 3 workouts a week',
    stepGoal: 8000,
    icon: 'walk-outline',
  },
  {
    id: 'moderately_active',
    title: 'Moderate',
    description: '3 to 5 workouts, or on your feet most of the day',
    stepGoal: 10000,
    icon: 'fitness-outline',
  },
  {
    id: 'very_active',
    title: 'Very active',
    description: 'Daily intense training or a physical job',
    stepGoal: 12500,
    icon: 'bicycle-outline',
  },
];

export const ActivityLevelScreen: React.FC<ActivityLevelScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialActivityLevel = 'moderately_active',
  sectionIndex = 1,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<ActivityLevel>(initialActivityLevel);

  const selectedOption =
    ACTIVITY_OPTIONS.find(o => o.id === selectedLevel) ?? ACTIVITY_OPTIONS[2];

  const handleSelect = (id: ActivityLevel) => {
    haptics.selection();
    setSelectedLevel(id);
  };

  const handleContinue = () => {
    haptics.selection();
    onContinue(selectedLevel);
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
            <Text style={styles.screenTitle}>How active is a normal week?</Text>
            <Text style={styles.screenSubtitle}>
              Calibrates your daily calorie expenditure and base step target.
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            {ACTIVITY_OPTIONS.map(option => {
              const isSelected = selectedLevel === option.id;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelect(option.id)}
                  style={({ pressed }) => [
                    styles.card,
                    isSelected ? styles.cardSelected : styles.cardUnselected,
                    pressed && styles.cardPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${option.title}: ${option.description}`}
                  testID={`activity-card-${option.id}`}
                >
                  <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={isSelected ? '#F47551' : '#64748B'}
                    />
                  </View>

                  <View style={styles.cardContent}>
                    <Text
                      style={[
                        styles.cardTitle,
                        isSelected ? styles.cardTitleSelected : styles.cardTitleUnselected,
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text style={styles.cardSubtitle}>{option.description}</Text>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      isSelected ? styles.radioSelected : styles.radioUnselected,
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Dynamic Step Goal Chip */}
          <Animated.View
            key={selectedOption.id}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.stepChipContainer}
            testID="activity-step-chip"
          >
            <View style={styles.stepChip}>
              <Ionicons name="footsteps" size={16} color="#16A34A" style={styles.stepChipIcon} />
              <Text style={styles.stepChipText}>
                Daily step goal: <Text style={styles.stepChipBold}>{selectedOption.stepGoal.toLocaleString()} steps</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to pace selection"
            testID="activity-continue-button"
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
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
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
    shadowOpacity: 0.08,
  },
  cardUnselected: {
    borderColor: '#E2E8F0',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconWrapSelected: {
    backgroundColor: '#FEE2E2',
  },
  cardContent: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    marginBottom: 2,
  },
  cardTitleSelected: {
    color: '#1E293B',
  },
  cardTitleUnselected: {
    color: '#334155',
  },
  cardSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
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
  stepChipContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  stepChipIcon: {
    marginRight: 8,
  },
  stepChipText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#166534',
  },
  stepChipBold: {
    fontFamily: Fonts.urbanist.bold,
    color: '#15803D',
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
