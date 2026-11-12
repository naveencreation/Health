/**
 * Ria's macro split: share of calories as a split bar, grams against targets, Ria's comment.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { VisualMacroSplitCardData } from '@/services/ai/types/ai.types';
import {
  BigValue,
  CardHeader,
  CardNote,
  CardShell,
  Divider,
  MacroBars,
  fmt,
  CardText as Text,
} from './RiaCardUI';

export interface RiaMacroVisualizerCardViewProps {
  data: VisualMacroSplitCardData;
  testID?: string;
}

export const RiaMacroVisualizerCardView: React.FC<RiaMacroVisualizerCardViewProps> = ({
  data,
  testID = 'ria-macro-visualizer-card',
}) => {
  const parts = [
    { label: 'Protein', kcal: data.proteinGrams * 4, color: Colors.protein },
    { label: 'Carbs', kcal: data.carbsGrams * 4, color: Colors.carbs },
    { label: 'Fat', kcal: data.fatGrams * 9, color: Colors.fat },
  ];
  const macroKcal = parts.reduce((s, p) => s + p.kcal, 0);
  const pct = parts.map(p => (macroKcal > 0 ? Math.round((p.kcal / macroKcal) * 100) : 0));
  const hasTargets = Boolean(
    data.targetProteinGrams || data.targetCarbsGrams || data.targetFatGrams
  );

  return (
    <CardShell testID={testID} accessibilityLabel={data.title || 'Macro split'}>
      <CardHeader
        icon="pie-chart-outline"
        tone="cal"
        title={data.title || 'Macro split'}
        subtitle={data.subtitle || 'Share of calories'}
        right={
          <BigValue
            value={fmt(data.totalKcal)}
            unit={data.targetKcal ? `/ ${fmt(data.targetKcal)} kcal` : 'kcal'}
          />
        }
      />
      {macroKcal > 0 ? (
        <>
          <View
            style={styles.split}
            accessible
            accessibilityLabel={parts.map((p, i) => `${p.label} ${pct[i]} percent`).join(', ')}
          >
            {parts.map(p =>
              p.kcal > 0 ? (
                <View key={p.label} style={{ flex: p.kcal, backgroundColor: p.color }} />
              ) : null
            )}
          </View>
          <View style={styles.legend} importantForAccessibility="no-hide-descendants">
            {parts.map((p, i) => (
              <View key={p.label} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: p.color }]} />
                <Text style={styles.legendText}>
                  {p.label} <Text style={styles.legendValue}>{pct[i]}%</Text>
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <MacroBars
        grams={{ protein: data.proteinGrams, carbs: data.carbsGrams, fat: data.fatGrams }}
        targets={
          hasTargets
            ? {
                protein: data.targetProteinGrams,
                carbs: data.targetCarbsGrams,
                fat: data.targetFatGrams,
              }
            : undefined
        }
      />
      {data.insight ? (
        <>
          <Divider />
          <CardNote icon="sparkles" label="Ria" text={data.insight} />
        </>
      ) : null}
    </CardShell>
  );
};

const styles = StyleSheet.create({
  split: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSlate600 },
  legendValue: { fontFamily: Fonts.urbanist.bold, color: Colors.textPrimary },
});
