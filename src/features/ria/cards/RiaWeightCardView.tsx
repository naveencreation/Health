/**
 * RiaWeightCardView.tsx
 *
 * Double-bezel Action Card for Proposed & Confirmed Weight Logging.
 * Displays delta vs previous weigh-in, flags >3 kg change sanity notices,
 * and handles confirm/dismiss with haptics per RIA_Chat.md.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { WeightCardData } from '@/services/ai/types/ai.types';

export interface RiaWeightCardViewProps {
  data: WeightCardData;
  onConfirm: () => void;
  onDismiss?: () => void;
  testID?: string;
}

export const RiaWeightCardView: React.FC<RiaWeightCardViewProps> = ({
  data,
  onConfirm,
  onDismiss,
  testID = 'ria-weight-card',
}) => {
  const handleConfirmPress = async () => {
    await haptics.impactLight();
    onConfirm();
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
          <Text style={styles.dismissedText}>Weight proposal dismissed</Text>
        </View>
      </View>
    );
  }

  // State: Logged
  if (data.state === 'logged') {
    return (
      <View style={[styles.outerShell, styles.loggedShell]} testID={`${testID}-logged`}>
        <View style={styles.loggedInnerCore}>
          <View style={styles.loggedHeaderRow}>
            <View style={styles.loggedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={styles.loggedBadgeText}>Weight Recorded</Text>
            </View>
            <Text style={styles.loggedWeightText}>{`${data.weightKg} kg`}</Text>
          </View>
          {data.deltaKg !== undefined && (
            <Text style={styles.loggedDeltaText}>
              {`${data.deltaKg >= 0 ? `+${data.deltaKg}` : `${data.deltaKg}`} kg vs previous`}
            </Text>
          )}
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
              <Ionicons name="scale-outline" size={16} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.titleText}>Log Weigh-In</Text>
              <Text style={styles.subtitleText}>Track progress toward goal</Text>
            </View>
          </View>

          <View style={styles.weightPill}>
            <Text style={styles.weightPillText}>{`${data.weightKg} kg`}</Text>
          </View>
        </View>

        {/* Delta Info */}
        {data.deltaKg !== undefined && (
          <View style={styles.deltaRow}>
            <Ionicons
              name={data.deltaKg <= 0 ? 'trending-down-outline' : 'trending-up-outline'}
              size={14}
              color={data.deltaKg <= 0 ? '#16A34A' : '#EA580C'}
            />
            <Text style={styles.deltaText}>
              {`${data.deltaKg > 0 ? `+${data.deltaKg}` : `${data.deltaKg}`} kg vs last entry (${data.previousWeightKg} kg)`}
            </Text>
          </View>
        )}

        {/* Sanity Notice Banner (> 3 kg shift) */}
        {data.needsSanityConfirm && (
          <View style={styles.sanityBanner} testID={`${testID}-sanity-banner`}>
            <Ionicons name="alert-circle" size={15} color="#D97706" />
            <Text style={styles.sanityBannerText}>
              {`Notice: This is a ${Math.abs(data.deltaKg || 0)} kg change from your last weigh-in. Please confirm this number is correct.`}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.confirmBtn, pressed && styles.btnPressed]}
            onPress={handleConfirmPress}
            accessibilityRole="button"
            accessibilityLabel={`Confirm weight ${data.weightKg} kg`}
            testID={`${testID}-confirm-btn`}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>{`Confirm ${data.weightKg} kg`}</Text>
          </Pressable>

          {onDismiss && (
            <Pressable
              style={({ pressed }) => [styles.dismissBtn, pressed && styles.btnPressed]}
              onPress={handleDismissPress}
              accessibilityRole="button"
              accessibilityLabel="Dismiss weight proposal"
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
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E0E7FF',
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
    backgroundColor: '#EEF2FF',
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
  weightPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  weightPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#4F46E5',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deltaText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#475569',
  },
  sanityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  sanityBannerText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  confirmBtnText: {
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
    color: '#16A34A',
  },
  loggedWeightText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  loggedDeltaText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
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
