import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { FoodItem, MealType, LoggedMealItem } from '@/types';
import { useFoodData, useDailyLog, useGoals } from '@/context/HealthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodIconBadge } from '@/components/common/FoodIconBadge';
import { FoodImage } from '@/components/common/FoodImage';
import { getFoodDescription } from '@/data/foodDatabase';
import { getFoodImageSource } from '@/assets/foodImages';

interface FoodLogModalProps {
  visible: boolean;
  mealType: MealType;
  onClose: () => void;
  onOpenFoodVision?: () => void;
  onOpenBarcodeScanner?: () => void;
  prefillBarcode?: string | null;
}

interface CategoryItem {
  id: string;
  label: string;
  iconFamily: 'ion' | 'mci';
  iconName: string;
  hasDropdown?: boolean;
  activeColor?: string;
  inactiveColor?: string;
}

const CategoryPill = React.memo(function CategoryPill({
  index,
  cat,
  isSelected,
  onPress,
}: {
  index: number;
  cat: CategoryItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-10);

  useEffect(() => {
    opacity.value = withDelay(index * 55, withTiming(1, { duration: 200 }));
    translateX.value = withDelay(index * 55, withTiming(0, { duration: 200 }));
  }, [index, opacity, translateX]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const iconColor = isSelected
    ? cat.activeColor || '#FFFFFF'
    : cat.inactiveColor || '#64748B';

  return (
    <Animated.View style={pillStyle}>
      <Pressable
        style={({ pressed }) => [
          styles.categoryPill,
          isSelected ? styles.categoryPillActive : null,
          pressed ? styles.btnPressedPill : null,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Filter by ${cat.label}`}
      >
        {cat.iconFamily === 'mci' ? (
          <MaterialCommunityIcons name={cat.iconName as any} size={15} color={iconColor} />
        ) : (
          <Ionicons
            name={
              cat.id === 'popular'
                ? isSelected
                  ? 'star'
                  : 'star-outline'
                : (cat.iconName as any)
            }
            size={15}
            color={iconColor}
          />
        )}
        <Text style={[styles.categoryText, isSelected ? styles.categoryTextActive : null]}>
          {cat.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

// Meal-Contextual Categories to eliminate decision fatigue
const MEAL_CATEGORIES: Record<MealType, CategoryItem[]> = {
  breakfast: [
    {
      id: 'popular',
      label: 'Popular',
      iconFamily: 'ion',
      iconName: 'star-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'all',
      label: 'All',
      iconFamily: 'ion',
      iconName: 'pricetag-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'south_indian',
      label: 'South Indian',
      iconFamily: 'mci',
      iconName: 'pot-steam-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'breads',
      label: 'Breads & Toast',
      iconFamily: 'mci',
      iconName: 'bread-slice-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'high_protein',
      label: 'High Protein',
      iconFamily: 'ion',
      iconName: 'flash-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'custom',
      label: 'My Custom',
      iconFamily: 'mci',
      iconName: 'chef-hat',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'fruits',
      label: 'Fruits & Nuts',
      iconFamily: 'ion',
      iconName: 'nutrition-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
  ],
  lunch: [
    {
      id: 'popular',
      label: 'Popular',
      iconFamily: 'ion',
      iconName: 'star-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'all',
      label: 'All',
      iconFamily: 'ion',
      iconName: 'pricetag-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'curries',
      label: 'Dals & Curries',
      iconFamily: 'mci',
      iconName: 'bowl-mix-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'rice',
      label: 'Rice & Grains',
      iconFamily: 'mci',
      iconName: 'rice',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'breads',
      label: 'Breads & Rotis',
      iconFamily: 'mci',
      iconName: 'bread-slice-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'high_protein',
      label: 'High Protein',
      iconFamily: 'ion',
      iconName: 'flash-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'custom',
      label: 'My Custom',
      iconFamily: 'mci',
      iconName: 'chef-hat',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
  ],
  dinner: [
    {
      id: 'popular',
      label: 'Popular',
      iconFamily: 'ion',
      iconName: 'star-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'all',
      label: 'All',
      iconFamily: 'ion',
      iconName: 'pricetag-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'curries',
      label: 'Dals & Curries',
      iconFamily: 'mci',
      iconName: 'bowl-mix-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'breads',
      label: 'Breads',
      iconFamily: 'mci',
      iconName: 'bread-slice-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'south_indian',
      label: 'South Indian',
      iconFamily: 'mci',
      iconName: 'pot-steam-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'high_protein',
      label: 'High Protein',
      iconFamily: 'ion',
      iconName: 'flash-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'custom',
      label: 'My Custom',
      iconFamily: 'mci',
      iconName: 'chef-hat',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
  ],
  snacks: [
    {
      id: 'popular',
      label: 'Popular',
      iconFamily: 'ion',
      iconName: 'star-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'all',
      label: 'All',
      iconFamily: 'ion',
      iconName: 'pricetag-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'snacks',
      label: 'Snacks',
      iconFamily: 'mci',
      iconName: 'cookie-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'fruits',
      label: 'Fruits & Nuts',
      iconFamily: 'ion',
      iconName: 'nutrition-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'high_protein',
      label: 'High Protein',
      iconFamily: 'ion',
      iconName: 'flash-outline',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
    {
      id: 'custom',
      label: 'My Custom',
      iconFamily: 'mci',
      iconName: 'chef-hat',
      activeColor: '#FFFFFF',
      inactiveColor: '#64748B',
    },
  ],
};

interface MealTabItem {
  id: MealType;
  label: string;
  iconFamily: 'mci' | 'ion';
  iconName: string;
}

const MEAL_TABS: MealTabItem[] = [
  { id: 'breakfast', label: 'Breakfast', iconFamily: 'mci', iconName: 'weather-sunset' },
  { id: 'lunch', label: 'Lunch', iconFamily: 'ion', iconName: 'sunny-outline' },
  { id: 'snacks', label: 'Snacks', iconFamily: 'ion', iconName: 'cafe-outline' },
  { id: 'dinner', label: 'Dinner', iconFamily: 'ion', iconName: 'moon-outline' },
];

const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };
const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

const formatServingUnit = (unit?: string): string => {
  if (!unit) return '1 serving';
  const trimmed = unit.trim();
  if (/^\d/.test(trimmed)) return trimmed; // '100g' -> '100g', '250ml' -> '250ml'
  return `1 ${trimmed}`; // 'egg' -> '1 egg', 'piece' -> '1 piece'
};

const formatStepperUnit = (unit?: string): string => {
  if (!unit) return 'x';
  const firstWord = unit.split(/[\s(]/)[0].toLowerCase();
  if (firstWord.length <= 7) return firstWord;
  return 'x';
};

interface FoodItemRowProps {
  item: FoodItem;
  loggedCount?: number;
  onSelect: (item: FoodItem) => void;
  onQuickAdd: (item: FoodItem) => void;
}

const FoodItemRow = React.memo<FoodItemRowProps>(({ item, loggedCount, onSelect, onQuickAdd }) => {
  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.97, { duration: 80 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration: 120 });
  }, [pressScale]);

  const foodImg = getFoodImageSource(item);

  return (
    <Pressable onPress={() => onSelect(item)} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.foodItemCard, pressStyle]}>
        {/* Food Dish Photo Thumbnail */}
        <View style={styles.foodThumbWrapper}>
          {foodImg ? (
            <Image
              source={foodImg}
              style={styles.foodItemImg}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <FoodIconBadge item={item} size={48} style={styles.foodItemBadge} />
          )}
        </View>

        {/* Clean Food Details (Name + Serving Unit) */}
        <View style={styles.foodItemMain}>
          <View style={styles.foodItemNameRow}>
            <Text style={styles.foodItemName} numberOfLines={1}>
              {item.name}
            </Text>
            {(loggedCount ?? 0) > 0 ? (
              <View style={styles.loggedCountBadge}>
                <Text style={styles.loggedCountBadgeText}>✓ {loggedCount}x</Text>
              </View>
            ) : null}
            {item.isCustom ? (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Custom</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.foodItemUnit} numberOfLines={1}>
            {formatServingUnit(item.servingUnit)}
          </Text>
        </View>

        {/* Calories Stack + Prominent Circular Plus Action */}
        <View style={styles.foodItemRight}>
          <View style={styles.caloriesStack}>
            <Text style={styles.foodItemCals}>{item.calories}</Text>
            <Text style={styles.foodItemCalUnit}>kcal</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.quickAddButton,
              pressed ? styles.quickAddButtonPressed : null,
            ]}
            onPress={e => {
              e.stopPropagation && e.stopPropagation();
              onQuickAdd(item);
            }}
            hitSlop={HIT_SLOP_8}
            accessibilityRole="button"
            accessibilityLabel={`Quick add 1 serving of ${item.name}`}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
});
FoodItemRow.displayName = 'FoodItemRow';

const FoodLogModalComponent: React.FC<FoodLogModalProps> = ({
  visible,
  mealType,
  onClose,
  onOpenFoodVision,
  onOpenBarcodeScanner,
  prefillBarcode,
}) => {
  const insets = useSafeAreaInsets();
  const { foodDatabase, addCustomFood } = useFoodData();
  const { addMealItem, removeMealItem, mealCalories, mealsByType } = useDailyLog();
  const { userGoals } = useGoals();

  const [selectedMealType, setSelectedMealType] = useState<MealType>(mealType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [favoriteFoodIds, setFavoriteFoodIds] = useState<Record<string, boolean>>({});

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteFoodIds(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    setSelectedMealType(mealType);
  }, [mealType, visible]);

  useEffect(() => {
    if (prefillBarcode) {
      setCustomName(prefillBarcode);
      setIsCustomMode(true);
    }
  }, [prefillBarcode]);

  // In-modal Toast & Undo State for 2-Speed Fast Path
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastAddedMeal, setLastAddedMeal] = useState<LoggedMealItem | null>(null);
  const [toastTimer, setToastTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const toastSlideAnim = useSharedValue(20);
  const toastFadeAnim = useSharedValue(0);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastFadeAnim.value,
    transform: [{ translateY: toastSlideAnim.value }],
  }));

  const isReducedMotion = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      isReducedMotion.current = enabled;
    });
  }, []);

  const handleDismissDrawer = useCallback(() => {
    setSelectedFood(null);
    setQuantity(1);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      if (isReducedMotion.current) {
        toastSlideAnim.value = 0;
        toastFadeAnim.value = 1;
        return;
      }
      toastSlideAnim.value = 20;
      toastFadeAnim.value = 0;
      toastFadeAnim.value = withTiming(1, { duration: 180 });
      toastSlideAnim.value = withTiming(0, { duration: 180 });
    }
  }, [toastMessage, toastSlideAnim, toastFadeAnim]);

  const handleDismissToast = useCallback(() => {
    if (isReducedMotion.current) {
      setToastMessage(null);
      setLastAddedMeal(null);
      if (toastTimer) clearTimeout(toastTimer);
      return;
    }
    toastFadeAnim.value = withTiming(0, { duration: 150 });
    setTimeout(() => {
      setToastMessage(null);
      setLastAddedMeal(null);
      if (toastTimer) clearTimeout(toastTimer);
    }, 150);
  }, [toastFadeAnim, toastTimer]);

  useEffect(() => {
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, [toastTimer]);

  // Live Meal Target Budget Anchor
  const budget = userGoals.dailyCalorieBudget || 2350;
  const mealRatio =
    {
      breakfast: 0.25,
      lunch: 0.35,
      snacks: 0.12,
      dinner: 0.28,
    }[selectedMealType] || 0.25;

  const mealTarget = Math.round(budget * mealRatio);
  const currentMealLogged = mealCalories[selectedMealType] || 0;
  const mealRemaining = mealTarget - currentMealLogged;

  // Custom food form state
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('serving');
  const [customCals, setCustomCals] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customFiber, setCustomFiber] = useState('');
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(null);

  const handlePickCustomPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please grant photo library access to add a custom food photo.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setCustomPhotoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn('Custom photo pick error:', err);
    }
  };

  // Context-aware food list based on mealType and active category
  const filteredFoods = useMemo(() => {
    let list = foodDatabase;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return list.filter(
        item => item.name.toLowerCase().includes(q) || item.categoryLabel.toLowerCase().includes(q)
      );
    }

    // Category filtering
    if (selectedCategory === 'popular') {
      if (selectedMealType === 'breakfast') {
        const priorityIds = [
          'idli_steamed',
          'plain_dosa',
          'aloo_paratha',
          'bread_omelette',
          'upma',
          'ven_pongal',
          'poha',
          'apple_medium',
          'banana_medium',
          'raw_almonds',
        ];
        return list
          .filter(item => priorityIds.includes(item.id))
          .sort((a, b) => {
            const aIdx = priorityIds.indexOf(a.id);
            const bIdx = priorityIds.indexOf(b.id);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return 0;
          });
      }

      if (selectedMealType === 'lunch') {
        const priorityIds = [
          'roti_chapati',
          'paneer_butter_masala',
          'chicken_curry',
          'chicken_biryani',
          'chole_rice',
          'rajma_chawal',
          'veg_thali',
          'curd_rice',
          'lemon_rice',
        ];
        return list.filter(
          item =>
            priorityIds.includes(item.id) || item.category === 'curries' || item.category === 'rice'
        );
      }

      if (selectedMealType === 'dinner') {
        const priorityIds = [
          'roti_chapati',
          'paratha',
          'paneer_butter_masala',
          'veg_thali',
          'chicken_curry',
          'idli_steamed',
          'moong_dal_khichdi',
          'curd_rice',
        ];
        return list.filter(
          item =>
            priorityIds.includes(item.id) ||
            item.category === 'curries' ||
            item.category === 'breads'
        );
      }

      // Snacks
      return list.filter(item => item.category === 'snacks' || item.category === 'fruits');
    }

    if (selectedCategory === 'all') return list;
    if (selectedCategory === 'custom') return list.filter(item => item.isCustom);
    if (selectedCategory === 'high_protein') return list.filter(item => item.protein >= 8);
    return list.filter(item => item.category === selectedCategory);
  }, [foodDatabase, searchQuery, selectedCategory, selectedMealType]);

  const handleSelectFood = useCallback((food: FoodItem) => {
    setSelectedFood(food);
    setQuantity(1);
  }, []);

  const handleUndo = () => {
    if (lastAddedMeal) {
      removeMealItem(lastAddedMeal.id);
      handleDismissToast();
    }
  };

  const handleConfirmLog = () => {
    if (!selectedFood) return;
    if (toastTimer) clearTimeout(toastTimer);
    const cals = Math.round(selectedFood.calories * quantity);
    const addedItem = addMealItem(selectedMealType, selectedFood, quantity);
    setLastAddedMeal(addedItem);
    setToastMessage(
      `Added ${quantity > 1 ? `${quantity}x ` : ''}${selectedFood.name} (${cals} kcal)`
    );
    setSelectedFood(null);

    const timer = setTimeout(() => {
      setToastMessage(null);
      setLastAddedMeal(null);
    }, 4500);
    setToastTimer(timer);
  };

  // Speed 1 (Fast Path): 1-Tap Quick Add logs immediately without drawer friction
  const handleQuickAdd = useCallback(
    (food: FoodItem) => {
      if (toastTimer) clearTimeout(toastTimer);
      const addedItem = addMealItem(selectedMealType, food, 1);
      setLastAddedMeal(addedItem);
      setToastMessage(`Added ${food.name} (${food.calories} kcal)`);

      const timer = setTimeout(() => {
        setToastMessage(null);
        setLastAddedMeal(null);
      }, 4500);
      setToastTimer(timer);
    },
    [addMealItem, selectedMealType, toastTimer]
  );

  const currentMealItems = mealsByType[selectedMealType] || [];
  const loggedMap = useMemo(() => {
    const map = new Map<string, number>();
    currentMealItems.forEach(m => {
      map.set(m.foodId, (map.get(m.foodId) || 0) + m.quantity);
    });
    return map;
  }, [currentMealItems]);

  const renderFoodItem = useCallback(
    ({ item }: { item: FoodItem }) => (
      <FoodItemRow
        item={item}
        loggedCount={loggedMap.get(item.id) || 0}
        onSelect={handleSelectFood}
        onQuickAdd={handleQuickAdd}
      />
    ),
    [handleSelectFood, handleQuickAdd, loggedMap]
  );

  const handleCreateCustomFood = () => {
    if (!customName.trim() || !customCals) return;
    if (toastTimer) clearTimeout(toastTimer);
    const newFood = addCustomFood({
      name: customName.trim(),
      category: 'snacks',
      categoryLabel: 'Custom',
      servingUnit: customUnit.trim() || 'serving',
      defaultServingSize: 1,
      calories: parseInt(customCals, 10) || 100,
      carbs: parseFloat(customCarbs) || 0,
      protein: parseFloat(customProtein) || 0,
      fat: parseFloat(customFat) || 0,
      fiber: parseFloat(customFiber) || 0,
      icon: '🍱',
      imageUrl: customPhotoUri || undefined,
    });

    const addedItem = addMealItem(selectedMealType, newFood, 1);
    setLastAddedMeal(addedItem);
    setToastMessage(`Added ${newFood.name} (${newFood.calories} kcal)`);

    const timer = setTimeout(() => {
      setToastMessage(null);
      setLastAddedMeal(null);
    }, 4500);
    setToastTimer(timer);

    setIsCustomMode(false);
    setCustomName('');
    setCustomPhotoUri(null);
    setCustomCals('');
    setCustomCarbs('');
    setCustomProtein('');
    setCustomFat('');
    setCustomFiber('');
  };

  const mealTitle = selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1);
  const categoriesList = MEAL_CATEGORIES[selectedMealType] || MEAL_CATEGORIES.breakfast;

  // Projected Live Budget Impact for Speed 2 Portion Drawer
  const projectedAddedCals = selectedFood ? Math.round(selectedFood.calories * quantity) : 0;
  const projectedTotal = currentMealLogged + projectedAddedCals;
  const projectedRemaining = mealTarget - projectedTotal;
  const projectedPct = Math.min(100, Math.round((projectedTotal / (mealTarget || 1)) * 100));
  const isProjectedOver = projectedRemaining < 0;
  const heroImageSource = selectedFood ? getFoodImageSource(selectedFood) : undefined;
  const foodDescription = selectedFood ? getFoodDescription(selectedFood) : '';
  const isFav = selectedFood ? !!favoriteFoodIds[selectedFood.id] : false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar style="dark" />
      <View style={styles.modalRoot}>
        {selectedFood ? (
          /* =======================================================
             1. FULL-SCREEN DEDICATED FOOD PRODUCT DETAIL PAGE
             ======================================================= */
          <View style={styles.fullScreenProductContainer}>
            {/* Top Bar: Floating Back & Favorite Buttons */}
            <View
              style={[
                styles.productTopNavRow,
                { top: insets.top + (Platform.OS === 'web' ? 14 : 10) },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.productNavCircleBtn,
                  pressed ? styles.btnPressedSubtle : null,
                ]}
                onPress={handleDismissDrawer}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel="Back to food list"
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.productNavCircleBtn,
                  pressed ? styles.btnPressedSubtle : null,
                ]}
                onPress={() => toggleFavorite(selectedFood.id)}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Ionicons
                  name={isFav ? 'heart' : 'heart-outline'}
                  size={21}
                  color={isFav ? '#EF4444' : '#0F172A'}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={true}
              alwaysBounceVertical={false}
              style={styles.fullScreenScrollView}
              contentContainerStyle={[
                styles.fullScreenScrollContent,
                { paddingBottom: 130 + insets.bottom },
              ]}
            >
              {/* 2. First: The Food Image — 4:3 container, subject centered via contain */}
              <View
                style={[
                  styles.productHeroStage,
                  { paddingTop: insets.top + (Platform.OS === 'web' ? 50 : 54) },
                ]}
              >
                <FoodImage
                  source={heroImageSource}
                  aspectRatio={4 / 3}
                  contentFit="contain"
                  width="100%"
                  style={styles.productHeroImage}
                  backgroundColor="#FFFFFF"
                  fallback={<FoodIconBadge item={selectedFood} size={160} />}
                />
              </View>

              {/* 3. Product Information Card */}
              <View style={styles.productDetailCard}>
                {/* Category Pill + Health Tag */}
                <View style={styles.productHeaderMetaRow}>
                  <View style={styles.productCategoryWrap}>
                    <MaterialCommunityIcons name="bowl-mix-outline" size={15} color="#64748B" />
                    <Text style={styles.productCategoryLabel} numberOfLines={1}>
                      {(
                        selectedFood.categoryLabel ||
                        selectedFood.category ||
                        'WHOLESOME'
                      ).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.productHealthBadgePill}>
                    <Ionicons name="leaf-outline" size={13} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.productHealthBadgeText} numberOfLines={1}>
                      {selectedFood.badge || 'Gut Friendly'}
                    </Text>
                  </View>
                </View>

                {/* Dish Name */}
                <Text style={styles.productMainTitle} numberOfLines={2}>
                  {selectedFood.name}
                </Text>

                {/* Serving Unit & Base Calories */}
                <Text style={styles.productBaseServingText}>
                  1 {selectedFood.servingUnit} · {selectedFood.calories} kcal
                </Text>

                {/* Description */}
                <Text style={styles.productDescriptionText}>{foodDescription}</Text>

                {/* Nutrition Breakdown */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>NUTRITION BREAKDOWN</Text>
                  <Text style={styles.sectionHeaderSub}>
                    Per {selectedFood.servingUnit}
                  </Text>
                </View>

                <View style={styles.nutritionMatrixGrid}>
                  {/* Calories */}
                  <View style={[styles.nutriCard, styles.nutriCardCalories]}>
                    <View style={styles.nutriCardIconWrap}>
                      <Ionicons name="flame-outline" size={20} color="#EA580C" />
                    </View>
                    <Text
                      style={styles.nutriVal}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.72}
                    >
                      {projectedAddedCals}
                    </Text>
                    <Text style={styles.nutriKey} numberOfLines={1}>Calories</Text>
                  </View>

                  {/* Protein */}
                  <View style={[styles.nutriCard, styles.nutriCardProtein]}>
                    <View style={styles.nutriCardIconWrap}>
                      <MaterialCommunityIcons
                        name="dumbbell"
                        size={19}
                        color="#2563EB"
                        style={{ transform: [{ rotate: '-45deg' }] }}
                      />
                    </View>
                    <Text
                      style={styles.nutriVal}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.72}
                    >
                      {(selectedFood.protein * quantity).toFixed(1)} g
                    </Text>
                    <Text style={styles.nutriKey} numberOfLines={1}>Protein</Text>
                  </View>

                  {/* Carbs */}
                  <View style={[styles.nutriCard, styles.nutriCardCarbs]}>
                    <View style={styles.nutriCardIconWrap}>
                      <MaterialCommunityIcons name="barley" size={20} color="#D97706" />
                    </View>
                    <Text
                      style={styles.nutriVal}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.72}
                    >
                      {(selectedFood.carbs * quantity).toFixed(1)} g
                    </Text>
                    <Text style={styles.nutriKey} numberOfLines={1}>Carbs</Text>
                  </View>

                  {/* Fat */}
                  <View style={[styles.nutriCard, styles.nutriCardFat]}>
                    <View style={styles.nutriCardIconWrap}>
                      <Ionicons name="water-outline" size={19} color="#0EA5E9" />
                    </View>
                    <Text
                      style={styles.nutriVal}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.72}
                    >
                      {(selectedFood.fat * quantity).toFixed(1)} g
                    </Text>
                    <Text style={styles.nutriKey} numberOfLines={1}>Fat</Text>
                  </View>
                </View>

                {/* Quick Portion Chips */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>QUICK PORTIONS</Text>
                </View>

                <View style={styles.distributionChipsRow}>
                  {[1, 2, 3, 5].map(val => (
                    <Pressable
                      key={val}
                      style={({ pressed }) => [
                        styles.distributionChip,
                        quantity === val ? styles.distributionChipActive : null,
                        pressed ? styles.btnPressedPill : null,
                      ]}
                      onPress={() => setQuantity(val)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${val} servings`}
                    >
                      <Text
                        style={[
                          styles.distributionChipText,
                          quantity === val ? styles.distributionChipTextActive : null,
                        ]}
                      >
                        {val}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Sticky Bottom Stepper & CTA Footer with Integrated Live Budget Impact */}
            <View
              style={[styles.productStickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}
            >
              {/* Live Budget Impact Ticker Strip */}
              <View style={styles.footerImpactStrip}>
                <View style={styles.footerImpactMetaRow}>
                  <View style={styles.footerImpactLeft}>
                    <Ionicons name="speedometer-outline" size={15} color="#64748B" />
                    <Text
                      style={styles.footerImpactLabel}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.82}
                    >
                      {mealTitle} Target:{' '}
                      <Text style={styles.footerImpactBold}>{mealTarget} kcal</Text>
                      <Text style={styles.footerImpactSub}> · {projectedTotal} total</Text>
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.footerImpactBadge,
                      isProjectedOver ? styles.footerImpactBadgeOver : styles.footerImpactBadgeOk,
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color={isProjectedOver ? '#DC2626' : '#16A34A'}
                      style={{ marginRight: 3 }}
                    />
                    <Text
                      style={[
                        styles.footerImpactBadgeText,
                        isProjectedOver
                          ? styles.footerImpactBadgeTextOver
                          : styles.footerImpactBadgeTextOk,
                      ]}
                    >
                      {projectedRemaining >= 0
                        ? `${projectedRemaining} kcal left`
                        : `${Math.abs(projectedRemaining)} kcal over`}
                    </Text>
                  </View>
                </View>

                {/* Hairline 3.5px Micro-Progress Track */}
                <View style={styles.footerImpactTrack}>
                  <View
                    style={[
                      styles.footerImpactBar,
                      { width: `${projectedPct}%` },
                      isProjectedOver ? styles.footerImpactBarOver : styles.footerImpactBarOk,
                    ]}
                  />
                </View>
              </View>

              {/* Action Controls: Stepper Pill & Add CTA */}
              <View style={styles.footerActionRow}>
                {/* Left: Quantity Stepper Pill */}
                <View style={styles.footerStepperPill}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.footerStepBtn,
                      pressed ? styles.btnPressedSubtle : null,
                    ]}
                    hitSlop={HIT_SLOP_8}
                    onPress={() =>
                      setQuantity(prev => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10))
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Decrease portion by 0.5"
                  >
                    <Ionicons name="remove" size={18} color="#0F172A" />
                  </Pressable>

                  <View style={styles.footerStepperValueWrap}>
                    <Text
                      style={styles.footerStepperValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.75}
                    >
                      <Text style={styles.footerStepperNumber}>{quantity}</Text>
                      <Text style={styles.footerStepperUnit}>
                        {' '}
                        {formatStepperUnit(selectedFood.servingUnit)}
                      </Text>
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.footerStepBtn,
                      pressed ? styles.btnPressedSubtle : null,
                    ]}
                    hitSlop={HIT_SLOP_8}
                    onPress={() => setQuantity(prev => Math.round((prev + 0.5) * 10) / 10)}
                    accessibilityRole="button"
                    accessibilityLabel="Increase portion by 0.5"
                  >
                    <Ionicons name="add" size={18} color="#0F172A" />
                  </Pressable>
                </View>

                {/* Right: Add to Meal Action Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.confirmAddBtn,
                    pressed ? styles.btnPressedPrimary : null,
                  ]}
                  onPress={handleConfirmLog}
                  accessibilityRole="button"
                  accessibilityLabel={`Add to ${mealTitle}, ${projectedAddedCals} calories`}
                >
                  <View style={styles.ctaCheckBadge}>
                    <Ionicons name="checkmark" size={14} color="#EA580C" />
                  </View>
                  <View style={styles.ctaTextCol}>
                    <Text
                      style={styles.confirmAddBtnTitle}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.8}
                    >
                      Add to {mealTitle}
                    </Text>
                    <Text style={styles.confirmAddBtnSub} numberOfLines={1}>
                      {projectedAddedCals} kcal
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          /* =======================================================
             2. CATALOG / SEARCH PAGE
             ======================================================= */
          <SafeAreaView style={styles.phoneScreenContainer} edges={['top', 'bottom']}>
            {/* 1. Header — Back button | Title | Create button */}
            <View style={styles.header}>
              {/* Left: Context-aware back button */}
              <Pressable
                onPress={isCustomMode ? () => setIsCustomMode(false) : onClose}
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.btnPressedSubtle : null]}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel={isCustomMode ? 'Back to food list' : 'Close food logger'}
              >
                <Ionicons name="arrow-back" size={22} color="#0F172A" />
              </Pressable>

              {/* Center: Clean title only — no budget clutter */}
              <View style={styles.headerTitleCenter}>
                <Text style={styles.headerTitle}>
                  {isCustomMode ? 'Create Dish' : `Log ${mealTitle}`}
                </Text>
              </View>

              {/* Right: Create (opens custom form) — hidden when already in create mode */}
              <Pressable
                style={({ pressed }) => [
                  styles.customToggleBtn,
                  isCustomMode ? styles.customToggleBtnHidden : null,
                  pressed ? styles.btnPressedSubtle : null,
                ]}
                onPress={() => setIsCustomMode(true)}
                hitSlop={HIT_SLOP_8}
                accessibilityRole="button"
                accessibilityLabel="Create custom food"
                disabled={isCustomMode}
              >
                <Text style={styles.customToggleText}>+ Create</Text>
              </Pressable>
            </View>

            {/* Meal Switcher Strip (Breakfast | Lunch | Snacks | Dinner) */}
            <View style={styles.mealSwitcherRow}>
              {MEAL_TABS.map(slot => {
                const isSelected = selectedMealType === slot.id;
                const iconColor = isSelected ? '#FFFFFF' : '#64748B';
                return (
                  <Pressable
                    key={slot.id}
                    style={({ pressed }) => [
                      styles.mealTabPill,
                      isSelected ? styles.mealTabPillActive : null,
                      pressed ? styles.btnPressedPill : null,
                    ]}
                    onPress={() => {
                      setSelectedMealType(slot.id);
                      setSelectedCategory('popular');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${slot.label}`}
                  >
                    {slot.iconFamily === 'mci' ? (
                      <MaterialCommunityIcons
                        name={slot.iconName as any}
                        size={16}
                        color={iconColor}
                      />
                    ) : (
                      <Ionicons
                        name={slot.iconName as any}
                        size={16}
                        color={iconColor}
                      />
                    )}
                    <Text
                      style={[styles.mealTabLabel, isSelected ? styles.mealTabLabelActive : null]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {slot.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            >
              {isCustomMode ? (
                /* Custom Food Form */
                <ScrollView
                  style={styles.customForm}
                  contentContainerStyle={{ paddingBottom: 140 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.customFormDesc}>
                    Add homemade recipes or items not in the database.
                  </Text>

                  {/* Photo Picker */}
                  <View style={styles.customPhotoRow}>
                    {customPhotoUri ? (
                      <View style={styles.customPhotoPreviewContainer}>
                        <Image
                          source={{ uri: customPhotoUri }}
                          style={styles.customPhotoPreviewImg}
                          contentFit="cover"
                        />
                        <Pressable
                          style={styles.customPhotoRemoveBtn}
                          onPress={() => setCustomPhotoUri(null)}
                          hitSlop={HIT_SLOP_8}
                          accessibilityLabel="Remove photo"
                        >
                          <Ionicons name="close" size={14} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [
                          styles.customAddPhotoBtn,
                          pressed ? styles.btnPressedSubtle : null,
                        ]}
                        onPress={handlePickCustomPhoto}
                        accessibilityLabel="Pick photo for custom food"
                      >
                        <Ionicons name="camera-outline" size={20} color="#EA580C" />
                        <Text style={styles.customAddPhotoText}>Add Dish Photo (Optional)</Text>
                      </Pressable>
                    )}
                  </View>

                  <Text style={styles.inputLabel}>Food / Dish Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mom's Besan Chilla"
                    value={customName}
                    onChangeText={setCustomName}
                    placeholderTextColor={Colors.textMuted}
                  />

                  <Text style={styles.inputLabel}>Serving Unit (e.g. piece, katori, bowl)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="piece"
                    value={customUnit}
                    onChangeText={setCustomUnit}
                    placeholderTextColor={Colors.textMuted}
                  />

                  <View style={styles.grid2}>
                    <View style={styles.flex1}>
                      <Text style={styles.inputLabel}>Calories (kcal) *</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="150"
                        value={customCals}
                        onChangeText={setCustomCals}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.inputLabel}>Protein (g)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="6.5"
                        value={customProtein}
                        onChangeText={setCustomProtein}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.grid3}>
                    <View style={styles.flex1}>
                      <Text style={styles.inputLabel}>Carbs (g)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="20"
                        value={customCarbs}
                        onChangeText={setCustomCarbs}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.inputLabel}>Fat (g)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="4"
                        value={customFat}
                        onChangeText={setCustomFat}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.inputLabel}>Fiber (g)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="2"
                        value={customFiber}
                        onChangeText={setCustomFiber}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.saveCustomBtn,
                      pressed ? styles.btnPressedPrimary : null,
                    ]}
                    onPress={handleCreateCustomFood}
                    accessibilityRole="button"
                  >
                    <Text style={styles.saveCustomBtnText}>Save & Log Dish</Text>
                  </Pressable>
                </ScrollView>
              ) : (
                <>
                  {/* 2. Search Input Bar */}
                  <View style={styles.searchBarContainer}>
                    <Ionicons
                      name="search-outline"
                      size={19}
                      color="#64748B"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={`Search ${selectedMealType === 'breakfast' ? 'idli, dosa, eggs, oats, coffee...' : 'roti, dal, paneer, rice...'}`}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor="#94A3B8"
                      clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 ? (
                      <Pressable
                        onPress={() => setSearchQuery('')}
                        hitSlop={HIT_SLOP_8}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search input"
                      >
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                      </Pressable>
                    ) : (
                      <View style={styles.searchActionRow}>
                        {onOpenBarcodeScanner ? (
                          <Pressable
                            onPress={onOpenBarcodeScanner}
                            style={({ pressed }) => [
                              styles.barcodeScanBtn,
                              pressed ? styles.btnPressedSubtle : null,
                            ]}
                            hitSlop={HIT_SLOP_8}
                            accessibilityRole="button"
                            accessibilityLabel="Scan barcode on packaged food"
                          >
                            <Ionicons name="barcode-outline" size={20} color="#EA580C" />
                          </Pressable>
                        ) : null}
                        {onOpenFoodVision ? (
                          <Pressable
                            onPress={onOpenFoodVision}
                            style={({ pressed }) => [
                              styles.cameraScanBtn,
                              pressed ? styles.btnPressedSubtle : null,
                            ]}
                            hitSlop={HIT_SLOP_8}
                            accessibilityRole="button"
                            accessibilityLabel="Scan food with AI camera"
                          >
                            <Ionicons name="camera-outline" size={20} color="#EA580C" />
                          </Pressable>
                        ) : null}
                      </View>
                    )}
                  </View>

                  {/* 3. Non-Clipped Category Filter Tabs */}
                  <View style={styles.categoryWrapper}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      {categoriesList.map((cat, index) => (
                        <CategoryPill
                          key={cat.id}
                          index={index}
                          cat={cat}
                          isSelected={selectedCategory === cat.id}
                          onPress={() => setSelectedCategory(cat.id)}
                        />
                      ))}
                    </ScrollView>
                  </View>

                  {/* 4. Food List */}
                  <FlatList
                    data={filteredFoods}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderFoodItem}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                  />
                </>
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        )}

        {/* Floating In-Modal Toast Snackbar with Undo */}
        {toastMessage ? (
          <Animated.View
            style={[
              styles.toastContainer,
              { bottom: Math.max(insets.bottom + 12, 20) },
              toastStyle,
            ]}
          >
            <View style={styles.toastContent}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#22C55E"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.toastText} numberOfLines={1}>
                {toastMessage}
              </Text>
            </View>
            <View style={styles.toastActions}>
              {lastAddedMeal ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.toastUndoBtn,
                    pressed ? styles.btnPressedSubtle : null,
                  ]}
                  onPress={handleUndo}
                  hitSlop={HIT_SLOP_8}
                  accessibilityRole="button"
                  accessibilityLabel="Undo food log"
                >
                  <Text style={styles.toastUndoText}>Undo</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [
                  styles.toastCloseBtn,
                  pressed ? styles.btnPressedSubtle : null,
                ]}
                onPress={handleDismissToast}
                hitSlop={HIT_SLOP_8}
                accessibilityRole="button"
                accessibilityLabel="Dismiss toast"
              >
                <Ionicons name="close" size={16} color="#94A3B8" />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  phoneScreenContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FAF9F6',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  customToggleBtnHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  headerTitleCenter: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerSubtitleText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#64748B',
  },
  headerBoldVal: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
  headerBudgetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  budgetBadgeOk: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  budgetBadgeOver: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  headerBudgetBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
  },
  budgetTextOk: {
    color: '#059669',
  },
  budgetTextOver: {
    color: '#EA580C',
  },
  customToggleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  customToggleText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#EA580C',
  },
  mealSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  mealSwitcherScroll: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  mealTabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    gap: 5,
  },
  mealTabPillActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
    borderWidth: 1.5,
  },
  mealTabEmoji: {
    fontSize: 13,
  },
  mealTabLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#64748B',
  },
  mealTabLabelActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.urbanist.bold,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 4,
  },
  categoryWrapper: {
    flexShrink: 0,
    height: 48,
    marginVertical: 6,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.urbanist.bold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 6,
  },
  foodItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  foodThumbWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  foodItemImg: {
    width: '100%',
    height: '100%',
  },
  foodItemBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodItemMain: {
    flex: 1,
    justifyContent: 'center',
  },
  foodItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  foodItemName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    lineHeight: 20,
    color: '#0F172A',
    flexShrink: 1,
  },
  customBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  customBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 9,
    color: '#EA580C',
    letterSpacing: 0.3,
  },
  loggedCountBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  loggedCountBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 9.5,
    color: '#059669',
  },
  searchActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barcodeScanBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraScanBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodItemUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 17,
    color: '#64748B',
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  macroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  macroDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  macroDotProtein: {
    backgroundColor: '#22C55E',
  },
  macroDotCarbs: {
    backgroundColor: '#EAB308',
  },
  macroDotFat: {
    backgroundColor: '#F97316',
  },
  foodItemCardPressed: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  macroText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
  },
  foodItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 10,
  },
  caloriesStack: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  foodItemCals: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#0F172A',
    textAlign: 'center',
  },
  foodItemCalUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    lineHeight: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  quickAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  fullScreenProductContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  fullScreenScrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullScreenScrollContent: {
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
  },
  productTopNavRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  productNavCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  productHeroStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    paddingHorizontal: 16,
    position: 'relative',
  },
  productHeroImage: {
    maxHeight: 230,
  },
  productDetailCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  productStickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 20,
  },
  footerStepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 4,
    width: 136,
    flexShrink: 0,
  },
  footerStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  footerStepperValueWrap: {
    flex: 1,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerStepperValue: {
    textAlign: 'center',
  },
  footerStepperNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  footerStepperUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
  productHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
  },
  productCategoryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  productCategoryLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.8,
  },
  productHealthBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    flexShrink: 0,
  },
  productHealthBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11.5,
    color: '#059669',
  },
  productMainTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.3,
    marginTop: 6,
    lineHeight: 28,
  },
  productBaseServingText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 8,
  },
  productDescriptionText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 16,
  },
  distributionChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  distributionChip: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distributionChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
    borderWidth: 1.5,
  },
  distributionChipText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: '#475569',
  },
  distributionChipTextActive: {
    fontFamily: Fonts.urbanist.bold,
    color: '#EA580C',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeaderLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionHeaderSub: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11.5,
    color: '#64748B',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityDisplayContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  quantityDisplay: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  quantityUnitText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  presetBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#475569',
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.urbanist.bold,
  },
  nutritionMatrixGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  nutriCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 3,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nutriCardCalories: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  nutriCardProtein: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  nutriCardCarbs: {
    backgroundColor: '#FEFCE8',
    borderColor: 'rgba(234, 179, 8, 0.28)',
  },
  nutriCardFat: {
    backgroundColor: '#ECFEFF',
    borderColor: '#CFFAFE',
  },
  nutriCardIconWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nutriKey: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  nutriVal: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 2,
    textAlign: 'center',
  },
  footerImpactStrip: {
    marginBottom: 12,
  },
  footerImpactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  footerImpactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
    overflow: 'hidden',
  },
  footerImpactLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  footerImpactBold: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
  footerImpactSub: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11.5,
    color: '#64748B',
  },
  footerImpactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  footerImpactBadgeOk: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  footerImpactBadgeOver: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  footerImpactDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  footerImpactDotOk: {
    backgroundColor: '#16A34A',
  },
  footerImpactDotOver: {
    backgroundColor: '#EF4444',
  },
  footerImpactBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11.5,
  },
  footerImpactBadgeTextOk: {
    color: '#16A34A',
  },
  footerImpactBadgeTextOver: {
    color: '#DC2626',
  },
  footerImpactTrack: {
    height: 3.5,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  footerImpactBar: {
    height: '100%',
    borderRadius: 2,
  },
  footerImpactBarOk: {
    backgroundColor: '#10B981',
  },
  footerImpactBarOver: {
    backgroundColor: '#EF4444',
  },
  footerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnPressedSubtle: {
    opacity: 0.7,
  },
  btnPressedPill: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  btnPressedPrimary: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  confirmAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    height: 52,
    borderRadius: 16,
    gap: 8,
    paddingHorizontal: 12,
  },
  ctaCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ctaTextCol: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  confirmAddBtnTitle: {
    fontFamily: Fonts.urbanist.bold,
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 18,
  },
  confirmAddBtnSub: {
    fontFamily: Fonts.urbanist.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 15,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 10002,
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  toastText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  toastActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastUndoBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toastUndoText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#FACC15',
  },
  toastCloseBtn: {
    padding: 4,
  },
  customForm: {
    padding: 20,
  },
  customPhotoRow: {
    marginBottom: 12,
  },
  customAddPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 12,
    paddingVertical: 12,
    borderStyle: 'dashed',
  },
  customAddPhotoText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#EA580C',
  },
  customPhotoPreviewContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  customPhotoPreviewImg: {
    width: 64,
    height: 64,
  },
  customPhotoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customFormTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  customFormDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    marginTop: 2,
  },
  inputLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    fontFamily: Fonts.urbanist.regular,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
  },
  grid3: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  saveCustomBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveCustomBtnText: {
    fontFamily: Fonts.urbanist.bold,
    color: '#FFFFFF',
    fontSize: 15,
  },
});

export const FoodLogModal = React.memo(FoodLogModalComponent);
