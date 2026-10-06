/**
 * RiaWaterCardView.tsx
 *
 * Double-bezel Action Card for Proposed & Confirmed Water Logging.
 * Features 10-second live countdown Undo, quick adjustment chips (+100ml, +250ml, +500ml),
 * and tactile haptic feedback per RIA_Chat.md.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { WaterCardData } from '@/services/ai/types/ai.types';

export interface RiaWaterCardViewProps {
  data: WaterCardData;
  onConfirm: (amountMl: number) => void;
  onUndo: () => void;
  onDismiss?: () => void;
  testID?: string;
}

const QUICK_CHIPS = [100, 250, 500];

export const RiaWaterCardView: React.FC<RiaWaterCardViewProps> = ({
  data,
  onConfirm,
  onUndo,
  onDismiss,
  testID = 'ria-water-card',
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(data.amountMl || 250);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (data.state === 'logged' && data.undoUntil) {
      return Math.max(0, Math.ceil((data.undoUntil - Date.now()) / 1000));
    }
    return 0;
  });

  // Active 10-second ticker when logged and within undo window
  useEffect(() => {
    if (data.state !== 'logged' || !data.undoUntil) return;

    const tick = () => {
      const diffMs = (data.undoUntil || 0) - Date.now();
      const s = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsRemaining(s);
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [data.state, data.undoUntil]);

  const handleConfirmPress = async () => {
    await haptics.impactLight();
    onConfirm(selectedAmount);
  };

  const handleUndoPress = async () => {
    await haptics.impactLight();
    onUndo();
  };

  const handleDismissPress = async () => {
    await haptics.selection();
    onDismiss?.();
  };

  const handleChipPress = async (amount: number) => {
    await haptics.selection();
    setSelectedAmount(amount);
  };

  // State: Undone
  if (data.state === 'undone') {
    return (
      <View style={[styles.outerShell, styles.inactiveShell]} testID={`${testID}-undone`}>
        <View style={styles.undoneRow}>
          <Ionicons name="arrow-undo-outline" size={14} color="#94A3B8" />
          <Text style={styles.undoneText}>Water entry removed</Text>
        </View>
      </View>
    );
  }

  // State: Dismissed
  if (data.state === 'dismissed') {
    return (
      <View style={[styles.outerShell, styles.inactiveShell]} testID={`${testID}-dismissed`}>
        <View style={styles.undoneRow}>
          <Ionicons name="close-circle-outline" size={14} color="#94A3B8" />
          <Text style={styles.undoneText}>Hydration suggestion dismissed</Text>
        </View>
      </View>
    );
  }

  // State: Logged (with 10-second live undo countdown)
  if (data.state === 'logged') {
    const isUndoAvailable = secondsRemaining > 0;

    return (
      <View style={[styles.outerShell, styles.loggedShell]} testID={`${testID}-logged`}>
        <View style={styles.loggedInnerCore}>
          <View style={styles.loggedHeaderRow}>
            <View style={styles.loggedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#0284C7" />
              <Text style={styles.loggedBadgeText}>{`Added ${data.amountMl} ml water`}</Text>
            </View>
            <Ionicons name="water" size={18} color="#0284C7" />
          </View>

          {isUndoAvailable && (
            <View style={styles.undoFooterRow}>
              <View style={styles.undoTimerBadge}>
                <Ionicons name="timer-outline" size={13} color="#EA580C" />
                <Text style={styles.undoTimerText}>{`Undo expires in ${secondsRemaining}s`}</Text>
              </View>
              <Pressable
                style={styles.undoBtn}
                onPress={handleUndoPress}
                accessibilityRole="button"
                accessibilityLabel="Undo water logging"
                testID={`${testID}-undo-btn`}
              >
                <Text style={styles.undoBtnText}>Undo</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }

  // State: Proposed (Default interactive double-bezel card)
  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <View style={styles.waterIconCircle}>
              <Ionicons name="water" size={16} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Hydration Log</Text>
              <Text style={styles.cardSubtitle}>Track water intake toward daily goal</Text>
            </View>
          </View>
          <View style={styles.amountPill}>
            <Text style={styles.amountPillText}>{`${selectedAmount} ml`}</Text>
          </View>
        </View>

        {/* Quick Amount Chips */}
        <View style={styles.chipsRow}>
          <Text style={styles.chipsLabel}>Quick select:</Text>
          {QUICK_CHIPS.map(ml => (
            <Pressable
              key={ml}
              style={[styles.quickChip, selectedAmount === ml && styles.quickChipActive]}
              onPress={() => handleChipPress(ml)}
              accessibilityRole="button"
              accessibilityLabel={`${ml} ml`}
            >
              <Text
                style={[
                  styles.quickChipText,
                  selectedAmount === ml && styles.quickChipTextActive,
                ]}
              >
                {`+${ml} ml`}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.primaryAddBtn, pressed && styles.btnPressed]}
            onPress={handleConfirmPress}
            accessibilityRole="button"
            accessibilityLabel={`Log ${selectedAmount} ml water`}
            testID={`${testID}-confirm-btn`}
          >
            <Ionicons name="water-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryAddBtnText}>{`Log ${selectedAmount} ml`}</Text>
          </Pressable>

          {onDismiss && (
            <Pressable
              style={({ pressed }) => [styles.dismissBtn, pressed && styles.btnPressed]}
              onPress={handleDismissPress}
              accessibilityRole="button"
              accessibilityLabel="Dismiss water proposal"
              testID={`${testID}-dismiss-btn`}
            >
              <Ionicons name="close" size={16} color="#64748B" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    marginVertical: 6,
    width: '100%',
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  inactiveShell: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    padding: 2,
  },
  loggedShell: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  loggedInnerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0FDF4',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waterIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  amountPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  amountPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0284C7',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  chipsLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
  },
  quickChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  quickChipText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#475569',
  },
  quickChipTextActive: {
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  primaryAddBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  dismissBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  loggedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loggedBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0284C7',
  },
  undoFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  undoTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  undoTimerText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#EA580C',
  },
  undoBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  undoBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#EA580C',
  },
  undoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  undoneText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
});
