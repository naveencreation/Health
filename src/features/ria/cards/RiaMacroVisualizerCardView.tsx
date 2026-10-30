/**
 * RiaMacroVisualizerCardView.tsx
 *
 * Spec-driven visual macro balance card for Ria AI.
 * Renders a segmented macro proportion bar, metric pods,
 * and context insight grounded in Calorify brand tokens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { VisualMacroSplitCardData } from '@/services/ai/types/ai.types';

export interface RiaMacroVisualizerCardViewProps {
  data: VisualMacroSplitCardData;
  testID?: string;
}

export const RiaMacroVisualizerCardView: React.FC<RiaMacroVisualizerCardViewProps> = ({
  data,
  testID = 'ria-macro-visualizer-card',
}) => {
  const proteinKcal = data.proteinGrams * 4;
  const carbsKcal = data.carbsGrams * 4;
  const fatKcal = data.fatGrams * 9;
  const computedTotalKcal = proteinKcal + carbsKcal + fatKcal;
  const effectiveTotalKcal = Math.max(1, data.totalKcal || computedTotalKcal);

  const protPct = Math.round((proteinKcal / effectiveTotalKcal) * 100);
  const carbsPct = Math.round((carbsKcal / effectiveTotalKcal) * 100);
  const fatPct = Math.max(0, 100 - (protPct + carbsPct));

  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={styles.iconCircle}>
              <Ionicons name="pie-chart-outline" size={16} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.titleText}>{data.title || 'Macro Balance & Split'}</Text>
              <Text style={styles.subtitleText}>
                {data.subtitle || 'Thermodynamic calorie & nutrient split'}
              </Text>
            </View>
          </View>
          <View style={styles.calBadge}>
            <Text style={styles.calBadgeText}>
              {data.totalKcal}
              {data.targetKcal ? ` / ${data.targetKcal}` : ''} kcal
            </Text>
          </View>
        </View>

        {/* Segmented Macro Bar */}
        <View style={styles.segmentedBarContainer}>
          <View style={styles.segmentedBarTrack}>
            <View
              style={[
                styles.segment,
                { width: `${Math.max(4, protPct)}%`, backgroundColor: Colors.protein },
              ]}
            />
            <View
              style={[
                styles.segment,
                { width: `${Math.max(4, carbsPct)}%`, backgroundColor: Colors.carbs },
              ]}
            />
            <View
              style={[
                styles.segment,
                { width: `${Math.max(4, fatPct)}%`, backgroundColor: Colors.fat },
              ]}
            />
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.protein }]} />
              <Text style={styles.legendText}>Protein {protPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.carbs }]} />
              <Text style={styles.legendText}>Carbs {carbsPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.fat }]} />
              <Text style={styles.legendText}>Fat {fatPct}%</Text>
            </View>
          </View>
        </View>

        {/* 3 Macro Stat Pods */}
        <View style={styles.macroPillsRow}>
          <View style={[styles.macroCard, styles.proteinCard]}>
            <Text style={[styles.macroValueText, { color: Colors.proteinDark }]}>
              {data.proteinGrams}g
            </Text>
            <Text style={styles.macroLabelText}>
              Protein {data.targetProteinGrams ? `· ${data.targetProteinGrams}g goal` : ''}
            </Text>
          </View>

          <View style={[styles.macroCard, styles.carbsCard]}>
            <Text style={[styles.macroValueText, { color: Colors.carbsDark }]}>
              {data.carbsGrams}g
            </Text>
            <Text style={styles.macroLabelText}>
              Carbs {data.targetCarbsGrams ? `· ${data.targetCarbsGrams}g goal` : ''}
            </Text>
          </View>

          <View style={[styles.macroCard, styles.fatCard]}>
            <Text style={[styles.macroValueText, { color: Colors.fatDark }]}>
              {data.fatGrams}g
            </Text>
            <Text style={styles.macroLabelText}>
              Fat {data.targetFatGrams ? `· ${data.targetFatGrams}g goal` : ''}
            </Text>
          </View>
        </View>

        {/* Insight Callout */}
        {data.insight ? (
          <View style={styles.insightBox}>
            <View style={styles.insightHeader}>
              <Ionicons name="sparkles" size={13} color={Colors.primary} />
              <Text style={styles.insightTitle}>Ria's Observation</Text>
            </View>
            <Text style={styles.insightText}>{data.insight}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: '#FFEDD5',
    borderRadius: 20,
    padding: 3,
    marginVertical: 8,
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
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
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
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
  calBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  calBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  segmentedBarContainer: {
    marginBottom: 14,
  },
  segmentedBarTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  segment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#475569',
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  macroCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  proteinCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  carbsCard: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FEF08A',
  },
  fatCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  macroValueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
  },
  macroLabelText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  insightBox: {
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  insightTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
});
