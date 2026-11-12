import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import {
  SubscriptionPlanId,
  SUBSCRIPTION_PACKAGES,
  PLAN_NAMES,
  formatExpiry,
} from '@/services/payments/paymentService';
import { usePro } from '../hooks/usePro';
import { haptics } from '@/utils/haptics';
import {
  ProfileButton,
  SettingsRow,
  SettingsSection,
  SheetHeader,
  SheetNotice,
  profileCard,
  sheetStyles,
} from '@/components/profile/ProfileUI';

export interface ProPaywallModalProps {
  visible: boolean;
  onClose: () => void;
  highlightFeature?: string;
}

const PRO_BENEFITS: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}[] = [
  {
    icon: 'camera-outline',
    title: 'Unlimited food photos',
    description: 'Snap any meal and Ria estimates it',
  },
  {
    icon: 'sparkles-outline',
    title: 'Adaptive coaching',
    description: 'Targets adjust to your real progress',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Long-term trends',
    description: '30-day, monthly and yearly reports',
  },
];

const BenefitsSection: React.FC<{ title: string; checked?: boolean }> = ({ title, checked }) => (
  <SettingsSection title={title}>
    {PRO_BENEFITS.map(b => (
      <SettingsRow
        key={b.title}
        icon={checked ? 'checkmark' : b.icon}
        iconColor={Colors.primary}
        iconBackground={Colors.primaryLight}
        title={b.title}
        subtitle={checked ? undefined : b.description}
      />
    ))}
  </SettingsSection>
);

