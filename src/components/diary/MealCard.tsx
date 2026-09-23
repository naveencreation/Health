import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { LoggedMealItem, MealType } from '@/types';
import { useDailyLog } from '@/context/HealthContext';
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
  const { removeMealItem, updateMealQuantity } = useDailyLog();
  const [isExpanded, setIsExpanded] = useState(true);
  const [imgError, setImgError] = useState(false);
  const expandAnim = useSharedValue(1);
  const contentHeight = useSharedValue(0);

  const resolvedImageSource = imageSource ?? (imageUrl ? (typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl) : null);

  const handleToggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded((prev) => !prev);
    expandAnim.value = withTiming(toValue, { duration: 220 });
  };

  // Sync anim when items change (card goes from empty to filled)
  useEffect(() => {
    expandAnim.value = 1;
    setIsExpanded(true);
  }, [items.length === 0]);

  const collapseStyle = useAnimatedStyle(() => ({
    opacity: expandAnim.value,
    height: interpolate(expandAnim.value, [0, 1], [0, contentHeight.value]),
  }));

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
        hasItems ? styles.cardActive : null,
        isDimmed && !hasItems ? styles.dimmedCard : null,
      ]}
    >
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [
            styles.headerLeft,
            pressed ? styles.pressedSubtle : null,
          ]}
          onPress={() => {
            if (hasItems) {
              handleToggleExpand();
            } else {
              onAddPress(mealType);
            }
          }}
          accessibilityRole="button"
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
                transition={150}
                onError={() => setImgError(true)}
              />
            ) : (
              <Text style={styles.fallbackEmoji}>{iconFallback}</Text>
            )}
          </View>

          {/* Title, Target Subtitle & Clean Progress Bar */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.mealTitle}>
                {hasItems ? title.replace('Add ', '') : title}
              </Text>
              {hasItems ? (
                <View style={styles.chevronPill}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color="#475569"
                  />
                </View>
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
              fillColor={isOverBudget ? '#F97316' : '#10B981'}
              height={4}
              trackColor="rgba(15, 23, 42, 0.06)"
              style={{ marginTop: 4 }}
            />
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
              isDimmed && !hasItems ? styles.dimmedAddButton : null,
              pressed ? styles.pressedAddButton : null,
            ]}
            onPress={() => onAddPress(mealType)}
            hitSlop={HIT_SLOP_8}
            accessibilityRole="button"
            accessibilityLabel={`Add food to ${title}`}
          >
            <Ionicons name="add" size={22} color="#16A34A" />
          </Pressable>
        </View>
      </View>

      {/* 2. Expanded Items List: Flat Rows (No Nested Cards) */}
      {hasItems ? (
        <Animated.View
          style={[
            styles.itemsContainer,
            { overflow: 'hidden' },
            collapseStyle,
          ]}
        >
          <View onLayout={(event) => { contentHeight.value = event.nativeEvent.layout.height; }}>
            {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <View
                key={item.id}
                style={[
                  styles.foodRow,
                  !isLast ? styles.foodRowBorder : null,
                ]}
              >
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
                      style={({ pressed }) => [styles.stepperBtn, pressed ? styles.pressedSubtle : null]}
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
                      <Ionicons name="remove" size={13} color="#475569" />
                    </Pressable>

                    <Text style={styles.stepperQty}>{item.quantity}</Text>

                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed ? styles.pressedSubtle : null]}
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
                      <Ionicons name="add" size={13} color="#475569" />
                    </Pressable>
                  </View>

                  {/* Single Clean Calorie Metric */}
                  <Text style={styles.foodCalories}>
                    {item.calories} <Text style={styles.foodCaloriesUnit}>cal</Text>
                  </Text>

                  {/* Delete Button */}
                  <Pressable
                    style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressedSubtle : null]}
                    hitSlop={HIT_SLOP_10}
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
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
    borderCurve: 'continuous',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardActive: {
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowOpacity: 0.06,
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
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(0, 0, 0, 0.06)',
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
    borderCurve: 'continuous',
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
    height: 3.5,
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#10B981', // Emerald on track
  },
  progressBarFillOver: {
    backgroundColor: '#F47551', // Supportive warm coral
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F6', // Warm porcelain tint
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
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
    backgroundColor: '#F8D558', // Warm Golden Amber
  },
  macroDotProtein: {
    backgroundColor: '#67BD6E', // Fresh Avocado Leaf Green
  },
  macroDotFat: {
    backgroundColor: '#F47551', // Signature Sun Coral
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

export const MealCard = React.memo(MealCardComponent);
