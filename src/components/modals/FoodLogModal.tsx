import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { FoodItem, MealType, LoggedMealItem } from '@/types';
import { useHealth } from '@/context/HealthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FoodLogModalProps {
  visible: boolean;
  mealType: MealType;
  onClose: () => void;
}

// Meal-Contextual Categories to eliminate decision fatigue
const MEAL_CATEGORIES: Record<MealType, { id: string; label: string }[]> = {
  breakfast: [
    { id: 'popular', label: '⭐ Popular' },
    { id: 'south_indian', label: '🌯 South Indian' },
    { id: 'beverages', label: '☕ Tea & Coffee' },
    { id: 'breads', label: '🫓 Breads & Toast' },
    { id: 'high_protein', label: '⚡ High Protein' },
    { id: 'fruits', label: '🍎 Fruits' },
    { id: 'all', label: 'All Foods' },
  ],
  lunch: [
    { id: 'popular', label: '⭐ Popular' },
    { id: 'curries', label: '🍲 Dals & Curries' },
    { id: 'rice', label: '🍚 Rice & Grains' },
    { id: 'breads', label: '🫓 Breads & Rotis' },
    { id: 'high_protein', label: '⚡ High Protein' },
    { id: 'all', label: 'All Foods' },
  ],
  dinner: [
    { id: 'popular', label: '⭐ Popular' },
    { id: 'curries', label: '🍲 Dals & Curries' },
    { id: 'breads', label: '🫓 Breads' },
    { id: 'south_indian', label: '🌯 South Indian' },
    { id: 'high_protein', label: '⚡ High Protein' },
    { id: 'all', label: 'All Foods' },
  ],
  snacks: [
    { id: 'popular', label: '⭐ Popular' },
    { id: 'snacks', label: '🥗 Snacks' },
    { id: 'beverages', label: '☕ Beverages' },
    { id: 'fruits', label: '🍎 Fruits & Nuts' },
    { id: 'high_protein', label: '⚡ High Protein' },
    { id: 'all', label: 'All Foods' },
  ],
};

