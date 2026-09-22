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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { FoodItem, MealType, LoggedMealItem } from '@/types';
import { useHealth } from '@/context/HealthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodIconBadge } from '@/components/common/FoodIconBadge';
import { FoodImage } from '@/components/common/FoodImage';
import { getFoodDescription } from '@/data/foodDatabase';
import { getFoodImageSource } from '@/assets/foodImages';

interface FoodLogModalProps {
  visible: boolean;
  mealType: MealType;
  onClose: () => void;
  onOpenFoodVision?: () => void;
}

interface CategoryItem {
  id: string;
  label: string;
  iconFamily: 'ion' | 'mci';
  iconName: string;
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
    ? (cat.activeColor || '#FFFFFF')
    : (cat.inactiveColor || '#64748B');

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
          <MaterialCommunityIcons name={cat.iconName as any} size={14} color={iconColor} />
        ) : (
          <Ionicons name={cat.iconName as any} size={14} color={iconColor} />
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
    { id: 'popular', label: 'Popular', iconFamily: 'ion', iconName: 'star', activeColor: '#FACC15', inactiveColor: '#EAB308' },
    { id: 'custom', label: 'My Custom', iconFamily: 'mci', iconName: 'chef-hat', activeColor: '#FFFFFF', inactiveColor: '#8B5CF6' },
    { id: 'south_indian', label: 'South Indian', iconFamily: 'mci', iconName: 'pot-steam-outline', activeColor: '#FFFFFF', inactiveColor: '#F97316' },
    { id: 'breads', label: 'Breads & Toast', iconFamily: 'mci', iconName: 'bread-slice-outline', activeColor: '#FFFFFF', inactiveColor: '#D97706' },
    { id: 'high_protein', label: 'High Protein', iconFamily: 'ion', iconName: 'flash', activeColor: '#FACC15', inactiveColor: '#F59E0B' },
    { id: 'fruits', label: 'Fruits & Nuts', iconFamily: 'ion', iconName: 'nutrition-outline', activeColor: '#34D399', inactiveColor: '#10B981' },
    { id: 'all', label: 'All Foods', iconFamily: 'ion', iconName: 'grid-outline', activeColor: '#FFFFFF', inactiveColor: '#64748B' },
  ],
  lunch: [
    { id: 'popular', label: 'Popular', iconFamily: 'ion', iconName: 'star', activeColor: '#FACC15', inactiveColor: '#EAB308' },
    { id: 'custom', label: 'My Custom', iconFamily: 'mci', iconName: 'chef-hat', activeColor: '#FFFFFF', inactiveColor: '#8B5CF6' },
    { id: 'curries', label: 'Dals & Curries', iconFamily: 'mci', iconName: 'bowl-mix-outline', activeColor: '#FFFFFF', inactiveColor: '#EA580C' },
    { id: 'rice', label: 'Rice & Grains', iconFamily: 'mci', iconName: 'rice', activeColor: '#FFFFFF', inactiveColor: '#0D9488' },
    { id: 'breads', label: 'Breads & Rotis', iconFamily: 'mci', iconName: 'bread-slice-outline', activeColor: '#FFFFFF', inactiveColor: '#D97706' },
    { id: 'high_protein', label: 'High Protein', iconFamily: 'ion', iconName: 'flash', activeColor: '#FACC15', inactiveColor: '#F59E0B' },
    { id: 'all', label: 'All Foods', iconFamily: 'ion', iconName: 'grid-outline', activeColor: '#FFFFFF', inactiveColor: '#64748B' },
  ],
  dinner: [
    { id: 'popular', label: 'Popular', iconFamily: 'ion', iconName: 'star', activeColor: '#FACC15', inactiveColor: '#EAB308' },
    { id: 'custom', label: 'My Custom', iconFamily: 'mci', iconName: 'chef-hat', activeColor: '#FFFFFF', inactiveColor: '#8B5CF6' },
    { id: 'curries', label: 'Dals & Curries', iconFamily: 'mci', iconName: 'bowl-mix-outline', activeColor: '#FFFFFF', inactiveColor: '#EA580C' },
    { id: 'breads', label: 'Breads', iconFamily: 'mci', iconName: 'bread-slice-outline', activeColor: '#FFFFFF', inactiveColor: '#D97706' },
    { id: 'south_indian', label: 'South Indian', iconFamily: 'mci', iconName: 'pot-steam-outline', activeColor: '#FFFFFF', inactiveColor: '#F97316' },
    { id: 'high_protein', label: 'High Protein', iconFamily: 'ion', iconName: 'flash', activeColor: '#FACC15', inactiveColor: '#F59E0B' },
    { id: 'all', label: 'All Foods', iconFamily: 'ion', iconName: 'grid-outline', activeColor: '#FFFFFF', inactiveColor: '#64748B' },
  ],
  snacks: [
    { id: 'popular', label: 'Popular', iconFamily: 'ion', iconName: 'star', activeColor: '#FACC15', inactiveColor: '#EAB308' },
    { id: 'custom', label: 'My Custom', iconFamily: 'mci', iconName: 'chef-hat', activeColor: '#FFFFFF', inactiveColor: '#8B5CF6' },
    { id: 'snacks', label: 'Snacks', iconFamily: 'mci', iconName: 'cookie-outline', activeColor: '#FFFFFF', inactiveColor: '#F97316' },
    { id: 'fruits', label: 'Fruits & Nuts', iconFamily: 'ion', iconName: 'nutrition-outline', activeColor: '#34D399', inactiveColor: '#10B981' },
    { id: 'high_protein', label: 'High Protein', iconFamily: 'ion', iconName: 'flash', activeColor: '#FACC15', inactiveColor: '#F59E0B' },
    { id: 'all', label: 'All Foods', iconFamily: 'ion', iconName: 'grid-outline', activeColor: '#FFFFFF', inactiveColor: '#64748B' },
  ],
};

