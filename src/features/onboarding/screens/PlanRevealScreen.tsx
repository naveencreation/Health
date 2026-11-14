import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { haptics } from '@/utils/haptics';
import { getMealTarget } from '@/features/nutrition/services/nutritionAnalytics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { CalculatedHealthPlan } from '../services/onboardingCalculator';
import { Struggle } from '../services/onboardingDraft';
import { LBS_PER_KG } from '../services/goalsForm';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');
const NBSP = ' ';

interface PlanRevealScreenProps {
  plan: CalculatedHealthPlan;
  name?: string;
  firstStruggle?: Struggle;
  targetWeightKg?: number;
  weightUnit?: 'kg' | 'lbs';
  weightKg?: number;
  onLogFirstMeal: () => void;
  onBack?: () => void;
}

export function planGoalLine(
  plan: CalculatedHealthPlan,
  opts: { weightUnit: 'kg' | 'lbs'; targetWeightKg?: number; weightKg?: number }
): string | null {
  const factor = opts.weightUnit === 'lbs' ? LBS_PER_KG : 1;
  const unit = opts.weightUnit === 'lbs' ? 'lb' : 'kg';
  const weekly = plan.weeklyChangeKg;
  if (weekly === undefined) {
    return opts.weightKg ? `Staying at ${Math.round(opts.weightKg * factor)} ${unit}` : null;
  }
  if (weekly < 0 && opts.targetWeightKg && plan.goalDate) {
    return `${Math.round(opts.targetWeightKg * factor)} ${unit} by ${plan.goalDate}`;
  }
  const x = (Math.round(Math.abs(weekly) * factor * 10) / 10).toFixed(1);
  return `${weekly < 0 ? 'Losing' : 'Gaining'} ${x} ${unit} a week`;
}

export function planRiaLine(struggle: Struggle | undefined, plan: CalculatedHealthPlan): string {
  switch (struggle) {
    case 'portions':
      return 'Log in everyday servings, like 2 rotis or 1 katori dal, and I’ll do the maths. No scale needed.';
    case 'protein':
      return `Your protein target is ${plan.targetProteinG}${NBSP}g. Today shows how close you are after every meal.`;
    case 'consistency':
      return 'Small and steady wins. Turn on reminders next and I’ll nudge you around your meal times.';
    case 'home_cooked':
      return 'Dal, poha, roti and khichdi are already in the food list. Add your own recipe once and reuse it.';
    case 'eating_out':
      return 'Search restaurant dishes by name. With a Gemini key, I can estimate a plate from a photo too.';
    case 'late_snacking':
      return `About ${getMealTarget(plan.dailyCalorieBudget, 'snacks')}${NBSP}kcal of your day is set aside for snacks. Plan it, and late nights won’t surprise you.`;
    default:
      return 'No pressure. Log one meal today and we’ll learn from there.';
  }
}

