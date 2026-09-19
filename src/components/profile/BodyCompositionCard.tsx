import React from 'react';
import { StyleSheet, View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

interface BodyCompositionCardProps {
  startWeight: number;
  weightNum: number;
  targetWeightNum: number;
  currentWeight: string;
  setCurrentWeight: (v: string) => void;
  targetWeight: string;
  setTargetWeight: (v: string) => void;
  userHeightCm: string;
  setUserHeightCm: (v: string) => void;
  weightProgressPct: number;
  lostSoFar: number;
  bmi: string;
  bmiStatus: { label: string; color: string };
  bmrEst: number;
  tdeeEst: number;
  calorieBudget: string;
  currentBudget: number;
}

export const BodyCompositionCard: React.FC<BodyCompositionCardProps> = ({
  startWeight,
  weightNum,
  targetWeightNum,
  currentWeight,
  setCurrentWeight,
  targetWeight,
  setTargetWeight,
  userHeightCm,
  setUserHeightCm,
  weightProgressPct,
  lostSoFar,
  bmi,
  bmiStatus,
  bmrEst,
  tdeeEst,
  calorieBudget,
  currentBudget,
}) => {
  const getBmiPillStyle = (label?: string) => {
    const l = (label || '').toLowerCase();
    if (l.includes('under')) return styles.bmiPillUnder;
    if (l.includes('over')) return styles.bmiPillOver;
    if (l.includes('obese')) return styles.bmiPillObese;
    return styles.bmiPillNormal;
  };

  const getBmiTextStyle = (label?: string) => {
    const l = (label || '').toLowerCase();
    if (l.includes('under')) return styles.bmiTextUnder;
    if (l.includes('over')) return styles.bmiTextOver;
    if (l.includes('obese')) return styles.bmiTextObese;
    return styles.bmiTextNormal;
  };

  return (
    <View style={styles.container}>
      {/* 1. Weight Progress Journey Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Weight Journey & Timeline</Text>
            <Text style={styles.cardSubtitle}>Progress from starting weight to target</Text>
          </View>
          <View style={styles.progressPctBadge}>
            <Text style={styles.progressPctBadgeText}>{weightProgressPct}% Done</Text>
          </View>
        </View>

        {/* Progress Track */}
        <View style={styles.weightTrackContainer}>
          <View style={styles.weightTrackBackground}>
            <View style={[styles.weightTrackFill, { width: `${weightProgressPct}%` }]} />
          </View>
          <View style={styles.weightTrackMilestones}>
            <Text style={styles.milestoneText}>Start: {startWeight} kg</Text>
            <Text style={styles.milestoneTextHighlight}>Current: {weightNum} kg</Text>
            <Text style={styles.milestoneText}>Goal: {targetWeightNum} kg</Text>
          </View>
        </View>

        <View style={styles.weightSummaryPill}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.weightSummaryText}>
            Lost <Text style={styles.boldText}>{lostSoFar.toFixed(1)} kg</Text> so far •{' '}
            <Text style={styles.boldText}>{(weightNum - targetWeightNum).toFixed(1)} kg remaining</Text>
          </Text>
        </View>

        {/* Weight Inputs */}
        <View style={styles.grid2}>
          <View style={styles.flex1}>
            <Text style={styles.fieldLabel}>Current Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={currentWeight}
              onChangeText={setCurrentWeight}
              accessibilityLabel="Current weight in kilograms"
            />
          </View>

          <View style={styles.flex1}>
            <Text style={styles.fieldLabel}>Target Goal Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
              accessibilityLabel="Target goal weight in kilograms"
            />
          </View>
        </View>
      </View>

      {/* 2. BMI Health Gauge Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Body Mass Index (BMI)</Text>
            <Text style={styles.cardSubtitle}>Clinical indicator of healthy body composition</Text>
          </View>
          <View style={[styles.bmiPill, getBmiPillStyle(bmiStatus.label)]}>
            <Text style={[styles.bmiPillText, getBmiTextStyle(bmiStatus.label)]}>{bmiStatus.label}</Text>
          </View>
        </View>

        {/* Large BMI Number */}
        <View style={styles.bmiNumberRow}>
          <Text style={[styles.bmiBigNumber, getBmiTextStyle(bmiStatus.label)]}>{bmi}</Text>
          <Text style={styles.bmiUnit}>kg/m²</Text>
        </View>

        {/* 4-Color Category Bar */}
        <View style={styles.bmiBarWrapper}>
          <View style={[styles.bmiBarSeg, styles.bmiBarSegUnder]} />
          <View style={[styles.bmiBarSeg, styles.bmiBarSegNormal]} />
          <View style={[styles.bmiBarSeg, styles.bmiBarSegOver]} />
          <View style={[styles.bmiBarSeg, styles.bmiBarSegObese]} />
        </View>
        <View style={styles.bmiLabelsRow}>
          <Text style={styles.bmiRangeText}>&lt;18.5 Under</Text>
          <Text style={[styles.bmiRangeText, styles.bmiNormalText]}>18.5–24.9 Normal</Text>
          <Text style={styles.bmiRangeText}>25–29.9 Over</Text>
          <Text style={styles.bmiRangeText}>30+ Obese</Text>
        </View>

        {/* Height Input */}
        <View style={styles.heightFieldGroup}>
          <Text style={styles.fieldLabel}>Your Height (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={userHeightCm}
            onChangeText={setUserHeightCm}
            accessibilityLabel="Height in centimeters"
          />
        </View>
      </View>

      {/* 3. Metabolic Engine Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Metabolic Energy Engine</Text>
        <Text style={styles.cardSubtitle}>Scientific calculation of your daily calorie burn</Text>

        <View style={styles.metabolicRow}>
          <View style={styles.metabolicBox}>
            <Text style={styles.metabolicVal}>
              {bmrEst} <Text style={styles.metabolicUnit}>kcal</Text>
            </Text>
            <Text style={styles.metabolicLabel}>Basal Metabolic Rate</Text>
            <Text style={styles.metabolicDesc}>Burned passively at complete rest</Text>
          </View>

          <View style={styles.metabolicBox}>
            <Text style={[styles.metabolicVal, styles.metabolicValPrimary]}>
              {tdeeEst} <Text style={styles.metabolicUnit}>kcal</Text>
            </Text>
            <Text style={styles.metabolicLabel}>Total Daily Burn (TDEE)</Text>
            <Text style={styles.metabolicDesc}>With your normal daily movement</Text>
          </View>
        </View>

        <View style={styles.deficitBanner}>
          <Ionicons name="trending-down" size={16} color="#EA580C" />
          <Text style={styles.deficitBannerText}>
            Your <Text style={styles.boldText}>{calorieBudget} kcal</Text> budget produces a{' '}
            <Text style={[styles.boldText, styles.deficitGreen]}>
              {Math.max(0, tdeeEst - currentBudget)} kcal daily deficit
            </Text>{' '}
            (~0.5 kg fat loss/week).
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 16,
    color: '#0F172A',
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressPctBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  progressPctBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  weightTrackContainer: {
    marginVertical: 10,
  },
  weightTrackBackground: {
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
  weightTrackMilestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  milestoneText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  milestoneTextHighlight: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  weightSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginVertical: 12,
  },
  weightSummaryText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#065F46',
  },
  boldText: {
    fontFamily: Fonts.poppins.semiBold,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  flex1: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    fontFamily: Fonts.poppins.medium,
    fontSize: 14,
    color: '#0F172A',
  },
  bmiPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bmiPillUnder: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  bmiPillNormal: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  bmiPillOver: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  bmiPillObese: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  bmiPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
  },
  bmiTextUnder: {
    color: '#3B82F6',
  },
  bmiTextNormal: {
    color: '#10B981',
  },
  bmiTextOver: {
    color: '#F59E0B',
  },
  bmiTextObese: {
    color: '#EF4444',
  },
  bmiNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 6,
  },
  bmiBigNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 34,
  },
  bmiUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
  },
  bmiBarWrapper: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 6,
  },
  bmiBarSeg: {
    height: '100%',
  },
  bmiBarSegUnder: {
    backgroundColor: '#3B82F6',
    flex: 18.5,
  },
  bmiBarSegNormal: {
    backgroundColor: '#10B981',
    flex: 6.4,
  },
  bmiBarSegOver: {
    backgroundColor: '#F59E0B',
    flex: 5,
  },
  bmiBarSegObese: {
    backgroundColor: '#EF4444',
    flex: 10,
  },
  bmiLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bmiRangeText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
  },
  bmiNormalText: {
    color: '#10B981',
    fontFamily: Fonts.poppins.semiBold,
  },
  heightFieldGroup: {
    marginTop: 10,
  },
  metabolicRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 14,
  },
  metabolicBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metabolicVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  metabolicValPrimary: {
    color: Colors.primary,
  },
  metabolicUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  metabolicLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#334155',
    marginTop: 4,
  },
  metabolicDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  deficitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  deficitBannerText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#9A3412',
    flex: 1,
  },
  deficitGreen: {
    color: '#10B981',
  },
});