interface MealTabItem {
  id: MealType;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const MEAL_TABS: MealTabItem[] = [
  { id: 'breakfast', label: 'Breakfast', iconActive: 'sunny', iconInactive: 'sunny-outline' },
  { id: 'lunch', label: 'Lunch', iconActive: 'restaurant', iconInactive: 'restaurant-outline' },
  { id: 'snacks', label: 'Snacks', iconActive: 'cafe', iconInactive: 'cafe-outline' },
  { id: 'dinner', label: 'Dinner', iconActive: 'moon', iconInactive: 'moon-outline' },
];

const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };
const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

const formatServingUnit = (unit?: string): string => {
  if (!unit) return '1 serving';
  const trimmed = unit.trim();
  if (/^\d/.test(trimmed)) return trimmed; // '100g' -> '100g', '250ml' -> '250ml'
  return `1 ${trimmed}`;                  // 'egg' -> '1 egg', 'piece' -> '1 piece'
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

  return (
    <Pressable
      onPress={() => onSelect(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.foodItemCard, pressStyle]}
      >
        {/* Food Vector / Photo Badge */}
        <FoodIconBadge item={item} size={42} style={styles.foodItemBadge} />

        {/* Clean Food Details (Name + Serving Unit) */}
        <View style={styles.foodItemMain}>
          <View style={styles.foodItemNameRow}>
            <Text style={styles.foodItemName} numberOfLines={1}>{item.name}</Text>
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

        {/* Calories Stack + 44×44 Touch Target Quick Add */}
        <View style={styles.foodItemRight}>
          <View style={styles.caloriesStack}>
            <Text style={styles.foodItemCals}>{item.calories}</Text>
            <Text style={styles.foodItemCalUnit}>kcal</Text>
          </View>

          {/* 44×44 Touch Target Button — stopPropagation prevents card select */}
          <Pressable
            style={({ pressed }) => [styles.quickAddButton, pressed ? styles.quickAddButtonPressed : null]}
            onPress={(e) => {
              e.stopPropagation && e.stopPropagation();
              onQuickAdd(item);
            }}
            hitSlop={HIT_SLOP_8}
            accessibilityLabel={`Quick add 1 serving of ${item.name}`}
          >
            <View style={styles.quickAddIconCircle}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const FoodLogModalComponent: React.FC<FoodLogModalProps> = ({ visible, mealType, onClose, onOpenFoodVision }) => {
  const { foodDatabase, addMealItem, removeMealItem, addCustomFood, userGoals, mealCalories, mealsByType } = useHealth();

  const [selectedMealType, setSelectedMealType] = useState<MealType>(mealType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [favoriteFoodIds, setFavoriteFoodIds] = useState<Record<string, boolean>>({});

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteFoodIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    setSelectedMealType(mealType);
  }, [mealType, visible]);

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
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
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
  const mealRatio = {
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
        Alert.alert('Permission required', 'Please grant photo library access to add a custom food photo.');
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
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.categoryLabel.toLowerCase().includes(q)
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
          .filter((item) => priorityIds.includes(item.id))
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
          (item) => priorityIds.includes(item.id) || item.category === 'curries' || item.category === 'rice'
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
          (item) => priorityIds.includes(item.id) || item.category === 'curries' || item.category === 'breads'
        );
      }

      // Snacks
      return list.filter(
        (item) =>
          item.category === 'snacks' ||
          item.category === 'fruits'
      );
    }

    if (selectedCategory === 'all') return list;
    if (selectedCategory === 'custom') return list.filter((item) => item.isCustom);
    if (selectedCategory === 'high_protein') return list.filter((item) => item.protein >= 8);
    return list.filter((item) => item.category === selectedCategory);
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
    setToastMessage(`Added ${quantity > 1 ? `${quantity}x ` : ''}${selectedFood.name} (${cals} kcal)`);
    setSelectedFood(null);

    const timer = setTimeout(() => {
      setToastMessage(null);
      setLastAddedMeal(null);
    }, 4500);
    setToastTimer(timer);
  };

  // Speed 1 (Fast Path): 1-Tap Quick Add logs immediately without drawer friction
  const handleQuickAdd = useCallback((food: FoodItem) => {
    if (toastTimer) clearTimeout(toastTimer);
    const addedItem = addMealItem(selectedMealType, food, 1);
    setLastAddedMeal(addedItem);
    setToastMessage(`Added ${food.name} (${food.calories} kcal)`);

    const timer = setTimeout(() => {
      setToastMessage(null);
      setLastAddedMeal(null);
    }, 4500);
    setToastTimer(timer);
  }, [addMealItem, selectedMealType, toastTimer]);

  const currentMealItems = mealsByType[selectedMealType] || [];
  const loggedMap = useMemo(() => {
    const map = new Map<string, number>();
    currentMealItems.forEach((m) => {
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
    >
      <View style={styles.modalRoot}>
        {selectedFood ? (
          /* =======================================================
             1. FULL-SCREEN DEDICATED FOOD PRODUCT DETAIL PAGE
             ======================================================= */
          <SafeAreaView style={styles.fullScreenProductContainer} edges={['top', 'bottom']}>
            {/* Top Bar: Floating Back & Favorite Buttons */}
            <View style={styles.productTopNavRow}>
              <Pressable
                style={({ pressed }) => [styles.productNavCircleBtn, pressed ? styles.btnPressedSubtle : null]}
                onPress={handleDismissDrawer}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel="Back to food list"
              >
                <Ionicons name="arrow-back" size={22} color="#0F172A" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.productNavCircleBtn, pressed ? styles.btnPressedSubtle : null]}
                onPress={() => toggleFavorite(selectedFood.id)}
                hitSlop={HIT_SLOP_10}
                accessibilityRole="button"
                accessibilityLabel={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color={isFav ? "#EF4444" : "#64748B"} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={true}
              alwaysBounceVertical={true}
              style={styles.fullScreenScrollView}
              contentContainerStyle={styles.fullScreenScrollContent}
            >
              {/* 2. First: The Food Image — 4:3 container, subject centered via contain */}
              <View style={styles.productHeroStage}>
                <FoodImage
                  source={heroImageSource}
                  aspectRatio={4 / 3}
                  contentFit="contain"
                  width="100%"
                  backgroundColor="#FFFFFF"
                  fallback={<FoodIconBadge item={selectedFood} size={160} />}
                />
              </View>

              {/* 3. Product Information Card */}
              <View style={styles.productDetailCard}>
                {/* Category Pill + Health Tag */}
                <View style={styles.productHeaderMetaRow}>
                  <Text style={styles.productCategoryLabel}>
                    {(selectedFood.categoryLabel || selectedFood.category || 'WHOLESOME').toUpperCase()}
                  </Text>
                  <View style={styles.productHealthBadgePill}>
                    <Text style={styles.productHealthBadgeText}>{selectedFood.badge || 'Clean Energy'}</Text>
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
                <Text style={styles.productDescriptionText}>
                  {foodDescription}
                </Text>

                {/* Nutrition Breakdown */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>Nutrition Breakdown</Text>
                </View>

                <View style={styles.nutritionMatrixGrid}>
                  <View style={[styles.nutriCard, styles.nutriCardCalories]}>
                    <Text style={styles.nutriVal}>{projectedAddedCals}</Text>
                    <Text style={[styles.nutriKey, { color: '#C2410C' }]}>CALORIES</Text>
                  </View>
                  <View style={styles.nutriCard}>
                    <View style={styles.nutriHeaderRow}>
                      <View style={[styles.drawerMacroDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.nutriKey}>PROTEIN</Text>
                    </View>
                    <Text style={styles.nutriVal}>
                      {(selectedFood.protein * quantity).toFixed(1)}g
                    </Text>
                  </View>
                  <View style={styles.nutriCard}>
                    <View style={styles.nutriHeaderRow}>
                      <View style={[styles.drawerMacroDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.nutriKey}>CARBS</Text>
                    </View>
                    <Text style={styles.nutriVal}>
                      {(selectedFood.carbs * quantity).toFixed(1)}g
                    </Text>
                  </View>
                  <View style={styles.nutriCard}>
                    <View style={styles.nutriHeaderRow}>
                      <View style={[styles.drawerMacroDot, { backgroundColor: '#F47551' }]} />
                      <Text style={styles.nutriKey}>FAT</Text>
                    </View>
                    <Text style={styles.nutriVal}>
                      {(selectedFood.fat * quantity).toFixed(1)}g
                    </Text>
                  </View>
                </View>

                {/* Effective Quantity Distribution */}
                {/* Quick Portion Chips */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>Quick Portions</Text>
                </View>

                <View style={styles.distributionChipsRow}>
                  {[1, 2, 3, 5].map((val) => (
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
            <View style={styles.productStickyFooter}>
              {/* Live Budget Impact Ticker Strip */}
              <View style={styles.footerImpactStrip}>
                <View style={styles.footerImpactMetaRow}>
                  <View style={styles.footerImpactLeft}>
                    <Ionicons name="pie-chart-outline" size={13} color="#64748B" />
                    <Text style={styles.footerImpactLabel} numberOfLines={1}>
                      {mealTitle} Target: <Text style={styles.footerImpactBold}>{mealTarget} kcal</Text>
                      <Text style={styles.footerImpactSub}> • {projectedTotal} total</Text>
                    </Text>
                  </View>

                  <View style={[styles.footerImpactBadge, isProjectedOver ? styles.footerImpactBadgeOver : styles.footerImpactBadgeOk]}>
                    <View style={[styles.footerImpactDot, isProjectedOver ? styles.footerImpactDotOver : styles.footerImpactDotOk]} />
                    <Text style={[styles.footerImpactBadgeText, isProjectedOver ? styles.footerImpactBadgeTextOver : styles.footerImpactBadgeTextOk]}>
                      {projectedRemaining >= 0
                        ? `${projectedRemaining} kcal left`
                        : `${Math.abs(projectedRemaining)} kcal over`}
                    </Text>
                  </View>
                </View>

                {/* Hairline 3px Micro-Progress Track */}
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
                    style={({ pressed }) => [styles.footerStepBtn, pressed ? styles.btnPressedSubtle : null]}
                    hitSlop={HIT_SLOP_8}
                    onPress={() => setQuantity((prev) => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10))}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease portion by 0.5"
                  >
                    <Ionicons name="remove" size={20} color="#0F172A" />
                  </Pressable>

                  <View style={styles.footerStepperValueWrap}>
                    <Text style={styles.footerStepperValue} numberOfLines={1}>
                      <Text style={styles.footerStepperNumber}>{quantity}</Text>
                      <Text style={styles.footerStepperUnit}> {formatStepperUnit(selectedFood.servingUnit)}</Text>
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.footerStepBtn, pressed ? styles.btnPressedSubtle : null]}
                    hitSlop={HIT_SLOP_8}
                    onPress={() => setQuantity((prev) => Math.round((prev + 0.5) * 10) / 10)}
                    accessibilityRole="button"
                    accessibilityLabel="Increase portion by 0.5"
                  >
                    <Ionicons name="add" size={20} color="#0F172A" />
                  </Pressable>
                </View>

                {/* Right: Add to Meal Action Button */}
                <Pressable
                  style={({ pressed }) => [styles.confirmAddBtn, pressed ? styles.btnPressedPrimary : null]}
                  onPress={handleConfirmLog}
                  accessibilityRole="button"
                  accessibilityLabel={`Add to ${mealTitle}, ${projectedAddedCals} calories`}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmAddBtnText} numberOfLines={1}>
                    Add to {mealTitle} • {projectedAddedCals} kcal
                  </Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
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
          {MEAL_TABS.map((slot) => {
            const isSelected = selectedMealType === slot.id;
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
                <Ionicons
                  name={isSelected ? slot.iconActive : slot.iconInactive}
                  size={13}
                  color={isSelected ? '#FFFFFF' : '#EA580C'}
                />
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
                    <Image source={{ uri: customPhotoUri }} style={styles.customPhotoPreviewImg} contentFit="cover" />
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
                    style={({ pressed }) => [styles.customAddPhotoBtn, pressed ? styles.btnPressedSubtle : null]}
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
                style={({ pressed }) => [styles.saveCustomBtn, pressed ? styles.btnPressedPrimary : null]}
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
                <Ionicons name="search-outline" size={19} color="#64748B" style={{ marginRight: 8 }} />
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
                ) : onOpenFoodVision ? (
                  <Pressable
                    onPress={onOpenFoodVision}
                    style={styles.cameraScanBtn}
                    hitSlop={HIT_SLOP_8}
                    accessibilityRole="button"
                    accessibilityLabel="Scan food with AI camera"
                  >
                    <Ionicons name="camera" size={20} color="#F47551" />
                  </Pressable>
                ) : null}
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
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={renderFoodItem}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                getItemLayout={(_data, index) => ({
                  length: 64,
                  offset: 64 * index,
                  index,
                })}
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
              toastStyle,
            ]}
          >
            <View style={styles.toastContent}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={{ marginRight: 8 }} />
              <Text style={styles.toastText} numberOfLines={1}>
                {toastMessage}
              </Text>
            </View>
            <View style={styles.toastActions}>
              {lastAddedMeal ? (
                <Pressable
                  style={({ pressed }) => [styles.toastUndoBtn, pressed ? styles.btnPressedSubtle : null]}
                  onPress={handleUndo}
                  hitSlop={HIT_SLOP_8}
                  accessibilityRole="button"
                  accessibilityLabel="Undo food log"
                >
                  <Text style={styles.toastUndoText}>Undo</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.toastCloseBtn, pressed ? styles.btnPressedSubtle : null]}
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(15, 23, 42, 0.65)' : '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneScreenContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    height: Platform.OS === 'web' ? '100%' : undefined,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#E2E8F0',
        }
      : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    fontWeight: '700',
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
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  headerBoldVal: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    fontWeight: '700',
  },
  budgetTextOk: {
    color: '#059669',
  },
  budgetTextOver: {
    color: '#EA580C',
  },
  customToggleBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  customToggleText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '600',
  },
  mealSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
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
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  mealTabPillActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  mealTabEmoji: {
    fontSize: 13,
  },
  mealTabLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#475569',
  },
  mealTabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: Fonts.poppins.bold,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#0F172A',
  },
  categoryWrapper: {
    flexShrink: 0,
    height: 46,
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
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5.5,
  },
  categoryPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
  },
  foodItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  foodItemBadge: {
    marginRight: 12,
  },
  foodItemMain: {
    flex: 1,
  },
  foodItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodItemName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14.5,
    fontWeight: '600',
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
    fontFamily: Fonts.poppins.bold,
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 9.5,
    color: '#059669',
    fontWeight: '700',
  },
  cameraScanBtn: {
    padding: 6,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 117, 81, 0.1)',
  },
  foodItemUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  foodItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  caloriesStack: {
    alignItems: 'flex-end',
  },
  foodItemCals: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  foodItemCalUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  quickAddButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  quickAddButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  fullScreenProductContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    height: Platform.OS === 'web' ? '100%' : undefined,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#E2E8F0',
        }
      : {}),
  },
  fullScreenScrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullScreenScrollContent: {
    paddingBottom: 120,
  },
  productTopNavRow: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 14 : 8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  productHeroStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    position: 'relative',
  },
  productDetailCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 20,
  },
  footerStepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 4,
    minWidth: 120,
  },
  footerStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerStepperValueWrap: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerStepperValue: {
    textAlign: 'center',
  },
  footerStepperNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  footerStepperUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
  productHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  productCategoryLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  productHealthBadgePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  productHealthBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    color: '#059669',
  },
  productMainTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginTop: 4,
    lineHeight: 28,
  },
  productBaseServingText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  productDescriptionText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
  },
  distributionChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  distributionChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distributionChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  distributionChipText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#475569',
  },
  distributionChipTextActive: {
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  sectionHeaderLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  quantityUnitText: {
    fontFamily: Fonts.poppins.medium,
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#475569',
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.poppins.bold,
  },
  nutritionMatrixGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  nutriCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  nutriCardCalories: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  nutriHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  drawerMacroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nutriKey: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9.5,
    color: '#64748B',
    letterSpacing: 0.4,
  },
  nutriVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  footerImpactStrip: {
    marginBottom: 10,
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
  },
  footerImpactLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
  footerImpactBold: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#0F172A',
  },
  footerImpactSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  footerImpactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  footerImpactBadgeOk: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
  },
  footerImpactBadgeTextOk: {
    color: '#15803D',
  },
  footerImpactBadgeTextOver: {
    color: '#DC2626',
  },
  footerImpactTrack: {
    height: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  footerImpactBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  footerImpactBarOk: {
    backgroundColor: '#16A34A',
  },
  footerImpactBarOver: {
    backgroundColor: '#EF4444',
  },
  footerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: '#15803D',
    height: 52,
    borderRadius: 16,
    gap: 8,
    paddingHorizontal: 12,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmAddBtnText: {
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
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
    fontFamily: Fonts.poppins.medium,
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
    fontFamily: Fonts.poppins.bold,
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
    fontFamily: Fonts.poppins.semiBold,
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  customFormDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    marginTop: 2,
  },
  inputLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    fontFamily: Fonts.poppins.regular,
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
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
    fontSize: 15,
  },
});

export const FoodLogModal = React.memo(FoodLogModalComponent);
