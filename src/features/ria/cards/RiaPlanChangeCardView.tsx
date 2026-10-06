/**
 * RiaPlanChangeCardView.tsx
 *
 * Double-bezel Action Card for Ria's Proposed Goal Adjustments.
 * Displays before/after targets with deltas and clinical rationale.
 * Spec: RIA_Chat.md sections 7, 8, 10, 11 (Pro only, blocked for minors).
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { PlanChangeCardData } from '@/services/ai/types/ai.types';

export interface RiaPlanChangeCardViewProps {
  data: PlanChangeCardData;
  onApply: () => void;
  onDismiss?: () => void;
  testID?: string;
}

export const RiaPlanChangeCardView: React.FC<RiaPlanChangeCardViewProps> = ({
  data,
  onApply,
  onDismiss,
  testID = 'ria-plan-change-card',
}) => {
  const calDelta = data.calories - data.currentCalories;
  const protDelta = data.protein - data.currentProtein;

  const handleApplyPress = async () => {
    await haptics.impactLight();
    onApply();
  };

  const handleDismissPress = async () => {
    await haptics.selection();
    onDismiss?.();
  };

  // State: Dismissed
  if (data.state === 'dismissed') {
    return (
      <View style={[styles.outerShell, styles.inactiveShell]} testID={`${testID}-dismissed`}>
        <View style={styles.dismissedRow}>
          <Ionicons name="close-circle-outline" size={14} color="#94A3B8" />
          <Text style={styles.dismissedText}>Plan adjustment dismissed</Text>
        </View>
      </View>
    );
  }

  // State: Applied
  if (data.state === 'applied') {
    return (
      <View style={[styles.outerShell, styles.appliedShell]} testID={`${testID}-applied`}>
        <View style={styles.appliedInnerCore}>
          <View style={styles.appliedHeaderRow}>
            <View style={styles.appliedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={styles.appliedBadgeText}>Plan Updated to {data.calories} kcal</Text>
            </View>
            <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
          </View>
        </View>
      </View>
    );
  }

  // State: Proposed
  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={styles.iconCircle}>
              <Ionicons name="trending-up" size={16} color="#EA580C" />
            </View>
            <View>
              <Text style={styles.titleText}>Adjust Plan</Text>
              <Text style={styles.subtitleText}>Target calibration recommendation</Text>
            </View>
          </View>

          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>

        {/* Reason Note */}
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText}>"{data.reason}"</Text>
        </View>

        {/* Before / After Metrics Row */}
        <View style={styles.metricsGrid}>
          {/* Calories */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Daily Budget</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.currentValue}>{data.currentCalories}</Text>
              <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
              <Text style={styles.proposedValue}>{data.calories} kcal</Text>
            </View>
            <Text style={[styles.deltaLabel, calDelta <= 0 ? styles.deltaMinus : styles.deltaPlus]}>
              {calDelta > 0 ? `+${calDelta}` : `${calDelta}`} kcal
            </Text>
          </View>

          {/* Protein */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Protein Goal</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.currentValue}>{data.currentProtein}g</Text>
              <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
              <Text style={styles.proposedValue}>{data.protein}g</Text>
            </View>
            <Text style={[styles.deltaLabel, protDelta >= 0 ? styles.deltaPlus : styles.deltaMinus]}>
              {protDelta > 0 ? `+${protDelta}` : `${protDelta}`}g
            </Text>
          </View>
        </View>

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.applyBtn, pressed && styles.btnPressed]}
            onPress={handleApplyPress}
            accessibilityRole="button"
            accessibilityLabel={`Apply plan change to ${data.calories} calories`}
            testID={`${testID}-apply-btn`}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
            <Text style={styles.applyBtnText}>Update My Plan</Text>
          </Pressable>

          {onDismiss && (
            <Pressable
              style={({ pressed }) => [styles.dismissBtn, pressed && styles.btnPressed]}
              onPress={handleDismissPress}
              accessibilityRole="button"
              accessibilityLabel="Dismiss plan change"
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
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginVertical: 6,
    width: '100%',
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFF7ED',
  },
  inactiveShell: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    padding: 2,
  },
  appliedShell: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  appliedInnerCore: {
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
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  subtitleText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  proBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  reasonBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 9,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  reasonText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#334155',
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#64748B',
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  currentValue: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  proposedValue: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12.5,
    color: '#0F172A',
  },
  deltaLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
  },
  deltaMinus: {
    color: '#059669',
  },
  deltaPlus: {
    color: '#EA580C',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  applyBtnText: {
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
  appliedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#16A34A',
  },
  dismissedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  dismissedText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
});
