import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { FoodStyle } from '../services/onboardingDraft';

export interface FoodStyleData {
  foodStyle: FoodStyle;
  mealTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  skipsBreakfast: boolean;
  snacks: boolean;
}

interface FoodStyleScreenProps {
  onBack?: () => void;
  onContinue: (data: FoodStyleData) => void;
  onSkip?: () => void;
  initialFoodStyle?: FoodStyle;
  initialMealTimes?: { breakfast: string; lunch: string; dinner: string };
  initialSkipsBreakfast?: boolean;
  initialSnacks?: boolean;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

interface DietOption {
  id: FoodStyle;
  label: string;
  icon: string;
}

const DIET_OPTIONS: DietOption[] = [
  { id: 'vegetarian', label: 'Vegetarian', icon: 'leaf-outline' },
  { id: 'eggetarian', label: 'Eggetarian', icon: 'egg-outline' },
  { id: 'non_veg', label: 'Non-veg', icon: 'restaurant-outline' },
  { id: 'vegan', label: 'Vegan', icon: 'nutrition-outline' },
  { id: 'no_preference', label: 'No preference', icon: 'sparkles-outline' },
];

export const FoodStyleScreen: React.FC<FoodStyleScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialFoodStyle = 'no_preference',
  initialMealTimes = { breakfast: '08:30', lunch: '13:00', dinner: '20:00' },
  initialSkipsBreakfast = false,
  initialSnacks = true,
  sectionIndex = 2,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<FoodStyle>(initialFoodStyle);
  const [skipsBreakfast, setSkipsBreakfast] = useState<boolean>(initialSkipsBreakfast);
  const [snacks, setSnacks] = useState<boolean>(initialSnacks);
  const [mealTimes] = useState(initialMealTimes);

  const handleSelectDiet = (id: FoodStyle) => {
    haptics.selection();
    setSelectedStyle(id);
  };

  const handleContinue = () => {
    haptics.selection();
    onContinue({
      foodStyle: selectedStyle,
      mealTimes,
      skipsBreakfast,
      snacks,
    });
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
            <Text style={styles.screenTitle}>Food style & meal rhythm</Text>
            <Text style={styles.screenSubtitle}>
              Tunes your quick meal suggestions and daily reminder schedule.
            </Text>
          </View>

          {/* Section 1: Dietary Pattern Chips */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Dietary Preference</Text>
            <View style={styles.dietGrid}>
              {DIET_OPTIONS.map(opt => {
                const isSelected = selectedStyle === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleSelectDiet(opt.id)}
                    style={({ pressed }) => [
                      styles.dietChip,
                      isSelected ? styles.dietChipSelected : styles.dietChipUnselected,
                      pressed && styles.dietChipPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={opt.label}
                    testID={`diet-chip-${opt.id}`}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={isSelected ? '#F47551' : '#64748B'}
                      style={styles.dietChipIcon}
                    />
                    <Text
                      style={[
                        styles.dietChipText,
                        isSelected ? styles.dietChipTextSelected : styles.dietChipTextUnselected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section 2: Meal Rhythm & Habits */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Daily Routine</Text>
            <View style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>I skip breakfast</Text>
                  <Text style={styles.toggleSubtitle}>Focus calories on lunch and dinner</Text>
                </View>
                <Switch
                  value={skipsBreakfast}
                  onValueChange={val => {
                    haptics.selection();
                    setSkipsBreakfast(val);
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#F47551' }}
                  thumbColor="#FFFFFF"
                  testID="skip-breakfast-switch"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>I snack between meals</Text>
                  <Text style={styles.toggleSubtitle}>Reserve a dedicated snack calorie budget</Text>
                </View>
                <Switch
                  value={snacks}
                  onValueChange={val => {
                    haptics.selection();
                    setSnacks(val);
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#F47551' }}
                  thumbColor="#FFFFFF"
                  testID="snacks-switch"
                />
              </View>
            </View>
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
            accessibilityLabel="Continue to build your plan"
            testID="food-style-continue-button"
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
  sectionBlock: {
    marginBottom: 26,
  },
  sectionLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 16,
    color: Colors.textPrimary ?? '#1E293B',
    marginBottom: 12,
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dietChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dietChipSelected: {
    borderColor: '#F47551',
    backgroundColor: '#FFFBF9',
    shadowColor: '#F47551',
    shadowOpacity: 0.1,
  },
  dietChipUnselected: {
    borderColor: '#E2E8F0',
  },
  dietChipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  dietChipIcon: {
    marginRight: 8,
  },
  dietChipText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 14,
  },
  dietChipTextSelected: {
    color: '#1E293B',
    fontFamily: Fonts.poppins.semiBold,
  },
  dietChipTextUnselected: {
    color: '#475569',
  },
  toggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 14,
  },
  toggleTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
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
