import React, { useState } from 'react';
import { KCAL_PER_STEP, BIOMETRIC_DEFAULTS } from '@/constants/biometricDefaults';
import { LBS_PER_KG } from '@/features/onboarding/services/goalsForm';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ClinicalBmiGauge } from '@/features/weight';

export type MetricTab = 'bmi' | 'weight' | 'calories' | 'steps' | 'water';

interface ProfileMetricInspectorProps {
  bmi: string;
  bmiStatus: { label: string; color: string };
  heightCm: number | string;
  weightNum: number;
  targetWeightNum: number;
  startWeight: number;
  calorieBudget: string | number;
  targetProtein: string | number;
  targetCarbs: string | number;
  targetFat: string | number;
  stepGoal: string | number;
  waterGoal: string | number;
  weightUnit?: 'kg' | 'lbs';
  onOpenGoalsModal: () => void;
}

const EDIT_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const PILL_HIT_SLOP = { top: 6, bottom: 6, left: 0, right: 0 };

export const ProfileMetricInspector: React.FC<ProfileMetricInspectorProps> = ({
  bmi,
  bmiStatus,
  heightCm,
  weightNum,
  targetWeightNum,
  startWeight,
  calorieBudget,
  targetProtein,
  targetCarbs,
  targetFat,
  stepGoal,
  waterGoal,
  weightUnit = 'kg',
  onOpenGoalsModal,
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricTab>('bmi');
  // Weights stay in kg for the maths and are shown in the user's unit
  const w = (kg: number) =>
    (Math.round((weightUnit === 'lbs' ? kg * LBS_PER_KG : kg) * 10) / 10).toFixed(1);

  // Weight calculations — direction-aware (supports both loss and gain goals)
  const isGainGoal = targetWeightNum > startWeight;
  const totalJourney = Math.max(0.1, Math.abs(startWeight - targetWeightNum));
  const progressSoFar = isGainGoal
    ? Math.max(0, weightNum - startWeight) // gaining
    : Math.max(0, startWeight - weightNum); // losing
  const lostSoFar = Math.max(0, startWeight - weightNum); // kept for display text
  const gainedSoFar = Math.max(0, weightNum - startWeight);
  const remainingWeight = isGainGoal
    ? Math.max(0, targetWeightNum - weightNum)
    : Math.max(0, weightNum - targetWeightNum);
  const weightProgressPct = Math.min(100, Math.round((progressSoFar / totalJourney) * 100));

  // Weight journey context states
  const isMaintain = Math.abs(startWeight - targetWeightNum) < 0.1;
  const isNewUser = Math.abs(startWeight - weightNum) < 0.05;
  const atGoal = isMaintain
    ? Math.abs(weightNum - targetWeightNum) <= 1
    : isGainGoal
      ? weightNum >= targetWeightNum
      : weightNum <= targetWeightNum;
  // Moving away from the goal since the start
  const offTrack = !isMaintain && !atGoal && !isNewUser && progressSoFar === 0;
  const shownPct = isMaintain ? (atGoal ? 100 : 0) : atGoal ? 100 : weightProgressPct;
  const showStartLabel = Math.abs(startWeight - weightNum) > 0.05;

  // Macro percentages
  const p = Number(targetProtein) || BIOMETRIC_DEFAULTS.targetProtein;
  const c = Number(targetCarbs) || BIOMETRIC_DEFAULTS.targetCarbs;
  const f = Number(targetFat) || BIOMETRIC_DEFAULTS.targetFat;
  const totalMacroCals = p * 4 + c * 4 + f * 9;
  const pPct = Math.round(((p * 4) / (totalMacroCals || 1)) * 100);
  const cPct = Math.round(((c * 4) / (totalMacroCals || 1)) * 100);
  const fPct = Math.max(0, 100 - pPct - cPct);

  return (
    <View style={styles.container}>
      {/* Horizontal Pill Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScrollContent}
        style={styles.pillsScroll}
        accessibilityRole="tablist"
      >
        <Pressable
          style={({ pressed }) => [
            styles.pill,
            activeMetric === 'bmi' ? styles.pillActive : null,
            pressed ? styles.pressedSubtle : null,
          ]}
          onPress={() => setActiveMetric('bmi')}
          hitSlop={PILL_HIT_SLOP}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeMetric === 'bmi' }}
          accessibilityLabel="View BMI metric"
        >
          <Text style={[styles.pillText, activeMetric === 'bmi' ? styles.pillTextActive : null]}>
            BMI
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.pill,
            activeMetric === 'weight' ? styles.pillActive : null,
            pressed ? styles.pressedSubtle : null,
          ]}
          onPress={() => setActiveMetric('weight')}
          hitSlop={PILL_HIT_SLOP}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeMetric === 'weight' }}
          accessibilityLabel="View Weight journey metric"
        >
          <Text style={[styles.pillText, activeMetric === 'weight' ? styles.pillTextActive : null]}>
            Weight
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.pill,
            activeMetric === 'calories' ? styles.pillActive : null,
            pressed ? styles.pressedSubtle : null,
          ]}
          onPress={() => setActiveMetric('calories')}
          hitSlop={PILL_HIT_SLOP}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeMetric === 'calories' }}
          accessibilityLabel="View Calorie Intake metric"
        >
          <Text
            style={[styles.pillText, activeMetric === 'calories' ? styles.pillTextActive : null]}
          >
            Calorie Intake
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.pill,
            activeMetric === 'steps' ? styles.pillActive : null,
            pressed ? styles.pressedSubtle : null,
          ]}
          onPress={() => setActiveMetric('steps')}
          hitSlop={PILL_HIT_SLOP}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeMetric === 'steps' }}
          accessibilityLabel="View Daily Steps metric"
        >
          <Text style={[styles.pillText, activeMetric === 'steps' ? styles.pillTextActive : null]}>
            Steps
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.pill,
            activeMetric === 'water' ? styles.pillActive : null,
            pressed ? styles.pressedSubtle : null,
          ]}
          onPress={() => setActiveMetric('water')}
          hitSlop={PILL_HIT_SLOP}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeMetric === 'water' }}
          accessibilityLabel="View Hydration metric"
        >
          <Text style={[styles.pillText, activeMetric === 'water' ? styles.pillTextActive : null]}>
            Hydration
          </Text>
        </Pressable>
      </ScrollView>

      {/* Dynamic Active Hero Card */}
      {activeMetric === 'bmi' ? (
        <ClinicalBmiGauge bmi={bmi} bmiStatus={bmiStatus} heightCm={heightCm} />
      ) : null}

      {activeMetric === 'weight' ? (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Weight Journey</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed ? styles.pressedSubtle : null]}
              onPress={onOpenGoalsModal}
              hitSlop={EDIT_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`Edit weight goal, currently ${w(targetWeightNum)} ${weightUnit}`}
            >
              <Text style={styles.goalPillText}>
                Goal {w(targetWeightNum)} {weightUnit}
              </Text>
              <Ionicons name="chevron-forward" size={12} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.weightValueRow}>
            <Text style={styles.bigWeightValue}>{w(weightNum)}</Text>
            <Text style={styles.weightUnit}>{weightUnit}</Text>
          </View>

          {/* Progress Track */}
          <View style={styles.weightTrackWrapper}>
            <View style={styles.weightTrackBg}>
              <View
                style={[
                  styles.weightTrackFill,
                  {
                    width: `${shownPct}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.milestonesRow}>
              {showStartLabel ? (
                <Text style={styles.milestoneText}>
                  Start: {w(startWeight)} {weightUnit}
                </Text>
              ) : (
                <Text style={styles.milestoneText}>{'\u2014'}</Text>
              )}
              <Text style={styles.milestoneProgressText}>
                {isMaintain ? 'Maintaining' : `${shownPct}% complete`}
              </Text>
              <Text style={styles.milestoneText}>
                Goal: {w(targetWeightNum)} {weightUnit}
              </Text>
            </View>
          </View>

          {/* Context row — smart states */}
          <View style={styles.contextSummaryRow}>
            {atGoal ? (
              <>
                <Ionicons name="trophy-outline" size={16} color="#F8D558" />
                <Text style={styles.contextSummaryText}>
                  <Text style={styles.boldText}>
                    {isMaintain ? 'On target.' : 'Goal reached!'}
                  </Text>{' '}
                  Maintaining at{' '}
                  <Text style={styles.boldText}>
                    {w(weightNum)} {weightUnit}
                  </Text>
                </Text>
              </>
            ) : offTrack ? (
              <>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.warningDark} />
                <Text style={styles.contextSummaryText}>
                  <Text style={styles.boldText}>
                    {w(Math.abs(weightNum - startWeight))} {weightUnit}
                  </Text>{' '}
                  {isGainGoal ? 'below' : 'above'} your starting weight {'\u2022'}{' '}
                  <Text style={styles.boldText}>
                    {w(remainingWeight)} {weightUnit}
                  </Text>{' '}
                  to target
                </Text>
              </>
            ) : isNewUser || isMaintain ? (
              <>
                <Ionicons name="scale-outline" size={16} color="#94A3B8" />
                <Text style={styles.contextSummaryText}>
                  {"You're at your starting weight. Log your weight daily to track progress."}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
                <Text style={styles.contextSummaryText}>
                  {isGainGoal ? (
                    <>
                      Gained{' '}
                      <Text style={styles.boldText}>
                        {w(gainedSoFar)} {weightUnit}
                      </Text>{' '}
                      so far {'\u2022'}{' '}
                      <Text style={styles.boldText}>
                        {w(remainingWeight)} {weightUnit}
                      </Text>{' '}
                      to target
                    </>
                  ) : (
                    <>
                      Lost{' '}
                      <Text style={styles.boldText}>
                        {w(lostSoFar)} {weightUnit}
                      </Text>{' '}
                      so far {'\u2022'}{' '}
                      <Text style={styles.boldText}>
                        {w(remainingWeight)} {weightUnit}
                      </Text>{' '}
                      remaining to target
                    </>
                  )}
                </Text>
              </>
            )}
          </View>
        </View>
      ) : null}

      {activeMetric === 'calories' ? (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Daily Calorie Budget</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed ? styles.pressedSubtle : null]}
              onPress={onOpenGoalsModal}
              hitSlop={EDIT_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Edit daily calorie budget"
            >
              <Text style={styles.goalPillText}>Edit Budget</Text>
              <Ionicons name="chevron-forward" size={12} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.weightValueRow}>
            <Text style={styles.bigWeightValue}>{Number(calorieBudget).toLocaleString()}</Text>
            <Text style={styles.weightUnit}>kcal / day</Text>
          </View>

          <View style={styles.macroSplitBar}>
            <View
              style={[styles.macroBarSeg, styles.macroBarProtein, { flex: Math.max(1, pPct) }]}
            />
            <View style={[styles.macroBarSeg, styles.macroBarCarbs, { flex: Math.max(1, cPct) }]} />
            <View style={[styles.macroBarSeg, styles.macroBarFat, { flex: Math.max(1, fPct) }]} />
          </View>

          <View style={styles.macroLegendRow}>
            <View style={styles.legendCol}>
              <View style={[styles.legendDot, styles.legendDotProtein]} />
              <Text style={styles.legendLabel}>Protein</Text>
              <Text style={styles.legendVal}>
                {p}g ({pPct}%)
              </Text>
            </View>
            <View style={styles.legendCol}>
              <View style={[styles.legendDot, styles.legendDotCarbs]} />
              <Text style={styles.legendLabel}>Carbs</Text>
              <Text style={styles.legendVal}>
                {c}g ({cPct}%)
              </Text>
            </View>
            <View style={styles.legendCol}>
              <View style={[styles.legendDot, styles.legendDotFat]} />
              <Text style={styles.legendLabel}>Fat</Text>
              <Text style={styles.legendVal}>
                {f}g ({fPct}%)
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {activeMetric === 'steps' ? (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Daily Movement Target</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed ? styles.pressedSubtle : null]}
              onPress={onOpenGoalsModal}
              hitSlop={EDIT_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Edit daily movement step goal"
            >
              <Text style={styles.goalPillText}>Edit Goal</Text>
              <Ionicons name="chevron-forward" size={12} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.weightValueRow}>
            <Text style={styles.bigWeightValue}>{Number(stepGoal).toLocaleString()}</Text>
            <Text style={styles.weightUnit}>steps</Text>
          </View>

          <View style={styles.contextSummaryRow}>
            <Ionicons name="flame-outline" size={16} color="#F47551" />
            <Text style={styles.contextSummaryText}>
              Estimated daily movement burn:{' '}
              <Text style={styles.boldText}>~{Math.round(Number(stepGoal) * KCAL_PER_STEP)} kcal</Text>
            </Text>
          </View>
        </View>
      ) : null}

      {activeMetric === 'water' ? (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Daily Hydration Target</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed ? styles.pressedSubtle : null]}
              onPress={onOpenGoalsModal}
              hitSlop={EDIT_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Edit daily hydration water target"
            >
              <Text style={styles.goalPillText}>Edit Target</Text>
              <Ionicons name="chevron-forward" size={12} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.weightValueRow}>
            <Text style={styles.bigWeightValue}>{(Number(waterGoal) / 1000).toFixed(1)}</Text>
            <Text style={styles.weightUnit}>L ({waterGoal} ml)</Text>
          </View>

          <View style={styles.contextSummaryRow}>
            <Ionicons name="water-outline" size={16} color="#0284C7" />
            <Text style={styles.contextSummaryText}>
              Promotes optimal metabolic rate, cellular recovery, and digestion.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  pillsScroll: {
    marginBottom: 8,
  },
  pillsScrollContent: {
    gap: 8,
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    elevation: 0,
    shadowOpacity: 0,
  },
  pillText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    includeFontPadding: false,
  },
  pillTextActive: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.primary,
  },
  telemetryCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  goalPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  goalPillText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  weightValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 14,
  },
  bigWeightValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  weightUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  weightTrackWrapper: {
    marginTop: 4,
    marginBottom: 10,
  },
  weightTrackBg: {
    height: 8,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightTrackFill: {
    height: '100%',
    backgroundColor: Colors.weight,
    borderRadius: 4,
  },
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  milestoneText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  milestoneProgressText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.weight,
  },
  milestoneTextActive: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.weight,
  },
  contextSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLow,
  },
  contextSummaryText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  boldText: {
    fontFamily: Fonts.urbanist.semiBold,
    color: '#334155',
  },
  macroSplitBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  macroBarSeg: {
    height: '100%',
  },
  macroLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  legendCol: {
    flex: 1,
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  legendLabel: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  legendVal: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  macroBarProtein: {
    backgroundColor: Colors.protein,
  },
  macroBarCarbs: {
    backgroundColor: Colors.carbs,
  },
  macroBarFat: {
    backgroundColor: Colors.fat,
  },
  legendDotProtein: {
    backgroundColor: Colors.protein,
  },
  legendDotCarbs: {
    backgroundColor: Colors.carbs,
  },
  legendDotFat: {
    backgroundColor: Colors.fat,
  },
});
