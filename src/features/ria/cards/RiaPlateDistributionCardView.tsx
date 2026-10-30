/**
 * RiaPlateDistributionCardView.tsx
 *
 * Spec-driven visual balanced plate distribution card for Ria AI.
 * Displays proportions for Greens, Protein, Carbs, and Healthy Fats,
 * with balance scoring and actionable nutritional coaching.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { PlateDistributionCardData } from '@/services/ai/types/ai.types';

export interface RiaPlateDistributionCardViewProps {
  data: PlateDistributionCardData;
  testID?: string;
}

export const RiaPlateDistributionCardView: React.FC<RiaPlateDistributionCardViewProps> = ({
  data,
  testID = 'ria-plate-distribution-card',
}) => {
  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return { label: 'Optimal Balance', color: '#166534', bg: '#DCFCE7' };
    }
    if (score >= 60) {
      return { label: 'Good Split', color: '#92400E', bg: '#FEF3C7' };
    }
    return { label: 'Needs Adjustment', color: '#991B1B', bg: '#FEE2E2' };
  };

  const badge = getScoreBadge(data.balanceScore);

  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={styles.iconCircle}>
              <Ionicons name="restaurant-outline" size={16} color="#059669" />
            </View>
            <View>
              <Text style={styles.titleText}>{data.mealName || 'Balanced Meal Plate'}</Text>
              <Text style={styles.subtitleText}>
                {data.slot ? `${data.slot.toUpperCase()} · ` : ''}
                {data.totalKcal} kcal
              </Text>
            </View>
          </View>

          <View style={[styles.scoreBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.scoreBadgeText, { color: badge.color }]}>
              {data.balanceScore}/100 · {badge.label}
            </Text>
          </View>
        </View>

        {/* 4 Quadrants Plate Layout */}
        <View style={styles.plateGrid}>
          {/* Veggies */}
          <View style={[styles.plateQuadrant, styles.veggieQuadrant]}>
            <View style={styles.quadrantHeader}>
              <Text style={styles.quadrantEmoji}>🥦</Text>
              <Text style={styles.quadrantPct}>{data.veggiesPct}%</Text>
            </View>
            <Text style={styles.quadrantTitle}>Greens & Veggies</Text>
            <Text style={styles.quadrantHint}>Fiber & Micronutrients</Text>
          </View>

          {/* Protein */}
          <View style={[styles.plateQuadrant, styles.proteinQuadrant]}>
            <View style={styles.quadrantHeader}>
              <Text style={styles.quadrantEmoji}>🍗</Text>
              <Text style={styles.quadrantPct}>{data.proteinPct}%</Text>
            </View>
            <Text style={styles.quadrantTitle}>Lean Protein</Text>
            <Text style={styles.quadrantHint}>Muscle & Satiety</Text>
          </View>

          {/* Carbs */}
          <View style={[styles.plateQuadrant, styles.carbsQuadrant]}>
            <View style={styles.quadrantHeader}>
              <Text style={styles.quadrantEmoji}>🍚</Text>
              <Text style={styles.quadrantPct}>{data.carbsPct}%</Text>
            </View>
            <Text style={styles.quadrantTitle}>Complex Carbs</Text>
            <Text style={styles.quadrantHint}>Steady Glucose Energy</Text>
          </View>

          {/* Healthy Fats */}
          <View style={[styles.plateQuadrant, styles.fatsQuadrant]}>
            <View style={styles.quadrantHeader}>
              <Text style={styles.quadrantEmoji}>🥑</Text>
              <Text style={styles.quadrantPct}>{data.fatsPct}%</Text>
            </View>
            <Text style={styles.quadrantTitle}>Healthy Fats</Text>
            <Text style={styles.quadrantHint}>Hormone & Absorption</Text>
          </View>
        </View>

        {/* Coaching Recommendation */}
        {data.recommendation ? (
          <View style={styles.recommendationBox}>
            <View style={styles.recHeader}>
              <Ionicons name="bulb-outline" size={13} color="#059669" />
              <Text style={styles.recTitle}>Plate Guidance</Text>
            </View>
            <Text style={styles.recText}>{data.recommendation}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    padding: 3,
    marginVertical: 8,
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  titleText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  subtitleText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scoreBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
  },
  plateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  plateQuadrant: {
    width: '48.5%',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  veggieQuadrant: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  proteinQuadrant: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  carbsQuadrant: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FEF08A',
  },
  fatsQuadrant: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  quadrantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quadrantEmoji: {
    fontSize: 16,
  },
  quadrantPct: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  quadrantTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#1E293B',
  },
  quadrantHint: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  recommendationBox: {
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  recTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
});
