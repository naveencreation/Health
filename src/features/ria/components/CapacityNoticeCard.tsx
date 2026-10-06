/**
 * CapacityNoticeCard.tsx
 * 
 * Rendered when Ria is at capacity (HTTP 429, shared pool exhaustion, or ria_pool_degraded).
 * Distinct from LimitReachedCard: communicates temporary shared pool rest, does not count
 * against user limits, and does not push a paid upgrade.
 * 
 * Spec: RIA_Chat.md section 6, 9, 12.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { getCapacityNoticeInfo } from '@/services/ai/limits/RiaLimitGate';

export interface CapacityNoticeCardProps {
  retryAfter?: string;
  onRetryPress?: () => void;
  testID?: string;
}

export const CapacityNoticeCard: React.FC<CapacityNoticeCardProps> = ({
  retryAfter,
  onRetryPress,
  testID = 'capacity-notice-card',
}) => {
  const info = getCapacityNoticeInfo(retryAfter);

  const handleRetryPress = () => {
    haptics.impactLight();
    onRetryPress?.();
  };

  return (
    <View style={styles.container} testID={testID} accessibilityRole="alert">
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="moon-outline" size={20} color="#D97706" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} testID="capacity-card-title">
            {info.title}
          </Text>
          <Text style={styles.highlightText} testID="capacity-card-back-around">
            {info.backAroundText}
          </Text>
          <Text style={styles.subtitle} testID="capacity-card-subtitle">
            {info.subtitle}
          </Text>
        </View>
      </View>

      {onRetryPress && (
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          onPress={handleRetryPress}
          testID="capacity-card-retry-btn"
          accessibilityRole="button"
          accessibilityLabel="Check Ria availability"
        >
          <Ionicons name="refresh-outline" size={15} color="#92400E" />
          <Text style={styles.retryBtnText}>Check Status</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#78350F',
    marginBottom: 2,
  },
  highlightText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#B45309',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#92400E',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 6,
  },
  retryBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  retryBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#92400E',
  },
});
