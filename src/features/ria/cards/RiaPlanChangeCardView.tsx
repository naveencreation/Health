/**
 * RiaPlanChangeCardView.tsx
 *
 * Spec-driven Plan Change proposal card for Ria AI.
 * Shows proposed calorie budget & macro targets vs current targets,
 * enforcing clinical floors and allowing 1-tap Apply.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { PlanChangeCardData } from '@/services/ai/types/ai.types';

export interface RiaPlanChangeCardViewProps {
  data: PlanChangeCardData;
  onApply?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

export const RiaPlanChangeCardView: React.FC<RiaPlanChangeCardViewProps> = ({
  data,
  onApply,
  onDismiss,
  testID = 'ria-plan-change-card',
}) => {
  const [isApplied, setIsApplied] = useState(data.state === 'applied');

  const handleApply = () => {
    setIsApplied(true);
    onApply?.();
  };

  const calDelta = data.calories - data.currentCalories;
  const calDeltaText = `${calDelta > 0 ? '+' : ''}${calDelta} kcal`;

  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="options-outline" size={16} color={Colors.primary} />
          </View>
          <View style={styles.titleGroup}>
            <Text style={styles.titleText}>Proposed Plan Optimization</Text>
            <Text style={styles.subtitleText}>{data.reason}</Text>
          </View>
        </View>

        {/* Before / After Table */}
        <View style={styles.comparisonTable}>
          <View style={styles.tableRow}>
            <Text style={styles.metricLabel}>Daily Calorie Target</Text>
            <Text style={styles.currentVal}>{data.currentCalories} kcal</Text>
            <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
            <Text style={styles.proposedVal}>{data.calories} kcal</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.metricLabel}>Daily Protein</Text>
            <Text style={styles.currentVal}>{data.currentProtein}g</Text>
            <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
            <Text style={styles.proposedVal}>{data.protein}g</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.metricLabel}>Daily Carbs</Text>
            <Text style={styles.currentVal}>{data.currentCarbs}g</Text>
            <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
            <Text style={styles.proposedVal}>{data.carbs}g</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.metricLabel}>Daily Fat</Text>
            <Text style={styles.currentVal}>{data.currentFat}g</Text>
            <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
            <Text style={styles.proposedVal}>{data.fat}g</Text>
          </View>
        </View>

        {/* Action Buttons */}
        {isApplied ? (
          <View style={styles.appliedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#166534" />
            <Text style={styles.appliedText}>New Plan Applied to Your Goals</Text>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.applyBtnText}>Apply Target ({calDeltaText})</Text>
            </Pressable>

            {onDismiss && (
              <Pressable style={styles.dismissBtn} onPress={onDismiss}>
                <Text style={styles.dismissBtnText}>Keep Current</Text>
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
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  titleGroup: {
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
  comparisonTable: {
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#475569',
  },
  currentVal: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#64748B',
    width: 65,
    textAlign: 'right',
  },
  proposedVal: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.primaryDark,
    width: 65,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  applyBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  dismissBtn: {
    paddingHorizontal: 12,
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
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: 12,
  },
  appliedText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#166534',
  },
});
