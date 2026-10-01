import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

export interface WeightSummaryData {
  netChangeKg: number | null; // delta from start of period to end
  currentWeightKg: number | null;
  avgWeightKg: number | null;
  targetWeightKg?: number;
  startWeightKg?: number;
  unit: 'kg' | 'lbs';
}

interface WeightSummaryCardProps {
  data: WeightSummaryData;
  activeColor?: string;
}

export const WeightSummaryCard: React.FC<WeightSummaryCardProps> = ({
  data,
  activeColor = Colors.weight,
}) => {
  const { netChangeKg, currentWeightKg, avgWeightKg, targetWeightKg, startWeightKg, unit } = data;
  const isLbs = unit === 'lbs';
  const unitFactor = isLbs ? 2.20462 : 1;

  // Format weight helper
  const formatWeight = (valKg: number | null | undefined): string => {
    if (valKg === null || valKg === undefined || isNaN(valKg)) return '--';
    return (valKg * unitFactor).toFixed(1);
  };

  // Directional delta styling
  const isGoalWeightLoss = startWeightKg && targetWeightKg ? targetWeightKg < startWeightKg : true;
  const hasChange = netChangeKg !== null && !isNaN(netChangeKg);
  const changeVal = hasChange ? netChangeKg! * unitFactor : 0;
  const formattedChange = hasChange
    ? (changeVal > 0 ? `+${changeVal.toFixed(1)}` : changeVal.toFixed(1))
    : '--';

  const isFavorable = isGoalWeightLoss ? changeVal < 0 : changeVal > 0;
  const changeColor = hasChange
    ? changeVal === 0
      ? '#64748B'
      : isFavorable
      ? '#10B981'
      : '#FF3B5C'
    : '#94A3B8';

  const changeIcon = hasChange && changeVal !== 0
    ? changeVal < 0
      ? 'arrow-down'
      : 'arrow-up'
    : null;

  // Goal distance
  const goalGapKg = currentWeightKg !== null && targetWeightKg !== undefined
    ? Math.abs(currentWeightKg - targetWeightKg)
    : null;
  const formattedGoalGap = goalGapKg !== null
    ? `${(goalGapKg * unitFactor).toFixed(1)} ${unit} to goal`
    : targetWeightKg !== undefined
    ? `Goal: ${(targetWeightKg * unitFactor).toFixed(1)} ${unit}`
    : 'No goal set';

  const isGoalReached = goalGapKg !== null && goalGapKg < 0.1;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="sparkles-outline" size={16} color={activeColor} style={{ marginRight: 6 }} />
          <Text style={styles.cardTitle}>Period Overview</Text>
        </View>
        {isGoalReached ? (
          <View style={styles.goalAchievedBadge}>
            <Text style={styles.goalAchievedText}>🎉 Goal Reached!</Text>
          </View>
        ) : (
          <View style={styles.goalBadge}>
            <Ionicons name="flag-outline" size={12} color={activeColor} style={{ marginRight: 4 }} />
            <Text style={styles.goalHintText}>{formattedGoalGap}</Text>
          </View>
        )}
      </View>
      <View style={styles.headerDivider} />

      {/* 3-Pod Grid */}
      <View style={styles.podsGrid}>
        {/* Pod 1: Net Change */}
        <View style={styles.pod}>
          <Text style={styles.podLabel}>NET CHANGE</Text>
          <View style={styles.valueRow}>
            {changeIcon && (
              <Ionicons
                name={changeIcon}
                size={14}
                color={changeColor}
                style={{ marginRight: 2, marginTop: 2 }}
              />
            )}
            <Text style={[styles.podValue, { color: changeColor }]}>
              {formattedChange}
            </Text>
            {hasChange && <Text style={styles.podUnit}>{unit}</Text>}
          </View>
          <Text style={styles.podSubLabel}>across this period</Text>
        </View>

        <View style={styles.verticalDivider} />

        {/* Pod 2: Current / Latest */}
        <View style={styles.pod}>
          <Text style={styles.podLabel}>LATEST</Text>
          <View style={styles.valueRow}>
            <Text style={styles.podValue}>{formatWeight(currentWeightKg)}</Text>
            {currentWeightKg !== null && <Text style={styles.podUnit}>{unit}</Text>}
          </View>
          <Text style={styles.podSubLabel}>
            {currentWeightKg !== null ? 'recorded weigh-in' : 'no entry in period'}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        {/* Pod 3: Period Average */}
        <View style={styles.pod}>
          <Text style={styles.podLabel}>AVERAGE</Text>
          <View style={styles.valueRow}>
            <Text style={styles.podValue}>{formatWeight(avgWeightKg)}</Text>
            {avgWeightKg !== null && <Text style={styles.podUnit}>{unit}</Text>}
          </View>
          <Text style={styles.podSubLabel}>period average</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  goalHintText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
  goalAchievedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  goalAchievedText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#059669',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  podsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pod: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  verticalDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#F1F5F9',
  },
  podLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  podValue: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  podUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    marginLeft: 3,
  },
  podSubLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
});
