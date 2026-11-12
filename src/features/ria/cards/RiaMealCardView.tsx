/**
 * Ria's meal proposal: items, Ria's assumption, macro split and one-tap logging
 * with a 10 s Undo. Each item's kcal is the total for its qty (TD-H1).
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ProfileButton } from '@/components/profile/ProfileUI';
import { MealCardData } from '@/services/ai/types/ai.types';
import {
  BigValue,
  CardHeader,
  CardNotice,
  CardShell,
  CollapsedCard,
  DoneBar,
  MacroBars,
  UndoCountdown,
  fmt,
  slotLabel,
  ui,
  CardText as Text,
} from './RiaCardUI';

export interface RiaMealCardViewProps {
  data: MealCardData;
  onConfirm?: () => void;
  onUndo?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

export const RiaMealCardView: React.FC<RiaMealCardViewProps> = ({
  data,
  onConfirm,
  onUndo,
  onDismiss,
  testID = 'ria-meal-card',
}) => {
  const [shown, setShown] = useState(false);
  const meal = slotLabel(data.slot);
  const sum = (k: 'kcal' | 'protein' | 'carbs' | 'fat') =>
    data.items.reduce((s, item) => s + item[k], 0);
  const kcal = sum('kcal');

  if (data.state === 'dismissed' && !shown) {
    return (
      <CollapsedCard
        text={`${meal} · ${fmt(kcal)} kcal not logged`}
        onShow={onConfirm ? () => setShown(true) : undefined}
        testID={testID}
      />
    );
  }

  const logged = data.state === 'logged';
  return (
    <CardShell
      testID={testID}
      accessibilityLabel={`${logged ? 'Logged' : 'Proposed'} ${meal}, ${fmt(kcal)} kcal`}
    >
      <CardHeader
        icon="restaurant-outline"
        tone="cal"
        title={meal}
        subtitle={data.photoThumbUri ? 'From your photo' : undefined}
        thumbUri={data.photoThumbUri}
        right={<BigValue value={fmt(kcal)} unit="kcal" />}
      />

      {data.duplicateWarning && !logged ? (
        <CardNotice kind="warn" text={data.duplicateWarning} />
      ) : null}

      <View>
        {data.items.map((item, i) => (
          <View key={item.id ?? i} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={ui.flex1}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.source === 'estimate' ? (
                  <Text style={styles.est} accessibilityLabel="estimated">
                    est.
                  </Text>
                ) : null}
              </View>
              <Text style={ui.subtitle}>{`${item.qty} ${item.unit}`}</Text>
            </View>
            <Text style={styles.kcal}>{fmt(item.kcal)} kcal</Text>
          </View>
        ))}
      </View>

      {logged ? (
        <DoneBar label={`Added to ${meal}`}>
          {onUndo && data.undoUntil ? (
            <UndoCountdown
              key={data.undoUntil}
              undoUntil={data.undoUntil}
              onUndo={onUndo}
              what={meal}
            />
          ) : null}
        </DoneBar>
      ) : (
        <>
          {data.assumption ? <CardNotice kind="info" text={data.assumption} /> : null}
          <View style={styles.macroRow}>
            <MacroBars grams={{ protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') }} />
          </View>
          {onConfirm ? (
            <View style={ui.buttons}>
              <ProfileButton
                label={data.duplicateWarning ? 'Log again' : `Log to ${meal}`}
                variant="primary"
                onPress={onConfirm}
                accessibilityLabel={`${data.duplicateWarning ? 'Log again' : 'Log'} to ${meal}, ${fmt(kcal)} calories`}
                style={ui.mainButton}
              />
              {onDismiss ? <ProfileButton label="Not now" onPress={onDismiss} /> : null}
            </View>
          ) : null}
        </>
      )}
    </CardShell>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.borderWhisper },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  est: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 4,
    paddingHorizontal: 5,
    overflow: 'hidden',
  },
  kcal: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSlate700 },
  macroRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderWhisper },
});