export const PlanRevealScreen: React.FC<PlanRevealScreenProps> = ({
  plan,
  name,
  firstStruggle,
  targetWeightKg,
  weightUnit = 'kg',
  weightKg,
  onLogFirstMeal,
  onBack,
}) => {
  const displayName = name?.trim();
  const goalLine = planGoalLine(plan, { weightUnit, targetWeightKg, weightKg });
  const kcal = plan.dailyCalorieBudget.toLocaleString('en-US');
  const water = (plan.targetWaterMl / 1000).toFixed(1);
  const steps = plan.stepGoal.toLocaleString('en-US');

  const macros = [
    {
      label: 'Protein',
      g: plan.targetProteinG,
      color: Colors.protein,
      share: plan.targetProteinG * 4,
    },
    { label: 'Carbs', g: plan.targetCarbsG, color: Colors.carbs, share: plan.targetCarbsG * 4 },
    { label: 'Fat', g: plan.targetFatG, color: Colors.fat, share: plan.targetFatG * 9 },
  ];
  const totalShare = macros.reduce((s, m) => s + m.share, 0);

  const handleLogPress = () => {
    haptics.impactMedium();
    onLogFirstMeal();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        <OnboardingHeader
          onBack={onBack}
          sectionIndex={3}
          totalSections={4}
          sectionProgress={1.0}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {displayName ? `Your plan, ${displayName}` : 'Your plan'}
          </Text>

          {goalLine ? (
            <View style={styles.goalPill} testID="plan-goal-pill">
              <Ionicons name="flag-outline" size={14} color={Colors.primaryDeep} />
              <Text style={styles.goalPillText} maxFontSizeMultiplier={1.3}>
                {goalLine}
              </Text>
            </View>
          ) : null}

          <View
            style={styles.hero}
            accessible
            accessibilityLabel={`${kcal} calories a day. Protein ${plan.targetProteinG} grams, carbs ${plan.targetCarbsG} grams, fat ${plan.targetFatG} grams.`}
            testID="plan-hero"
          >
            <Text style={styles.heroLabel} maxFontSizeMultiplier={1.3}>
              DAILY TARGET
            </Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroNumber} maxFontSizeMultiplier={1.2}>
                {kcal}
              </Text>
              <Text style={styles.heroUnit} maxFontSizeMultiplier={1.3}>
                kcal a day
              </Text>
            </View>

            <View style={styles.macroBar}>
              {macros.map(m => (
                <View
                  key={m.label}
                  style={[
                    styles.macroSegment,
                    { backgroundColor: m.color, flex: totalShare > 0 ? m.share : 1 },
                  ]}
                />
              ))}
            </View>

            <View style={styles.macroCols}>
              {macros.map(m => (
                <View key={m.label} style={styles.macroCol}>
                  <Text style={styles.macroValue} maxFontSizeMultiplier={1.3}>
                    {`${m.g}${NBSP}g`}
                  </Text>
                  <View style={styles.macroLabelRow}>
                    <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                    <Text style={styles.macroLabel} maxFontSizeMultiplier={1.3}>
                      {m.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.tiles}>
            <View
              style={styles.tile}
              accessible
              accessibilityLabel={`${water} litres of water a day`}
              testID="plan-water-tile"
            >
              <View style={[styles.tileIcon, { backgroundColor: Colors.waterLight }]}>
                <Ionicons name="water-outline" size={16} color={Colors.water} />
              </View>
              <View style={styles.tileText}>
                <Text style={styles.tileValue} maxFontSizeMultiplier={1.3}>
                  {`${water}${NBSP}L`}
                </Text>
                <Text style={styles.tileCaption} maxFontSizeMultiplier={1.3}>
                  water a day
                </Text>
              </View>
            </View>
            <View
              style={styles.tile}
              accessible
              accessibilityLabel={`${steps} steps a day`}
              testID="plan-steps-tile"
            >
              <View style={[styles.tileIcon, { backgroundColor: Colors.stepsLight }]}>
                <Ionicons name="footsteps-outline" size={16} color={Colors.steps} />
              </View>
              <View style={styles.tileText}>
                <Text style={styles.tileValue} maxFontSizeMultiplier={1.3}>
                  {steps}
                </Text>
                <Text style={styles.tileCaption} maxFontSizeMultiplier={1.3}>
                  steps a day
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.replyRow}>
            <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
            <View style={styles.bubble} testID="plan-ria-line">
              <Text style={styles.bubbleText}>{planRiaLine(firstStruggle, plan)}</Text>
            </View>
          </View>

          <Text style={styles.finePrint} maxFontSizeMultiplier={1.3}>
            Mifflin-St Jeor estimate. Not medical advice.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleLogPress}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Log my first meal"
            testID="btn-log-first-meal"
          >
            <Text style={styles.continueText}>Log my first meal</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const cardBase = {
  backgroundColor: Colors.card,
  borderWidth: 1,
  borderColor: Colors.borderSubtle,
  borderRadius: 10,
  borderCurve: 'continuous',
  elevation: 0,
} as const;

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
  goalPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },
  goalPillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13.5,
    color: Colors.primaryDeep,
  },
  hero: {
    ...cardBase,
    marginTop: 18,
    padding: 16,
  },
  heroLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  heroNumber: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    color: Colors.textPrimary,
  },
  heroUnit: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textMuted,
  },
  macroBar: {
    flexDirection: 'row',
    height: 8,
    gap: 3,
    marginTop: 14,
  },
  macroSegment: {
    height: 8,
    borderRadius: 4,
  },
  macroCols: {
    flexDirection: 'row',
    marginTop: 14,
  },
  macroCol: {
    flex: 1,
  },
  macroValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tile: {
    ...cardBase,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    flexShrink: 1,
  },
  tileValue: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  tileCaption: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  replyRow: {
    marginTop: 14,
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
  finePrint: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textMuted,
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
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  continueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textInverse,
  },
});
