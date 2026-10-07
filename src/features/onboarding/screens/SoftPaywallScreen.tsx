import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { usePro } from '@/features/subscription/hooks/usePro';
import {
  SubscriptionPlanId,
  SUBSCRIPTION_PACKAGES,
} from '@/services/payments/paymentService';
import { CalculatedHealthPlan } from '../services/onboardingCalculator';

export interface SoftPaywallScreenProps {
  name?: string;
  plan: CalculatedHealthPlan;
  onContinue: () => void;
  onSkip: () => void;
  onBack?: () => void;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const PRO_VALUE_PILLARS = [
  {
    id: 'vision',
    icon: 'camera',
    title: 'Unlimited AI Meal Vision',
    description: 'No 5-scan daily limit. Snap photos of every dish, snack, and beverage instantly.',
    accentColor: Colors.primary,
    bgColor: Colors.primaryLight,
  },
  {
    id: 'coaching',
    icon: 'sparkles',
    title: 'Dynamic Adaptive Coaching',
    description: 'Ria AI recalculates your calories and macros weekly based on your real metabolic pace.',
    accentColor: Colors.proteinDark,
    bgColor: Colors.proteinLight,
  },
  {
    id: 'analytics',
    icon: 'stats-chart',
    title: '30-Day Deep Trend Graphs',
    description: 'Interactive expenditure curves, micronutrient radar, and projected weight timeline.',
    accentColor: Colors.water,
    bgColor: Colors.waterTrack,
  },
  {
    id: 'backup',
    icon: 'shield-checkmark',
    title: 'Priority Backup & Sync',
    description: 'Never lose a single meal log, water record, or streak day across your devices.',
    accentColor: Colors.fiberDark,
    bgColor: Colors.fiberLight,
  },
];

export const SoftPaywallScreen: React.FC<SoftPaywallScreenProps> = ({
  name,
  plan,
  onContinue,
  onSkip,
  onBack,
}) => {
  const { purchasePlan, restorePurchases } = usePro();
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('pro_annual');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayName = name?.trim() ? name.trim() : 'friend';

  const handleSelectPlan = async (id: SubscriptionPlanId) => {
    await haptics.selection();
    setSelectedPlanId(id);
    setErrorMessage(null);
  };

  const handleStartTrial = async () => {
    await haptics.impactMedium();
    setIsPurchasing(true);
    setErrorMessage(null);
    try {
      const res = await purchasePlan(selectedPlanId);
      if (res.success) {
        await haptics.success();
        onContinue();
      } else {
        setErrorMessage(res.error || 'Trial could not be activated.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment service unavailable.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSkip = async () => {
    await haptics.selection();
    onSkip();
  };

  const handleRestore = async () => {
    await haptics.selection();
    setIsPurchasing(true);
    setErrorMessage(null);
    try {
      const res = await restorePurchases();
      if (res.restored) {
        await haptics.success();
        onContinue();
      } else {
        setErrorMessage('No previous active subscription found.');
      }
    } catch {
      setErrorMessage('Restore failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const annualPkg = SUBSCRIPTION_PACKAGES.find(p => p.id === 'pro_annual');
  const monthlyPkg = SUBSCRIPTION_PACKAGES.find(p => p.id === 'pro_monthly');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.phoneFrame}>
        {/* Top Header Row with Back Button and Trial Badge */}
        <View style={styles.topHeaderRow}>
          {onBack ? (
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
              onPress={async () => {
                await haptics.selection();
                onBack();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              testID="btn-paywall-back"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}

          <View style={styles.badge}>
            <Ionicons name="sparkles" size={13} color={Colors.primary} />
            <Text style={styles.badgeText}>7-DAY FREE TRIAL</Text>
          </View>

          {/* Right Skip Button */}
          <Pressable
            style={({ pressed }) => [styles.skipHeaderBtn, pressed && styles.btnPressed]}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip paywall"
            testID="btn-paywall-skip-header"
          >
            <Text style={styles.skipHeaderText}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Block */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Accelerate your plan, {displayName}.</Text>
            <Text style={styles.subtitle}>
              Members with Pro hit their target {plan.dailyCalorieBudget} kcal budget 2.3x more
              consistently with zero logging limits.
            </Text>
          </View>

          {/* Personalized Plan Chip */}
          <View style={styles.planChip}>
            <View style={styles.planChipDot} />
            <Text style={styles.planChipText}>
              Calibrated for {displayName} · {plan.dailyCalorieBudget} kcal/day target
            </Text>
          </View>

          {/* 4 Value Pillars */}
          <View style={styles.pillarsList}>
            {PRO_VALUE_PILLARS.map(item => (
              <View key={item.id} style={styles.pillarCard}>
                <View style={[styles.pillarIconBox, { backgroundColor: item.bgColor }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.accentColor} />
                </View>
                <View style={styles.pillarContent}>
                  <Text style={styles.pillarTitle}>{item.title}</Text>
                  <Text style={styles.pillarDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Trust Timeline Visualizer */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineHeader}>HOW YOUR FREE TRIAL WORKS</Text>
            <View style={styles.timelineRow}>
              <View style={styles.timelineNode}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineInfo}>
                <Text style={styles.timelineNodeTitle}>Today</Text>
                <Text style={styles.timelineNodeSub}>
                  Instant full Pro access. Cost: $0.00 today.
                </Text>
              </View>
            </View>

            <View style={styles.timelineRow}>
              <View style={styles.timelineNode}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineInfo}>
                <Text style={styles.timelineNodeTitle}>Day 5</Text>
                <Text style={styles.timelineNodeSub}>
                  Gentle reminder notification before your trial ends.
                </Text>
              </View>
            </View>

            <View style={styles.timelineRow}>
              <View style={styles.timelineNode}>
                <View style={styles.timelineDot} />
              </View>
              <View style={styles.timelineInfo}>
                <Text style={styles.timelineNodeTitle}>Day 7</Text>
                <Text style={styles.timelineNodeSub}>
                  Billed only if you love it. Cancel anytime with 1 tap.
                </Text>
              </View>
            </View>
          </View>

          {/* Plan Selection Cards */}
          <View style={styles.plansContainer}>
            {/* Annual Plan (Best Value with Trial) */}
            {annualPkg && (
              <Pressable
                onPress={() => handleSelectPlan('pro_annual')}
                style={[
                  styles.planOptionCard,
                  selectedPlanId === 'pro_annual' && styles.planOptionCardSelected,
                ]}
                testID="plan-option-annual"
                accessibilityRole="button"
                accessibilityLabel="Select Annual Plan"
              >
                <View style={styles.planHeaderRow}>
                  <View style={styles.planRadioRow}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedPlanId === 'pro_annual' && styles.radioOuterSelected,
                      ]}
                    >
                      {selectedPlanId === 'pro_annual' && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.planTitleText}>Annual Plan</Text>
                      <Text style={styles.planSubText}>7 days free, then {annualPkg.priceFormatted}</Text>
                    </View>
                  </View>
                  <View style={styles.badgeSavings}>
                    <Text style={styles.badgeSavingsText}>SAVE 50%</Text>
                  </View>
                </View>
                <Text style={styles.perMonthText}>{annualPkg.pricePerMonthFormatted} · Billed yearly</Text>
              </Pressable>
            )}

            {/* Monthly Plan */}
            {monthlyPkg && (
              <Pressable
                onPress={() => handleSelectPlan('pro_monthly')}
                style={[
                  styles.planOptionCard,
                  selectedPlanId === 'pro_monthly' && styles.planOptionCardSelected,
                ]}
                testID="plan-option-monthly"
                accessibilityRole="button"
                accessibilityLabel="Select Monthly Plan"
              >
                <View style={styles.planHeaderRow}>
                  <View style={styles.planRadioRow}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedPlanId === 'pro_monthly' && styles.radioOuterSelected,
                      ]}
                    >
                      {selectedPlanId === 'pro_monthly' && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.planTitleText}>Monthly Plan</Text>
                      <Text style={styles.planSubText}>{monthlyPkg.priceFormatted}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.perMonthText}>Flexible monthly billing · Cancel anytime</Text>
              </Pressable>
            )}
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.dangerDark} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Action Footer */}
          <View style={styles.actionSection}>
            <Pressable
              onPress={handleStartTrial}
              disabled={isPurchasing}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Start 7-Day Free Trial"
              testID="btn-start-trial"
            >
              {isPurchasing ? (
                <ActivityIndicator color={Colors.onPrimary} size="small" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {selectedPlanId === 'pro_annual' ? 'Start 7-Day Free Trial' : 'Upgrade to Pro'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.onPrimary} />
                </>
              )}
            </Pressable>

            {/* Zero-Pressure Dismiss Link */}
            <Pressable
              onPress={handleSkip}
              disabled={isPurchasing}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Free Plan"
              testID="btn-continue-free"
            >
              <Text style={styles.ghostBtnText}>Continue with Free Plan</Text>
            </Pressable>

            {/* Legal & Restore row */}
            <View style={styles.legalRow}>
              <Pressable onPress={handleRestore} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} testID="btn-restore-purchases">
                <Text style={styles.legalLink}>Restore</Text>
              </Pressable>
              <Text style={styles.legalDivider}>·</Text>
              <Pressable
                onPress={() => Linking.openURL('https://calorify.app/terms')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.legalLink}>Terms</Text>
              </Pressable>
              <Text style={styles.legalDivider}>·</Text>
              <Pressable
                onPress={() => Linking.openURL('https://calorify.app/privacy')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.legalLink}>Privacy</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.stepsBorder,
  },
  badgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.primaryDeep,
    letterSpacing: 0.5,
  },
  skipHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipHeaderText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  planChipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
  },
  planChipText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSlate700,
  },
  pillarsList: {
    gap: 12,
    marginBottom: 22,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    padding: 14,
    gap: 14,
  },
  pillarIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarContent: {
    flex: 1,
  },
  pillarTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  pillarDescription: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  timelineCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    padding: 16,
    marginBottom: 22,
  },
  timelineHeader: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 46,
  },
  timelineNode: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.borderMedium,
    marginTop: 3,
  },
  timelineDotActive: {
    backgroundColor: Colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.borderInset,
    marginVertical: 4,
  },
  timelineInfo: {
    flex: 1,
    paddingBottom: 10,
  },
  timelineNodeTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  timelineNodeSub: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 20,
  },
  planOptionCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    padding: 16,
  },
  planOptionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  planRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  planTitleText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  planSubText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  badgeSavings: {
    backgroundColor: Colors.proteinLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  badgeSavingsText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.proteinDark,
    letterSpacing: 0.3,
  },
  perMonthText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 32,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 8,
    borderCurve: 'continuous',
    marginBottom: 16,
  },
  errorText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.dangerDark,
    flex: 1,
  },
  actionSection: {
    gap: 12,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.onPrimary,
  },
  ghostBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  legalLink: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  legalDivider: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textLight,
  },
});

export default SoftPaywallScreen;
