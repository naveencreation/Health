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
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { MotionDurations } from '@/theme/motion';
import { Fonts } from '@/theme/typography';
import { FoodItem, MealType, LoggedMealItem } from '@/types';
import { useFoodData, useDailyLog } from '@/context/HealthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodIconBadge } from '@/components/common/FoodIconBadge';
import { getFoodDescription } from '@/data/foodDatabase';
import {
  HeaderIconButton,
  ProfileButton,
  SheetHeader,
  SubScreenHeader,
} from '@/components/profile/ProfileUI';
import { FULL_DAY_NAMES, SHORT_MONTHS, parseDateString } from '@/utils/dateUtils';
import { useNutrition } from '../hooks/useNutrition';
import { getMealTarget } from '../services/nutritionAnalytics';
import {
  LabeledInput,
  MacroSummary,
  MealBudgetBar,
  MealImpact,
  MealSwitcher,
  PortionStepper,
  SectionLabel,
  foodUiStyles as ui,
  formatQty,
  mealLabel,
} from '../components/FoodLogUI';

interface FoodLogModalProps {
  visible: boolean;
  mealType: MealType;
  onClose: () => void;
  onOpenFoodVision?: () => void;
  onOpenBarcodeScanner?: () => void;
  prefillBarcode?: string | null;
}

type Category = { id: string; label: string };

const COMMON_HEAD: Category[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'recent', label: 'Recent' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'all', label: 'All' },
];
const HIGH_PROTEIN: Category = { id: 'high_protein', label: 'High protein' };
const MY_FOODS: Category = { id: 'custom', label: 'My foods' };

// Meal-specific chips keep the list short for the slot the user is logging
const MEAL_CATEGORIES: Record<MealType, Category[]> = {
  breakfast: [
    ...COMMON_HEAD,
    { id: 'south_indian', label: 'South Indian' },
    { id: 'breads', label: 'Breads & toast' },
    HIGH_PROTEIN,
    MY_FOODS,
    { id: 'fruits', label: 'Fruits & nuts' },
  ],
  lunch: [
    ...COMMON_HEAD,
    { id: 'curries', label: 'Dals & curries' },
    { id: 'rice', label: 'Rice & grains' },
    { id: 'breads', label: 'Breads & rotis' },
    HIGH_PROTEIN,
    MY_FOODS,
  ],
  dinner: [
    ...COMMON_HEAD,
    { id: 'curries', label: 'Dals & curries' },
    { id: 'breads', label: 'Breads' },
    { id: 'south_indian', label: 'South Indian' },
    HIGH_PROTEIN,
    MY_FOODS,
  ],
  snacks: [
    ...COMMON_HEAD,
    { id: 'snacks', label: 'Snacks' },
    { id: 'fruits', label: 'Fruits & nuts' },
    HIGH_PROTEIN,
    MY_FOODS,
  ],
};

const HIT_SLOP_4 = { top: 4, bottom: 4, left: 4, right: 4 };
const TOAST_MS = 4500;

/** '100g' stays '100g', 'katori' becomes '1 katori'. */
const formatServingUnit = (unit?: string): string => {
  if (!unit) return '1 serving';
  const trimmed = unit.trim();
  return /^\d/.test(trimmed) ? trimmed : `1 ${trimmed}`;
};

