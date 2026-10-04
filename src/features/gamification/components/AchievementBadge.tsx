import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { EvaluatedAchievement } from '../engine/AchievementEvaluator';
import { TIER_COLORS, BadgeTier } from '../engine/achievementRules';
import { haptics } from '@/utils/haptics';

export interface AchievementBadgeProps {
  achievement: EvaluatedAchievement;
  onPress?: (achievement: EvaluatedAchievement) => void;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({ achievement, onPress }) => {
  const { definition, isUnlocked, progressPercent, currentProgress, maxProgress } = achievement;
  const tierColor = TIER_COLORS[definition.tier] || TIER_COLORS.bronze;

  const handlePress = async () => {
    await haptics.selection();
    if (onPress) onPress(achievement);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isUnlocked ? styles.unlockedCard : styles.lockedCard,
        { borderColor: isUnlocked ? tierColor.border : 'rgba(15, 23, 42, 0.06)' },
        pressed && styles.cardPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${definition.title}, ${
        isUnlocked ? 'Unlocked' : `${progressPercent}% complete`
      }`}
    >
      {/* Left Icon Disc */}
      <View
        style={[
          styles.iconDisc,
          {
            backgroundColor: isUnlocked ? tierColor.bg : '#F1F5F9',
            borderColor: isUnlocked ? tierColor.border : '#E2E8F0',
          },
        ]}
      >
        <Ionicons
          name={definition.iconName as any}
          size={24}
          color={isUnlocked ? tierColor.primary : '#94A3B8'}
        />
        {isUnlocked && (
          <View style={[styles.miniCheckBadge, { backgroundColor: tierColor.primary }]}>
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Middle Content */}
      <View style={styles.contentWrap}>
        <View style={styles.topRow}>
          <Text
            style={[styles.title, { color: isUnlocked ? '#0F172A' : '#64748B' }]}
            numberOfLines={1}
          >
            {definition.title}
          </Text>

          {/* Tier Pill */}
          <View
            style={[
              styles.tierPill,
              {
                backgroundColor: isUnlocked ? tierColor.bg : '#F8FAFC',
                borderColor: isUnlocked ? tierColor.border : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.tierText, { color: isUnlocked ? tierColor.primary : '#94A3B8' }]}>
              {definition.tier.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {definition.description}
        </Text>

        {/* Progress Bar & Label */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isUnlocked ? tierColor.primary : '#CBD5E1',
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {isUnlocked ? 'Completed' : `${currentProgress} / ${maxProgress}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: 14,
    marginBottom: 12,
  },
  unlockedCard: {
    backgroundColor: '#FFFFFF',
  },
  lockedCard: {
    backgroundColor: '#FAFAFA',
    opacity: 0.85,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  contentWrap: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  description: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#94A3B8',
  },
});

export default AchievementBadge;
