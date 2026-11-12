/**
 * Ria's plate balance: a ring of the plate split, a balance score and Ria's suggestion.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { PlateDistributionCardData } from '@/services/ai/types/ai.types';
import {
  CardHeader,
  CardNote,
  CardShell,
  Divider,
  fmt,
  slotLabel,
  CardText as Text,
} from './RiaCardUI';

export interface RiaPlateDistributionCardViewProps {
  data: PlateDistributionCardData;
  testID?: string;
}

const R = 15.9155; // circumference 100, so dash lengths are percentages

export const scoreLabel = (score: number) =>
  score >= 80
    ? { label: 'Well balanced', bg: Colors.primaryLight, fg: Colors.primaryDeep }
    : score >= 60
      ? { label: 'Mostly balanced', bg: Colors.surfaceContainer, fg: Colors.textSlate600 }
      : { label: 'Needs work', bg: Colors.warningLight, fg: Colors.warningDark };

export const RiaPlateDistributionCardView: React.FC<RiaPlateDistributionCardViewProps> = ({
  data,
  testID = 'ria-plate-distribution-card',
}) => {
  // Carbs sit between the two greens (veggies, protein) so they never touch on the ring
  const parts = [
    { label: 'Veggies', pct: data.veggiesPct, color: Colors.fiber },
    { label: 'Carbs', pct: data.carbsPct, color: Colors.carbs },
    { label: 'Protein', pct: data.proteinPct, color: Colors.protein },
    { label: 'Fats', pct: data.fatsPct, color: Colors.fat },
  ];
  const total = parts.reduce((s, p) => s + Math.max(0, p.pct), 0) || 1;
  let start = 0;
  const arcs = parts.map(p => {
    const len = (Math.max(0, p.pct) / total) * 100;
    const arc = { ...p, len, offset: 25 - start };
    start += len;
    return arc;
  });
  const score = scoreLabel(data.balanceScore);
  const subtitle = [data.slot ? slotLabel(data.slot) : null, `${fmt(data.totalKcal)} kcal`]
    .filter(Boolean)
    .join(' · ');

  return (
    <CardShell
      testID={testID}
      accessibilityLabel={`Plate balance for ${data.mealName || 'this meal'}`}
    >
      <CardHeader
        icon="restaurant-outline"
        tone="cal"
        title={data.mealName || 'Your plate'}
        subtitle={subtitle}
        right={
          <Text
            style={styles.score}
            accessibilityLabel={`Balance score ${data.balanceScore} out of 100`}
          >
            {data.balanceScore}
            <Text style={styles.scoreOf}> / 100</Text>
          </Text>
        }
      />
      <View style={styles.plate}>
        <Svg
          width={112}
          height={112}
          viewBox="0 0 42 42"
          accessibilityLabel={parts.map(p => `${p.label} ${p.pct} percent`).join(', ')}
        >
          <Circle
            cx={21}
            cy={21}
            r={R}
            fill="none"
            stroke={Colors.surfaceContainer}
            strokeWidth={6}
          />
          {arcs.map(a =>
            a.len > 1 ? (
              <Circle
                key={a.label}
                cx={21}
                cy={21}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={6}
                strokeDasharray={`${a.len - 1} ${101 - a.len}`}
                strokeDashoffset={a.offset}
              />
            ) : null
          )}
        </Svg>
        <View style={styles.legend} importantForAccessibility="no-hide-descendants">
          {parts.map(p => (
            <View key={p.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={styles.legendText}>
                {p.label} <Text style={styles.legendValue}>{Math.round(p.pct)}%</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.chip, { backgroundColor: score.bg }]}>
        <Text style={[styles.chipText, { color: score.fg }]}>{score.label}</Text>
      </View>
      {data.recommendation ? (
        <>
          <Divider />
          <CardNote icon="sparkles" label="Ria" text={data.recommendation} />
        </>
      ) : null}
    </CardShell>
  );
};

const styles = StyleSheet.create({
  score: { fontFamily: Fonts.urbanist.extraBold, fontSize: 20, color: Colors.textPrimary },
  scoreOf: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSecondary },
  plate: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSlate600 },
  legendValue: { fontFamily: Fonts.urbanist.bold, color: Colors.textPrimary },
  chip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { fontFamily: Fonts.urbanist.bold, fontSize: 12 },
});
