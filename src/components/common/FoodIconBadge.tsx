import { Colors } from '@/theme/colors';
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
      bgColor: Colors.primaryLight, iconColor: Colors.primary, borderColor: Colors.primaryLight,
    };
  }
  if (name.includes('dosa') || name.includes('uttapam')) {
    return {
      iconName: 'silverware-fork-knife' as const,
      bgColor: Colors.carbsLight, iconColor: Colors.carbsDark, borderColor: Colors.carbsBorder,
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
      bgColor: Colors.primaryLight, iconColor: Colors.primary, borderColor: Colors.primaryLight,
    };
  }
  if (name.includes('chai') || name.includes('tea') || name.includes('coffee')) {
    return {
      iconName: 'coffee-outline' as const,
      bgColor: Colors.fatLight, iconColor: Colors.fatDark, borderColor: Colors.fatBorder,
    };
  }
  if (name.includes('egg')) {
    return {
      iconName: 'egg-outline' as const,
      bgColor: Colors.carbsLight, iconColor: Colors.carbsDark, borderColor: Colors.carbsBorder,
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
      bgColor: Colors.proteinLight, iconColor: Colors.proteinDark, borderColor: Colors.proteinBorder,
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
      bgColor: Colors.carbsLight, iconColor: Colors.carbsDark, borderColor: Colors.carbsBorder,
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
      bgColor: Colors.carbsLight, iconColor: Colors.carbsDark, borderColor: Colors.carbsBorder,
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
      bgColor: Colors.proteinLight, iconColor: Colors.proteinDark, borderColor: Colors.proteinBorder,
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
      bgColor: Colors.fiberLight, iconColor: Colors.fiberDark, borderColor: Colors.fiberBorder,
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
      bgColor: Colors.waterLight, iconColor: Colors.water, borderColor: Colors.waterTrack,
    };
  }

  // Category fallbacks
  switch (category) {
    case 'south_indian':
      return {
        iconName: 'pot-steam-outline' as const,
        bgColor: Colors.primaryLight, iconColor: Colors.primary, borderColor: Colors.primaryLight,
      };
    case 'curries':
      return {
        iconName: 'bowl-mix-outline' as const,
        bgColor: Colors.proteinLight, iconColor: Colors.proteinDark, borderColor: Colors.proteinBorder,
      };
    case 'breads':
      return {
        iconName: 'bread-slice-outline' as const,
        bgColor: Colors.carbsLight, iconColor: Colors.carbsDark, borderColor: Colors.carbsBorder,
      };
    case 'rice':
      return {
        iconName: 'rice' as const,
        bgColor: Colors.carbsLight, iconColor: Colors.carbsDark, borderColor: Colors.carbsBorder,
      };
    case 'beverages':
      return {
        iconName: 'coffee-outline' as const,
        bgColor: Colors.fatLight, iconColor: Colors.fatDark, borderColor: Colors.fatBorder,
      };
    case 'fruits':
      return {
        iconName: 'food-apple-outline' as const,
        bgColor: Colors.fiberLight, iconColor: Colors.fiberDark, borderColor: Colors.fiberBorder,
      };
    case 'dairy':
      return {
        iconName: 'cup-water' as const,
        bgColor: Colors.waterLight, iconColor: Colors.water, borderColor: Colors.waterTrack,
      };
    case 'snacks':
      return {
        iconName: 'cookie-outline' as const,
        bgColor: Colors.primaryLight, iconColor: Colors.primary, borderColor: Colors.primaryLight,
      };
    default:
      return {
        iconName: 'food-outline' as const,
        bgColor: Colors.surfaceLow, iconColor: Colors.textSecondary, borderColor: Colors.surfaceInset,
      };
  }
};

export const FoodIconBadge: React.FC<FoodIconBadgeProps> = React.memo(
  ({ item, category, foodName, size = 42, iconSize, style }) => {
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
          backgroundColor={Colors.card}
          style={[{ borderWidth: 1, borderColor: Colors.borderInset }, style]}
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
  }
);
FoodIconBadge.displayName = 'FoodIconBadge';

const styles = StyleSheet.create({
  fallbackContainer: {
    borderWidth: 1,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
