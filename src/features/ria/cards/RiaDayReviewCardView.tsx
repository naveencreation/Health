/**
 * RiaDayReviewCardView.tsx
 *
 * Double-bezel Action Card for Ria's Daily Nutrition Review.
 * Displays progress bars for calories and macros, paired with
 * celebratory Win ✨ and actionable Focus 🎯 sub-cards per RIA_Chat.md.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { DayReviewCardData } from '@/services/ai/types/ai.types';

export interface RiaDayReviewCardViewProps {
  data: DayReviewCardData;
  testID?: string;
}

export const RiaDayReviewCardView: React.FC<RiaDayReviewCardViewProps> = ({
  data,
  testID = 'ria-day-review-card',
}) => {
  const calPercent = Math.min(100, Math.round((data.caloriesConsumed / Math.max(1, data.calorieTarget)) * 100));
  const protPercent = Math.min(100, Math.round((data.proteinConsumed / Math.max(1, data.proteinTarget)) * 100));
  const carbsPercent = Math.min(100, Math.round((data.carbsConsumed / Math.max(1, data.carbsTarget)) * 100));
  const fatPercent = Math.min(100, Math.round((data.fatConsumed / Math.max(1, data.fatTarget)) * 100));

  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={styles.sparkleCircle}>
              <Ionicons name="sparkles" size={16} color="#D97706" />
            </View>
            <View>
              <Text style={styles.titleText}>Day in Review</Text>
              <Text style={styles.subtitleText}>Daily nutrition breakdown & coaching</Text>
            </View>
          </View>
          <View style={styles.calBadge}>
            <Text style={styles.calBadgeText}>{data.caloriesConsumed} / {data.calorieTarget} kcal</Text>
          </View>
        </View>

        {/* Calorie Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${calPercent}%` }]} />
          </View>
          <Text style={styles.percentText}>{calPercent}% of daily budget</Text>
        </View>

        {/* Macro Pills Row */}
        <View style={styles.macroPillsRow}>
          <View style={[styles.macroCard, styles.proteinCard]}>
            <Text style={styles.macroValueText}>{data.proteinConsumed}g</Text>
            <Text style={styles.macroLabelText}>Protein ({protPercent}%)</Text>
          </View>

          <View style={[styles.macroCard, styles.carbsCard]}>
            <Text style={styles.macroValueText}>{data.carbsConsumed}g</Text>
            <Text style={styles.macroLabelText}>Carbs ({carbsPercent}%)</Text>
          </View>

          <View style={[styles.macroCard, styles.fatCard]}>
            <Text style={styles.macroValueText}>{data.fatConsumed}g</Text>
            <Text style={styles.macroLabelText}>Fat ({fatPercent}%)</Text>
          </View>
        </View>

        {/* Win Card */}
        <View style={styles.winCard}>
          <View style={styles.subCardHeader}>
            <Ionicons name="trophy-outline" size={14} color="#16A34A" />
            <Text style={styles.winHeaderTitle}>Today's Win</Text>
          </View>
          <Text style={styles.subCardBodyText}>{data.win}</Text>
        </View>

        {/* Focus Card */}
        <View style={styles.focusCard}>
          <View style={styles.subCardHeader}>
            <Ionicons name="compass-outline" size={14} color="#EA580C" />
            <Text style={styles.focusHeaderTitle}>Next Focus</Text>
          </View>
          <Text style={styles.subCardBodyText}>{data.focus}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginVertical: 6,
    width: '100%',
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  subtitleText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  calBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  calBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#92400E',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D97706',
    borderRadius: 3,
  },
  percentText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'right',
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  macroCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  proteinCard: {
    backgroundColor: '#EFF6FF',
  },
  carbsCard: {
    backgroundColor: '#F0FDF4',
  },
  fatCard: {
    backgroundColor: '#FFF7ED',
  },
  macroValueText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  macroLabelText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  winCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  focusCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 12,
    padding: 10,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  winHeaderTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#16A34A',
  },
  focusHeaderTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#EA580C',
  },
  subCardBodyText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
});
