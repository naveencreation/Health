/**
 * Ria's plan change: current vs proposed daily targets side by side, Apply or Keep current.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ProfileButton } from '@/components/profile/ProfileUI';
import { PlanChangeCardData } from '@/services/ai/types/ai.types';
import {
  CardHeader,
  CardShell,
  CollapsedCard,
  DoneChip,
  fmt,
  ui,
  CardText as Text,
} from './RiaCardUI';

export interface RiaPlanChangeCardViewProps {
  data: PlanChangeCardData;
  onApply?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

const signed = (n: number) => `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))}`;

export const RiaPlanChangeCardView: React.FC<RiaPlanChangeCardViewProps> = ({
  data,
  onApply,
  onDismiss,
  testID = 'ria-plan-change-card',
}) => {
  const [shown, setShown] = useState(false);

  if (data.state === 'dismissed' && !shown) {
    return (
      <CollapsedCard
        text="Kept your current plan"
        onShow={onApply ? () => setShown(true) : undefined}
        testID={testID}
      />
    );
  }

  if (data.state === 'applied') {
    return (
      <CardShell testID={testID}>
        <CardHeader
          icon="options-outline"
          tone="cal"
          title="New daily plan"
          subtitle={`${fmt(data.calories)} kcal · ${fmt(data.protein)} g protein`}
          right={<DoneChip label="Applied" />}
        />
      </CardShell>
    );
  }

  const rows = [
    { label: 'Calories', from: data.currentCalories, to: data.calories, unit: '' },
    { label: 'Protein', from: data.currentProtein, to: data.protein, unit: ' g' },
    { label: 'Carbs', from: data.currentCarbs, to: data.carbs, unit: ' g' },
    { label: 'Fat', from: data.currentFat, to: data.fat, unit: ' g' },
  ];

  return (
    <CardShell testID={testID} accessibilityLabel="Proposed new daily plan">
      <CardHeader
        icon="options-outline"
        tone="cal"
        title="New daily plan"
        subtitle={data.reason || undefined}
      />
      <View>
        {rows.map((r, i) => {
          const diff = Math.round(r.to - r.from);
          return (
            <View
              key={r.label}
              style={[styles.row, i > 0 && styles.rowDivider]}
              accessible
              accessibilityLabel={
                diff === 0
                  ? `${r.label} stays ${fmt(r.to)}${r.unit}`
                  : `${r.label} from ${fmt(r.from)} to ${fmt(r.to)}${r.unit}`
              }
            >
              <Text style={styles.label}>{r.label}</Text>
              {diff === 0 ? (
                <Text style={styles.same}>{`${fmt(r.to)}${r.unit} · same`}</Text>
              ) : (
                <>
                  <Text style={styles.from}>{`${fmt(r.from)}${r.unit}`}</Text>
                  <Ionicons name="arrow-forward" size={12} color={Colors.textMuted} />
                  <Text style={styles.to}>
                    {`${fmt(r.to)}${r.unit}`}
                    <Text style={styles.diff}>{`  ${signed(diff)}`}</Text>
                  </Text>
                </>
              )}
            </View>
          );
        })}
      </View>
      {onApply ? (
        <View style={ui.buttons}>
          <ProfileButton
            label="Apply new plan"
            variant="primary"
            onPress={onApply}
            style={ui.mainButton}
          />
          {onDismiss ? <ProfileButton label="Keep current" onPress={onDismiss} /> : null}
        </View>
      ) : null}
    </CardShell>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 38 },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.borderWhisper },
  label: { flex: 1, fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSlate600 },
  from: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  to: { fontFamily: Fonts.urbanist.extraBold, fontSize: 14, color: Colors.textPrimary },
  diff: { fontFamily: Fonts.urbanist.bold, fontSize: 12, color: Colors.textSecondary },
  same: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSecondary },
});
