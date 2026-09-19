import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ClinicalBmiGauge } from './ClinicalBmiGauge';

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
  onOpenGoalsModal: () => void;
}

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
  onOpenGoalsModal,
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricTab>('bmi');

  // Weight calculations
  const totalToLose = Math.max(0.1, Math.abs(startWeight - targetWeightNum));
  const lostSoFar = Math.max(0, startWeight - weightNum);
  const remainingWeight = Math.max(0, weightNum - targetWeightNum);
  const weightProgressPct = Math.min(100, Math.round((lostSoFar / totalToLose) * 100));

  // Macro percentages
  const p = Number(targetProtein) || 90;
  const c = Number(targetCarbs) || 160;
  const f = Number(targetFat) || 50;
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
      >
        <Pressable
          style={[styles.pill, activeMetric === 'bmi' && styles.pillActive]}
          onPress={() => setActiveMetric('bmi')}
        >
          <Text style={[styles.pillText, activeMetric === 'bmi' && styles.pillTextActive]}>
            BMI
          </Text>
        </Pressable>

        <Pressable
          style={[styles.pill, activeMetric === 'weight' && styles.pillActive]}
          onPress={() => setActiveMetric('weight')}
        >
          <Text style={[styles.pillText, activeMetric === 'weight' && styles.pillTextActive]}>
            Weight
          </Text>
        </Pressable>

        <Pressable
          style={[styles.pill, activeMetric === 'calories' && styles.pillActive]}
          onPress={() => setActiveMetric('calories')}
        >
          <Text style={[styles.pillText, activeMetric === 'calories' && styles.pillTextActive]}>
            Calorie Intake
          </Text>
        </Pressable>

        <Pressable
          style={[styles.pill, activeMetric === 'steps' && styles.pillActive]}
          onPress={() => setActiveMetric('steps')}
        >
          <Text style={[styles.pillText, activeMetric === 'steps' && styles.pillTextActive]}>
            Steps
          </Text>
        </Pressable>

        <Pressable
          style={[styles.pill, activeMetric === 'water' && styles.pillActive]}
          onPress={() => setActiveMetric('water')}
        >
          <Text style={[styles.pillText, activeMetric === 'water' && styles.pillTextActive]}>
            Hydration
          </Text>
        </Pressable>
      </ScrollView>

      {/* Dynamic Active Hero Card */}
      {activeMetric === 'bmi' && (
        <ClinicalBmiGauge
          bmi={bmi}
          bmiStatus={bmiStatus}
          heightCm={heightCm}
        />
      )}

      {activeMetric === 'weight' && (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Weight Journey</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed && styles.pressedSubtle]}
              onPress={onOpenGoalsModal}
            >
              <Text style={styles.goalPillText}>Goal {targetWeightNum} kg</Text>
              <Ionicons name="chevron-forward" size={12} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.weightValueRow}>
            <Text style={styles.bigWeightValue}>{weightNum}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          {/* Milestone Track */}
          <View style={styles.weightTrackWrapper}>
            <View style={styles.weightTrackBg}>
              <View style={[styles.weightTrackFill, { width: `${weightProgressPct}%` }]} />
            </View>
            <View style={styles.milestonesRow}>
              <Text style={styles.milestoneText}>Start: {startWeight} kg</Text>
              <Text style={styles.milestoneTextActive}>Current: {weightNum} kg</Text>
              <Text style={styles.milestoneText}>Goal: {targetWeightNum} kg</Text>
            </View>
          </View>

          <View style={styles.contextSummaryRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
            <Text style={styles.contextSummaryText}>
              Lost <Text style={styles.boldText}>{lostSoFar.toFixed(1)} kg</Text> so far •{' '}
              <Text style={styles.boldText}>{remainingWeight.toFixed(1)} kg</Text> remaining to target
            </Text>
          </View>
        </View>
      )}

      {activeMetric === 'calories' && (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Daily Calorie Budget</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed && styles.pressedSubtle]}
              onPress={onOpenGoalsModal}
            >
              <Text style={styles.goalPillText}>Edit Budget</Text>
              <Ionicons name="chevron-forward" size={12} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.weightValueRow}>
            <Text style={styles.bigWeightValue}>{calorieBudget}</Text>
            <Text style={styles.weightUnit}>kcal / day</Text>
          </View>

          <View style={styles.macroSplitBar}>
            <View style={[styles.macroBarSeg, { flex: Math.max(1, pPct), backgroundColor: '#10B981' }]} />
            <View style={[styles.macroBarSeg, { flex: Math.max(1, cPct), backgroundColor: '#F59E0B' }]} />
            <View style={[styles.macroBarSeg, { flex: Math.max(1, fPct), backgroundColor: '#F47551' }]} />
          </View>

          <View style={styles.macroLegendRow}>
            <View style={styles.legendCol}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendLabel}>Protein</Text>
              <Text style={styles.legendVal}>{p}g ({pPct}%)</Text>
            </View>
            <View style={styles.legendCol}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendLabel}>Carbs</Text>
              <Text style={styles.legendVal}>{c}g ({cPct}%)</Text>
            </View>
            <View style={styles.legendCol}>
              <View style={[styles.legendDot, { backgroundColor: '#F47551' }]} />
              <Text style={styles.legendLabel}>Fat</Text>
              <Text style={styles.legendVal}>{f}g ({fPct}%)</Text>
            </View>
          </View>
        </View>
      )}

      {activeMetric === 'steps' && (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Daily Movement Target</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed && styles.pressedSubtle]}
              onPress={onOpenGoalsModal}
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
            <Ionicons name="flame-outline" size={16} color="#EA580C" />
            <Text style={styles.contextSummaryText}>
              Estimated daily movement burn: <Text style={styles.boldText}>~{Math.round(Number(stepGoal) * 0.04)} kcal</Text>
            </Text>
          </View>
        </View>
      )}

      {activeMetric === 'water' && (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Daily Hydration Target</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed && styles.pressedSubtle]}
              onPress={onOpenGoalsModal}
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
            <Ionicons name="water-outline" size={16} color="#2563EB" />
            <Text style={styles.contextSummaryText}>
              Promotes optimal metabolic rate, cellular recovery, and digestion.
            </Text>
          </View>
        </View>
      )}

      {/* Always Show Weight as Secondary Anchor Card if BMI is active (matching reference design) */}
      {activeMetric === 'bmi' && (
        <View style={styles.telemetryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Weight</Text>
            <Pressable
              style={({ pressed }) => [styles.goalPillBtn, pressed && styles.pressedSubtle]}
              onPress={onOpenGoalsModal}
            >
              <Text style={styles.goalPillText}>Goal {targetWeightNum} kg</Text>
              <Ionicons name="chevron-forward" size={12} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.weightValueRow}>
            <Text style={styles.bigWeightValue}>{weightNum}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          <View style={styles.weightTrackWrapper}>
            <View style={styles.weightTrackBg}>
              <View style={[styles.weightTrackFill, { width: `${weightProgressPct}%` }]} />
            </View>
            <View style={styles.milestonesRow}>
              <Text style={styles.milestoneText}>Start: {startWeight} kg</Text>
              <Text style={styles.milestoneTextActive}>Current: {weightNum} kg</Text>
              <Text style={styles.milestoneText}>Goal: {targetWeightNum} kg</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  pillsScroll: {
    marginBottom: 14,
  },
  pillsScrollContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
  pillTextActive: {
    fontFamily: Fonts.poppins.bold,
    color: '#0F172A',
  },
  telemetryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  goalPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  goalPillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
  pressedSubtle: {
    opacity: 0.75,
  },
  weightValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 14,
  },
  bigWeightValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  weightUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#64748B',
  },
  weightTrackWrapper: {
    marginTop: 4,
    marginBottom: 10,
  },
  weightTrackBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightTrackFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  milestoneText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  milestoneTextActive: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10.5,
    color: Colors.primary,
  },
  contextSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  contextSummaryText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    flex: 1,
  },
  boldText: {
    fontFamily: Fonts.poppins.semiBold,
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
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  legendVal: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#0F172A',
    marginTop: 1,
  },
});
