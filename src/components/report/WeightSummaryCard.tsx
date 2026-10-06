import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Fonts } from '@/theme/typography';

export interface WeightSummaryData {
  netChangeKg: number | null;
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

export const WeightSummaryCard: React.FC<WeightSummaryCardProps> = ({ data }) => {
  const { currentWeightKg, targetWeightKg, startWeightKg, netChangeKg, unit } = data;
  const isLbs = unit === 'lbs';
  const unitFactor = isLbs ? 2.20462 : 1;

  // Weight lost calculation: startWeight - currentWeight, or from netChange
  let lostOrGainedKg = 0;
  let isGain = false;

  if (startWeightKg !== undefined && startWeightKg !== null && currentWeightKg !== null) {
    const diff = startWeightKg - currentWeightKg;
    if (diff < 0) {
      isGain = true;
      lostOrGainedKg = Math.abs(diff);
    } else {
      lostOrGainedKg = diff;
    }
  } else if (netChangeKg !== null && !isNaN(netChangeKg)) {
    if (netChangeKg > 0) {
      isGain = true;
      lostOrGainedKg = netChangeKg;
    } else {
      lostOrGainedKg = Math.abs(netChangeKg);
    }
  }

  const lostOrGainedDisplay = (lostOrGainedKg * unitFactor).toFixed(1);
  const lostOrGainedLabel = isGain ? 'Weight Gained' : 'Weight Lost';

  const currentWeightDisplay =
    currentWeightKg !== null ? (currentWeightKg * unitFactor).toFixed(1) : '--';

  const goalWeightDisplay =
    targetWeightKg !== undefined && targetWeightKg !== null
      ? (targetWeightKg * unitFactor).toFixed(1)
      : '--';

  return (
    <View style={styles.container}>
      {/* 1. Weight Lost / Gained */}
      <View style={styles.metricCard}>
        <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
          {lostOrGainedDisplay} {unit}
        </Text>
        <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit>
          {lostOrGainedLabel}
        </Text>
      </View>

      {/* 2. Current Weight */}
      <View style={styles.metricCard}>
        <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
          {currentWeightDisplay} {unit}
        </Text>
        <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit>
          Current Weight
        </Text>
      </View>

      {/* 3. Goal Weight */}
      <View style={styles.metricCard}>
        <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
          {goalWeightDisplay} {unit}
        </Text>
        <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit>
          Goal Weight
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  metricValue: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    lineHeight: 24,
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  metricLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    letterSpacing: -0.1,
  },
});
