/**
 * Ria's day review: calories against budget, macros against targets, then a win and a next step.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { DayReviewCardData } from '@/services/ai/types/ai.types';
import {
  BigValue,
  CardHeader,
  CardNote,
  CardShell,
  Divider,
  MacroBars,
  fmt,
  ui,
  CardText as Text,
} from './RiaCardUI';

export interface RiaDayReviewCardViewProps {
  data: DayReviewCardData;
  testID?: string;
}

export const RiaDayReviewCardView: React.FC<RiaDayReviewCardViewProps> = ({
  data,
  testID = 'ria-day-review-card',
}) => {
  const target = Math.max(1, data.calorieTarget);
  const left = data.calorieTarget - data.caloriesConsumed;
  const over = left < 0;
  const pct = Math.round((data.caloriesConsumed / target) * 100);

  return (
    <CardShell testID={testID} accessibilityLabel="Day review">
      <CardHeader
        icon="sparkles"
        tone="ria"
        title="Your day"
        right={
          <BigValue value={fmt(data.caloriesConsumed)} unit={`/ ${fmt(data.calorieTarget)} kcal`} />
        }
      />
      <View>
        <View style={[styles.track, over && styles.trackOver]}>
          <View
            style={[styles.fill, over && styles.fillOver, { width: `${Math.min(100, pct)}%` }]}
          />
        </View>
        <Text style={[ui.subtitle, styles.caption]}>
          {over
            ? `${fmt(-left)} kcal over · ${pct}% of your budget`
            : `${fmt(left)} kcal left · ${pct}% of your budget`}
        </Text>
      </View>
      <MacroBars
        grams={{ protein: data.proteinConsumed, carbs: data.carbsConsumed, fat: data.fatConsumed }}
        targets={{ protein: data.proteinTarget, carbs: data.carbsTarget, fat: data.fatTarget }}
      />
      {data.win || data.focus ? (
        <>
          <Divider />
          {data.win ? <CardNote icon="trophy-outline" label="Win" text={data.win} /> : null}
          {data.focus ? <CardNote icon="compass-outline" label="Next" text={data.focus} /> : null}
        </>
      ) : null}
    </CardShell>
  );
};

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.primaryLight },
  trackOver: { backgroundColor: Colors.warningLight },
  fill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  fillOver: { backgroundColor: Colors.warning },
  caption: { marginTop: 6 },
});