/** Unit word under the stepper value: 'katori', '× 100g', or 'serving' for long units. */
const portionUnit = (unit?: string): string => {
  if (!unit) return 'serving';
  const trimmed = unit.trim();
  if (/^\d/.test(trimmed)) return `× ${trimmed}`;
  const firstWord = trimmed.split(/[\s(]/)[0].toLowerCase();
  return firstWord.length <= 9 ? firstWord : 'serving';
};

const formatDay = (date: string): string => {
  const d = parseDateString(date);
  return `${FULL_DAY_NAMES[d.getDay()]}, ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
};

const shiftDate = (date: string, daysBack: number): string => {
  const d = parseDateString(date);
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface FoodItemRowProps {
  item: FoodItem;
  loggedCount: number;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (item: FoodItem) => void;
  onQuickAdd: (item: FoodItem) => void;
}

const FoodItemRow = React.memo<FoodItemRowProps>(
  ({ item, loggedCount, isFirst, isLast, onSelect, onQuickAdd }) => {
    const logged = loggedCount > 0;
    return (
      <View
        style={[
          styles.listCardSlice,
          isFirst && styles.listCardTop,
          isLast && styles.listCardBottom,
        ]}
      >
        {!isFirst ? <View style={ui.divider} /> : null}
        {/* Quick add is a sibling, not a child: nested buttons are invalid on web and for screen readers */}
        <View style={styles.foodRowWrap}>
          <Pressable
            style={({ pressed }) => [styles.foodRow, pressed && styles.rowPressed]}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${formatServingUnit(item.servingUnit)}, ${item.calories} calories${logged ? `, logged ${formatQty(loggedCount)} times` : ''}. Opens details`}
          >
            <FoodIconBadge item={item} size={48} />
            <View style={styles.foodText}>
              <View style={styles.foodNameRow}>
                <Text style={styles.foodName} numberOfLines={1}>
                  {item.name}
                </Text>
                {logged ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>×{formatQty(loggedCount)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={ui.rowSubtitle} numberOfLines={1}>
                {formatServingUnit(item.servingUnit)} ·{' '}
                <Text style={styles.foodKcal}>{item.calories} kcal</Text>
                {item.protein >= 1 ? ` · ${Math.round(item.protein)} g protein` : ''}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              logged && styles.addBtnLogged,
              pressed && ui.pressed,
            ]}
            onPress={() => onQuickAdd(item)}
            accessibilityRole="button"
            accessibilityLabel={`Quick add 1 serving of ${item.name}`}
          >
            <Ionicons name="add" size={22} color={logged ? Colors.primary : Colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    );
  }
);
FoodItemRow.displayName = 'FoodItemRow';

