import React, { useState } from 'react';
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
import { GoalType } from '../services/onboardingCalculator';
import { GoalIntent } from '../services/onboardingDraft';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');

export type FitnessGoal = 'lose' | 'maintain' | 'gain' | 'lose_weight' | 'gain_muscle';

interface GoalSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (goal: GoalType, intent: GoalIntent) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
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
  reply: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const GOAL_OPTIONS: GoalCardItem[] = [
  {
    id: 'lose',
    goal: 'lose_weight',
    title: 'Lose weight',
    subtitle: 'Steadily, no crash dieting',
    reply: "Good call. I'll set a gentle calorie budget you can actually stick to.",
    iconName: 'trending-down-outline',
  },
  {
    id: 'maintain',
    goal: 'maintain',
    title: 'Maintain my weight',
    subtitle: 'Stay steady, eat better',
    reply: "Got it. I'll help you balance your plate, no restricting.",
    iconName: 'scale-outline',
  },
  {
    id: 'build',
    goal: 'gain_muscle',
    title: 'Build muscle',
    subtitle: 'More protein, small surplus',
    reply: "Let's do it. I'll set a high-protein target with a small surplus.",
    iconName: 'barbell-outline',
  },
  {
    id: 'understand',
    goal: 'maintain',
    title: 'Understand what I eat',
    subtitle: 'No targets, just insights',
    reply: "Love that. No pressure, just clear insight into what's on your plate.",
    iconName: 'eye-outline',
  },
];

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialIntent,
  name,
  sectionIndex = 0,
  totalSections = 4,
  sectionProgress = 0.4,
}) => {
  const [selectedIntent, setSelectedIntent] = useState<GoalIntent | null>(initialIntent ?? null);
  const reduceMotion = useReducedMotion();
  const reply = useSharedValue(initialIntent ? 1 : 0);

  const replyStyle = useAnimatedStyle(() => ({
    opacity: reply.value,
    transform: [{ translateY: (1 - reply.value) * 8 }],
  }));

  const selectedOption = GOAL_OPTIONS.find(o => o.id === selectedIntent);

  const handleSelectOption = (option: GoalCardItem) => {
    haptics.selection();
    if (option.id === selectedIntent) return;
    setSelectedIntent(option.id);
    if (reduceMotion) {
      reply.value = 1;
      return;
    }
    reply.value = 0;
    reply.value = withTiming(1, {
      duration: MotionDurations.sheet,
      easing: MotionCurves.decelerate,
    });
  };

  const handleContinue = () => {
    if (!selectedOption) return;
    haptics.selection();
    onContinue?.(selectedOption.goal, selectedOption.id);
  };

  const displayName = name?.trim() ?? '';

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
            {displayName ? (
              <>
                What brings you here, <Text style={styles.questionName}>{displayName}</Text>?
              </>
            ) : (
              'What brings you here?'
            )}
          </Text>
          <Text style={styles.subtitle}>This sets your calorie and protein targets.</Text>

          <View style={styles.list} accessibilityRole="radiogroup">
            {GOAL_OPTIONS.map(option => {
              const selected = selectedIntent === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelectOption(option)}
                  style={({ pressed }) => [
                    styles.card,
                    selected && styles.cardSelected,
                    pressed && styles.cardPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={`${option.title}, ${option.subtitle}`}
                  testID={`goal-card-${option.id}`}
                >
                  <View style={[styles.iconTile, selected && styles.iconTileSelected]}>
                    <Ionicons
                      name={option.iconName}
                      size={22}
                      color={selected ? Colors.primaryDeep : Colors.textPrimary}
                    />
                  </View>

                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
                      {option.title}
                    </Text>
                    <Text style={styles.cardSubtitle} maxFontSizeMultiplier={1.3}>
                      {option.subtitle}
                    </Text>
                  </View>

                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color={Colors.textInverse} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {selectedOption ? (
            <Animated.View style={[styles.replyRow, replyStyle]}>
              <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
              <View style={styles.bubble} accessibilityLiveRegion="polite" testID="goal-ria-reply">
                <Text style={styles.bubbleText}>{selectedOption.reply}</Text>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={!selectedOption}
            style={({ pressed }) => [
              styles.continueButton,
              !selectedOption && styles.continueButtonDisabled,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !selectedOption }}
            testID="goal-continue-button"
          >
            <Text style={[styles.continueText, !selectedOption && styles.continueTextDisabled]}>
              Continue
            </Text>
            {selectedOption ? (
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
  questionName: {
    color: Colors.primaryDeep,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  list: {
    marginTop: 22,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    borderCurve: 'continuous',
    elevation: 0,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12.5,
    paddingHorizontal: 13.5,
  },
  cardPressed: {
    opacity: 0.95,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.borderLight,
  },
  iconTileSelected: {
    backgroundColor: Colors.primaryLight,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16.5,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13.5,
    color: Colors.textMuted,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