export const ProPaywallModal: React.FC<ProPaywallModalProps> = ({
  visible,
  onClose,
  highlightFeature,
}) => {
  const { isPro, activePlanId, expiresAt, purchasePlan, restorePurchases } = usePro();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('pro_annual');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [trialEndsOn, setTrialEndsOn] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (visible) {
      setPurchaseSuccess(false);
      setStatusMessage(null);
    }
    // A pending auto-close must not fire after the sheet is gone or reopened
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
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
        setTrialEndsOn(
          selectedPlan.trialDays
            ? new Date(Date.now() + selectedPlan.trialDays * 86400000).toLocaleDateString()
            : null
        );
        setPurchaseSuccess(true);
      } else {
        setStatusMessage({ kind: 'error', text: res.error || 'Purchase failed' });
      }
    } catch {
      setStatusMessage({ kind: 'error', text: 'Payment could not be completed.' });
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
        setStatusMessage({ kind: 'ok', text: 'Subscription restored.' });
        closeTimer.current = setTimeout(() => onClose(), 1200);
      } else {
        setStatusMessage({ kind: 'error', text: 'No active subscription found to restore.' });
      }
    } catch {
      setStatusMessage({ kind: 'error', text: 'Restore failed. Try again.' });
    } finally {
      setPurchasing(false);
    }
  };

  const selectedPlan =
    SUBSCRIPTION_PACKAGES.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PACKAGES[0];
  const ctaLabel = selectedPlan.trialDays
    ? `Start ${selectedPlan.trialDays}-day free trial`
    : 'Unlock Calorify Pro';

  const renderMember = (welcome: boolean) => {
    const planName = welcome ? PLAN_NAMES[selectedPlan.id] : activePlanId ? PLAN_NAMES[activePlanId] : 'Pro';
    const planDetail = welcome
      ? trialEndsOn
        ? `Free trial for ${selectedPlan.trialDays} days, then billed on ${trialEndsOn} unless you cancel`
        : 'Active now'
      : formatExpiry(expiresAt);
    return (
      <View style={styles.page} testID={welcome ? 'pro-celebration-card' : 'pro-status-view'}>
        <SheetHeader
          title="Calorify Pro"
          subtitle="Your membership"
          onClose={onClose}
          closeLabel={welcome ? 'Close Paywall' : 'Close'}
        />
        <ScrollView contentContainerStyle={sheetStyles.body} showsVerticalScrollIndicator={false}>
          <View style={[profileCard, styles.hero]}>
            <View style={styles.heroIcon}>
              <Ionicons name={welcome ? 'sparkles' : 'star'} size={24} color={Colors.warningDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.heroTitle} accessibilityRole="header">
                {welcome ? 'Welcome to Calorify Pro!' : 'Pro is active'}
              </Text>
              <Text style={styles.heroSubtitle}>Every Pro feature is unlocked</Text>
            </View>
          </View>

          <SettingsSection
            title="Plan"
            footer="Calorify can't change your subscription from inside the app."
          >
            <SettingsRow icon="calendar-outline" title={planName} subtitle={planDetail} />
            <SettingsRow
              icon="information-circle-outline"
              title="Change or cancel"
              subtitle="Managed in Google Play or the App Store"
            />
          </SettingsSection>

          <BenefitsSection title="Included" checked />
        </ScrollView>
        <View style={[sheetStyles.footer, styles.footer]}>
          <ProfileButton
            label={welcome ? 'Explore Pro features' : 'Done'}
            variant={welcome ? 'primary' : 'secondary'}
            onPress={async () => {
              await haptics.selection();
              onClose();
            }}
          />
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {purchaseSuccess ? (
          renderMember(true)
        ) : isPro ? (
          renderMember(false)
        ) : (
          <View style={styles.page}>
            <SheetHeader
              title="Calorify Pro"
              subtitle="You're on the free plan"
              onClose={onClose}
              closeLabel="Close Paywall"
            />
            <ScrollView contentContainerStyle={sheetStyles.body} showsVerticalScrollIndicator={false}>
              {highlightFeature ? (
                <View style={styles.highlight}>
                  <Ionicons name="lock-open-outline" size={16} color={Colors.textSlate700} />
                  <Text style={styles.highlightText}>Unlocks: {highlightFeature}</Text>
                </View>
              ) : null}

              <BenefitsSection title="What you get" />

              <SettingsSection title="Choose a plan">
                {SUBSCRIPTION_PACKAGES.map(plan => {
                  const isSelected = selectedPlanId === plan.id;
                  const detail = [
                    plan.priceFormatted,
                    // Skip the per-month figure when it only repeats the price ($4.99 / month)
                    plan.pricePerMonthFormatted &&
                    plan.pricePerMonthFormatted.split(' ')[0] !== plan.priceFormatted.split(' ')[0]
                      ? plan.pricePerMonthFormatted
                      : null,
                    plan.trialDays ? `${plan.trialDays}-day free trial` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Pressable
                      key={plan.id}
                      style={({ pressed }) => [
                        styles.planRow,
                        isSelected && styles.planRowSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleSelectPlan(plan.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected, checked: isSelected }}
                      accessibilityLabel={`${plan.title}, ${detail}${plan.badge ? `, ${plan.badge}` : ''}`}
                    >
                      <View style={styles.flex}>
                        <View style={styles.planTitleRow}>
                          <Text style={styles.planTitle}>{plan.title}</Text>
                          {plan.badge ? (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>{plan.badge}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.planDetail}>{detail}</Text>
                      </View>
                      <View style={[styles.radio, isSelected && styles.radioOn]}>
                        {isSelected ? <View style={styles.radioDot} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </SettingsSection>

              {statusMessage ? <SheetNotice kind={statusMessage.kind} text={statusMessage.text} /> : null}
            </ScrollView>

            <View style={[sheetStyles.footer, styles.footer]}>
              <ProfileButton
                label={ctaLabel}
                variant="primary"
                onPress={handlePurchase}
                loading={purchasing}
              />
              <Pressable
                style={({ pressed }) => [styles.restore, pressed && styles.pressed]}
                onPress={handleRestore}
                disabled={purchasing}
                accessibilityRole="button"
                accessibilityLabel="Restore Purchases"
              >
                <Text style={styles.restoreText}>Restore purchases</Text>
              </Pressable>
              <Text style={styles.terms}>
                Renews automatically unless you cancel at least 24 hours before the period ends.
                Cancel any time in Google Play or the App Store.
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background, alignItems: 'center' },
  // Web shows the app in a 480 px phone frame; keep the sheet inside it
  page: { flex: 1, width: '100%', maxWidth: 480 },
  flex: { flex: 1 },
  footer: { paddingBottom: 16 },
  pressed: { opacity: 0.85 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontFamily: Fonts.urbanist.extraBold, fontSize: 20, color: Colors.textPrimary },
  heroSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.primaryLight,
  },
  highlightText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSlate700 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  planRowSelected: { backgroundColor: Colors.surfaceLow },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  planTitle: { fontFamily: Fonts.urbanist.semiBold, fontSize: 15, color: Colors.textPrimary },
  planDetail: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderCurve: 'continuous',
    backgroundColor: Colors.warningLight,
  },
  badgeText: { fontFamily: Fonts.urbanist.bold, fontSize: 11, color: Colors.warningDark },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  restore: { height: 44, alignItems: 'center', justifyContent: 'center' },
  restoreText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSecondary },
  terms: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

export default ProPaywallModal;
