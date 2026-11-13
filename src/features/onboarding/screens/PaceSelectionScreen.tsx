import React, { useMemo, useState } from 'react';
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
import { LBS_PER_KG } from '../services/goalsForm';
import {
  GoalType,
  Pace,
  previewPlans,
  UserBiometricsInput,
} from '../services/onboardingCalculator';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');

interface PaceSelectionScreenProps {
  onBack?: () => void;
  onContinue: (pace: Pace) => void;
  onSkip?: () => void;
  biometrics: UserBiometricsInput;
  initialPace?: Pace;
  weightUnit?: 'kg' | 'lbs';
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const PACES: { id: Pace; label: string }[] = [
  { id: 'gentle', label: 'Gentle' },
  { id: 'steady', label: 'Steady' },
  { id: 'faster', label: 'Faster' },
];

const LOSE_REPLY: Record<Pace, string> = {
  gentle: 'Small changes, less hunger. Great if strict diets haven’t stuck before.',
  steady: 'The sweet spot for most people: real progress without feeling deprived.',
  faster: 'Doable, but expect more hunger. You can slow down anytime in Goals.',
};

const GAIN_REPLY: Record<Pace, string> = {
  gentle: 'Leaner gains, more slowly. Good if you want to stay sharp.',
  steady: 'A good balance: steady muscle with little extra fat.',
  faster: 'Quicker gains, with a bit more fat along the way. Pair it with training.',
};

export const paceReply = (goal: GoalType, pace: Pace): string =>
  (goal === 'gain_muscle' ? GAIN_REPLY : LOSE_REPLY)[pace];

const formatKcal = (n: number) => n.toLocaleString('en-US');

export const PaceSelectionScreen: React.FC<PaceSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  biometrics,
  initialPace,
  weightUnit = 'kg',
  sectionIndex = 2,
  totalSections = 4,
  sectionProgress = 0.5,
}) => {
  const [selectedPace, setSelectedPace] = useState<Pace | null>(initialPace ?? null);
  const reduceMotion = useReducedMotion();
  const reply = useSharedValue(initialPace ? 1 : 0);

  const replyStyle = useAnimatedStyle(() => ({
    opacity: reply.value,
    transform: [{ translateY: (1 - reply.value) * 8 }],
  }));

  const plans = useMemo(() => previewPlans(biometrics), [biometrics]);
  const flooredPaces = PACES.filter(p => plans[p.id].isAtSafeFloor);

  const unitShort = weightUnit === 'lbs' ? 'lb' : 'kg';
  const unitLong = weightUnit === 'lbs' ? 'pounds' : 'kilograms';

  const handleSelect = (pace: Pace) => {
    haptics.selection();
    if (pace === selectedPace) return;
    setSelectedPace(pace);
    if (reduceMotion) {
      reply.set(1);
      return;
    }
    reply.set(0);
    reply.set(
      withTiming(1, {
        duration: MotionDurations.sheet,
        easing: MotionCurves.decelerate,
      })
    );
  };

  const handleContinue = () => {
    if (!selectedPace) return;
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
          <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            How fast do you want to go?
          </Text>
          <Text style={styles.subtitle}>You can change this anytime in Goals.</Text>

          <View style={styles.list} accessibilityRole="radiogroup">
            {PACES.map(({ id, label }) => {
              const plan = plans[id];
              const selected = selectedPace === id;
              const recommended = id === 'steady';

              let weekly: string | null = null;
              let weeklySpoken = '';
              if (plan.weeklyChangeKg !== undefined) {
                const unitFactor = weightUnit === 'lbs' ? LBS_PER_KG : 1;
                const amount = (
                  Math.round(Math.abs(plan.weeklyChangeKg) * unitFactor * 10) / 10
                ).toFixed(1);
                const loss = plan.weeklyChangeKg < 0;
                weekly = `${loss ? '−' : '+'}${amount} ${unitShort} a week`;
                weeklySpoken = `, ${loss ? 'lose' : 'gain'} ${amount} ${unitLong} a week`;
                if (plan.goalDate) {
                  weekly += ` · by ${plan.goalDate}`;
                  weeklySpoken += `, by ${plan.goalDate}`;
                }
              }

              return (
                <Pressable
                  key={id}
                  onPress={() => handleSelect(id)}
                  style={({ pressed }) => [
                    styles.card,
                    selected && styles.cardSelected,
                    pressed && styles.cardPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={`${label}${recommended ? ', recommended' : ''}, ${formatKcal(
                    plan.dailyCalorieBudget
                  )} calories a day${weeklySpoken}`}
                  testID={`pace-card-${id}`}
                >
                  <View style={styles.cardText}>
                    <View style={styles.labelRow}>
                      <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
                        {label}
                      </Text>
                      {recommended ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>RECOMMENDED</Text>
                        </View>
                      ) : null}
                    </View>
                    {weekly ? (
                      <Text style={styles.cardSubtitle} maxFontSizeMultiplier={1.3}>
                        {weekly}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.kcalBlock}>
                    <Text
                      style={[styles.kcalValue, selected && styles.kcalValueSelected]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {formatKcal(plan.dailyCalorieBudget)}
                    </Text>
                    <Text style={styles.kcalUnit} maxFontSizeMultiplier={1.3}>
                      kcal a day
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {flooredPaces.length > 0 ? (
            <View style={styles.floorNote} testID="pace-floor-note">
              <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.floorNoteText}>
                {flooredPaces.map(p => p.label).join(' and ')}{' '}
                {flooredPaces.length === 1 ? 'is' : 'are'} kept at a safe minimum of{' '}
                {formatKcal(plans[flooredPaces[0].id].dailyCalorieBudget)} kcal.
              </Text>
            </View>
          ) : null}

          {selectedPace ? (
            <Animated.View style={[styles.replyRow, replyStyle]}>
              <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
              <View style={styles.bubble} accessibilityLiveRegion="polite" testID="pace-ria-reply">
                <Text style={styles.bubbleText}>{paceReply(biometrics.goal, selectedPace)}</Text>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={!selectedPace}
            style={({ pressed }) => [
              styles.continueButton,
              !selectedPace && styles.continueButtonDisabled,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !selectedPace }}
            testID="pace-continue-button"
          >
            <Text style={[styles.continueText, !selectedPace && styles.continueTextDisabled]}>
              Continue
            </Text>
            {selectedPace ? (
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
  list: {
    marginTop: 22,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
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
  cardText: {
    flex: 1,
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16.5,
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: Colors.primaryDeep,
  },
  cardSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13.5,
    color: Colors.textMuted,
  },
  kcalBlock: {
    alignItems: 'flex-end',
  },
  kcalValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  kcalValueSelected: {
    color: Colors.primaryDeep,
  },
  kcalUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  floorNote: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floorNoteText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12.5,
    lineHeight: 18,
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
