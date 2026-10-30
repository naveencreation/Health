/**
 * RiaMealCardView.tsx
 *
 * Spec-driven Meal Proposal card for Ria AI.
 * Displays proposed meal items with quantities and calories,
 * duplicate warnings, and 1-tap "Log Meal" with 10-second Undo.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { MealCardData } from '@/services/ai/types/ai.types';

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
  onEdit,
  onDismiss,
  testID = 'ria-meal-card',
}) => {
  const [isLogged, setIsLogged] = useState(data.state === 'logged');
  const [undoCountdown, setUndoCountdown] = useState<number | null>(null);

  const totalCalories = data.items.reduce((sum, item) => sum + item.kcal, 0);
  const totalProtein = data.items.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = data.items.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = data.items.reduce((sum, item) => sum + item.fat, 0);

  useEffect(() => {
    setIsLogged(data.state === 'logged');
  }, [data.state]);

  const handleConfirm = () => {
    setIsLogged(true);
    setUndoCountdown(10);
    onConfirm?.();
  };

  const handleUndo = () => {
    setIsLogged(false);
    setUndoCountdown(null);
    onUndo?.();
  };

  useEffect(() => {
    if (undoCountdown === null) return;
    if (undoCountdown <= 0) {
      setUndoCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setUndoCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [undoCountdown]);

  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        {/* Slot & Calorie Header */}
        <View style={styles.headerRow}>
          <View style={styles.slotBadge}>
            <Ionicons name="restaurant-outline" size={13} color={Colors.primaryDark} />
            <Text style={styles.slotBadgeText}>{data.slot.toUpperCase()}</Text>
          </View>
          <View style={styles.calBadge}>
            <Text style={styles.calBadgeText}>{totalCalories} kcal</Text>
          </View>
        </View>

        {/* Duplicate Warning */}
        {data.duplicateWarning ? (
          <View style={styles.duplicateWarningBox}>
            <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
            <Text style={styles.duplicateWarningText}>{data.duplicateWarning}</Text>
          </View>
        ) : null}

        {/* Items List */}
        <View style={styles.itemsList}>
          {data.items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.qty} {item.unit} · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                </Text>
              </View>
              <Text style={styles.itemKcal}>{item.kcal} kcal</Text>
            </View>
          ))}
        </View>

        {/* Macro Summary Strip */}
        <View style={styles.macroStrip}>
          <Text style={styles.macroStripText}>
            Protein: <Text style={styles.bold}>{totalProtein}g</Text> · Carbs:{' '}
            <Text style={styles.bold}>{totalCarbs}g</Text> · Fat:{' '}
            <Text style={styles.bold}>{totalFat}g</Text>
          </Text>
        </View>

        {/* Action Controls */}
        {isLogged ? (
          <View style={styles.loggedStateRow}>
            <View style={styles.loggedConfirmation}>
              <Ionicons name="checkmark-circle" size={16} color="#166534" />
              <Text style={styles.loggedText}>
                Logged to {data.slot}
                {undoCountdown !== null ? ` (${undoCountdown}s)` : ''}
              </Text>
            </View>
            {undoCountdown !== null && (
              <Pressable style={styles.undoBtn} onPress={handleUndo}>
                <Text style={styles.undoBtnText}>Undo</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed ? styles.btnPressed : null]}
              onPress={handleConfirm}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Log this {data.slot}</Text>
            </Pressable>

            {onDismiss && (
              <Pressable
                style={({ pressed }) => [styles.dismissBtn, pressed ? styles.btnPressed : null]}
                onPress={onDismiss}
              >
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </Pressable>
            )}
          </View>
        )}
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  slotBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  calBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  calBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#92400E',
  },
  duplicateWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  duplicateWarningText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#B45309',
    flex: 1,
  },
  itemsList: {
    gap: 8,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  itemMeta: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  itemKcal: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#334155',
  },
  macroStrip: {
    backgroundColor: '#FAF9F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  macroStripText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
  },
  bold: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  dismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  btnPressed: {
    opacity: 0.85,
  },
  loggedStateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  loggedConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loggedText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#166534',
  },
  undoBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  undoBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#166534',
  },
});
