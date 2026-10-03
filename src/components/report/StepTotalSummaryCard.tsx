import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '@/theme/typography';
import {
  FootstepsOutlineSvg,
  ClockOutlineSvg,
  FlameOutlineSvg,
  LocationPinOutlineSvg,
} from '@/components/steps/StepOutlineIcons';

export interface StepTotalSummaryCardProps {
  totalSteps: number;
  totalDurationMinutes?: number;
  totalCalories?: number;
  totalDistanceKm?: number;
  subtitle?: string;
}

export const StepTotalSummaryCard: React.FC<StepTotalSummaryCardProps> = ({
  totalSteps,
  totalDurationMinutes,
  totalCalories,
  totalDistanceKm,
  subtitle = 'Total steps all the time',
}) => {
  // Derive metrics if not explicitly passed
  const duration = typeof totalDurationMinutes === 'number'
    ? totalDurationMinutes
    : Math.round(totalSteps / 100);

  const calories = typeof totalCalories === 'number'
    ? totalCalories
    : Math.round(totalSteps * 0.04);

  const distance = typeof totalDistanceKm === 'number'
    ? totalDistanceKm
    : Math.round(totalSteps * 0.000762 * 100) / 100;

  const formatDuration = (mins: number) => {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  return (
    <View style={styles.cardContainer}>
      {/* 1. Top Section: Purple Dual Footsteps, Big Number, Subtitle */}
      <View style={styles.topSection}>
        <View style={styles.topNumberRow}>
          <FootstepsOutlineSvg size={30} color="#8B5CF6" strokeWidth={1.8} />
          <Text style={styles.bigNumberText}>{totalSteps.toLocaleString('en-US')}</Text>
        </View>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </View>

      {/* 2. Horizontal Hairline Divider */}
      <View style={styles.horizontalDivider} />

      {/* 3. Bottom 3-Column Metrics Section */}
      <View style={styles.bottomMetricsRow}>
        {/* Column 1: Time */}
        <View style={styles.metricCol}>
          <ClockOutlineSvg size={24} color="#F97316" strokeWidth={1.8} />
          <Text style={styles.metricValueText}>{formatDuration(duration)}</Text>
          <Text style={styles.metricLabelText}>time</Text>
        </View>

        {/* Vertical Hairline Divider */}
        <View style={styles.verticalDivider} />

        {/* Column 2: Active Calories */}
        <View style={styles.metricCol}>
          <FlameOutlineSvg size={24} color="#EF4444" strokeWidth={1.8} />
          <Text style={styles.metricValueText}>{calories.toLocaleString('en-US')}</Text>
          <Text style={styles.metricLabelText}>kcal</Text>
        </View>

        {/* Vertical Hairline Divider */}
        <View style={styles.verticalDivider} />

        {/* Column 3: Distance */}
        <View style={styles.metricCol}>
          <LocationPinOutlineSvg size={24} color="#22C55E" strokeWidth={1.8} />
          <Text style={styles.metricValueText}>{distance.toFixed(2)}</Text>
          <Text style={styles.metricLabelText}>km</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bigNumberText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 34,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 18,
    marginHorizontal: 4,
  },
  bottomMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValueText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 19,
    color: '#0F172A',
    letterSpacing: -0.3,
    marginTop: 8,
    marginBottom: 2,
  },
  metricLabelText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    color: '#94A3B8',
  },
  verticalDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
  },
});

export default StepTotalSummaryCard;
