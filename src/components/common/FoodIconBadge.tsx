import { Colors } from '@/theme/colors';
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FoodItem } from '@/types';
import { getFoodImageSource, FoodImageResolvable } from '@/assets/foodImages';
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

export interface FoodIconTheme {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

const CATEGORY_THEMES: Record<string, FoodIconTheme> = {
  south_indian: {
    iconName: 'pot-steam-outline',
    bgColor: Colors.primaryLight,
    iconColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  curries: {
    iconName: 'bowl-mix-outline',
    bgColor: Colors.proteinLight,
    iconColor: Colors.proteinDark,
    borderColor: Colors.proteinBorder,
  },
  breads: {
    iconName: 'bread-slice-outline',
    bgColor: Colors.carbsLight,
    iconColor: Colors.carbsDark,
    borderColor: Colors.carbsBorder,
  },
  rice: {
    iconName: 'rice',
    bgColor: Colors.carbsLight,
    iconColor: Colors.carbsDark,
    borderColor: Colors.carbsBorder,
  },
  beverages: {
    iconName: 'coffee-outline',
    bgColor: Colors.fatLight,
    iconColor: Colors.fatDark,
    borderColor: Colors.fatBorder,
  },
  fruits: {
    iconName: 'food-apple-outline',
    bgColor: Colors.fiberLight,
    iconColor: Colors.fiberDark,
    borderColor: Colors.fiberBorder,
  },
  dairy: {
    iconName: 'cup-water',
    bgColor: Colors.waterLight,
    iconColor: Colors.water,
    borderColor: Colors.waterTrack,
  },
  snacks: {
    iconName: 'cookie-outline',
    bgColor: Colors.primaryLight,
    iconColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
};

const DEFAULT_THEME: FoodIconTheme = {
  iconName: 'food-outline',
  bgColor: Colors.surfaceLow,
  iconColor: Colors.textSecondary,
  borderColor: Colors.surfaceInset,
};

interface IconNameRule {
  readonly pattern: RegExp;
  readonly theme: FoodIconTheme;
}

const NAME_THEME_RULES: readonly IconNameRule[] = [
  {
    pattern: /\b(idlis?|dhoklas?|steamed)\b/i,
    theme: {
      iconName: 'pot-steam-outline',
      bgColor: Colors.primaryLight,
      iconColor: Colors.primary,
      borderColor: Colors.primaryLight,
    },
  },
  {
    pattern: /\b(dosas?|uttapams?)\b/i,
    theme: {
      iconName: 'silverware-fork-knife',
      bgColor: Colors.carbsLight,
      iconColor: Colors.carbsDark,
      borderColor: Colors.carbsBorder,
    },
  },
  {
    pattern: /\b(vadas?|pakoras?|samosas?|snacks?|chaat|kachori)\b/i,
    theme: {
      iconName: 'cookie-outline',
      bgColor: Colors.primaryLight,
      iconColor: Colors.primary,
      borderColor: Colors.primaryLight,
    },
  },
  {
    pattern: /\b(chai|teas?|coffee|latte|cappuccino)\b/i,
    theme: {
      iconName: 'coffee-outline',
      bgColor: Colors.fatLight,
      iconColor: Colors.fatDark,
      borderColor: Colors.fatBorder,
    },
  },
  {
    pattern: /\beggs?\b/i,
    theme: {
      iconName: 'egg-outline',
      bgColor: Colors.carbsLight,
      iconColor: Colors.carbsDark,
      borderColor: Colors.carbsBorder,
    },
  },
  {
    pattern: /\b(chicken|fish|mutton|meat|seafood|prawns?|steaks?|beef|pork)\b/i,
    theme: {
      iconName: 'food-drumstick-outline',
      bgColor: Colors.proteinLight,
      iconColor: Colors.proteinDark,
      borderColor: Colors.proteinBorder,
    },
  },
  {
    pattern: /\b(rice|biryani|pulao|khichdi)\b/i,
    theme: {
      iconName: 'rice',
      bgColor: Colors.carbsLight,
      iconColor: Colors.carbsDark,
      borderColor: Colors.carbsBorder,
    },
  },
  {
    pattern: /\b(rotis?|chapatis?|parathas?|naans?|breads?|toasts?)\b/i,
    theme: {
      iconName: 'bread-slice-outline',
      bgColor: Colors.carbsLight,
      iconColor: Colors.carbsDark,
      borderColor: Colors.carbsBorder,
    },
  },
  {
    pattern: /\b(dals?|sambars?|curry|curries|paneer|chole|rajma)\b/i,
    theme: {
      iconName: 'bowl-mix-outline',
      bgColor: Colors.proteinLight,
      iconColor: Colors.proteinDark,
      borderColor: Colors.proteinBorder,
    },
  },
  {
    pattern: /\b(apples?|bananas?|fruits?|papayas?)\b/i,
    theme: {
      iconName: 'food-apple-outline',
      bgColor: Colors.fiberLight,
      iconColor: Colors.fiberDark,
      borderColor: Colors.fiberBorder,
    },
  },
  {
    pattern: /\b(milk|curd|dahi|waters?|chaas)\b/i,
    theme: {
      iconName: 'cup-water',
      bgColor: Colors.waterLight,
      iconColor: Colors.water,
      borderColor: Colors.waterTrack,
    },
  },
];

// Vector Fallback Theme Generator
export const getFoodIconTheme = (
  item?: Partial<FoodItem> | null,
  fallbackCategory?: string,
  fallbackName?: string
): FoodIconTheme => {
  const name = (item?.name || fallbackName || '').toLowerCase().trim();
  const category = (item?.category || fallbackCategory || '').toLowerCase().trim();

  // 1. High-priority keyword matches with word boundaries (\b)
  if (name) {
    for (let i = 0; i < NAME_THEME_RULES.length; i++) {
      if (NAME_THEME_RULES[i].pattern.test(name)) {
        return NAME_THEME_RULES[i].theme;
      }
    }
  }

  // 2. Category fallbacks
  if (category && CATEGORY_THEMES[category]) {
    return CATEGORY_THEMES[category];
  }

  // 3. Default fallback
  return DEFAULT_THEME;
};

export const FoodIconBadge: React.FC<FoodIconBadgeProps> = React.memo(
  ({ item, category, foodName, size = 42, iconSize, style }) => {
    const resolvable: FoodImageResolvable | null = item
      ? { id: item.id, name: item.name, imageUrl: item.imageUrl }
      : foodName
        ? { name: foodName }
        : null;

    const imageSource = getFoodImageSource(resolvable);
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
