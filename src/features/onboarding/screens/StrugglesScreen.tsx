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
import { Struggle } from '../services/onboardingDraft';

interface StrugglesScreenProps {
  onBack?: () => void;
  onContinue: (struggles: Struggle[]) => void;
  onSkip?: () => void;
  initialStruggles?: Struggle[];
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

interface StruggleOption {
  id: Struggle;
  label: string;
  reassurance: string;
  icon: string;
}

const STRUGGLE_OPTIONS: StruggleOption[] = [
  {
    id: 'home_cooked',
    label: 'Home-cooked food, no idea of calories',
    reassurance: 'Our AI is tuned for everyday home meals, rotis, curries, and dal.',
    icon: 'restaurant-outline',
  },
  {
    id: 'portions',
    label: 'Portion sizes',
    reassurance: 'Scan estimates portions for you, no food scales needed.',
    icon: 'pie-chart-outline',
  },
  {
    id: 'eating_out',
    label: 'Eating out or ordering in',
    reassurance: 'Snap a photo of any restaurant plate or menu to estimate calories.',
    icon: 'fast-food-outline',
  },
  {
    id: 'consistency',
    label: 'Staying consistent',
    reassurance: "We'll nudge you at your actual meal times, never annoyingly.",
    icon: 'calendar-outline',
  },
  {
    id: 'protein',
    label: 'Getting enough protein',
    reassurance: "We'll suggest quick, simple ways to hit your protein target.",
    icon: 'fitness-outline',
  },
  {
    id: 'late_snacking',
    label: 'Late-night snacking',
    reassurance: 'Guilt-free logging and smart evening calorie budgeting.',
    icon: 'moon-outline',
  },
  {
    id: 'not_sure',
    label: 'Not sure where to start',
    reassurance: "We'll guide you step-by-step from your very first meal.",
    icon: 'compass-outline',
  },
];

export const StrugglesScreen: React.FC<StrugglesScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialStruggles = [],
  sectionIndex = 0,
  totalSections = 4,
  sectionProgress = 0.6,
}) => {
  const [selectedStruggles, setSelectedStruggles] = useState<Struggle[]>(initialStruggles);
  const [lastSelectedStruggle, setLastSelectedStruggle] = useState<Struggle | null>(
    initialStruggles.length > 0 ? initialStruggles[initialStruggles.length - 1] : null
  );

  const toggleStruggle = (id: Struggle) => {
    haptics.selection();
    setSelectedStruggles(prev => {
      if (prev.includes(id)) {
        const filtered = prev.filter(s => s !== id);
        return filtered;
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
    setLastSelectedStruggle(id);
  };

  const handleContinue = () => {
    if (selectedStruggles.length === 0) return;
    haptics.selection();
    onContinue(selectedStruggles);
  };

  const activeReassurance = lastSelectedStruggle
    ? STRUGGLE_OPTIONS.find(o => o.id === lastSelectedStruggle)?.reassurance
    : null;

  const canContinue = selectedStruggles.length > 0;

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
            <Text style={styles.screenTitle}>What usually makes tracking hard?</Text>
            <Text style={styles.screenSubtitle}>
              Select up to 3 challenges so Ria can tailor your experience.
            </Text>
          </View>

          <View style={styles.chipsContainer}>
            {STRUGGLE_OPTIONS.map(option => {
              const isSelected = selectedStruggles.includes(option.id);

              return (
                <Pressable
                  key={option.id}
                  onPress={() => toggleStruggle(option.id)}
                  style={({ pressed }) => [
                    styles.chipCard,
                    isSelected ? styles.chipCardSelected : styles.chipCardUnselected,
                    pressed && styles.chipCardPressed,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={option.label}
                  testID={`struggle-chip-${option.id}`}
                >
                  <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={isSelected ? '#F47551' : '#64748B'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.chipLabel,
                      isSelected ? styles.chipLabelSelected : styles.chipLabelUnselected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#F47551" style={styles.checkIcon} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Dynamic Reassurance Box */}
          {activeReassurance && (
            <Animated.View
              entering={FadeIn.duration(250)}
              exiting={FadeOut.duration(150)}
              style={styles.reassuranceCard}
              testID="struggles-reassurance-box"
            >
              <Ionicons name="sparkles" size={16} color="#F47551" style={styles.reassuranceIcon} />
              <Text style={styles.reassuranceText}>{activeReassurance}</Text>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled,
              pressed && canContinue && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            disabled={!canContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to next step"
            testID="struggles-continue-button"
          >
            <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>
              Continue
            </Text>
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
    fontFamily: Fonts.poppins.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary ?? '#64748B',
  },
  chipsContainer: {
    gap: 10,
  },
  chipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  chipCardSelected: {
    borderColor: '#F47551',
    backgroundColor: '#FFFBF9',
    shadowColor: '#F47551',
    shadowOpacity: 0.08,
  },
  chipCardUnselected: {
    borderColor: '#E2E8F0',
  },
  chipCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapSelected: {
    backgroundColor: '#FEE2E2',
  },
  chipLabel: {
    flex: 1,
    fontFamily: Fonts.poppins.medium,
    fontSize: 14.5,
    lineHeight: 20,
  },
  chipLabelSelected: {
    color: '#1E293B',
  },
  chipLabelUnselected: {
    color: '#475569',
  },
  checkIcon: {
    marginLeft: 8,
  },
  reassuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  reassuranceIcon: {
    marginRight: 10,
  },
  reassuranceText: {
    flex: 1,
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    lineHeight: 18,
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
  continueButtonDisabled: {
    backgroundColor: '#CBD5E1',
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
  continueButtonTextDisabled: {
    color: '#94A3B8',
  },
});