export const FoodLogModal: React.FC<FoodLogModalProps> = ({ visible, mealType, onClose }) => {
  const { foodDatabase, addMealItem, removeMealItem, addCustomFood, userGoals, mealCalories } = useHealth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // In-modal Toast & Undo State for 2-Speed Fast Path
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastAddedMeal, setLastAddedMeal] = useState<LoggedMealItem | null>(null);
  const [toastTimer, setToastTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

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
  }[mealType] || 0.25;

  const mealTarget = Math.round(budget * mealRatio);
  const currentMealLogged = mealCalories[mealType] || 0;
  const mealRemaining = mealTarget - currentMealLogged;

  // Custom food form state
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('serving');
  const [customCals, setCustomCals] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customFiber, setCustomFiber] = useState('');

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
      if (mealType === 'breakfast') {
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

      if (mealType === 'lunch') {
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

      if (mealType === 'dinner') {
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
    if (selectedCategory === 'high_protein') return list.filter((item) => item.protein >= 8);
    return list.filter((item) => item.category === selectedCategory);
  }, [foodDatabase, searchQuery, selectedCategory, mealType]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setQuantity(1);
  };

  const handleUndo = () => {
    if (lastAddedMeal) {
      removeMealItem(lastAddedMeal.id);
      setToastMessage(null);
      setLastAddedMeal(null);
      if (toastTimer) clearTimeout(toastTimer);
    }
  };

  const handleConfirmLog = () => {
    if (!selectedFood) return;
    if (toastTimer) clearTimeout(toastTimer);
    const cals = Math.round(selectedFood.calories * quantity);
    const addedItem = addMealItem(mealType, selectedFood, quantity);
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
  const handleQuickAdd = (food: FoodItem) => {
    if (toastTimer) clearTimeout(toastTimer);
    const addedItem = addMealItem(mealType, food, 1);
    setLastAddedMeal(addedItem);
    setToastMessage(`Added ${food.name} (${food.calories} kcal)`);

    const timer = setTimeout(() => {
      setToastMessage(null);
      setLastAddedMeal(null);
    }, 4500);
    setToastTimer(timer);
  };

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
      icon: '🍽️',
    });

    const addedItem = addMealItem(mealType, newFood, 1);
    setLastAddedMeal(addedItem);
    setToastMessage(`Added ${newFood.name} (${newFood.calories} kcal)`);

    const timer = setTimeout(() => {
      setToastMessage(null);
      setLastAddedMeal(null);
    }, 4500);
    setToastTimer(timer);

    setIsCustomMode(false);
    setCustomName('');
    setCustomCals('');
    setCustomCarbs('');
    setCustomProtein('');
    setCustomFat('');
    setCustomFiber('');
  };

  const mealTitle = mealType.charAt(0).toUpperCase() + mealType.slice(1);
  const categoriesList = MEAL_CATEGORIES[mealType] || MEAL_CATEGORIES.breakfast;

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
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close food logger"
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>Log {mealTitle}</Text>
            <Text style={styles.headerSubtitle}>
              Budget: <Text style={styles.headerBoldVal}>{mealTarget} cal</Text> • {currentMealLogged} logged •{' '}
              <Text style={{ color: mealRemaining < 0 ? '#EF4444' : '#16A34A', fontWeight: '700' }}>
                {mealRemaining >= 0 ? `${mealRemaining} cal left` : `${Math.abs(mealRemaining)} cal over`}
              </Text>
            </Text>
          </View>

            <TouchableOpacity
              style={styles.customToggleBtn}
              onPress={() => setIsCustomMode(!isCustomMode)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.customToggleText}>
                {isCustomMode ? 'Search' : '+ Custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {isCustomMode ? (
            /* Custom Food Form */
            <ScrollView style={styles.customForm} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.customFormTitle}>Create & Log Custom Dish</Text>
              <Text style={styles.customFormDesc}>
                Add homemade recipes or items not in the database.
              </Text>

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

              <TouchableOpacity style={styles.saveCustomBtn} onPress={handleCreateCustomFood}>
                <Text style={styles.saveCustomBtnText}>Save & Log Dish</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <>
              {/* 2. Search Input Bar */}
              <View style={styles.searchBarContainer}>
                <Ionicons name="search-outline" size={19} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${mealType === 'breakfast' ? 'idli, dosa, eggs, oats, coffee...' : 'roti, dal, paneer, rice...'}`}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#94A3B8"
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 3. Non-Clipped Category Filter Tabs */}
              <View style={styles.categoryWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {categoriesList.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryPill,
                        selectedCategory === cat.id && styles.categoryPillActive,
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === cat.id && styles.categoryTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 4. Food List */}
              <FlatList
                data={filteredFoods}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.foodItemCard}
                    onPress={() => handleSelectFood(item)}
                    activeOpacity={0.7}
                  >
                    {/* Food Thumbnail Icon */}
                    <View style={styles.foodItemIcon}>
                      <Text style={{ fontSize: 22 }}>{item.icon || '🍽️'}</Text>
                    </View>

                    {/* Food Details & Color-Coded Macro Badges */}
                    <View style={styles.foodItemMain}>
                      <Text style={styles.foodItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.foodItemUnit}>
                        1 {item.servingUnit} • {item.categoryLabel}
                      </Text>

                      {/* Clean Color-Coded Macro Badges */}
                      <View style={styles.macroPillRow}>
                        <View style={styles.macroBadge}>
                          <View style={[styles.macroDot, { backgroundColor: '#22C55E' }]} />
                          <Text style={styles.macroText}>{item.protein}g P</Text>
                        </View>
                        <View style={styles.macroBadge}>
                          <View style={[styles.macroDot, { backgroundColor: '#EAB308' }]} />
                          <Text style={styles.macroText}>{item.carbs}g C</Text>
                        </View>
                        <View style={styles.macroBadge}>
                          <View style={[styles.macroDot, { backgroundColor: '#F97316' }]} />
                          <Text style={styles.macroText}>{item.fat}g F</Text>
                        </View>
                      </View>
                    </View>

                    {/* Calories Stack + 44x44px Touch Target Quick Add */}
                    <View style={styles.foodItemRight}>
                      <View style={styles.caloriesStack}>
                        <Text style={styles.foodItemCals}>{item.calories}</Text>
                        <Text style={styles.foodItemCalUnit}>kcal</Text>
                      </View>

                      {/* 44x44px Touch Target Button */}
                      <TouchableOpacity
                        style={styles.quickAddButton}
                        onPress={() => handleQuickAdd(item)}
                        activeOpacity={0.8}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Quick add 1 serving of ${item.name}`}
                      >
                        <View style={styles.quickAddIconCircle}>
                          <Ionicons name="add" size={20} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {/* 5. Portion Selector Drawer */}
          {selectedFood && (
            <View style={styles.portionOverlay}>
              <TouchableOpacity
                style={styles.portionOverlayDismiss}
                activeOpacity={1}
                onPress={() => setSelectedFood(null)}
              />
              <View style={styles.portionDrawer}>
                <View style={styles.drawerHandleBar}>
                  <View style={styles.drawerHandle} />
                </View>

                <View style={styles.drawerTop}>
                  <View style={styles.drawerFoodInfo}>
                    <Text style={styles.drawerFoodName} numberOfLines={1}>{selectedFood.name}</Text>
                    <Text style={styles.drawerFoodUnit}>
                      1 {selectedFood.servingUnit} = {selectedFood.calories} kcal
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.drawerCloseBtn}
                    onPress={() => setSelectedFood(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Close portion drawer"
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Quantity Stepper */}
                <View style={styles.stepperContainer}>
                  <Text style={styles.stepperLabel}>Portion Size:</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => setQuantity(Math.max(0.5, Math.round((quantity - 0.5) * 10) / 10))}
                      accessibilityLabel="Decrease portion by 0.5"
                    >
                      <Ionicons name="remove" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.quantityDisplayContainer}>
                      <Text style={styles.quantityDisplay}>{quantity}x</Text>
                      <Text style={styles.quantityUnitText} numberOfLines={1}>
                        {selectedFood.servingUnit}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.stepButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => setQuantity(Math.round((quantity + 0.5) * 10) / 10)}
                      accessibilityLabel="Increase portion by 0.5"
                    >
                      <Ionicons name="add" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3 Clean Presets (eliminating Hick's Law decision fatigue) */}
                <View style={styles.presetRow}>
                  {[
                    { val: 0.5, label: '0.5x (Half)' },
                    { val: 1, label: '1x (Standard)' },
                    { val: 2, label: '2x (Double)' },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.val}
                      style={[styles.presetBtn, quantity === preset.val && styles.presetBtnActive]}
                      onPress={() => setQuantity(preset.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetBtnText,
                          quantity === preset.val && styles.presetBtnTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
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
                        {
                          width: `${projectedPct}%`,
                          backgroundColor: isProjectedOver ? '#EF4444' : '#22C55E',
                        },
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

                {/* Live Nutrition Breakdown */}
                <View style={styles.liveNutritionBox}>
                  <View style={styles.liveNutriItem}>
                    <Text style={styles.liveNutriVal}>{projectedAddedCals}</Text>
                    <Text style={styles.liveNutriKey}>Calories</Text>
                  </View>
                  <View style={styles.liveNutriItem}>
                    <Text style={[styles.liveNutriVal, { color: '#22C55E' }]}>
                      {(selectedFood.protein * quantity).toFixed(1)}g
                    </Text>
                    <Text style={styles.liveNutriKey}>Protein</Text>
                  </View>
                  <View style={styles.liveNutriItem}>
                    <Text style={[styles.liveNutriVal, { color: '#EAB308' }]}>
                      {(selectedFood.carbs * quantity).toFixed(1)}g
                    </Text>
                    <Text style={styles.liveNutriKey}>Carbs</Text>
                  </View>
                  <View style={styles.liveNutriItem}>
                    <Text style={[styles.liveNutriVal, { color: '#F97316' }]}>
                      {(selectedFood.fat * quantity).toFixed(1)}g
                    </Text>
                    <Text style={styles.liveNutriKey}>Fat</Text>
                  </View>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                  style={styles.confirmAddBtn}
                  onPress={handleConfirmLog}
                  activeOpacity={0.85}
                  accessibilityLabel={`Add to ${mealTitle}, ${projectedAddedCals} calories`}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmAddBtnText}>
                    Add to {mealTitle} • {projectedAddedCals} kcal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 6. Floating In-Modal Toast Snackbar with Undo */}
          {toastMessage && (
            <View style={styles.toastContainer}>
              <View style={styles.toastContent}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={{ marginRight: 8 }} />
                <Text style={styles.toastText} numberOfLines={1}>
                  {toastMessage}
                </Text>
              </View>
              <View style={styles.toastActions}>
                {lastAddedMeal && (
                  <TouchableOpacity
                    style={styles.toastUndoBtn}
                    onPress={handleUndo}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.8}
                    accessibilityLabel="Undo food log"
                  >
                    <Text style={styles.toastUndoText}>Undo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.toastCloseBtn}
                  onPress={() => {
                    setToastMessage(null);
                    setLastAddedMeal(null);
                    if (toastTimer) clearTimeout(toastTimer);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Dismiss toast"
                >
                  <Ionicons name="close" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  headerBoldVal: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    color: '#0F172A',
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  foodItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  foodItemMain: {
    flex: 1,
  },
  foodItemName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  drawerFoodInfo: {
    flex: 1,
    paddingRight: 10,
  },
  drawerFoodName: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0F172A',
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
