import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { usePro } from '../hooks/usePro';
import { haptics } from '@/utils/haptics';

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
            <Ionicons name="star" size={16} color="#D97706" />
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
            {expiresAt
              ? `Renews on ${new Date(expiresAt).toLocaleDateString()}`
              : 'Unlimited Access'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.manageBtn, pressed && styles.btnPressed]}
            onPress={handleManage}
            accessibilityRole="button"
            accessibilityLabel="Manage Pro Subscription"
          >
            <Text style={styles.manageBtnText}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color="#0F172A" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cardFree} testID="pro-membership-promo-card">
      <View style={styles.topRow}>
        <View style={styles.crownCircle}>
          <Ionicons name="sparkles" size={20} color="#D97706" />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.headline}>Unlock Calorify Pro</Text>
            <View style={styles.trialPill}>
              <Text style={styles.trialPillText}>7-DAY FREE TRIAL</Text>
            </View>
          </View>
          <Text style={styles.tagline}>
            AI food vision, adaptive calorie coaching, streak freeze & advanced trends.
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
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cardFree: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 12,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardPro: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
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
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  proIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
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
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  proTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  proSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  tagline: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#475569',
  },
  trialPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trialPillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 9,
    color: '#D97706',
    letterSpacing: 0.3,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 9,
    color: '#15803D',
    letterSpacing: 0.3,
  },
  upgradeBtn: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  upgradeBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  dividerPro: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expiryText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  manageBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

export default ProMembershipCard;
