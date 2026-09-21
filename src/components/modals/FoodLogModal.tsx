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
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { FoodItem, MealType, LoggedMealItem } from '@/types';
import { useHealth } from '@/context/HealthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodIconBadge } from '@/components/common/FoodIconBadge';

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

// Meal-Contextual Categories to eliminate decision fatigue
const MEAL_CATEGORIES: Record<MealType, CategoryItem[]> = {
  breakfast: [
    { id: 'popular', label: 'Popular', iconFamily: 'ion', iconName: 'star', activeColor: '#FACC15', inactiveColor: '#EAB308' },
    { id: 'custom', label: 'My Custom', iconFamily: 'mci', iconName: 'chef-hat', activeColor: '#FFFFFF', inactiveColor: '#8B5CF6' },
    { id: 'south_indian', label: 'South Indian', iconFamily: 'mci', iconName: 'pot-steam-outline', activeColor: '#FFFFFF', inactiveColor: '#F97316' },
    { id: 'beverages', label: 'Tea & Coffee', iconFamily: 'ion', iconName: 'cafe-outline', activeColor: '#FFFFFF', inactiveColor: '#B45309' },
    { id: 'breads', label: 'Breads & Toast', iconFamily: 'mci', iconName: 'bread-slice-outline', activeColor: '#FFFFFF', inactiveColor: '#D97706' },
    { id: 'high_protein', label: 'High Protein', iconFamily: 'ion', iconName: 'flash', activeColor: '#FACC15', inactiveColor: '#F59E0B' },
    { id: 'fruits', label: 'Fruits', iconFamily: 'ion', iconName: 'nutrition-outline', activeColor: '#34D399', inactiveColor: '#10B981' },
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
    { id: 'beverages', label: 'Beverages', iconFamily: 'ion', iconName: 'cafe-outline', activeColor: '#FFFFFF', inactiveColor: '#B45309' },
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

interface FoodItemRowProps {
  item: FoodItem;
  loggedCount?: number;
  onSelect: (item: FoodItem) => void;
  onQuickAdd: (item: FoodItem) => void;
}

const FoodItemRow = React.memo<FoodItemRowProps>(({ item, loggedCount, onSelect, onQuickAdd }) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.foodItemCard, pressed ? styles.foodItemCardPressed : null]}
      onPress={() => onSelect(item)}
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

      {/* Calories Stack + 44x44px Touch Target Quick Add */}
      <View style={styles.foodItemRight}>
        <View style={styles.caloriesStack}>
          <Text style={styles.foodItemCals}>{item.calories}</Text>
          <Text style={styles.foodItemCalUnit}>kcal</Text>
        </View>

        {/* 44x44px Touch Target Button */}
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

  useEffect(() => {
    setSelectedMealType(mealType);
  }, [mealType, visible]);

  // In-modal Toast & Undo State for 2-Speed Fast Path
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastAddedMeal, setLastAddedMeal] = useState<LoggedMealItem | null>(null);
  const [toastTimer, setToastTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const drawerSlideAnim = useRef(new Animated.Value(320)).current;
  const drawerFadeAnim = useRef(new Animated.Value(0)).current;
  const toastSlideAnim = useRef(new Animated.Value(20)).current;
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedFood) {
      drawerSlideAnim.setValue(320);
      drawerFadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(drawerFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(drawerSlideAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [selectedFood]);

  const handleDismissDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(drawerSlideAnim, {
        toValue: 320,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setSelectedFood(null);
    });
  }, [drawerFadeAnim, drawerSlideAnim]);

  useEffect(() => {
    if (toastMessage) {
      toastSlideAnim.setValue(20);
      toastFadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(toastFadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(toastSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [toastMessage]);

  const handleDismissToast = useCallback(() => {
    Animated.timing(toastFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setToastMessage(null);
      setLastAddedMeal(null);
      if (toastTimer) clearTimeout(toastTimer);
    });
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
          'filter_coffee',
          'masala_chai',
          'brown_bread_slice',
          'aloo_paratha',
          'egg_curry',
          'apple_medium',
          'banana_medium',
          'almonds',
        ];
        return list
          .filter((item) => priorityIds.includes(item.id) || item.category === 'south_indian')
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
          'dal_tadka',
          'steamed_rice_white',
          'paneer_butter_masala',
          'curd_dahi',
          'mix_veg_sabzi',
          'chicken_curry',
          'salad_cucumber_tomato',
        ];
        return list.filter(
          (item) => priorityIds.includes(item.id) || item.category === 'curries' || item.category === 'rice'
        );
      }

      if (selectedMealType === 'dinner') {
        const priorityIds = [
          'roti_chapati',
          'dal_tadka',
          'mix_veg_sabzi',
          'palak_paneer',
          'idli_steamed',
          'salad_cucumber_tomato',
        ];
        return list.filter(
          (item) => priorityIds.includes(item.id) || item.category === 'curries'
        );
      }

      // Snacks
      return list.filter(
        (item) =>
          item.category === 'snacks' ||
          item.category === 'beverages' ||
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <SafeAreaView style={styles.phoneScreenContainer} edges={['top', 'bottom']}>
        {/* 1. Header with Title & Live Budget Anchors */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed ? styles.btnPressedSubtle : null]}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Close food logger"
          >
            <Ionicons name="close" size={22} color="#0F172A" />
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>Log {mealTitle}</Text>
            <View style={styles.headerBudgetRow}>
              <Text style={styles.headerSubtitleText}>
                Budget: <Text style={styles.headerBoldVal}>{mealTarget} cal</Text> • {currentMealLogged} logged
              </Text>
              <View style={[styles.headerBudgetBadge, mealRemaining < 0 ? styles.budgetBadgeOver : styles.budgetBadgeOk]}>
                <Text style={[styles.headerBudgetBadgeText, mealRemaining < 0 ? styles.budgetTextOver : styles.budgetTextOk]}>
                  {mealRemaining >= 0 ? `${mealRemaining} left` : `+${Math.abs(mealRemaining)} over`}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.customToggleBtn, pressed ? styles.btnPressedSubtle : null]}
            onPress={() => setIsCustomMode(!isCustomMode)}
            hitSlop={HIT_SLOP_8}
            accessibilityRole="button"
          >
            <Text style={styles.customToggleText}>
              {isCustomMode ? 'Search' : '+ Custom'}
            </Text>
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
              <Text style={styles.customFormTitle}>Create & Log Custom Dish</Text>
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
                  {categoriesList.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const iconColor = isSelected
                      ? (cat.activeColor || '#FFFFFF')
                      : (cat.inactiveColor || '#64748B');

                    return (
                      <Pressable
                        key={cat.id}
                        style={({ pressed }) => [
                          styles.categoryPill,
                          isSelected ? styles.categoryPillActive : null,
                          pressed ? styles.btnPressedPill : null,
                        ]}
                        onPress={() => setSelectedCategory(cat.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by ${cat.label}`}
                      >
                        {cat.iconFamily === 'mci' ? (
                          <MaterialCommunityIcons
                            name={cat.iconName as any}
                            size={14}
                            color={iconColor}
                          />
                        ) : (
                          <Ionicons
                            name={cat.iconName as any}
                            size={14}
                            color={iconColor}
                          />
                        )}
                        <Text
                          style={[
                            styles.categoryText,
                            isSelected ? styles.categoryTextActive : null,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 4. Food List */}
              <FlatList
                data={filteredFoods}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={renderFoodItem}
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={5}
              />
            </>
          )}

          {/* 5. Portion Selector Drawer */}
          {selectedFood ? (
            <Animated.View style={[styles.portionOverlay, { opacity: drawerFadeAnim }]}>
              <Pressable
                style={styles.portionOverlayDismiss}
                onPress={handleDismissDrawer}
                accessibilityRole="button"
                accessibilityLabel="Dismiss portion drawer"
              />
              <Animated.View
                style={[
                  styles.portionDrawer,
                  { transform: [{ translateY: drawerSlideAnim }] },
                ]}
              >
                <View style={styles.drawerHandleBar}>
                  <View style={styles.drawerHandle} />
                </View>

                <View style={styles.drawerTop}>
                  <FoodIconBadge item={selectedFood} size={48} />
                  <View style={styles.drawerFoodInfo}>
                    <View style={styles.drawerTitleRow}>
                      <Text style={styles.drawerFoodName} numberOfLines={1}>{selectedFood.name}</Text>
                      {selectedFood.categoryLabel ? (
                        <View style={styles.drawerCategoryBadge}>
                          <Text style={styles.drawerCategoryText}>{selectedFood.categoryLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.drawerFoodUnit}>
                      1 {selectedFood.servingUnit} • {selectedFood.calories} kcal
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.drawerCloseBtn, pressed ? styles.btnPressedSubtle : null]}
                    onPress={handleDismissDrawer}
                    hitSlop={HIT_SLOP_10}
                    accessibilityRole="button"
                    accessibilityLabel="Close portion drawer"
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </Pressable>
                </View>

                {/* Quantity Stepper with Functional State Updaters */}
                <View style={styles.stepperContainer}>
                  <Text style={styles.stepperLabel}>Portion Size:</Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={({ pressed }) => [styles.stepButton, pressed ? styles.btnPressedSubtle : null]}
                      hitSlop={HIT_SLOP_8}
                      onPress={() => setQuantity((prev) => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10))}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease portion by 0.5"
                    >
                      <Ionicons name="remove" size={20} color={Colors.primary} />
                    </Pressable>
                    <View style={styles.quantityDisplayContainer}>
                      <Text style={styles.quantityDisplay}>{quantity}x</Text>
                      <Text style={styles.quantityUnitText} numberOfLines={1}>
                        {selectedFood.servingUnit}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.stepButton, pressed ? styles.btnPressedSubtle : null]}
                      hitSlop={HIT_SLOP_8}
                      onPress={() => setQuantity((prev) => Math.round((prev + 0.5) * 10) / 10)}
                      accessibilityRole="button"
                      accessibilityLabel="Increase portion by 0.5"
                    >
                      <Ionicons name="add" size={20} color={Colors.primary} />
                    </Pressable>
                  </View>
                </View>

                {/* 3 Clean Presets (eliminating Hick's Law decision fatigue) */}
                <View style={styles.presetRow}>
                  {[
                    { val: 0.5, label: '0.5x (Half)' },
                    { val: 1, label: '1x (Standard)' },
                    { val: 2, label: '2x (Double)' },
                  ].map((preset) => (
                    <Pressable
                      key={preset.val}
                      style={({ pressed }) => [
                        styles.presetBtn,
                        quantity === preset.val ? styles.presetBtnActive : null,
                        pressed ? styles.btnPressedPill : null,
                      ]}
                      onPress={() => setQuantity(preset.val)}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.presetBtnText,
                          quantity === preset.val ? styles.presetBtnTextActive : null,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Live Budget Impact Preview Card */}
                <View style={styles.drawerImpactCard}>
                  <View style={styles.impactHeaderRow}>
                    <Text style={styles.impactTitle}>{mealTitle} after this</Text>
                    <Text style={[styles.impactRemaining, isProjectedOver ? styles.impactRemainingOver : styles.impactRemainingOk]}>
                      {projectedRemaining >= 0
                        ? `${projectedRemaining} cal remaining`
                        : `${Math.abs(projectedRemaining)} cal over target`}
                    </Text>
                  </View>

                  <View style={styles.impactProgressTrack}>
                    <View
                      style={[
                        styles.impactProgressBar,
                        { width: `${projectedPct}%` },
                        isProjectedOver ? styles.impactBarOver : styles.impactBarOk,
                      ]}
                    />
                  </View>

                  <View style={styles.impactFooterRow}>
                    <Text style={styles.impactFooterText}>
                      {projectedTotal} / {mealTarget} kcal ({projectedPct}%)
                    </Text>
                    <Text style={styles.impactAddedBadge}>
                      +{projectedAddedCals} kcal
                    </Text>
                  </View>
                </View>

                {/* Live Nutrition Breakdown with Static Style Colors */}
                <View style={styles.liveNutritionBox}>
                  <View style={styles.liveNutriItem}>
                    <Text style={styles.liveNutriVal}>{projectedAddedCals}</Text>
                    <Text style={styles.liveNutriKey}>Calories</Text>
                  </View>
                  <View style={styles.liveNutriItem}>
                    <Text style={[styles.liveNutriVal, styles.liveNutriProtein]}>
                      {(selectedFood.protein * quantity).toFixed(1)}g
                    </Text>
                    <Text style={styles.liveNutriKey}>Protein</Text>
                  </View>
                  <View style={styles.liveNutriItem}>
                    <Text style={[styles.liveNutriVal, styles.liveNutriCarbs]}>
                      {(selectedFood.carbs * quantity).toFixed(1)}g
                    </Text>
                    <Text style={styles.liveNutriKey}>Carbs</Text>
                  </View>
                  <View style={styles.liveNutriItem}>
                    <Text style={[styles.liveNutriVal, styles.liveNutriFat]}>
                      {(selectedFood.fat * quantity).toFixed(1)}g
                    </Text>
                    <Text style={styles.liveNutriKey}>Fat</Text>
                  </View>
                </View>

                {/* Confirm Button */}
                <Pressable
                  style={({ pressed }) => [styles.confirmAddBtn, pressed ? styles.btnPressedPrimary : null]}
                  onPress={handleConfirmLog}
                  accessibilityRole="button"
                  accessibilityLabel={`Add to ${mealTitle}, ${projectedAddedCals} calories`}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmAddBtnText}>
                    Add to {mealTitle} • {projectedAddedCals} kcal
                  </Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          ) : null}
        </KeyboardAvoidingView>

          {/* 6. Floating In-Modal Toast Snackbar with Undo */}
          {toastMessage ? (
            <Animated.View
              style={[
                styles.toastContainer,
                {
                  opacity: toastFadeAnim,
                  transform: [{ translateY: toastSlideAnim }],
                },
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
        </SafeAreaView>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitleCenter: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
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
  portionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    zIndex: 10001,
  },
  portionOverlayDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  portionDrawer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  drawerHandleBar: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  drawerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  drawerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  drawerFoodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerFoodInfo: {
    flex: 1,
    paddingRight: 6,
  },
  drawerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawerFoodName: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  drawerCategoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  drawerCategoryText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#64748B',
  },
  drawerFoodUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  },
  quantityDisplayContainer: {
    alignItems: 'center',
    minWidth: 54,
  },
  quantityDisplay: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  quantityUnitText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    maxWidth: 90,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    minHeight: 44,
    paddingVertical: 10,
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
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#475569',
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.poppins.bold,
  },
  drawerImpactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  impactHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  impactTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#334155',
  },
  impactRemaining: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12,
  },
  impactRemainingOk: {
    color: '#16A34A',
  },
  impactRemainingOver: {
    color: '#EF4444',
  },
  impactProgressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  impactProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  impactBarOk: {
    backgroundColor: '#22C55E',
  },
  impactBarOver: {
    backgroundColor: '#EF4444',
  },
  impactFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactFooterText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  impactAddedBadge: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    color: '#0F172A',
  },
  liveNutritionBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-around',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  liveNutriItem: {
    alignItems: 'center',
  },
  liveNutriVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  liveNutriProtein: {
    color: '#22C55E',
  },
  liveNutriCarbs: {
    color: '#EAB308',
  },
  liveNutriFat: {
    color: '#F97316',
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
  liveNutriKey: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  confirmAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    minHeight: 48,
  },
  confirmAddBtnText: {
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
    fontSize: 15,
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
