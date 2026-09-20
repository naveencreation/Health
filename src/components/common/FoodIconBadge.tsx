import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FoodItem } from '@/types';

export interface FoodIconBadgeProps {
  item?: Partial<FoodItem> | null;
  category?: string;
  foodName?: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

// 100% Free, High-Resolution Curated Food Photography Registry
export const FOOD_PHOTO_REGISTRY: Record<string, string> = {
  // --- SOUTH INDIAN ---
  idli_steamed: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200&auto=format&fit=crop&q=80',
  plain_dosa: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=200&auto=format&fit=crop&q=80',
  masala_dosa: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=200&auto=format&fit=crop&q=80',
  sambar: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&auto=format&fit=crop&q=80',
  coconut_chutney: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&auto=format&fit=crop&q=80',
  upma: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200&auto=format&fit=crop&q=80',

  // --- BREADS & ROTIS ---
  roti_chapati: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=200&auto=format&fit=crop&q=80',
  butter_roti: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=200&auto=format&fit=crop&q=80',
  aloo_paratha: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&auto=format&fit=crop&q=80',
  paneer_paratha: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&auto=format&fit=crop&q=80',
  plain_naan: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=200&auto=format&fit=crop&q=80',
  brown_bread_slice: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80',

  // --- DALS & CURRIES ---
  dal_tadka: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&auto=format&fit=crop&q=80',
  dal_makhani: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&auto=format&fit=crop&q=80',
  paneer_butter_masala: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&auto=format&fit=crop&q=80',
  palak_paneer: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&auto=format&fit=crop&q=80',
  rajma_masala: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&auto=format&fit=crop&q=80',
  chole_masala: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&auto=format&fit=crop&q=80',
  chicken_curry: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200&auto=format&fit=crop&q=80',
  egg_curry: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&auto=format&fit=crop&q=80',
  mix_veg_sabzi: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=80',

  // --- RICE & GRAINS ---
  cooked_white_rice: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=200&auto=format&fit=crop&q=80',
  brown_rice: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=200&auto=format&fit=crop&q=80',
  veg_biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&auto=format&fit=crop&q=80',
  chicken_biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&auto=format&fit=crop&q=80',
  moong_dal_khichdi: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&auto=format&fit=crop&q=80',
  oatmeal_water: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=200&auto=format&fit=crop&q=80',

  // --- SNACKS & PROTEIN ---
  boiled_egg: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&auto=format&fit=crop&q=80',
  egg_white: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&auto=format&fit=crop&q=80',
  paneer_raw: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&auto=format&fit=crop&q=80',
  sprouts_salad: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&auto=format&fit=crop&q=80',
  roasted_chana: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=200&auto=format&fit=crop&q=80',
  poha: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=200&auto=format&fit=crop&q=80',
  samosa: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&auto=format&fit=crop&q=80',

  // --- DAIRY & BEVERAGES ---
  masala_chai: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=200&auto=format&fit=crop&q=80',
  chai_without_sugar: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=200&auto=format&fit=crop&q=80',
  filter_coffee: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80',
  green_tea: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=200&auto=format&fit=crop&q=80',
  buttermilk_chaas: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80',
  curd_dahi: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&auto=format&fit=crop&q=80',
  whey_protein: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&auto=format&fit=crop&q=80',

  // --- FRUITS & NUTS ---
  banana_medium: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&auto=format&fit=crop&q=80',
  apple_medium: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200&auto=format&fit=crop&q=80',
  papaya_cubes: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=200&auto=format&fit=crop&q=80',
  raw_almonds: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=200&auto=format&fit=crop&q=80',
};

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
  const [imgError, setImgError] = useState(false);

  // Look up photo URL: 1) explicit item.imageUrl (camera/picker), 2) exact ID in registry, 3) smart keyword matching
  const photoUrl =
    item?.imageUrl ||
    (item?.id ? FOOD_PHOTO_REGISTRY[item.id] : undefined) ||
    (() => {
      const name = (item?.name || foodName || '').toLowerCase().trim();
      if (!name) return undefined;
      if (name.includes('idli') || name.includes('dhokla')) return FOOD_PHOTO_REGISTRY['idli_steamed'];
      if (name.includes('dosa') || name.includes('uttapam')) return FOOD_PHOTO_REGISTRY['plain_dosa'];
      if (name.includes('paratha')) return FOOD_PHOTO_REGISTRY['aloo_paratha'];
      if (name.includes('roti') || name.includes('chapati') || name.includes('phulka')) return FOOD_PHOTO_REGISTRY['roti_chapati'];
      if (name.includes('naan')) return FOOD_PHOTO_REGISTRY['plain_naan'];
      if (name.includes('bread') || name.includes('toast') || name.includes('sandwich')) return FOOD_PHOTO_REGISTRY['brown_bread_slice'];
      if (name.includes('biryani') || name.includes('pulao')) return FOOD_PHOTO_REGISTRY['chicken_biryani'];
      if (name.includes('rice') || name.includes('chawal')) return FOOD_PHOTO_REGISTRY['cooked_white_rice'];
      if (name.includes('paneer')) return FOOD_PHOTO_REGISTRY['paneer_butter_masala'];
      if (name.includes('chicken') || name.includes('meat') || name.includes('mutton') || name.includes('fish')) return FOOD_PHOTO_REGISTRY['chicken_curry'];
      if (name.includes('egg') || name.includes('omelet') || name.includes('omlette')) return FOOD_PHOTO_REGISTRY['boiled_egg'];
      if (name.includes('dal') || name.includes('sambar') || name.includes('curry') || name.includes('chole') || name.includes('rajma')) return FOOD_PHOTO_REGISTRY['dal_tadka'];
      if (name.includes('chai') || name.includes('tea')) return FOOD_PHOTO_REGISTRY['masala_chai'];
      if (name.includes('coffee')) return FOOD_PHOTO_REGISTRY['filter_coffee'];
      if (name.includes('samosa') || name.includes('pakora') || name.includes('vada')) return FOOD_PHOTO_REGISTRY['samosa'];
      if (name.includes('apple')) return FOOD_PHOTO_REGISTRY['apple_medium'];
      if (name.includes('banana')) return FOOD_PHOTO_REGISTRY['banana_medium'];
      if (name.includes('papaya')) return FOOD_PHOTO_REGISTRY['papaya_cubes'];
      if (name.includes('oat') || name.includes('porridge')) return FOOD_PHOTO_REGISTRY['oatmeal_water'];
      if (name.includes('curd') || name.includes('dahi') || name.includes('yogurt')) return FOOD_PHOTO_REGISTRY['curd_dahi'];
      if (name.includes('protein') || name.includes('shake')) return FOOD_PHOTO_REGISTRY['whey_protein'];
      if (name.includes('salad') || name.includes('sprout')) return FOOD_PHOTO_REGISTRY['sprouts_salad'];
      return undefined;
    })();

  const radius = Math.round(size * 0.28);

  // 1. Primary: Real Food Photography Thumbnail
  if (photoUrl && !imgError) {
    return (
      <View
        style={[
          styles.imageWrapper,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={item?.id || photoUrl}
          priority="normal"
          onError={() => setImgError(true)}
        />
      </View>
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
  imageWrapper: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    borderWidth: 1,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
