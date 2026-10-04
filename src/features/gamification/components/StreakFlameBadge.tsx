import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

export interface StreakFlameBadgeProps {
  streakDays: number;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const StreakFlameBadge: React.FC<StreakFlameBadgeProps> = ({
  streakDays,
  onPress,
  size = 'medium',
}) => {
  const handlePress = async () => {
    await haptics.impactLight();
    if (onPress) onPress();
  };

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.badge,
        isSmall && styles.badgeSmall,
        isLarge && styles.badgeLarge,
        pressed && styles.badgePressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${streakDays} day streak`}
    >
      <View
        style={[
          styles.flameCircle,
          isSmall && styles.flameCircleSmall,
          isLarge && styles.flameCircleLarge,
        ]}
      >
        <Ionicons
          name="flame"
          size={isSmall ? 14 : isLarge ? 20 : 16}
          color="#FF5722"
        />
      </View>

      <View style={styles.textWrap}>
        <Text
          style={[
            styles.countText,
            isSmall && styles.countTextSmall,
            isLarge && styles.countTextLarge,
          ]}
        >
          {streakDays}
        </Text>
        {!isSmall && (
          <Text style={styles.labelSubText}>
            {streakDays === 1 ? 'DAY' : 'DAYS'}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderCurve: 'continuous',
    gap: 6,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 8,
  },
  badgePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  flameCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameCircleSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  flameCircleLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  textWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  countText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: '#EA580C',
  },
  countTextSmall: {
    fontSize: 12,
  },
  countTextLarge: {
    fontSize: 18,
  },
  labelSubText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    color: '#F97316',
    letterSpacing: 0.5,
  },
});

export default StreakFlameBadge;
