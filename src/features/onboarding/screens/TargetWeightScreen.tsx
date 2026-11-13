import React, { useEffect, useMemo, useState } from 'react';
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
import { LBS_PER_KG } from '../services/goalsForm';
import { GoalType, minSafeTargetKg } from '../services/onboardingCalculator';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');

type Unit = 'kg' | 'lbs';

interface TargetWeightScreenProps {
  onBack?: () => void;
  onContinue: (targetWeightKg: number) => void;
  onSkip?: () => void;
  currentWeightKg: number;
  heightCm: number;
  goal: GoalType;
  initialTargetWeightKg?: number;
  weightUnit?: Unit;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const toUnit = (kg: number, unit: Unit) => (unit === 'kg' ? kg : kg * LBS_PER_KG);
const toKg = (v: number, unit: Unit) => Math.round((unit === 'kg' ? v : v / LBS_PER_KG) * 10) / 10;

/** Whole-number drum range in the display unit, or null when no lower goal is safe. */
export const targetRange = (
  currentKg: number,
  heightCm: number,
  goal: GoalType,
  unit: Unit
): { min: number; max: number } | null => {
  if (goal === 'lose_weight') {
    const min = Math.ceil(toUnit(minSafeTargetKg(heightCm), unit));
    const max = Math.ceil(toUnit(currentKg, unit)) - 1;
    return max < min ? null : { min, max };
  }
  return {
    min: Math.floor(toUnit(currentKg, unit)) + 1,
    max: Math.floor(toUnit(currentKg + 20, unit)),
  };
};

/** Whole-number BMI 18.5-24.9 weights in the display unit. */
export const healthyRange = (heightCm: number, unit: Unit) => {
  const h = heightCm / 100;
  return {
    lo: Math.ceil(toUnit(18.5 * h * h, unit)),
    hi: Math.floor(toUnit(24.9 * h * h, unit)),
  };
};

export const riaTargetMessage = (goal: GoalType, currentKg: number, targetKg: number) => {
  if (goal === 'gain_muscle') {
    return 'Slow and steady works best for muscle. I’ll pair this with a protein target.';
  }
  return (currentKg - targetKg) / currentKg <= 0.1
    ? 'A realistic goal. Even 5% can make a real difference to how you feel.'
    : 'A big goal, and you can get there. We’ll take it a week at a time.';
};

const RiaBubble: React.FC<{ text: string; testID: string }> = ({ text, testID }) => {
  const reduceMotion = useReducedMotion();
  const reply = useSharedValue(reduceMotion ? 1 : 0);

  // Re-runs only when the message changes, so the live region fires once per category.
  useEffect(() => {
    if (reduceMotion) {
      reply.value = 1;
      return;
    }
    reply.value = 0;
    reply.value = withTiming(1, {
      duration: MotionDurations.sheet,
      easing: MotionCurves.decelerate,
    });
  }, [text, reduceMotion, reply]);

  const replyStyle = useAnimatedStyle(() => ({
    opacity: reply.value,
    transform: [{ translateY: (1 - reply.value) * 8 }],
  }));

  return (
    <Animated.View style={[styles.replyRow, replyStyle]}>
      <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
      <View style={styles.bubble} accessibilityLiveRegion="polite" testID={testID}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </Animated.View>
  );
};

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
  const unit = weightUnit;
  const unitLabel = unit === 'kg' ? 'kg' : 'lb';
  const range = useMemo(
    () => targetRange(currentWeightKg, heightCm, goal, unit),
    [currentWeightKg, heightCm, goal, unit]
  );
  const minSafe = minSafeTargetKg(heightCm);
  const currentDisplay = toUnit(currentWeightKg, unit);

  const [value, setValue] = useState<number>(() => {
    if (!range) return 0;
    const raw =
      initialTargetWeightKg !== undefined
        ? toUnit(initialTargetWeightKg, unit)
        : goal === 'lose_weight'
          ? toUnit(Math.max(minSafe, currentWeightKg - 5), unit)
          : toUnit(currentWeightKg + 3, unit);
    return Math.min(range.max, Math.max(range.min, Math.round(raw)));
  });

  const handleContinue = () => {
    haptics.selection();
    onContinue(range ? toKg(value, unit) : currentWeightKg);
  };

  const diff = Math.round(Math.abs(value - currentDisplay));
  const healthy = healthyRange(heightCm, unit);
  const message = range ? riaTargetMessage(goal, currentWeightKg, toKg(value, unit)) : '';

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
            What’s your goal weight?
          </Text>
          <Text style={styles.subtitle}>
            {`You’re at ${currentDisplay.toFixed(1)} ${unitLabel} today.`}
          </Text>

          {range ? (
            <>
              <View style={styles.wheel}>
                <WheelPicker
                  min={range.min}
                  max={range.max}
                  value={value}
                  onChange={setValue}
                  unit={unitLabel}
                  accessibilityLabel="Goal weight"
                  testID="target-weight-wheel"
                />
              </View>

              <View style={styles.pill} testID="target-weight-delta">
                <Ionicons
                  name={goal === 'lose_weight' ? 'arrow-down' : 'arrow-up'}
                  size={13}
                  color={Colors.primaryDeep}
                />
                <Text style={styles.pillText}>
                  {`${diff} ${unitLabel} ${goal === 'lose_weight' ? 'less' : 'more'} than today`}
                </Text>
              </View>

              <Text style={styles.hint} testID="target-weight-healthy-range">
                {`Healthy range for your height: ${healthy.lo}–${healthy.hi} ${unitLabel}`}
              </Text>

              <RiaBubble text={message} testID="target-weight-ria-reply" />
            </>
          ) : (
            <>
              <View style={styles.leanCard} testID="target-weight-lean-card">
                <Text style={styles.leanText}>
                  {`You’re already at the lowest healthy weight for your height (${Math.round(toUnit(minSafe, unit))} ${unitLabel}), so I won’t set a lower goal.`}
                </Text>
              </View>
              <RiaBubble
                text={`Let’s keep you at ${Math.round(currentDisplay)} ${unitLabel} and focus on eating well. You can change this later in Goals.`}
                testID="target-weight-ria-reply"
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            testID="target-weight-continue-button"
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 22, paddingBottom: 20 },
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
  wheel: { marginTop: 18 },
  pill: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },
  pillText: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 14,
    color: Colors.primaryDeep,
  },
  hint: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13.5,
    color: Colors.textMuted,
  },
  leanCard: {
    marginTop: 22,
    padding: 14,
    backgroundColor: Colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    borderCurve: 'continuous',
    elevation: 0,
  },
  leanText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.textPrimary,
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
  footer: { paddingTop: 12, paddingBottom: 16 },
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
  continueButtonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  continueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textInverse,
  },
});
