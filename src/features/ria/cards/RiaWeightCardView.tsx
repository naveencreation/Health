/**
 * RiaWeightCardView.tsx
 *
 * Spec-driven Weight entry card for Ria AI.
 * Shows new weigh-in, delta from previous weight,
 * sanity confirmation check if jump > 3 kg, and 1-tap save.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { WeightCardData } from '@/services/ai/types/ai.types';

export interface RiaWeightCardViewProps {
  data: WeightCardData;
  onConfirm?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

export const RiaWeightCardView: React.FC<RiaWeightCardViewProps> = ({
  data,
  onConfirm,
  onDismiss,
  testID = 'ria-weight-card',
}) => {
  const [isLogged, setIsLogged] = useState(data.state === 'logged');

  const handleConfirm = () => {
    setIsLogged(true);
    onConfirm?.();
  };

  const deltaFormatted =
    data.deltaKg !== undefined
      ? `${data.deltaKg > 0 ? '+' : ''}${data.deltaKg.toFixed(1)} kg`
      : null;

  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        <View style={styles.contentRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="scale-outline" size={18} color="#4F46E5" />
          </View>
          <View style={styles.textGroup}>
            <Text style={styles.titleText}>Log Weigh-in: {data.weightKg} kg</Text>
            <Text style={styles.subtitleText}>
              {deltaFormatted ? `${deltaFormatted} since last entry` : 'Track your body weight'}
            </Text>
          </View>

          {isLogged ? (
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#166534" />
              <Text style={styles.savedText}>Saved</Text>
            </View>
          ) : (
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </Pressable>
          )}
        </View>

        {data.needsSanityConfirm && !isLogged ? (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={13} color="#B45309" />
            <Text style={styles.warningText}>
              Large change detected ({deltaFormatted}). Tap confirm if accurate.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 3,
    marginVertical: 6,
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  textGroup: {
    flex: 1,
  },
  titleText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  subtitleText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  confirmBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savedText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#166534',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    padding: 6,
    borderRadius: 8,
  },
  warningText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10,
    color: '#92400E',
    flex: 1,
  },
});
