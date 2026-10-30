/**
 * RiaWaterCardView.tsx
 *
 * Spec-driven Water proposal card for Ria AI.
 * Allows 1-tap logging of hydration with 10-second Undo.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { WaterCardData } from '@/services/ai/types/ai.types';

export interface RiaWaterCardViewProps {
  data: WaterCardData;
  onConfirm?: (amountMl: number) => void;
  onUndo?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

export const RiaWaterCardView: React.FC<RiaWaterCardViewProps> = ({
  data,
  onConfirm,
  onUndo,
  onDismiss,
  testID = 'ria-water-card',
}) => {
  const [isLogged, setIsLogged] = useState(data.state === 'logged');

  const handleConfirm = () => {
    setIsLogged(true);
    onConfirm?.(data.amountMl);
  };

  const handleUndo = () => {
    setIsLogged(false);
    onUndo?.();
  };

  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        <View style={styles.contentRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="water" size={18} color="#0284C7" />
          </View>
          <View style={styles.textGroup}>
            <Text style={styles.titleText}>Log Hydration</Text>
            <Text style={styles.subtitleText}>{data.amountMl} ml of fresh water</Text>
          </View>

          {isLogged ? (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.logBtn} onPress={handleConfirm}>
              <Text style={styles.logBtnText}>+ Log {data.amountMl}ml</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: '#E0F2FE',
    borderRadius: 18,
    padding: 3,
    marginVertical: 6,
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
  logBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  undoBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  undoBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
  },
});
