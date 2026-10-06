/**
 * LimitReachedCard.tsx
 * 
 * Rendered when a user reaches their daily chat allowance (3 for Free, 50 for Pro).
 * In Free state, replaces composer with upgrade call-to-action while keeping chat history readable.
 * 
 * Spec: RIA_Chat.md section 6, 9.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { getLimitReachedInfo } from '@/services/ai/limits/RiaLimitGate';

export interface LimitReachedCardProps {
  isPro: boolean;
  limit?: number;
  onUpgradePress?: () => void;
  testID?: string;
}

export const LimitReachedCard: React.FC<LimitReachedCardProps> = ({
  isPro,
  limit = isPro ? 50 : 3,
  onUpgradePress,
  testID = 'limit-reached-card',
}) => {
  const info = getLimitReachedInfo(isPro, limit);

  const handleUpgradePress = () => {
    haptics.impactLight();
    onUpgradePress?.();
  };

  return (
    <View style={styles.container} testID={testID} accessibilityRole="alert">
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={isPro ? 'shield-checkmark-outline' : 'sparkles'}
            size={20}
            color={Colors.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} testID="limit-card-title">
            {info.title}
          </Text>
          <Text style={styles.subtitle} testID="limit-card-subtitle">
            {info.subtitle}
          </Text>
        </View>
      </View>

      {!isPro && onUpgradePress && (
        <Pressable
          style={({ pressed }) => [styles.upgradeBtn, pressed && styles.upgradeBtnPressed]}
          onPress={handleUpgradePress}
          testID="limit-card-upgrade-btn"
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Calorify Pro"
        >
          <Ionicons name="sparkles" size={15} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
          <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5F1',
    borderWidth: 1,
    borderColor: '#FFD5C6',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFE9E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748B',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 6,
  },
  upgradeBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  btnIcon: {
    marginRight: 2,
  },
  upgradeBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
