import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FoodItem } from '@/types';
import { getFoodImageSource } from '@/assets/foodImages';
import { FoodImage } from './FoodImage';

export interface FoodIconBadgeProps {
  item?: Partial<FoodItem> | null;
  category?: string;
  foodName?: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

// Food photo registry is powered by offline bundled LOCAL_FOOD_IMAGES
export const FOOD_PHOTO_REGISTRY: Record<string, string> = {};

// Vector Fallback Theme Generator
export const getFoodIconTheme = (
  item?: Partial<FoodItem> | null,
  fallbackCategory?: string,
  fallbackName?: string
) => {
  const name = (item?.name || fallbackName || '').toLowerCase();
  const category = (item?.category || fallbackCategory || '').toLowerCase();

  // High-priority keyword matches
  if (name.includes('idli') || name.includes('dhokla') || name.includes('steamed')) {
    return {
      iconName: 'pot-steam-outline' as const,
      bgColor: '#FFF7ED',
      iconColor: '#EA580C',
      borderColor: '#FFEDD5',
    };
  }
  if (name.includes('dosa') || name.includes('uttapam')) {
    return {
      iconName: 'silverware-fork-knife' as const,
      bgColor: '#FEF3C7',
      iconColor: '#D97706',
      borderColor: '#FDE68A',
    };
  }
  if (
    name.includes('vada') ||
    name.includes('pakora') ||
    name.includes('samosa') ||
    name.includes('snack')
  ) {
    return {
      iconName: 'cookie-outline' as const,
      bgColor: '#FFF7ED',
      iconColor: '#EA580C',
      borderColor: '#FFEDD5',
    };
  }
  if (name.includes('chai') || name.includes('tea') || name.includes('coffee')) {
    return {
      iconName: 'coffee-outline' as const,
      bgColor: '#FAF5FF',
      iconColor: '#7C3AED',
      borderColor: '#F3E8FF',
    };
  }
  if (name.includes('egg')) {
    return {
      iconName: 'egg-outline' as const,
      bgColor: '#FEF3C7',
      iconColor: '#D97706',
      borderColor: '#FDE68A',
    };
  }
  if (
    name.includes('chicken') ||
    name.includes('fish') ||
    name.includes('mutton') ||
    name.includes('meat')
  ) {
    return {
      iconName: 'food-drumstick-outline' as const,
      bgColor: '#FFF1F2',
      iconColor: '#E11D48',
      borderColor: '#FFE4E6',
    };
  }
  if (
    name.includes('rice') ||
    name.includes('biryani') ||
    name.includes('pulao') ||
    name.includes('khichdi')
  ) {
    return {
      iconName: 'rice' as const,
      bgColor: '#FFFBEB',
      iconColor: '#B45309',
      borderColor: '#FEF3C7',
    };
  }
  if (
    name.includes('roti') ||
    name.includes('chapati') ||
    name.includes('paratha') ||
    name.includes('naan') ||
    name.includes('bread') ||
    name.includes('toast')
  ) {
    return {
      iconName: 'bread-slice-outline' as const,
      bgColor: '#FEFCE8',
      iconColor: '#CA8A04',
      borderColor: '#FEF08A',
    };
  }
  if (
    name.includes('dal') ||
    name.includes('sambar') ||
    name.includes('curry') ||
    name.includes('paneer') ||
    name.includes('chole') ||
    name.includes('rajma')
  ) {
    return {
      iconName: 'bowl-mix-outline' as const,
      bgColor: '#FEF2F2',
      iconColor: '#DC2626',
      borderColor: '#FEE2E2',
    };
  }
  if (
    name.includes('apple') ||
    name.includes('banana') ||
    name.includes('fruit') ||
    name.includes('papaya')
  ) {
    return {
      iconName: 'food-apple-outline' as const,
      bgColor: '#ECFDF5',
      iconColor: '#059669',
      borderColor: '#D1FAE5',
    };
  }
  if (
    name.includes('milk') ||
    name.includes('curd') ||
    name.includes('dahi') ||
    name.includes('water') ||
    name.includes('chaas')
  ) {
    return {
      iconName: 'cup-water' as const,
      bgColor: '#F0F9FF',
      iconColor: '#0284C7',
      borderColor: '#E0F2FE',
    };
  }

  // Category fallbacks
  switch (category) {
    case 'south_indian':
      return {
        iconName: 'pot-steam-outline' as const,
        bgColor: '#FFF7ED',
        iconColor: '#EA580C',
        borderColor: '#FFEDD5',
      };
    case 'curries':
      return {
        iconName: 'bowl-mix-outline' as const,
        bgColor: '#FEF2F2',
        iconColor: '#DC2626',
        borderColor: '#FEE2E2',
      };
    case 'breads':
      return {
        iconName: 'bread-slice-outline' as const,
        bgColor: '#FEFCE8',
        iconColor: '#CA8A04',
        borderColor: '#FEF08A',
      };
    case 'rice':
      return {
        iconName: 'rice' as const,
        bgColor: '#FFFBEB',
        iconColor: '#B45309',
        borderColor: '#FEF3C7',
      };
    case 'beverages':
      return {
        iconName: 'coffee-outline' as const,
        bgColor: '#FAF5FF',
        iconColor: '#7C3AED',
        borderColor: '#F3E8FF',
      };
    case 'fruits':
      return {
        iconName: 'food-apple-outline' as const,
        bgColor: '#ECFDF5',
        iconColor: '#059669',
        borderColor: '#D1FAE5',
      };
    case 'dairy':
      return {
        iconName: 'cup-water' as const,
        bgColor: '#F0F9FF',
        iconColor: '#0284C7',
        borderColor: '#E0F2FE',
      };
    case 'snacks':
      return {
        iconName: 'cookie-outline' as const,
        bgColor: '#FFF7ED',
        iconColor: '#EA580C',
        borderColor: '#FFEDD5',
      };
    default:
      return {
        iconName: 'food-outline' as const,
        bgColor: '#F8FAFC',
        iconColor: '#64748B',
        borderColor: '#F1F5F9',
      };
  }
};

export const FoodIconBadge: React.FC<FoodIconBadgeProps> = React.memo(({
  item,
  category,
  foodName,
  size = 42,
  iconSize,
  style,
}) => {

  const imageSource = getFoodImageSource(
    item
      ? { id: item.id, name: item.name, imageUrl: item.imageUrl }
      : foodName
      ? { name: foodName }
      : null
  );

  const radius = Math.round(size * 0.28);

  // 1. Primary: Real Food Photography Thumbnail via FoodImage
  if (imageSource) {
    return (
      <FoodImage
        source={imageSource}
        aspectRatio={1}
        contentFit="cover"
        width={size}
        borderRadius={radius}
        backgroundColor="#FFFFFF"
        style={[{ borderWidth: 1, borderColor: '#E2E8F0' }, style]}
        recyclingKey={item?.id}
      />
    );
  }

  // 2. Graceful Fallback: Themed Vector Badge
  const theme = getFoodIconTheme(item, category, foodName);
  const calculatedIconSize = iconSize || Math.round(size * 0.52);

  return (
    <View
      style={[
        styles.fallbackContainer,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.bgColor,
          borderColor: theme.borderColor,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={theme.iconName}
        size={calculatedIconSize}
        color={theme.iconColor}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  fallbackContainer: {
    borderWidth: 1,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
