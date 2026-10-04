import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { EvaluatedAchievement } from '../engine/AchievementEvaluator';
import { TIER_COLORS } from '../engine/achievementRules';
import { haptics } from '@/utils/haptics';

export interface CelebrationModalProps {
  visible: boolean;
  achievement: EvaluatedAchievement | null;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  visible,
  achievement,
  onClose,
}) => {
  useEffect(() => {
    if (visible && achievement) {
      haptics.success().catch(() => {});
    }
  }, [visible, achievement]);

  if (!achievement) return null;

  const { definition } = achievement;
  const tierColor = TIER_COLORS[definition.tier] || TIER_COLORS.bronze;

  const handleClaim = async () => {
    await haptics.impactMedium();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialogCard}>
          {/* Top Confetti / Sparkle Pill */}
          <View style={styles.sparkleWrap}>
            <View style={styles.sparklePill}>
              <Ionicons name="sparkles" size={14} color="#EA580C" />
              <Text style={styles.sparkleText}>TROPHY UNLOCKED!</Text>
            </View>
          </View>

          {/* Trophy Icon Sunburst */}
          <View
            style={[
              styles.sunburstDisc,
              { backgroundColor: tierColor.bg, borderColor: tierColor.border },
            ]}
          >
            <Ionicons name={definition.iconName as any} size={48} color={tierColor.primary} />
          </View>

          {/* Tier Label */}
          <View
            style={[
              styles.tierTag,
              { backgroundColor: tierColor.bg, borderColor: tierColor.border },
            ]}
          >
            <Text style={[styles.tierTagText, { color: tierColor.primary }]}>
              {definition.tier.toUpperCase()} TIER
            </Text>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>{definition.title}</Text>
          <Text style={styles.description}>{definition.description}</Text>

          {/* Claim Trophy Button */}
          <Pressable
            style={({ pressed }) => [styles.claimBtn, pressed && styles.btnPressed]}
            onPress={handleClaim}
            accessibilityRole="button"
            accessibilityLabel="Claim Trophy"
          >
            <Text style={styles.claimBtnText}>Claim Trophy</Text>
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  sparkleWrap: {
    marginBottom: 16,
  },
  sparklePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  sparkleText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#EA580C',
    letterSpacing: 0.8,
  },
  sunburstDisc: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tierTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  tierTagText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  description: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  claimBtn: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  claimBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default CelebrationModal;
