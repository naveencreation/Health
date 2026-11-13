import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { MotionCurves, MotionDurations } from '@/theme/motion';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { WheelPicker } from '../components/WheelPicker';
import { Sex, evaluateAgePolicy } from '../services/onboardingCalculator';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');

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

const GENDER_OPTIONS: { id: Sex; label: string; iconName: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'female', label: 'Female', iconName: 'female' },
  { id: 'male', label: 'Male', iconName: 'male' },
];

export const AboutYouScreen: React.FC<AboutYouScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialSex,
  initialAge = 25,
  sectionIndex = 0,
  totalSections = 4,
  sectionProgress = 0.8,
}) => {
  const [selectedSex, setSelectedSex] = useState<Sex | null>(initialSex ?? null);
  const [selectedAge, setSelectedAge] = useState<number>(initialAge);
  const reduceMotion = useReducedMotion();

  const agePolicy = evaluateAgePolicy(selectedAge);
  const showTeenReply = agePolicy.allowed && agePolicy.forceMaintain;
  const teenReply = useSharedValue(showTeenReply ? 1 : 0);
  const teenReplyStyle = useAnimatedStyle(() => ({
    opacity: teenReply.value,
    transform: [{ translateY: (1 - teenReply.value) * 8 }],
  }));

  useEffect(() => {
    if (!showTeenReply) return;
    if (reduceMotion) {
      teenReply.value = 1;
      return;
    }
    teenReply.value = 0;
    teenReply.value = withTiming(1, {
      duration: MotionDurations.sheet,
      easing: MotionCurves.decelerate,
    });
  }, [showTeenReply, reduceMotion, teenReply]);

  const canContinue = selectedSex !== null && agePolicy.allowed;

  const handleContinue = () => {
    if (!canContinue || selectedSex === null) return;
    haptics.selection();
    onContinue(selectedSex, selectedAge);
  };

  const pickSex = (id: Sex) => {
    haptics.selection();
    setSelectedSex(id);
  };

  const preferNot = selectedSex === 'prefer_not_to_say';

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
          <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            A little about you
          </Text>
          <Text style={styles.subtitle}>
            Bodies burn energy differently, so this tunes your calorie estimate.
          </Text>

          <Text style={styles.sectionLabel}>Sex</Text>
          <View accessibilityRole="radiogroup">
            <View style={styles.sexRow}>
              {GENDER_OPTIONS.map(opt => {
                const isSelected = selectedSex === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => pickSex(opt.id)}
                    style={({ pressed }) => [
                      styles.sexTile,
                      isSelected && styles.sexTileSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, checked: isSelected }}
                    accessibilityLabel={opt.label}
                    testID={`sex-option-${opt.id}`}
                  >
                    <Ionicons
                      name={opt.iconName}
                      size={20}
                      color={isSelected ? Colors.primaryDeep : Colors.textPrimary}
                    />
                    <Text
                      style={[styles.sexLabel, isSelected && styles.selectedText]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => pickSex('prefer_not_to_say')}
              style={({ pressed }) => [
                styles.preferTile,
                preferNot && styles.preferTileSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: preferNot, checked: preferNot }}
              accessibilityLabel="Prefer not to say"
              testID="sex-option-prefer_not_to_say"
            >
              <Text
                style={[styles.preferLabel, preferNot && styles.selectedText]}
                maxFontSizeMultiplier={1.3}
              >
                Prefer not to say
              </Text>
            </Pressable>
          </View>

          <View style={styles.noteRow}>
            {preferNot ? (
              <Text style={styles.noteText}>{"No problem. I'll use an average of both."}</Text>
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.noteText}>
                  Only used for your calorie maths. Never shown or shared.
                </Text>
              </>
            )}
          </View>

          <Text style={styles.sectionLabel}>Age</Text>
          <WheelPicker
            min={MIN_AGE}
            max={MAX_AGE}
            value={selectedAge}
            onChange={setSelectedAge}
            unit="yrs"
            accessibilityLabel="Age"
            testID="age-scroll-wheel"
          />

          {showTeenReply ? (
            <Animated.View
              style={[styles.replyRow, teenReplyStyle]}
              accessibilityLiveRegion="polite"
              testID="age-policy-banner"
            >
              <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{agePolicy.message}</Text>
              </View>
            </Animated.View>
          ) : null}

          {!agePolicy.allowed ? (
            <View
              style={styles.blocked}
              accessibilityLiveRegion="polite"
              testID="age-policy-banner"
            >
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
              <Text style={styles.blockedText}>{agePolicy.message}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !canContinue }}
            testID="about-you-continue-button"
          >
            <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]}>
              Continue
            </Text>
            {canContinue ? (
              <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
            ) : null}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 22,
    paddingBottom: 20,
  },
  question: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  sexRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sexTile: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  sexTileSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  sexLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  preferTile: {
    marginTop: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    elevation: 0,
  },
  preferTileSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  preferLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14.5,
    color: Colors.textSecondary,
  },
  selectedText: {
    color: Colors.primaryDeep,
  },
  pressed: {
    opacity: 0.85,
  },
  noteRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteText: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textMuted,
  },
  replyRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  bubble: {
    flexShrink: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  blocked: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.dangerLight,
  },
  blockedText: {
    flex: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  continueButton: {
    height: ControlHeights.button + 4,
    borderRadius: ControlRadii.button,
    borderCurve: 'continuous',
    backgroundColor: Colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 0,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.borderInset,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  continueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textInverse,
  },
  continueTextDisabled: {
    color: Colors.textMuted,
  },
});
