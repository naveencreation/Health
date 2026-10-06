import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ProFeature } from '@/services/payments/paymentService';
import { usePro } from '../hooks/usePro';
import { ProBadge } from './ProBadge';
import { ProPaywallModal } from '../screens/ProPaywallModal';
import { haptics } from '@/utils/haptics';

export interface ProGateProps {
  feature: ProFeature;
  featureName?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProGate: React.FC<ProGateProps> = ({
  feature,
  featureName = 'Premium Feature',
  children,
  fallback,
}) => {
  const { isPro, loading } = usePro();
  const [paywallVisible, setPaywallVisible] = useState(false);

  if (loading) {
    return <View>{children}</View>;
  }

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const handleOpenPaywall = async () => {
    await haptics.impactMedium();
    setPaywallVisible(true);
  };

  return (
    <>
      <View style={styles.gateCard}>
        <View style={styles.topRow}>
          <ProBadge size="small" />
          <Ionicons name="lock-closed" size={16} color="#94A3B8" />
        </View>

        <Text style={styles.title}>{featureName}</Text>
        <Text style={styles.subtitle}>
          Upgrade to Calorify Pro to unlock unlimited access to this feature.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.unlockBtn, pressed && styles.btnPressed]}
          onPress={handleOpenPaywall}
          accessibilityRole="button"
          accessibilityLabel={`Unlock ${featureName} with Pro`}
        >
          <Text style={styles.unlockBtnText}>Unlock with Pro</Text>
          <Ionicons name="sparkles" size={14} color="#FFFFFF" />
        </Pressable>
      </View>

      <ProPaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        highlightFeature={featureName}
      />
    </>
  );
};

const styles = StyleSheet.create({
  gateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  unlockBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 6,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  unlockBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});

export default ProGate;
