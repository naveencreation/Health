import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { FoodItem, MealType } from '../types';
import { useHealth } from '../context/HealthContext';

interface FoodLogModalProps {
  visible: boolean;
  mealType: MealType;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Foods' },
  { id: 'high_protein', label: '⚡ High Protein' },
  { id: 'breads', label: '🫓 Breads' },
  { id: 'curries', label: '🍲 Dals & Curries' },
  { id: 'south_indian', label: '🌯 South Indian' },
  { id: 'rice', label: '🍚 Rice & Grains' },
  { id: 'snacks', label: '🥗 Snacks' },
  { id: 'beverages', label: '☕ Beverages' },
  { id: 'fruits', label: '🍎 Fruits & Nuts' },
];

export const FoodLogModal: React.FC<FoodLogModalProps> = ({ visible, mealType, onClose }) => {
  const { foodDatabase, addMealItem, addCustomFood } = useHealth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Custom food form state
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('serving');
  const [customCals, setCustomCals] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customFiber, setCustomFiber] = useState('');

  // Filter foods based on search query and category
  const filteredFoods = useMemo(() => {
    return foodDatabase.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'high_protein') return item.protein >= 8;
      return item.category === selectedCategory;
    });
  }, [foodDatabase, searchQuery, selectedCategory]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setQuantity(1);
  };

  const handleConfirmLog = () => {
    if (!selectedFood) return;
    addMealItem(mealType, selectedFood, quantity);
    setSelectedFood(null);
    onClose();
  };

  const handleCreateCustomFood = () => {
    if (!customName.trim() || !customCals) return;
    const newFood = addCustomFood({
      name: customName.trim(),
      category: 'snacks',
      categoryLabel: 'Custom',
      servingUnit: customUnit.trim() || 'serving',
      defaultServingSize: 1,
      calories: parseInt(customCals) || 100,
      carbs: parseFloat(customCarbs) || 0,
      protein: parseFloat(customProtein) || 0,
      fat: parseFloat(customFat) || 0,
      fiber: parseFloat(customFiber) || 0,
      icon: '🍽️',
    });

    // Directly log the newly created custom food
    addMealItem(mealType, newFood, 1);
    setIsCustomMode(false);
    setCustomName('');
    setCustomCals('');
    setCustomCarbs('');
    setCustomProtein('');
    setCustomFat('');
    setCustomFiber('');
    onClose();
  };

  const mealTitle = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>Log {mealTitle}</Text>
            <Text style={styles.headerSubtitle}>Select portion to calculate nutrition</Text>
          </View>
          <TouchableOpacity
            style={styles.customToggleBtn}
            onPress={() => setIsCustomMode(!isCustomMode)}
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
            {/* Search Input Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={20} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search roti, dal, paneer, biryani, dosa..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.textMuted}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    selectedCategory === cat.id && styles.categoryPillActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
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

            {/* Foods List */}
            <FlatList
              data={filteredFoods}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.foodItemCard}
                  onPress={() => handleSelectFood(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.foodItemIcon}>
                    <Text style={{ fontSize: 24 }}>{item.icon || '🍽️'}</Text>
                  </View>

                  <View style={styles.foodItemMain}>
                    <Text style={styles.foodItemName}>{item.name}</Text>
                    <Text style={styles.foodItemUnit}>
                      1 {item.servingUnit} • {item.categoryLabel}
                    </Text>
                    <View style={styles.macroPillRow}>
                      <Text style={[styles.macroMini, { color: Colors.protein }]}>
                        P: {item.protein}g
                      </Text>
                      <Text style={[styles.macroMini, { color: Colors.carbs }]}>
                        C: {item.carbs}g
                      </Text>
                      <Text style={[styles.macroMini, { color: Colors.fat }]}>
                        F: {item.fat}g
                      </Text>
                    </View>
                  </View>

                  <View style={styles.foodItemRight}>
                    <Text style={styles.foodItemCals}>{item.calories}</Text>
                    <Text style={styles.foodItemCalUnit}>kcal</Text>
                    <View style={styles.quickAddIcon}>
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {/* Portion Selector Bottom Drawer Modal */}
        {selectedFood && (
          <View style={styles.portionOverlay}>
            <View style={styles.portionDrawer}>
              <View style={styles.drawerTop}>
                <View style={styles.drawerFoodInfo}>
                  <Text style={styles.drawerFoodName}>{selectedFood.name}</Text>
                  <Text style={styles.drawerFoodUnit}>
                    Standard serving: 1 {selectedFood.servingUnit}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedFood(null)}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quantity Stepper */}
              <View style={styles.stepperContainer}>
                <Text style={styles.stepperLabel}>Portion Quantity:</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                  >
                    <Ionicons name="remove" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityDisplay}>
                    {quantity} <Text style={{ fontSize: 13, color: Colors.textSecondary }}>{selectedFood.servingUnit}</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.stepButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => setQuantity(quantity + 0.5)}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetRow}>
                {[0.5, 1, 1.5, 2, 3].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetBtn, quantity === val && styles.presetBtnActive]}
                    onPress={() => setQuantity(val)}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        quantity === val && styles.presetBtnTextActive,
                      ]}
                    >
                      {val}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Live Nutrition Calculation */}
              <View style={styles.liveNutritionBox}>
                <View style={styles.liveNutriItem}>
                  <Text style={styles.liveNutriVal}>{Math.round(selectedFood.calories * quantity)}</Text>
                  <Text style={styles.liveNutriKey}>Calories</Text>
                </View>
                <View style={styles.liveNutriItem}>
                  <Text style={[styles.liveNutriVal, { color: Colors.protein }]}>
                    {(selectedFood.protein * quantity).toFixed(1)}g
                  </Text>
                  <Text style={styles.liveNutriKey}>Protein</Text>
                </View>
                <View style={styles.liveNutriItem}>
                  <Text style={[styles.liveNutriVal, { color: Colors.carbs }]}>
                    {(selectedFood.carbs * quantity).toFixed(1)}g
                  </Text>
                  <Text style={styles.liveNutriKey}>Carbs</Text>
                </View>
                <View style={styles.liveNutriItem}>
                  <Text style={[styles.liveNutriVal, { color: Colors.fat }]}>
                    {(selectedFood.fat * quantity).toFixed(1)}g
                  </Text>
                  <Text style={styles.liveNutriKey}>Fat</Text>
                </View>
              </View>

              {/* Confirm Add Button */}
              <TouchableOpacity style={styles.confirmAddBtn} onPress={handleConfirmLog}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.confirmAddBtnText}>
                  Add to {mealTitle} • {Math.round(selectedFood.calories * quantity)} kcal
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  customToggleBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  customToggleText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.poppins.semiBold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  foodItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  foodItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  foodItemMain: {
    flex: 1,
  },
  foodItemName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  foodItemUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  macroMini: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
  },
  foodItemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  foodItemCals: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  foodItemCalUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  quickAddIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  portionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    height: '100%',
  },
  portionDrawer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  drawerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  drawerFoodInfo: {
    flex: 1,
  },
  drawerFoodName: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  drawerFoodUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  stepperLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quantityDisplay: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  presetBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  presetBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  presetBtnTextActive: {
    color: Colors.primary,
  },
  liveNutritionBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  liveNutriItem: {
    alignItems: 'center',
  },
  liveNutriVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  liveNutriKey: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  confirmAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  confirmAddBtnText: {
    fontFamily: Fonts.poppins.bold,
    color: '#FFFFFF',
    fontSize: 15,
  },
  customForm: {
    padding: 20,
  },
  customFormTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  customFormDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    marginTop: 2,
  },
  inputLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    fontFamily: Fonts.poppins.regular,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
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
