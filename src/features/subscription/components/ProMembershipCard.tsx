import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { usePro } from '../hooks/usePro';
import { formatExpiry, SUBSCRIPTION_PACKAGES } from '@/services/payments/paymentService';
import { haptics } from '@/utils/haptics';

// Longest trial on offer, so the promo never advertises a trial no plan has
const TRIAL_DAYS = Math.max(0, ...SUBSCRIPTION_PACKAGES.map(p => p.trialDays ?? 0));

export interface ProMembershipCardProps {
  onUpgradePress: () => void;
  onManagePress?: () => void;
}

export const ProMembershipCard: React.FC<ProMembershipCardProps> = ({
  onUpgradePress,
  onManagePress,
}) => {
  const { isPro, activePlanId, expiresAt } = usePro();

  const handleUpgrade = async () => {
    await haptics.impactMedium();
    onUpgradePress();
  };

  const handleManage = async () => {
    await haptics.selection();
    if (onManagePress) {
      onManagePress();
    } else {
      onUpgradePress();
    }
  };

  const getPlanLabel = () => {
    if (activePlanId === 'pro_annual') return 'Annual VIP Membership';
    if (activePlanId === 'pro_monthly') return 'Monthly Member';
    if (activePlanId === 'pro_lifetime') return 'Lifetime VIP Access';
    return 'Pro Active';
  };

  if (isPro) {
    return (
      <View style={styles.cardPro} testID="pro-membership-active-card">
        <View style={styles.topRow}>
          <View style={styles.proIconBadge}>
            <Ionicons name="star" size={16} color={Colors.warningDark} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.proTitle}>Calorify Pro</Text>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.proSubtitle}>{getPlanLabel()}</Text>
          </View>
        </View>

        <View style={styles.dividerPro} />

        <View style={styles.bottomRow}>
          <Text style={styles.expiryText}>
            {formatExpiry(expiresAt)}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.manageBtn, pressed && styles.btnPressed]}
            onPress={handleManage}
            accessibilityRole="button"
            accessibilityLabel="Manage Pro Subscription"
          >
            <Text style={styles.manageBtnText}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cardFree} testID="pro-membership-promo-card">
      <View style={styles.topRow}>
        <View style={styles.crownCircle}>
          <Ionicons name="sparkles" size={20} color={Colors.warningDark} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.headline}>Unlock Calorify Pro</Text>
            {TRIAL_DAYS > 0 ? (
              <View style={styles.trialPill}>
                <Text style={styles.trialPillText}>{TRIAL_DAYS}-DAY FREE TRIAL</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.tagline}>
            AI food vision, adaptive calorie coaching & advanced trends.
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.upgradeBtn, pressed && styles.btnPressed]}
        onPress={handleUpgrade}
        accessibilityRole="button"
        accessibilityLabel="Upgrade to Calorify Pro"
      >
        <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.textInverse} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cardFree: {
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.carbsBorder,
    gap: 12,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardPro: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.carbsBorder,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crownCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.carbsBorder,
  },
  proIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  headline: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  proTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  proSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tagline: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSlate600,
  },
  trialPill: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trialPillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.warningDark,
    letterSpacing: 0.3,
  },
  activePill: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.successDark,
    letterSpacing: 0.3,
  },
  upgradeBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 10,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 6,
  },
  upgradeBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  dividerPro: {
    height: 1,
    backgroundColor: Colors.borderWhisper,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expiryText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  manageBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

export default ProMembershipCard;
