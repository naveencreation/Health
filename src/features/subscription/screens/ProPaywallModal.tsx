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
                <Ionicons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.celebrationScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.celebrationBadgeCircle}>
                <Ionicons name="sparkles" size={42} color="#D97706" />
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
                    <Ionicons name="checkmark" size={15} color="#16A34A" />
                  </View>
                  <View style={styles.unlockedTextWrap}>
                    <Text style={styles.unlockedTitle}>Unlimited AI Meal Vision</Text>
                    <Text style={styles.unlockedDesc}>No daily scan limits. Snap photos of every dish and snack.</Text>
                  </View>
                </View>

                <View style={styles.unlockedRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={15} color="#16A34A" />
                  </View>
                  <View style={styles.unlockedTextWrap}>
                    <Text style={styles.unlockedTitle}>Dynamic Adaptive Coaching</Text>
                    <Text style={styles.unlockedDesc}>Weekly calorie & macro recalculation with Ria AI.</Text>
                  </View>
                </View>

                <View style={styles.unlockedRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={15} color="#16A34A" />
                  </View>
                  <View style={styles.unlockedTextWrap}>
                    <Text style={styles.unlockedTitle}>Deep 30-Day & Yearly Trends</Text>
                    <Text style={styles.unlockedDesc}>Full historical analytics, expenditure curves & projections.</Text>
                  </View>
                </View>

                <View style={styles.unlockedRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={15} color="#16A34A" />
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
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
                <Ionicons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
          {/* Hero Crown Badge */}
          <View style={styles.crownWrap}>
            <View style={styles.crownCircle}>
              <Ionicons name="star" size={32} color="#FFFFFF" />
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
              <Ionicons name="lock-open" size={14} color="#EA580C" />
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
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.purchaseBtnText}>
                  {selectedPlan.trialDays
                    ? `Start ${selectedPlan.trialDays}-Day Free Trial`
                    : 'Unlock Calorify Pro'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
    backgroundColor: '#FAF9F6',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
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
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  headline: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 26,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderCurve: 'continuous',
    marginBottom: 20,
  },
  highlightText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#EA580C',
  },
  benefitsList: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    gap: 12,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 2,
  },
  benefitDescription: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },
  choosePlanTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFBF9',
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
    color: '#FFFFFF',
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
    color: '#0F172A',
  },
  planBillingPeriod: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#64748B',
  },
  planPrice: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  planPerMonth: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#10B981',
  },
  statusBox: {
    width: '100%',
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginBottom: 16,
  },
  statusText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#334155',
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
    color: '#FFFFFF',
  },
  restoreBtn: {
    paddingVertical: 8,
    marginBottom: 20,
  },
  restoreBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#64748B',
  },
  termsNote: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
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
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  celebrationPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  celebrationPillText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#B45309',
    letterSpacing: 0.6,
  },
  celebrationHeadline: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationTagline: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  unlockedBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
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
    backgroundColor: '#DCFCE7',
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
    color: '#0F172A',
    marginBottom: 2,
  },
  unlockedDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
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
    color: '#FFFFFF',
  },
});

export default ProPaywallModal;
