import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { Sex, evaluateAgePolicy } from '../services/onboardingCalculator';

interface AboutYouScreenProps {
  onBack?: () => void;
  onContinue: (sex: Sex, age: number) => void;
  onSkip?: () => void;
  initialSex?: Sex;
  initialAge?: number;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const MIN_AGE = 10;
const MAX_AGE = 99;
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220px
const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);
const SNAP_OFFSETS = AGES.map((_, i) => i * ITEM_HEIGHT);

const SEX_OPTIONS: { id: Sex; label: string; icon: string }[] = [
  { id: 'female', label: 'Female', icon: 'female' },
  { id: 'male', label: 'Male', icon: 'male' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'person' },
];

export const AboutYouScreen: React.FC<AboutYouScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialSex = 'female',
  initialAge = 25,
  sectionIndex = 0,
  totalSections = 4,
  sectionProgress = 0.8,
}) => {
  const [selectedSex, setSelectedSex] = useState<Sex>(initialSex);
  const [selectedAge, setSelectedAge] = useState<number>(initialAge);
  const scrollViewRef = useRef<ScrollView>(null);
  const isLayoutReadyRef = useRef(false);

  const initialOffset = Math.max(0, (initialAge - MIN_AGE) * ITEM_HEIGHT);

  useEffect(() => {
    if (isLayoutReadyRef.current) {
      const offset = Math.max(0, (selectedAge - MIN_AGE) * ITEM_HEIGHT);
      scrollViewRef.current?.scrollTo({ y: offset, animated: false });
    }
  }, []);

  const handleLayout = useCallback(() => {
    if (!isLayoutReadyRef.current) {
      isLayoutReadyRef.current = true;
      scrollViewRef.current?.scrollTo({ y: initialOffset, animated: false });
    }
  }, [initialOffset]);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(AGES.length - 1, index));
    const age = AGES[clampedIndex];
    if (age !== undefined && age !== selectedAge) {
      haptics.selection();
      setSelectedAge(age);
    }
  };

  const handleSelectAge = (age: number) => {
    haptics.selection();
    setSelectedAge(age);
    const offset = (age - MIN_AGE) * ITEM_HEIGHT;
    scrollViewRef.current?.scrollTo({ y: offset, animated: true });
  };

  const agePolicy = evaluateAgePolicy(selectedAge);
  const canContinue = agePolicy.allowed;

  const handleContinue = () => {
    if (!canContinue) return;
    haptics.selection();
    onContinue(selectedSex, selectedAge);
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
          onLayout={handleLayout}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>A little about you.</Text>
            <Text style={styles.screenSubtitle}>
              Helps calibrate your base metabolic rate accurately.
            </Text>
          </View>

          {/* Biological Sex Selection */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Biological Sex</Text>
            <View style={styles.sexRow}>
              {SEX_OPTIONS.map(opt => {
                const isSelected = selectedSex === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      haptics.selection();
                      setSelectedSex(opt.id);
                    }}
                    style={({ pressed }) => [
                      styles.sexPill,
                      isSelected ? styles.sexPillSelected : styles.sexPillUnselected,
                      pressed && styles.sexPillPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={opt.label}
                    testID={`sex-option-${opt.id}`}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={isSelected ? '#F47551' : '#64748B'}
                      style={styles.sexIcon}
                    />
                    <Text
                      style={[
                        styles.sexText,
                        isSelected ? styles.sexTextSelected : styles.sexTextUnselected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.privacyNote}>
              Only used for calorie math. Never shown on your profile or shared.
            </Text>
          </View>

          {/* Age Selection Wheel */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Age</Text>
            <View style={styles.wheelContainer}>
              <View style={styles.wheelHighlight} />
              <ScrollView
                ref={scrollViewRef}
                style={styles.wheelScrollView}
                contentContainerStyle={styles.wheelContent}
                showsVerticalScrollIndicator={false}
                snapToOffsets={SNAP_OFFSETS}
                snapToAlignment="center"
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumScrollEnd}
                testID="age-scroll-wheel"
              >
                {AGES.map(age => {
                  const isSelected = age === selectedAge;
                  return (
                    <Pressable
                      key={age}
                      onPress={() => handleSelectAge(age)}
                      style={styles.wheelItem}
                      testID={`age-item-${age}`}
                    >
                      <Text
                        style={[
                          styles.wheelItemText,
                          isSelected ? styles.wheelItemTextSelected : styles.wheelItemTextDim,
                        ]}
                      >
                        {age}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Age Policy Notification Banner */}
          {agePolicy.message && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={[
                styles.policyCard,
                !agePolicy.allowed ? styles.policyCardBlocked : styles.policyCardNotice,
              ]}
              testID="age-policy-banner"
            >
              <Ionicons
                name={!agePolicy.allowed ? 'alert-circle' : 'information-circle'}
                size={18}
                color={!agePolicy.allowed ? '#DC2626' : '#D97706'}
                style={styles.policyIcon}
              />
              <Text
                style={[
                  styles.policyText,
                  !agePolicy.allowed ? styles.policyTextBlocked : styles.policyTextNotice,
                ]}
              >
                {agePolicy.message}
              </Text>
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
            accessibilityLabel="Continue to body metrics"
            testID="about-you-continue-button"
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
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary ?? '#64748B',
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textPrimary ?? '#1E293B',
    marginBottom: 10,
  },
  sexRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sexPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  sexPillSelected: {
    borderColor: '#F47551',
    backgroundColor: '#FFFBF9',
  },
  sexPillUnselected: {
    borderColor: '#E2E8F0',
  },
  sexPillPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  sexIcon: {
    marginRight: 6,
  },
  sexText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
  },
  sexTextSelected: {
    color: '#1E293B',
    fontFamily: Fonts.urbanist.semiBold,
  },
  sexTextUnselected: {
    color: '#64748B',
  },
  privacyNote: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#94A3B8',
    marginTop: 8,
  },
  wheelContainer: {
    height: CONTAINER_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  wheelHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 12,
    right: 12,
    height: ITEM_HEIGHT,
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  wheelScrollView: {
    flex: 1,
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 18,
  },
  wheelItemTextSelected: {
    fontSize: 22,
    fontFamily: Fonts.urbanist.bold,
    color: '#F47551',
  },
  wheelItemTextDim: {
    color: '#94A3B8',
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  policyCardBlocked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  policyCardNotice: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  policyIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  policyText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  policyTextBlocked: {
    color: '#991B1B',
  },
  policyTextNotice: {
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
  continueButtonDisabled: {
    backgroundColor: '#CBD5E1',
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
  continueButtonTextDisabled: {
    color: '#94A3B8',
  },
});
