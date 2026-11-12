import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { EvaluatedAchievement } from '../engine/AchievementEvaluator';
import { TIER_COLORS } from '../engine/achievementRules';
import { haptics } from '@/utils/haptics';
import { ProfileButton, dialogCard, sheetStyles } from '@/components/profile/ProfileUI';

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
  const tierLabel = definition.tier.charAt(0).toUpperCase() + definition.tier.slice(1);

  const handleClose = async () => {
    await haptics.impactMedium();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sheetStyles.centeredScrim}>
        <Pressable
          style={sheetStyles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View
          style={[dialogCard, styles.card]}
          accessibilityViewIsModal
          accessibilityLabel={`Badge unlocked: ${definition.title}, ${tierLabel} tier`}
        >
          <Text style={styles.eyebrow}>Badge unlocked</Text>

          <View
            style={[styles.disc, { backgroundColor: tierColor.bg, borderColor: tierColor.border }]}
          >
            <Ionicons
              name={definition.iconName as keyof typeof Ionicons.glyphMap}
              size={44}
              color={tierColor.primary}
            />
          </View>

          {/* Tier colours are too light for text, so the label stays slate on the tier tint */}
          <View style={[styles.tier, { backgroundColor: tierColor.bg, borderColor: tierColor.border }]}>
            <Text style={styles.tierText}>{tierLabel}</Text>
          </View>

          <Text style={styles.title} accessibilityRole="header">
            {definition.title}
          </Text>
          <Text style={[sheetStyles.dialogMessage, styles.description]}>
            {definition.description}
          </Text>

          <ProfileButton
            label="Keep going"
            variant="primary"
            onPress={handleClose}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingTop: 28 },
  eyebrow: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSecondary },
  disc: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 14,
    elevation: 0,
  },
  tier: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  tierText: { fontFamily: Fonts.urbanist.bold, fontSize: 12, color: Colors.textSlate700 },
  title: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 12,
  },
  description: { marginTop: 6, paddingHorizontal: 8 },
  button: { alignSelf: 'stretch', marginTop: 24 },
});

export default CelebrationModal;
