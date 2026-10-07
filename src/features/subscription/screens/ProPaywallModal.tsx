import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { SubscriptionPlanId, SUBSCRIPTION_PACKAGES } from '@/services/payments/paymentService';
import { usePro } from '../hooks/usePro';
import { haptics } from '@/utils/haptics';

export interface ProPaywallModalProps {
  visible: boolean;
  onClose: () => void;
  highlightFeature?: string;
}

const PRO_BENEFITS = [
  {
    icon: 'camera',
    title: 'Unlimited AI Meal Vision',
    description: 'Instant photo nutrition recognition & portion estimation with Ria AI.',
  },
  {
    icon: 'sparkles',
    title: 'Adaptive Macro Coaching',
    description: 'Dynamic daily calorie and metabolic adjustments tailored to your progress.',
  },
  {
    icon: 'stats-chart',
    title: 'Deep Metabolic Trends',
    description: 'Consolidated 30-day, monthly, and annual nutrition & energy expenditure graphs.',
  },
  {
    icon: 'cloud-done',
    title: 'Priority Cloud Backup',
    description: 'End-to-end encrypted backup and instant synchronization across all your devices.',
  },
];

export const ProPaywallModal: React.FC<ProPaywallModalProps> = ({
  visible,
  onClose,
  highlightFeature,
}) => {
  const { purchasePlan, restorePurchases } = usePro();
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('pro_annual');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPurchaseSuccess(false);
      setStatusMessage(null);
    }
  }, [visible]);

  const handleSelectPlan = async (id: SubscriptionPlanId) => {
    await haptics.selection();
    setSelectedPlanId(id);
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    setStatusMessage(null);
    try {
      const res = await purchasePlan(selectedPlanId);
      if (res.success) {
        await haptics.success();
        setPurchaseSuccess(true);
      } else {
        setStatusMessage(res.error || 'Purchase failed');
      }
    } catch {
      setStatusMessage('Payment could not be completed.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    setStatusMessage(null);
    try {
      const res = await restorePurchases();
      if (res.restored) {
        setStatusMessage('Subscription restored successfully!');
        setTimeout(() => onClose(), 1200);
      } else {
        setStatusMessage('No active subscription found to restore.');
      }
    } catch {
      setStatusMessage('Restore operation failed.');
    } finally {
      setPurchasing(false);
    }
  };

  const selectedPlan =
    SUBSCRIPTION_PACKAGES.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PACKAGES[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {purchaseSuccess ? (
          <View style={styles.celebrationWrapper} testID="pro-celebration-card">
            {/* Top Bar with Close Button */}
            <View style={styles.topBar}>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close Paywall"
              >
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.celebrationScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.celebrationBadgeCircle}>
                <Ionicons name="sparkles" size={42} color={Colors.warningDark} />
              </View>

              <View style={styles.celebrationPill}>
                <Text style={styles.celebrationPillText}>VIP ACCESS ACTIVATED</Text>
              </View>

              <Text style={styles.celebrationHeadline}>Welcome to Calorify Pro!</Text>
              <Text style={styles.celebrationTagline}>
                {selectedPlan.trialDays
                  ? `Your ${selectedPlan.trialDays}-day free trial is now active. Billed on ${new Date(Date.now() + 7 * 86400000).toLocaleDateString()} unless canceled.`
                  : 'Your unlimited VIP membership is now fully active.'}
              </Text>

              {/* Unlocked Perks List */}
              <View style={styles.unlockedBox}>
                <View style={styles.unlockedRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={15} color={Colors.success} />
                  </View>
                  <View style={styles.unlockedTextWrap}>
                    <Text style={styles.unlockedTitle}>Unlimited AI Meal Vision</Text>
                    <Text style={styles.unlockedDesc}>No daily scan limits. Snap photos of every dish and snack.</Text>
                  </View>
                </View>

                <View style={styles.unlockedRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={15} color={Colors.success} />
                  </View>
                  <View style={styles.unlockedTextWrap}>
                    <Text style={styles.unlockedTitle}>Dynamic Adaptive Coaching</Text>
                    <Text style={styles.unlockedDesc}>Weekly calorie & macro recalculation with Ria AI.</Text>
                  </View>
                </View>

                <View style={styles.unlockedRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={15} color={Colors.success} />
                  </View>
                  <View style={styles.unlockedTextWrap}>
                    <Text style={styles.unlockedTitle}>Deep 30-Day & Yearly Trends</Text>
                    <Text style={styles.unlockedDesc}>Full historical analytics, expenditure curves & projections.</Text>
                  </View>
                </View>

                <View style={styles.unlockedRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={15} color={Colors.success} />
                  </View>
                  <View style={styles.unlockedTextWrap}>
                    <Text style={styles.unlockedTitle}>Streak Freeze Protection</Text>
                    <Text style={styles.unlockedDesc}>Automatic streak recovery keeps your consistency intact.</Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.exploreBtn, pressed && styles.btnPressed]}
                onPress={async () => {
                  await haptics.selection();
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Explore Pro Features"
              >
                <Text style={styles.exploreBtnText}>Explore Pro Features</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.onPrimary} />
              </Pressable>
            </ScrollView>
          </View>
        ) : (
          <>
            {/* Top Bar with Close Button */}
            <View style={styles.topBar}>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close Paywall"
              >
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
          {/* Hero Crown Badge */}
          <View style={styles.crownWrap}>
            <View style={styles.crownCircle}>
              <Ionicons name="star" size={32} color={Colors.onPrimary} />
            </View>
          </View>

          {/* Headline & Subtitle */}
          <Text style={styles.headline}>Unlock Calorify Pro</Text>
          <Text style={styles.subtitle}>
            Experience the full power of AI nutrition scanning, deep metabolic analytics, and streak
            protection.
          </Text>

          {highlightFeature && (
            <View style={styles.highlightPill}>
              <Ionicons name="lock-open" size={14} color={Colors.primary} />
              <Text style={styles.highlightText}>Unlocks: {highlightFeature}</Text>
            </View>
          )}

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            {PRO_BENEFITS.map((b, idx) => (
              <View key={idx} style={styles.benefitCard}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={b.icon as any} size={20} color={Colors.primary} />
                </View>
                <View style={styles.benefitTextWrap}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDescription}>{b.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Subscription Plans */}
          <Text style={styles.choosePlanTitle}>Choose Your Plan</Text>
          <View style={styles.planList}>
            {SUBSCRIPTION_PACKAGES.map(plan => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                  onPress={() => handleSelectPlan(plan.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  {plan.badge && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}

                  <View style={styles.planCardHeader}>
                    <View style={styles.planRadioCircle}>
                      {isSelected && <View style={styles.planRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle}>{plan.title}</Text>
                      <Text style={styles.planBillingPeriod}>{plan.billingPeriod}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.planPrice}>{plan.priceFormatted}</Text>
                      {plan.pricePerMonthFormatted && (
                        <Text style={styles.planPerMonth}>{plan.pricePerMonthFormatted}</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Status Message */}
          {statusMessage && (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.purchaseBtn,
              (purchasing || pressed) && styles.btnPressed,
            ]}
            onPress={handlePurchase}
            disabled={purchasing}
            accessibilityRole="button"
            accessibilityLabel="Unlock Calorify Pro"
          >
            {purchasing ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <>
                <Text style={styles.purchaseBtnText}>
                  {selectedPlan.trialDays
                    ? `Start ${selectedPlan.trialDays}-Day Free Trial`
                    : 'Unlock Calorify Pro'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.onPrimary} />
              </>
            )}
          </Pressable>

          {/* Restore Purchases */}
          <Pressable
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={purchasing}
            accessibilityRole="button"
            accessibilityLabel="Restore Purchases"
          >
            <Text style={styles.restoreBtnText}>Restore Purchases</Text>
          </Pressable>

          {/* Terms and Privacy Footnote */}
          <Text style={styles.termsNote}>
            Cancel anytime in your Google Play Store or App Store settings. Subscription
            automatically renews unless canceled at least 24 hours before the end of the current
            period.
          </Text>
          </ScrollView>
        </>
      )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
  },
  crownWrap: {
    marginBottom: 16,
  },
  crownCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  headline: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.stepsLight,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderCurve: 'continuous',
    marginBottom: 20,
  },
  highlightText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  benefitsList: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    gap: 12,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.stepsLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  benefitDescription: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  choosePlanTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  planList: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    color: Colors.onPrimary,
    letterSpacing: 0.5,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  planTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  planBillingPeriod: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  planPrice: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  planPerMonth: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.weightLoss,
  },
  statusBox: {
    width: '100%',
    padding: 12,
    backgroundColor: Colors.surfaceInset,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSlate700,
    textAlign: 'center',
  },
  purchaseBtn: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  purchaseBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.onPrimary,
  },
  restoreBtn: {
    paddingVertical: 8,
    marginBottom: 20,
  },
  restoreBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  termsNote: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  celebrationWrapper: {
    flex: 1,
  },
  celebrationScroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  celebrationBadgeCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.carbsLight,
    borderWidth: 2,
    borderColor: Colors.carbsBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  celebrationPill: {
    backgroundColor: Colors.carbsLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.carbsBorder,
    marginBottom: 12,
  },
  celebrationPillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.warningDark,
    letterSpacing: 0.6,
  },
  celebrationHeadline: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationTagline: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  unlockedBox: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 16,
    marginBottom: 28,
  },
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.proteinLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  unlockedTextWrap: {
    flex: 1,
  },
  unlockedTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  unlockedDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  exploreBtn: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.onPrimary,
  },
});

export default ProPaywallModal;
