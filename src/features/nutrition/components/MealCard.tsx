import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { LoggedMealItem, MealType } from '@/types';
import { useNutrition } from '../hooks/useNutrition';
import { AnimatedProgressBar } from '@/components/common/AnimatedProgressBar';

interface MealCardProps {
  mealType: MealType;
  title: string;
  recommendedCals: number;
  imageUrl?: string;
  imageSource?: any;
  iconFallback: string;
  items: LoggedMealItem[];
  onAddPress: (mealType: MealType) => void;
  isDimmed?: boolean;
}

const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };
const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

const MealCardComponent: React.FC<MealCardProps> = ({
  mealType,
  title,
  recommendedCals,
  imageUrl,
  imageSource,
  iconFallback,
  items,
  onAddPress,
  isDimmed = false,
}) => {
  const { removeMealItem, updateMealQuantity } = useNutrition();
  const [isExpanded, setIsExpanded] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const expandAnim = useSharedValue(1);

  const resolvedImageSource =
    imageSource ??
    (imageUrl ? (typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl) : null);

  const handleToggleExpand = () => {
    const nextVal = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    expandAnim.value = withTiming(nextVal, {
      duration: 200,
      easing: Easing?.bezier ? Easing.bezier(0.25, 0.1, 0.25, 1) : undefined,
    });
  };

  // Sync anim when items change (card goes from empty to filled)
  useEffect(() => {
    expandAnim.value = 1;
    setIsExpanded(true);
  }, [items.length === 0]);

  // UI-thread continuous chevron rotation (0deg collapsed -> 180deg expanded)
  const chevronAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(expandAnim.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  // Smooth measured-height accordion container
  const collapseContainerStyle = useAnimatedStyle(() => {
    const isMeasured = contentHeight > 0;
    const targetH = isMeasured ? contentHeight : 600;
    return {
      overflow: 'hidden',
      height: isMeasured ? interpolate(expandAnim.value, [0, 1], [0, targetH]) : undefined,
      maxHeight: !isMeasured ? interpolate(expandAnim.value, [0, 1], [0, 600]) : undefined,
      opacity: interpolate(expandAnim.value, [0, 0.2, 1], [0, 0.5, 1]),
    };
  });

  // Subtle fade and slide-in for the expanded rows and macro summary
  const contentInnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0, 0.35, 1], [0, 0.6, 1]),
    transform: [
      {
        translateY: interpolate(expandAnim.value, [0, 1], [-8, 0]),
      },
    ],
  }));

  const totalMealCals = items.reduce((sum, item) => sum + item.calories, 0);
  const hasItems = items.length > 0;

  // Aggregate macros for the entire meal (Meal-level macro summary)
  const totalProtein =
    Math.round(items.reduce((sum, item) => sum + (item.protein || 0), 0) * 10) / 10;
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
        hasItems ? styles.cardActive : null,
        isDimmed && !hasItems ? styles.dimmedCard : null,
      ]}
    >
      {/* 1. Header Row - Fully Tappable with isolated Plus Action Button */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.headerLeft}
          onPress={() => {
            if (hasItems) {
              handleToggleExpand();
            } else {
              onAddPress(mealType);
            }
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: hasItems ? isExpanded : undefined }}
          accessibilityLabel={`${title}, ${hasItems ? (isExpanded ? 'collapse details' : 'expand details') : 'add food to ' + title}`}
        >
          {/* Circular Thumbnail with Crisp Border */}
          <View style={styles.thumbnailCircle}>
            {!imgError && resolvedImageSource ? (
              <Image
                source={resolvedImageSource}
                style={styles.thumbnailImg}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={typeof resolvedImageSource === 'number' ? 0 : 150}
                onError={() => setImgError(true)}
              />
            ) : (
              <Text style={styles.fallbackEmoji}>{iconFallback}</Text>
            )}
          </View>

          {/* Title, Animated Chevron, Target Subtitle & Clean Progress Bar */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.mealTitle}>{hasItems ? title.replace('Add ', '') : title}</Text>
              {hasItems ? (
                <Animated.View style={[styles.chevronPill, chevronAnimatedStyle]}>
                  <Ionicons
                    name="chevron-down"
                    size={13}
                    color="#475569"
                  />
                </Animated.View>
              ) : null}
            </View>

            {/* Contextual Target / Consumed Subtitle */}
            <Text style={styles.recommendedText}>
              {hasItems
                ? `${totalMealCals} / ${targetCals} kcal • ${isOverBudget ? 'Above target' : 'On track'}`
                : `Target: ${targetCals} kcal • Tap to log`}
            </Text>

            {/* Visual Calorie Consumption Progress Bar */}
            <AnimatedProgressBar
              progress={mealProgress}
              fillColor={isOverBudget ? Colors.primaryDark : Colors.primary}
              height={4}
              trackColor="rgba(15, 23, 42, 0.06)"
              style={{ marginTop: 4 }}
            />
          </View>

          {/* Calorie Badge inside Header Clickable Area */}
          {hasItems ? (
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieNumber}>{totalMealCals}</Text>
              <Text style={styles.calorieUnit}>cal</Text>
            </View>
          ) : null}
        </Pressable>

        {/* Independent Right Action: Circular Add Button */}
        <Pressable
          style={({ pressed }) => [
            styles.addButtonCircle,
            isDimmed && !hasItems ? styles.dimmedAddButton : null,
            pressed ? styles.pressedAddButton : null,
          ]}
          onPress={() => onAddPress(mealType)}
          hitSlop={HIT_SLOP_8}
          accessibilityRole="button"
          accessibilityLabel={`Add food to ${title}`}
        >
          <Ionicons name="add" size={20} color={Colors.protein} />
        </Pressable>
      </View>

      {/* 2. Expanded Items List: Smooth Measured Accordion */}
      {hasItems ? (
        <Animated.View style={[styles.itemsContainer, collapseContainerStyle]}>
          <Animated.View
            style={contentInnerStyle}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0 && Math.abs(h - contentHeight) > 1) {
                setContentHeight(h);
              }
            }}
          >
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              return (
                <View key={item.id} style={[styles.foodRow, !isLast ? styles.foodRowBorder : null]}>
                  {/* Left: Food Name & Serving */}
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.foodServing} numberOfLines={1}>
                      {item.servingUnit}
                    </Text>
                  </View>

                  {/* Right: Stepper + Single Calorie + Delete */}
                  <View style={styles.foodActions}>
                    {/* Capsule Stepper */}
                    <View style={styles.stepperCapsule}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.stepperBtn,
                          pressed ? styles.pressedSubtle : null,
                        ]}
                        hitSlop={HIT_SLOP_8}
                        onPress={() => {
                          if (item.quantity > 1) {
                            updateMealQuantity(item.id, item.quantity - 1);
                          } else if (item.quantity === 1) {
                            updateMealQuantity(item.id, 0.5);
                          } else {
                            removeMealItem(item.id);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Decrease quantity"
                      >
                        <Ionicons name="remove" size={16} color="#475569" />
                      </Pressable>

                      <Text style={styles.stepperQty}>{item.quantity}</Text>

                      <Pressable
                        style={({ pressed }) => [
                          styles.stepperBtn,
                          pressed ? styles.pressedSubtle : null,
                        ]}
                        hitSlop={HIT_SLOP_8}
                        onPress={() => {
                          if (item.quantity === 0.5) {
                            updateMealQuantity(item.id, 1);
                          } else {
                            updateMealQuantity(item.id, Math.round((item.quantity + 1) * 10) / 10);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Increase quantity"
                      >
                        <Ionicons name="add" size={16} color="#475569" />
                      </Pressable>
                    </View>

                    {/* Single Clean Calorie Metric */}
                    <Text style={styles.foodCalories}>
                      {item.calories} <Text style={styles.foodCaloriesUnit}>cal</Text>
                    </Text>

                    {/* Delete Button */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        pressed ? styles.pressedSubtle : null,
                      ]}
                      hitSlop={HIT_SLOP_10}
                      onPress={() => removeMealItem(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name}`}
                    >
                      <Ionicons name="close" size={16} color="#94A3B8" />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {/* 3. Meal-Level Macro Summary Bar (Harmonized: Carbs -> Protein -> Fat) */}
            <View style={styles.macroSummaryBar}>
              <View style={styles.macroSummaryPill}>
                <View style={[styles.macroDot, styles.macroDotCarbs]} />
                <Text style={styles.macroSummaryText}>{totalCarbs}g Carbs</Text>
              </View>

              <Text style={styles.macroSummaryDivider}>•</Text>

              <View style={styles.macroSummaryPill}>
                <View style={[styles.macroDot, styles.macroDotProtein]} />
                <Text style={styles.macroSummaryText}>{totalProtein}g Protein</Text>
              </View>

              <Text style={styles.macroSummaryDivider}>•</Text>

              <View style={styles.macroSummaryPill}>
                <View style={[styles.macroDot, styles.macroDotFat]} />
                <Text style={styles.macroSummaryText}>{totalFat}g Fat</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    borderRadius: 10,
    borderCurve: 'continuous',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 0,
    shadowOpacity: 0,
  },
  cardActive: {
    borderColor: Colors.borderSubtle,
    elevation: 0,
    shadowOpacity: 0,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: Colors.surfaceLow,
    borderColor: Colors.borderWhisper,
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
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  chevronPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 3.5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 2,
    borderCurve: 'continuous',
    marginTop: 6,
    maxWidth: 160,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    borderCurve: 'continuous',
  },
  progressBarFillNormal: {
    backgroundColor: Colors.primary,
  },
  progressBarFillOver: {
    backgroundColor: Colors.primaryDark,
  },
  pressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  pressedAddButton: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calorieBadge: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  calorieNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  calorieUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  addButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    backgroundColor: Colors.proteinLight,
    borderWidth: 1,
    borderColor: Colors.proteinBorder,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  dimmedAddButton: {
    opacity: 0.65,
  },
  itemsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceInset,
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
    borderBottomColor: Colors.surfaceLow,
  },
  foodInfo: {
    flex: 1,
    marginRight: 10,
  },
  foodName: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  foodServing: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  foodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  stepperCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceInset,
    borderRadius: 10,
    borderCurve: 'continuous',
    height: 30,
    paddingHorizontal: 5,
    gap: 4,
  },
  stepperBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
    includeFontPadding: false,
  },
  foodCalories: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    minWidth: 54,
    textAlign: 'right',
  },
  foodCaloriesUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    flexWrap: 'wrap',
  },
  macroSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  macroDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  macroDotCarbs: {
    backgroundColor: Colors.carbs,
  },
  macroDotProtein: {
    backgroundColor: Colors.protein,
  },
  macroDotFat: {
    backgroundColor: Colors.fat,
  },
  macroSummaryText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.textSlate700,
  },
  macroSummaryDivider: {
    fontSize: 10,
    color: Colors.textLight,
  },
});

export const MealCard = React.memo(MealCardComponent);
