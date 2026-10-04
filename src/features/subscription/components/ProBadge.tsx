import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

export interface ProBadgeProps {
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const ProBadge: React.FC<ProBadgeProps> = ({
  onPress,
  size = 'small',
}) => {
  const handlePress = async () => {
    await haptics.selection();
    if (onPress) onPress();
  };

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const badgeContent = (
    <View
      style={[
        styles.badge,
        isSmall && styles.badgeSmall,
        isLarge && styles.badgeLarge,
      ]}
    >
      <Ionicons
        name="star"
        size={isSmall ? 10 : isLarge ? 16 : 12}
        color="#FFFFFF"
      />
      <Text
        style={[
          styles.text,
          isSmall && styles.textSmall,
          isLarge && styles.textLarge,
        ]}
      >
        PRO
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Calorify Pro"
      >
        {badgeContent}
      </Pressable>
    );
  }

  return badgeContent;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 4,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  text: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  textSmall: {
    fontSize: 10,
  },
  textLarge: {
    fontSize: 14,
  },
});

export default ProBadge;
