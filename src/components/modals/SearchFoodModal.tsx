import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { FoodItem, MealType } from '@/types';
import { useHealth } from '@/context/HealthContext';

interface SearchFoodModalProps {
  visible: boolean;
  onClose: () => void;
  onLoggedSuccess?: (dishName: string, mealType: MealType) => void;
}

const MEAL_SLOTS: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { id: 'lunch', label: 'Lunch', icon: '🥗' },
  { id: 'snacks', label: 'Snacks', icon: '🍵' },
  { id: 'dinner', label: 'Dinner', icon: '🍲' },
];

export const SearchFoodModal: React.FC<SearchFoodModalProps> = ({
  visible,
  onClose,
  onLoggedSuccess,
}) => {
  const { foodDatabase, addMealItem } = useHealth();

  const [query, setQuery] = useState('');
  const [targetSlot, setTargetSlot] = useState<MealType>('lunch');
  const [feedbackDish, setFeedbackDish] = useState<string | null>(null);

  const filteredFoods = useMemo(() => {
    if (!query.trim()) {
      // Show popular staple items by default
      return foodDatabase.slice(0, 15);
    }
    const q = query.toLowerCase();
    return foodDatabase.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.categoryLabel.toLowerCase().includes(q)
    );
  }, [foodDatabase, query]);

  const handleQuickAdd = (food: FoodItem) => {
    addMealItem(targetSlot, food, 1);
    setFeedbackDish(`Added ${food.name} to ${targetSlot.toUpperCase()}`);
    if (onLoggedSuccess) {
      onLoggedSuccess(food.name, targetSlot);
    }
    setTimeout(() => {
      setFeedbackDish(null);
    }, 2000);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss food search modal backdrop"
        />
        <View style={styles.sheetContainer}>
          <View style={styles.handleContainer}>
            <View style={styles.dragHandle} />
          </View>
          {/* Modal Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedCloseBtn : null]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close food search"
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
            <View style={styles.headerTitleCenter}>
              <Text style={styles.headerTitle}>Search Foods</Text>
              <Text style={styles.headerSubtitle}>Universal calorie & nutrition database</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Input Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Search dal, roti, paneer, oats, dosa, biryani..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoFocus={true}
              clearButtonMode="while-editing"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search text"
                style={({ pressed }) => (pressed ? styles.pressedSubtle : null)}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>

          {/* Target Meal Slot Picker Strip */}
          <View style={styles.slotStrip}>
            <Text style={styles.slotStripLabel}>Add to:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotScroll}>
              {MEAL_SLOTS.map((slot) => {
                const isSelected = targetSlot === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    style={({ pressed }) => [
                      styles.slotPill,
                      isSelected ? styles.slotPillActive : null,
                      pressed ? styles.pressedSlotPill : null,
                    ]}
                    onPress={() => setTargetSlot(slot.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Add to ${slot.label}`}
                  >
                    <Text style={styles.slotEmoji}>{slot.icon}</Text>
                    <Text style={[styles.slotText, isSelected ? styles.slotTextActive : null]}>
                      {slot.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Toast Feedback */}
          {feedbackDish ? (
            <View style={styles.feedbackToast} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.feedbackToastText}>{feedbackDish} 🎯</Text>
            </View>
          ) : null}

          {/* Search Results List */}
          <FlatList
            data={filteredFoods}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.resultsCount}>
                {query.trim()
                  ? `Found ${filteredFoods.length} matching foods`
                  : 'Frequently logged foods'}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.foodRow}>
                <View style={styles.foodIconBox}>
                  <Text style={styles.foodIconText}>{item.icon || '🍽️'}</Text>
                </View>

                <View style={styles.foodMainInfo}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.foodUnit}>
                    1 {item.servingUnit} • {item.categoryLabel}
                  </Text>
                  <View style={styles.macroPillRow}>
                    <Text style={[styles.macroPill, styles.macroPillProtein]}>
                      P: {item.protein}g
                    </Text>
                    <Text style={[styles.macroPill, styles.macroPillCarbs]}>
                      C: {item.carbs}g
                    </Text>
                    <Text style={[styles.macroPill, styles.macroPillFat]}>
                      F: {item.fat}g
                    </Text>
                  </View>
                </View>

                <View style={styles.foodRightCol}>
                  <Text style={styles.foodCals}>{item.calories} <Text style={styles.calUnit}>kcal</Text></Text>
                  <Pressable
                    style={({ pressed }) => [styles.quickAddBtn, pressed ? styles.pressedQuickAdd : null]}
                    onPress={() => handleQuickAdd(item)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Quick add ${item.name} to ${targetSlot}`}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.quickAddText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    height: '90%',
    maxHeight: 740,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 10000,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedCloseBtn: {
    opacity: 0.7,
    backgroundColor: '#E2E8F0',
  },
  headerSpacer: {
    width: 36,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  pressedSubtle: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  slotStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  slotStripLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  slotScroll: {
    gap: 8,
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  slotPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pressedSlotPill: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  slotEmoji: {
    fontSize: 13,
  },
  slotText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  slotTextActive: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#FFFFFF',
  },
  feedbackToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  feedbackToastText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#059669',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  resultsCount: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 4,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  foodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  foodIconText: {
    fontSize: 22,
  },
  foodMainInfo: {
    flex: 1,
  },
  foodName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  foodUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  macroPill: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
  },
  macroPillProtein: {
    color: Colors.protein,
  },
  macroPillCarbs: {
    color: Colors.carbs,
  },
  macroPillFat: {
    color: Colors.fat,
  },
  foodRightCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  foodCals: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  calUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 2,
  },
  pressedQuickAdd: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  quickAddText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
});
