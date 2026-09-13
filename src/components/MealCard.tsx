import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';
import { LoggedMealItem, MealType } from '../types';
import { useHealth } from '../context/HealthContext';

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

  // Aggregate macros for the entire meal (UXPeak Principle: Meal-level macro summary)
  const totalProtein = Math.round(items.reduce((sum, item) => sum + (item.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(items.reduce((sum, item) => sum + (item.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(items.reduce((sum, item) => sum + (item.fat || 0), 0) * 10) / 10;

  // Curated premium pastel accents per meal type
  const mealTheme = {
    breakfast: { tint: '#FFF7ED', border: 'rgba(249, 115, 22, 0.18)', badge: '#F97316' },
    lunch: { tint: '#F0FDF4', border: 'rgba(34, 197, 94, 0.18)', badge: '#22C55E' },
    snacks: { tint: '#FEF3C7', border: 'rgba(245, 158, 11, 0.18)', badge: '#F59E0B' },
    dinner: { tint: '#F5F3FF', border: 'rgba(139, 92, 246, 0.18)', badge: '#8B5CF6' },
  }[mealType] || { tint: '#F3F4F6', border: 'rgba(0,0,0,0.1)', badge: '#64748B' };

  return (
    <View style={[styles.card, isDimmed && !hasItems && styles.dimmedCard]}>
      {/* Figma Slot Header (Rectangle 31/32/33: #FAFAFA, border: 1px solid #3F7E03) */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => hasItems && setIsExpanded(!isExpanded)}
          activeOpacity={hasItems ? 0.7 : 1}
        >
          {/* Premium Circular Thumbnail with Glass/Card Ring */}
          <View style={[styles.thumbnailCircle, { backgroundColor: mealTheme.tint, borderColor: mealTheme.border }]}>
            {!imgError ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.thumbnailImg}
                onError={() => setImgError(true)}
              />
            ) : (
              <Text style={styles.fallbackEmoji}>{iconFallback}</Text>
            )}
          </View>

          {/* Title & Subtitle */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.mealTitle}>
                {hasItems ? title.replace('Add ', '') : title}
              </Text>
              {hasItems && (
                <View style={styles.chevronPill}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="rgba(0, 0, 0, 0.45)"
                  />
                </View>
              )}
            </View>

            <Text style={styles.recommendedText}>
              Recommended {Math.max(350, recommendedCals - 100)}–{recommendedCals + 100} cal
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right Action: Clean Calorie Badge & Lime Green Add Button */}
        <View style={styles.headerRight}>
          {hasItems && (
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieNumber}>{totalMealCals}</Text>
              <Text style={styles.calorieUnit}>cal</Text>
            </View>
          )}

          {/* Figma Ellipse 21/22: 38px circle in #CDE26D with sleek lime glow */}
          <TouchableOpacity
            style={[
              styles.addButtonCircle,
              isDimmed && !hasItems && styles.dimmedAddButton,
            ]}
            onPress={() => onAddPress(mealType)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={22} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded Items List: Clean, Flat Rows (NO "Russian Doll" Nested Boxes) */}
      {isExpanded && hasItems && (
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
                {/* Left: Food Name & Clean Serving Info (No duplicate calories!) */}
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.foodServing} numberOfLines={1}>
                    {item.quantity} × {item.servingUnit}
                  </Text>
                </View>

                {/* Right: Sleek Unified Capsule Stepper + Single Calorie + Trash */}
                <View style={styles.foodActions}>
                  {/* Unified Apple-Style Capsule Stepper */}
                  <View style={styles.stepperCapsule}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      onPress={() => {
                        if (item.quantity > 0.5) {
                          updateMealQuantity(item.id, Math.max(0.5, item.quantity - 0.5));
                        } else {
                          removeMealItem(item.id);
                        }
                      }}
                    >
                      <Ionicons name="remove" size={13} color="#475569" />
                    </TouchableOpacity>

                    <Text style={styles.stepperQty}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      onPress={() => updateMealQuantity(item.id, item.quantity + 0.5)}
                    >
                      <Ionicons name="add" size={13} color="#475569" />
                    </TouchableOpacity>
                  </View>

                  {/* Single Clean Calorie Metric */}
                  <Text style={styles.foodCalories}>
                    {item.calories} <Text style={styles.foodCaloriesUnit}>cal</Text>
                  </Text>

                  {/* Refined Delete Button */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    onPress={() => removeMealItem(item.id)}
                  >
                    <Ionicons name="close" size={15} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* UXPeak Single Macro Summary Bar at Meal Level */}
          <View style={styles.macroSummaryBar}>
            <View style={styles.macroSummaryPill}>
              <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
              <Text style={styles.macroSummaryText}>{totalProtein}g Protein</Text>
            </View>

            <Text style={styles.macroSummaryDivider}>•</Text>

            <View style={styles.macroSummaryPill}>
              <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
              <Text style={styles.macroSummaryText}>{totalFat}g Fats</Text>
            </View>

            <Text style={styles.macroSummaryDivider}>•</Text>

            <View style={styles.macroSummaryPill}>
              <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
              <Text style={styles.macroSummaryText}>{totalCarbs}g Carbs</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Figma Rectangle 31/32: 354px wide, #FAFAFA surface, 1px solid #3F7E03 green border
  card: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#3F7E03',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  dimmedCard: {
    opacity: 0.4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  // Ellipse 19/20/23: 48px circle with subtle inner border and soft ambient shadow
  thumbnailCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
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
  // Figma: font-family: 'Poppins'; font-size: 15px; color: #000000;
  mealTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  chevronPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma: font-family: 'Poppins'; font-size: 11px; color: rgba(0, 0, 0, 0.4);
  recommendedText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.45)',
    marginTop: 2,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  calorieUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.45)',
  },
  // Figma Ellipse 21/22: 38px circle in #CDE26D with sleek lime ambient glow
  addButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CDE26D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  dimmedAddButton: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  // Items Container: Clean list without inner card borders
  itemsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 4,
  },
  // Flat, uncluttered list row (UXPeak: Zero Russian-Doll Cards)
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  foodRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  foodInfo: {
    flex: 1,
    marginRight: 10,
  },
  foodName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#1E293B',
  },
  foodServing: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1.5,
  },
  foodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Unified Minimalist Apple-Style Capsule Stepper
  stepperCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 13,
    height: 26,
    paddingHorizontal: 4,
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
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0F172A',
    minWidth: 14,
    textAlign: 'center',
  },
  // Single Clean Calorie Display
  foodCalories: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    minWidth: 48,
    textAlign: 'right',
  },
  foodCaloriesUnit: {
    fontSize: 10.5,
    fontWeight: '400',
    color: '#64748B',
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.035)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Single UXPeak Macro Summary Bar at Meal Level
  macroSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.025)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  macroSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroSummaryText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  macroSummaryDivider: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.25)',
  },
});
