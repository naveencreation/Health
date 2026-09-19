import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { LoggedMealItem, MealType } from '@/types';
import { useHealth } from '@/context/HealthContext';

interface MealCardProps {
  mealType: MealType;
  title: string;
  recommendedCals: number;
  imageUrl: string;
  iconFallback: string;
  items: LoggedMealItem[];
  onAddPress: (mealType: MealType) => void;
  isDimmed?: boolean;
}

export const MealCard: React.FC<MealCardProps> = ({
  mealType,
  title,
  recommendedCals,
  imageUrl,
  iconFallback,
  items,
  onAddPress,
  isDimmed = false,
}) => {
  const { removeMealItem, updateMealQuantity } = useHealth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [imgError, setImgError] = useState(false);

  const totalMealCals = items.reduce((sum, item) => sum + item.calories, 0);
  const hasItems = items.length > 0;

  // Aggregate macros for the entire meal (Meal-level macro summary)
  const totalProtein = Math.round(items.reduce((sum, item) => sum + (item.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(items.reduce((sum, item) => sum + (item.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(items.reduce((sum, item) => sum + (item.fat || 0), 0) * 10) / 10;

  // Meal progress calculation (Single average target vs range)
  const targetCals = recommendedCals || 500;
  const mealProgress = Math.min(1, Math.max(0, totalMealCals / targetCals));
  const isOverBudget = totalMealCals > targetCals;

  return (
    <View
      style={[
        styles.card,
        hasItems && styles.cardActive,
        isDimmed && !hasItems && styles.dimmedCard,
      ]}
    >
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [
            styles.headerLeft,
            pressed && hasItems && styles.pressedSubtle,
          ]}
          onPress={() => {
            if (hasItems) {
              setIsExpanded((prev) => !prev);
            }
          }}
          disabled={!hasItems}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${hasItems ? (isExpanded ? 'collapse details' : 'expand details') : 'no items logged'}`}
        >
          {/* Circular Thumbnail with Crisp Border */}
          <View style={styles.thumbnailCircle}>
            {!imgError ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.thumbnailImg}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
                onError={() => setImgError(true)}
              />
            ) : (
              <Text style={styles.fallbackEmoji}>{iconFallback}</Text>
            )}
          </View>

          {/* Title, Single Target Subtitle & Informative Progress Bar */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.mealTitle}>
                {hasItems ? title.replace('Add ', '') : title}
              </Text>
              {hasItems ? (
                <View style={styles.chevronPill}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#475569"
                  />
                </View>
              ) : null}
            </View>

            {/* Zero Decision Fatigue: Single Clear Target */}
            <Text style={styles.recommendedText}>
              Recommended: {targetCals} cal
            </Text>

            {/* Visual Calorie Consumption Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(mealProgress * 100)}%` },
                  isOverBudget ? styles.progressBarFillOver : styles.progressBarFillNormal,
                ]}
              />
            </View>
          </View>
        </Pressable>

        {/* Right Action: Calorie Badge & Lime Green Add Button */}
        <View style={styles.headerRight}>
          {hasItems ? (
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieNumber}>{totalMealCals}</Text>
              <Text style={styles.calorieUnit}>cal</Text>
            </View>
          ) : null}

          {/* Round Lime Green Add Button (#CDE26D) */}
          <Pressable
            style={({ pressed }) => [
              styles.addButtonCircle,
              isDimmed && !hasItems && styles.dimmedAddButton,
              pressed && styles.pressedAddButton,
            ]}
            onPress={() => onAddPress(mealType)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Add food to ${title}`}
          >
            <Ionicons name="add" size={22} color="#16A34A" />
          </Pressable>
        </View>
      </View>

      {/* 2. Expanded Items List: Flat Rows (No Nested Cards) */}
      {isExpanded && hasItems ? (
        <View style={styles.itemsContainer}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <View
                key={item.id}
                style={[
                  styles.foodRow,
                  !isLast && styles.foodRowBorder,
                ]}
              >
                {/* Left: Food Name & Serving */}
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.foodServing} numberOfLines={1}>
                    {item.quantity} × {item.servingUnit}
                  </Text>
                </View>

                {/* Right: Stepper + Single Calorie + Delete */}
                <View style={styles.foodActions}>
                  {/* Capsule Stepper */}
                  <View style={styles.stepperCapsule}>
                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressedSubtle]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => {
                        if (item.quantity > 0.5) {
                          updateMealQuantity(item.id, Math.max(0.5, Math.round((item.quantity - 0.5) * 10) / 10));
                        } else {
                          removeMealItem(item.id);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease quantity"
                    >
                      <Ionicons name="remove" size={13} color="#475569" />
                    </Pressable>

                    <Text style={styles.stepperQty}>{item.quantity}</Text>

                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressedSubtle]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => updateMealQuantity(item.id, Math.round((item.quantity + 0.5) * 10) / 10)}
                      accessibilityRole="button"
                      accessibilityLabel="Increase quantity"
                    >
                      <Ionicons name="add" size={13} color="#475569" />
                    </Pressable>
                  </View>

                  {/* Single Clean Calorie Metric */}
                  <Text style={styles.foodCalories}>
                    {item.calories} <Text style={styles.foodCaloriesUnit}>cal</Text>
                  </Text>

                  {/* Delete Button */}
                  <Pressable
                    style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressedSubtle]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => removeMealItem(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                  >
                    <Ionicons name="close" size={15} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>
            );
          })}

          {/* 3. Meal-Level Macro Summary Bar */}
          <View style={styles.macroSummaryBar}>
            <View style={styles.macroSummaryPill}>
              <View style={[styles.macroDot, styles.macroDotProtein]} />
              <Text style={styles.macroSummaryText}>{totalProtein}g Protein</Text>
            </View>

            <Text style={styles.macroSummaryDivider}>•</Text>

            <View style={styles.macroSummaryPill}>
              <View style={[styles.macroDot, styles.macroDotFat]} />
              <Text style={styles.macroSummaryText}>{totalFat}g Fats</Text>
            </View>

            <Text style={styles.macroSummaryDivider}>•</Text>

            <View style={styles.macroSummaryPill}>
              <View style={[styles.macroDot, styles.macroDotCarbs]} />
              <Text style={styles.macroSummaryText}>{totalCarbs}g Carbs</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)', // Clean neutral border for empty meals
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardActive: {
    borderWidth: 1.5,
    borderColor: '#4ADE80', // Fresh herbal green border when meal has logged food
  },
  dimmedCard: {
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  thumbnailCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  fallbackEmoji: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  chevronPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  progressBarTrack: {
    height: 4.5,
    backgroundColor: '#F1F5F9',
    borderRadius: 2.5,
    marginTop: 6,
    maxWidth: 160,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  progressBarFillNormal: {
    backgroundColor: '#22C55E',
  },
  progressBarFillOver: {
    backgroundColor: '#F97316',
  },
  pressedSubtle: {
    opacity: 0.65,
  },
  pressedAddButton: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calorieBadge: {
    alignItems: 'flex-end',
  },
  calorieNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  calorieUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#94A3B8',
  },
  addButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  dimmedAddButton: {
    opacity: 0.65,
  },
  itemsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 4,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  foodRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  foodInfo: {
    flex: 1,
    marginRight: 10,
  },
  foodName: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  foodServing: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  foodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    height: 28,
    paddingHorizontal: 5,
    gap: 4,
  },
  stepperBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 16,
    textAlign: 'center',
  },
  foodCalories: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 54,
    textAlign: 'right',
  },
  foodCaloriesUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAF8',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 10,
  },
  macroSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  macroDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  macroDotProtein: {
    backgroundColor: '#22C55E',
  },
  macroDotFat: {
    backgroundColor: '#F97316',
  },
  macroDotCarbs: {
    backgroundColor: '#EAB308',
  },
  macroSummaryText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  macroSummaryDivider: {
    fontSize: 10,
    color: '#CBD5E1',
  },
});