/** One tappable row inside an options card (no-match and empty states). */
const OptionRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  accessibilityLabel: string;
  divider?: boolean;
}> = ({ icon, title, subtitle, onPress, accessibilityLabel, divider }) => (
  <>
    {divider ? <View style={ui.divider} /> : null}
    <Pressable
      style={({ pressed }) => [ui.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[ui.tile, { backgroundColor: Colors.primaryContainer }]}>
        <Ionicons name={icon} size={18} color={Colors.primaryDark} />
      </View>
      <View style={styles.flex1}>
        <Text style={ui.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={ui.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  </>
);

type Toast = { title: string; detail: string };

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
  const { dailyLogs, selectedDate } = useDailyLog();
  const { addMealItem, removeMealItem, mealCalories, mealsByType, calorieBudget, caloriesBurned } =
    useNutrition();

  const [selectedMealType, setSelectedMealType] = useState<MealType>(mealType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    setSelectedMealType(mealType);
  }, [mealType, visible]);

  const mealTitle = mealLabel(selectedMealType);
  const categoriesList = MEAL_CATEGORIES[selectedMealType] || MEAL_CATEGORIES.breakfast;

  // Custom food form state
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('serving');
  const [customCals, setCustomCals] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customFiber, setCustomFiber] = useState('');
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(null);
  const [customBarcode, setCustomBarcode] = useState<string | null>(null);

  // A barcode Open Food Facts didn't know: the user types the label in; the code is context, not a name
  useEffect(() => {
    if (prefillBarcode) {
      setCustomBarcode(prefillBarcode);
      setIsCustomMode(true);
    }
  }, [prefillBarcode]);

  // In-modal toast with undo
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastAdded, setLastAdded] = useState<LoggedMealItem[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!toast) return;
    if (isReducedMotion.current) {
      toastSlideAnim.value = 0;
      toastFadeAnim.value = 1;
      return;
    }
    toastSlideAnim.value = 20;
    toastFadeAnim.value = 0;
    toastFadeAnim.value = withTiming(1, { duration: MotionDurations.standard });
    toastSlideAnim.value = withTiming(0, { duration: MotionDurations.standard });
  }, [toast, toastSlideAnim, toastFadeAnim]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const clearToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
    setLastAdded([]);
  }, []);

  const handleDismissToast = useCallback(() => {
    if (isReducedMotion.current) {
      clearToast();
      return;
    }
    toastFadeAnim.value = withTiming(0, { duration: MotionDurations.micro });
    setTimeout(clearToast, MotionDurations.micro);
  }, [toastFadeAnim, clearToast]);

  // Meal target: this meal's share of the day's allowance (budget + burned)
  const mealTarget = getMealTarget(calorieBudget + caloriesBurned, selectedMealType);
  const currentMealLogged = mealCalories[selectedMealType] || 0;

  const showToast = useCallback(
    (title: string, addedCals: number, items: LoggedMealItem[]) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      const left = mealTarget - (currentMealLogged + addedCals);
      const tail =
        left >= 0
          ? `${left} left for ${selectedMealType}`
          : `${-left} over for ${selectedMealType}`;
      setToast({ title, detail: `+${addedCals} kcal · ${tail}` });
      setLastAdded(items);
      toastTimer.current = setTimeout(() => {
        setToast(null);
        setLastAdded([]);
      }, TOAST_MS);
    },
    [mealTarget, currentMealLogged, selectedMealType]
  );

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
    const list = foodDatabase;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return list.filter(
        item => item.name.toLowerCase().includes(q) || item.categoryLabel.toLowerCase().includes(q)
      );
    }

    if (selectedCategory === 'recent' || selectedCategory === 'yesterday') {
      if (!selectedDate) return [];
      if (selectedCategory === 'yesterday') {
        const log = dailyLogs[shiftDate(selectedDate, 1)];
        if (log && log.meals) {
          const ids = log.meals.filter(m => m.mealType === selectedMealType).map(m => m.foodId);
          return list.filter(f => ids.includes(f.id));
        }
        return [];
      }
      const recentIds = new Set<string>();
      for (let i = 1; i <= 7; i++) {
        const log = dailyLogs[shiftDate(selectedDate, i)];
        log?.meals
          ?.filter(m => m.mealType === selectedMealType)
          .forEach(m => recentIds.add(m.foodId));
      }
      return list.filter(f => recentIds.has(f.id));
    }

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
          .sort((a, b) => priorityIds.indexOf(a.id) - priorityIds.indexOf(b.id));
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

      return list.filter(item => item.category === 'snacks' || item.category === 'fruits');
    }

    if (selectedCategory === 'all') return list;
    if (selectedCategory === 'custom') return list.filter(item => item.isCustom);
    if (selectedCategory === 'high_protein') return list.filter(item => item.protein >= 8);
    return list.filter(item => item.category === selectedCategory);
  }, [foodDatabase, searchQuery, selectedCategory, selectedMealType, dailyLogs, selectedDate]);

  const handleSelectFood = useCallback((food: FoodItem) => {
    setSelectedFood(food);
    setQuantity(1);
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSelectedFood(null);
    setQuantity(1);
  }, []);

  const handleUndo = () => {
    lastAdded.forEach(item => removeMealItem(item.id));
    handleDismissToast();
  };

  const handleConfirmLog = () => {
    if (!selectedFood) return;
    const added = addMealItem(selectedMealType, selectedFood, quantity);
    showToast(`Added ${selectedFood.name}`, Math.round(selectedFood.calories * quantity), [added]);
    setSelectedFood(null);
  };

  const handleQuickAdd = useCallback(
    (food: FoodItem) => {
      const added = addMealItem(selectedMealType, food, 1);
      showToast(`Added ${food.name}`, food.calories, [added]);
    },
    [addMealItem, selectedMealType, showToast]
  );

  const currentMealItems = mealsByType[selectedMealType];
  const loggedMap = useMemo(() => {
    const map = new Map<string, number>();
    (currentMealItems || []).forEach(m => {
      map.set(m.foodId, (map.get(m.foodId) || 0) + m.quantity);
    });
    return map;
  }, [currentMealItems]);

  const yesterdayMealItems = useMemo(() => {
    if (!selectedDate) return [];
    const log = dailyLogs[shiftDate(selectedDate, 1)];
    return log && Array.isArray(log.meals)
      ? log.meals.filter(meal => meal.mealType === selectedMealType)
      : [];
  }, [dailyLogs, selectedDate, selectedMealType]);

  const yesterdayMealTotalCals = useMemo(
    () => yesterdayMealItems.reduce((sum, item) => sum + (item.calories || 0), 0),
    [yesterdayMealItems]
  );

  const handleRepeatYesterdayMeal = useCallback(() => {
    if (yesterdayMealItems.length === 0) return;
    let totalAddedCals = 0;
    const added = yesterdayMealItems.map(meal => {
      const existingFood = foodDatabase.find(f => f.id === meal.foodId);
      const foodToLog: FoodItem = existingFood || {
        id: meal.foodId,
        name: meal.name,
        category: 'snacks',
        categoryLabel: 'Meal Item',
        servingUnit: meal.servingUnit,
        defaultServingSize: 1,
        calories: Math.round(meal.calories / (meal.quantity || 1)),
        protein: (meal.protein || 0) / (meal.quantity || 1),
        carbs: (meal.carbs || 0) / (meal.quantity || 1),
        fat: (meal.fat || 0) / (meal.quantity || 1),
        fiber: 0,
        icon: '🍱',
      };
      totalAddedCals += meal.calories;
      return addMealItem(selectedMealType, foodToLog, meal.quantity || 1);
    });
    showToast(`Logged yesterday's ${selectedMealType}`, totalAddedCals, added);
  }, [yesterdayMealItems, foodDatabase, addMealItem, selectedMealType, showToast]);

  const openCustom = useCallback((name = '') => {
    setCustomName(name);
    setIsCustomMode(true);
  }, []);

  const closeCustom = () => {
    setIsCustomMode(false);
    setCustomBarcode(null);
  };

  const query = searchQuery.trim();
  const listTitle = query
    ? `Results for "${query}"`
    : selectedCategory === 'popular'
      ? `Popular for ${selectedMealType}`
      : categoriesList.find(c => c.id === selectedCategory)?.label || 'Foods';

  const renderFoodItem = useCallback(
    ({ item, index }: { item: FoodItem; index: number }) => (
      <FoodItemRow
        item={item}
        loggedCount={loggedMap.get(item.id) || 0}
        isFirst={index === 0}
        isLast={index === filteredFoods.length - 1}
        onSelect={handleSelectFood}
        onQuickAdd={handleQuickAdd}
      />
    ),
    [handleSelectFood, handleQuickAdd, loggedMap, filteredFoods.length]
  );

  const showRepeat = yesterdayMealItems.length > 0 && !query && selectedCategory !== 'yesterday';

  const renderListHeader = () => (
    <View>
      {showRepeat ? (
        <View style={styles.repeatCard}>
          <View style={[ui.tile, styles.repeatTile]}>
            <Ionicons name="refresh" size={18} color={Colors.primaryDark} />
          </View>
          <View style={styles.flex1}>
            <Text style={ui.rowTitle} numberOfLines={1}>
              {`Same as yesterday's ${selectedMealType}`}
            </Text>
            <Text style={ui.rowSubtitle}>
              {yesterdayMealItems.length} item{yesterdayMealItems.length > 1 ? 's' : ''} ·{' '}
              {yesterdayMealTotalCals} kcal
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.repeatBtn, pressed && ui.pressed]}
            onPress={handleRepeatYesterdayMeal}
            accessibilityRole="button"
            accessibilityLabel={`Log all of yesterday's ${mealTitle}, ${yesterdayMealTotalCals} calories`}
          >
            <Text style={styles.repeatBtnText}>Log all</Text>
          </Pressable>
        </View>
      ) : null}
      {filteredFoods.length > 0 ? <SectionLabel title={listTitle} /> : null}
    </View>
  );

  const renderListFooter = () =>
    filteredFoods.length > 0 ? (
      <Pressable
        style={({ pressed }) => [styles.createRow, pressed && ui.pressed]}
        onPress={() => openCustom(query)}
        accessibilityRole="button"
        accessibilityLabel="Create custom food"
      >
        <Ionicons name="add-circle-outline" size={18} color={Colors.primaryDark} />
        <Text style={styles.createRowText}>Not listed? Create a food</Text>
      </Pressable>
    ) : null;

  const renderListEmpty = () => {
    const searching = Boolean(query);
    const empty = searching
      ? {
          icon: 'search' as const,
          title: `No match for "${query}"`,
          body: 'Log it another way. It takes under a minute.',
        }
      : selectedCategory === 'yesterday'
        ? {
            icon: 'time-outline' as const,
            title: `No ${selectedMealType} logged yesterday`,
            body: 'What you log today shows up here tomorrow for one-tap logging.',
          }
        : selectedCategory === 'recent'
          ? {
              icon: 'time-outline' as const,
              title: 'No recent foods yet',
              body: `Foods you log for ${selectedMealType} over the past 7 days appear here.`,
            }
          : selectedCategory === 'custom'
            ? {
                icon: 'create-outline' as const,
                title: 'No foods of your own yet',
                body: 'Foods you create are saved here for next time.',
              }
            : {
                icon: 'restaurant-outline' as const,
                title: 'Nothing in this category',
                body: 'Try another category, or search above.',
              };

    const options: React.ComponentProps<typeof OptionRow>[] = [];
    if (searching && onOpenFoodVision) {
      options.push({
        icon: 'camera-outline',
        title: 'Snap a photo',
        subtitle: 'Ria estimates it from your plate',
        onPress: onOpenFoodVision,
        accessibilityLabel: 'Scan food with AI camera',
      });
    }
    if (searching && onOpenBarcodeScanner) {
      options.push({
        icon: 'barcode-outline',
        title: 'Scan a barcode',
        subtitle: 'For packaged food',
        onPress: onOpenBarcodeScanner,
        accessibilityLabel: 'Scan barcode',
      });
    }
    if (!searching && selectedCategory !== 'custom') {
      options.push({
        icon: 'star-outline',
        title: 'Browse popular foods',
        subtitle: `Common picks for ${selectedMealType}`,
        onPress: () => setSelectedCategory('popular'),
        accessibilityLabel: 'Browse popular foods',
      });
    }
    options.push({
      icon: 'add',
      title: searching ? `Create "${query}"` : 'Create a food',
      subtitle: 'Enter calories once, reuse it later',
      onPress: () => openCustom(query),
      accessibilityLabel: 'Create custom food',
    });

    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name={empty.icon} size={24} color={Colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle} accessibilityRole="header">
          {empty.title}
        </Text>
        <Text style={[ui.body, styles.center]}>{empty.body}</Text>
        <View style={[ui.card, styles.emptyCard]}>
          {options.map((o, i) => (
            <OptionRow key={o.title} {...o} divider={i > 0} />
          ))}
        </View>
      </View>
    );
  };

  const customCalories = parseInt(customCals, 10);
  const canSaveCustom = customName.trim().length > 0 && customCalories > 0;

  const handleCreateCustomFood = () => {
    if (!canSaveCustom) return;
    const newFood = addCustomFood({
      name: customName.trim(),
      category: 'snacks',
      categoryLabel: 'Custom',
      servingUnit: customUnit.trim() || 'serving',
      defaultServingSize: 1,
      calories: customCalories,
      carbs: parseFloat(customCarbs) || 0,
      protein: parseFloat(customProtein) || 0,
      fat: parseFloat(customFat) || 0,
      fiber: parseFloat(customFiber) || 0,
      icon: '🍱',
      imageUrl: customPhotoUri || undefined,
    });

    const added = addMealItem(selectedMealType, newFood, 1);
    showToast(`Added ${newFood.name}`, newFood.calories, [added]);

    closeCustom();
    setCustomName('');
    setCustomUnit('serving');
    setCustomPhotoUri(null);
    setCustomCals('');
    setCustomCarbs('');
    setCustomProtein('');
    setCustomFat('');
    setCustomFiber('');
  };

  const footerPad = { paddingBottom: Math.max(16, insets.bottom + 8) };
  const projectedAddedCals = selectedFood ? Math.round(selectedFood.calories * quantity) : 0;

  const renderDetail = (food: FoodItem) => {
    const unit = portionUnit(food.servingUnit);
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.detailTopBar}>
          <HeaderIconButton
            icon="chevron-back"
            label="Back to food list"
            onPress={handleBackFromDetail}
          />
        </View>
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailHero}>
            <FoodIconBadge item={food} size={84} />
            <View style={styles.flex1}>
              <Text style={ui.title} numberOfLines={2} accessibilityRole="header">
                {food.name}
              </Text>
              <Text style={styles.detailServing}>
                {formatServingUnit(food.servingUnit)} · {food.calories} kcal
              </Text>
              {food.categoryLabel ? (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {food.isCustom ? 'My food' : food.categoryLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View>
            <SectionLabel title={`Nutrition (for ${formatQty(quantity)} ${unit})`} />
            <MacroSummary
              calories={projectedAddedCals}
              protein={food.protein * quantity}
              carbs={food.carbs * quantity}
              fat={food.fat * quantity}
            />
          </View>

          <View>
            <SectionLabel title="Portion" />
            <PortionStepper value={quantity} unit={unit} onChange={setQuantity} />
          </View>

          <Text style={[ui.body, styles.descText]}>{getFoodDescription(food)}</Text>
        </ScrollView>

        <View style={[styles.footer, footerPad]}>
          <MealImpact logged={currentMealLogged} adding={projectedAddedCals} target={mealTarget} />
          <ProfileButton
            label={`Add to ${mealTitle} · ${projectedAddedCals} kcal`}
            variant="primary"
            onPress={handleConfirmLog}
            accessibilityLabel={`Add to ${mealTitle}, ${projectedAddedCals} calories`}
          />
        </View>
      </SafeAreaView>
    );
  };

  const renderCustomForm = () => (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SubScreenHeader
        title="New food"
        subtitle={
          customBarcode
            ? `Barcode ${customBarcode} · saved to My foods`
            : 'Saved to My foods for next time'
        }
        onBack={closeCustom}
        backLabel="Back to food list"
      />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {customPhotoUri ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: customPhotoUri }} style={styles.photoImg} contentFit="cover" />
              <Pressable
                style={({ pressed }) => [styles.photoRemove, pressed && ui.pressed]}
                onPress={() => setCustomPhotoUri(null)}
                hitSlop={HIT_SLOP_4}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={16} color={Colors.textInverse} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.photoSlot, pressed && styles.rowPressed]}
              onPress={handlePickCustomPhoto}
              accessibilityRole="button"
              accessibilityLabel="Pick photo for custom food"
            >
              <Ionicons name="image-outline" size={22} color={Colors.primaryDark} />
              <Text style={styles.photoSlotText}>Add a photo (optional)</Text>
            </Pressable>
          )}

          <View style={styles.formGroup}>
            <LabeledInput
              label="Name"
              placeholder="e.g. Mom's besan chilla"
              value={customName}
              onChangeText={setCustomName}
              autoFocus={!!customBarcode}
            />
            <LabeledInput
              label="Serving"
              placeholder="piece, katori, bowl"
              value={customUnit}
              onChangeText={setCustomUnit}
            />
            <LabeledInput
              label="Calories per serving"
              unit="kcal"
              keyboardType="numeric"
              placeholder="150"
              value={customCals}
              onChangeText={setCustomCals}
            />
          </View>

          <View>
            <SectionLabel title="Macros (optional)" />
            <View style={styles.macroGrid}>
              {(
                [
                  ['Protein', customProtein, setCustomProtein, '6'],
                  ['Carbs', customCarbs, setCustomCarbs, '20'],
                  ['Fat', customFat, setCustomFat, '4'],
                  ['Fibre', customFiber, setCustomFiber, '2'],
                ] as const
              ).map(([label, value, setter, placeholder]) => (
                <View key={label} style={styles.macroCell}>
                  <LabeledInput
                    label={label}
                    unit="g"
                    keyboardType="numeric"
                    placeholder={placeholder}
                    value={value}
                    onChangeText={setter}
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={[styles.footer, footerPad]}>
          <ProfileButton
            label={`Save and add to ${mealTitle}`}
            variant="primary"
            onPress={handleCreateCustomFood}
            disabled={!canSaveCustom}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const noMatch = Boolean(query) && filteredFoods.length === 0;

  const renderCatalog = () => (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SheetHeader
        title="Log food"
        subtitle={selectedDate ? formatDay(selectedDate) : undefined}
        onClose={onClose}
        closeLabel="Close food logger"
      />
      <View style={styles.top}>
        <MealSwitcher
          value={selectedMealType}
          onChange={m => {
            setSelectedMealType(m);
            setSelectedCategory('popular');
          }}
        />
        <View
          style={styles.budgetRow}
          accessible
          accessibilityLabel={`${mealTitle}: ${currentMealLogged} of ${mealTarget} calories`}
        >
          <MealBudgetBar logged={currentMealLogged} target={mealTarget} />
          <Text style={styles.budgetText}>
            <Text style={styles.budgetStrong}>{currentMealLogged}</Text> of {mealTarget} kcal
          </Text>
        </View>

        <View style={[styles.search, noMatch && styles.searchActive]}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              selectedMealType === 'breakfast'
                ? 'Search idli, dosa, eggs, oats'
                : 'Search roti, dal, paneer, rice'
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            accessibilityLabel="Search foods"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              style={styles.searchIconBtn}
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search input"
            >
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          ) : (
            <>
              {onOpenBarcodeScanner || onOpenFoodVision ? (
                <View style={styles.searchDivider} />
              ) : null}
              {onOpenBarcodeScanner ? (
                <Pressable
                  style={({ pressed }) => [styles.searchIconBtn, pressed && ui.pressed]}
                  onPress={onOpenBarcodeScanner}
                  accessibilityRole="button"
                  accessibilityLabel="Scan barcode on packaged food"
                >
                  <Ionicons name="barcode-outline" size={21} color={Colors.textPrimary} />
                </Pressable>
              ) : null}
              {onOpenFoodVision ? (
                <Pressable
                  style={({ pressed }) => [styles.searchIconBtn, pressed && ui.pressed]}
                  onPress={onOpenFoodVision}
                  accessibilityRole="button"
                  accessibilityLabel="Scan food with AI camera"
                >
                  <Ionicons name="camera-outline" size={21} color={Colors.primary} />
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>

      {query ? null : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {categoriesList.map(cat => {
            const on = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && ui.pressed]}
                onPress={() => setSelectedCategory(cat.id)}
                hitSlop={HIT_SLOP_4}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Filter by ${cat.label}`}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        style={styles.flex1}
        data={filteredFoods}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        renderItem={renderFoodItem}
        ListHeaderComponent={renderListHeader()}
        ListFooterComponent={renderListFooter()}
        ListEmptyComponent={renderListEmpty()}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </SafeAreaView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={selectedFood ? handleBackFromDetail : isCustomMode ? closeCustom : onClose}
      statusBarTranslucent={true}
    >
      <StatusBar style="dark" />
      <View style={styles.root}>
        {selectedFood
          ? renderDetail(selectedFood)
          : isCustomMode
            ? renderCustomForm()
            : renderCatalog()}

        {toast ? (
          <Animated.View
            style={[styles.toast, { bottom: Math.max(insets.bottom + 12, 20) }, toastStyle]}
            accessibilityLiveRegion="polite"
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.primaryMuted} />
            <View style={styles.flex1}>
              <Text style={styles.toastTitle} numberOfLines={1}>
                {toast.title}
              </Text>
              <Text style={styles.toastDetail} numberOfLines={1}>
                {toast.detail}
              </Text>
            </View>
            {lastAdded.length > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.toastBtn, pressed && ui.pressed]}
                onPress={handleUndo}
                accessibilityRole="button"
                accessibilityLabel="Undo food log"
              >
                <Text style={styles.toastUndo}>Undo</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.toastClose, pressed && ui.pressed]}
              onPress={handleDismissToast}
              accessibilityRole="button"
              accessibilityLabel="Dismiss toast"
            >
              <Ionicons name="close" size={16} color={Colors.textMuted} />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  rowPressed: { backgroundColor: Colors.surfaceLow },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 24 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    backgroundColor: Colors.background,
  },

  // Catalog
  top: { paddingHorizontal: 16, gap: 14 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  budgetText: { fontFamily: Fonts.urbanist.medium, fontSize: 13, color: Colors.textSecondary },
  budgetStrong: { fontFamily: Fonts.urbanist.bold, color: Colors.textPrimary },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingLeft: 14,
    paddingRight: 2,
    gap: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.card,
  },
  searchActive: { borderColor: Colors.primary },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  searchDivider: { width: 1, height: 22, backgroundColor: Colors.borderSubtle },
  searchIconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chipsScroll: { flexGrow: 0, marginTop: 14 },
  chips: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: Colors.inverseSurface, borderColor: Colors.inverseSurface },
  chipText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSecondary },
  chipTextOn: { color: Colors.textInverse },
  listContent: { paddingHorizontal: 16, paddingTop: 16, flexGrow: 1 },

  repeatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingLeft: 14,
    marginBottom: 24,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    elevation: 0,
  },
  repeatTile: { backgroundColor: Colors.primaryContainer },
  repeatBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBtnText: { fontFamily: Fonts.urbanist.bold, fontSize: 13, color: Colors.onPrimary },

  // One card split across FlatList rows
  listCardSlice: {
    backgroundColor: Colors.card,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  listCardTop: {
    borderTopWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderCurve: 'continuous',
  },
  listCardBottom: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderCurve: 'continuous',
  },
  foodRowWrap: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  foodRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
  },
  foodText: { flex: 1, minWidth: 0 },
  foodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foodName: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  foodKcal: { fontFamily: Fonts.urbanist.bold, color: Colors.textPrimary },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  countBadgeText: { fontFamily: Fonts.urbanist.bold, fontSize: 11, color: Colors.primaryDark },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  addBtnLogged: { backgroundColor: Colors.primaryLight },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 12,
  },
  createRowText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.primaryDark },

  empty: { alignItems: 'center', paddingTop: 16, gap: 6 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyCard: { alignSelf: 'stretch', marginTop: 18 },

  // Detail
  detailTopBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  detailHero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  detailServing: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.surfaceContainer,
  },
  categoryBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  descText: { marginHorizontal: 4 },

  // Custom form
  photoSlot: {
    height: 96,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderMedium,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoSlotText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSecondary },
  photoPreview: { alignSelf: 'flex-start' },
  photoImg: { width: 96, height: 96, borderRadius: 10, borderCurve: 'continuous' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: { gap: 16 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macroCell: { flexBasis: '45%', flexGrow: 1 },

  // Toast
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 448,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Colors.inverseSurface,
    elevation: 0,
  },
  toastTitle: { fontFamily: Fonts.urbanist.bold, fontSize: 14, color: Colors.textInverse },
  toastDetail: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  toastBtn: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  toastUndo: { fontFamily: Fonts.urbanist.bold, fontSize: 14, color: Colors.primaryMuted },
  toastClose: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export const FoodLogModal = React.memo(FoodLogModalComponent);
