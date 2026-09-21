import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MealCard } from '../diary/MealCard';
import { MealType } from '@/types';
import { useHealth } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';

const MEAL_ICONS = {
  breakfast: require('../../../assets/meals/breakfast.webp'),
  lunch: require('../../../assets/meals/lunch.webp'),
  dinner: require('../../../assets/meals/dinner.webp'),
  snacks: require('../../../assets/meals/snacks.webp'),
};

interface MealSectionProps {
  onAddFood: (mealType: MealType) => void;
}

const MealSectionComponent: React.FC<MealSectionProps> = ({ onAddFood }) => {
  const { mealsByType, userGoals } = useHealth();

  const budget = userGoals.dailyCalorieBudget;
  const recommended = {
    breakfast: Math.round(budget * 0.25),
    lunch: Math.round(budget * 0.35),
    snacks: Math.round(budget * 0.12),
    dinner: Math.round(budget * 0.28),
  };

  return (
    <View style={styles.container}>
      {/* Section Header: Eaten */}
      <Text style={styles.sectionTitle}>Eaten</Text>

      {/* Breakfast */}
      <MealCard
        mealType="breakfast"
        title="Breakfast"
        recommendedCals={recommended.breakfast || 588}
        imageSource={MEAL_ICONS.breakfast}
        iconFallback="🍳"
        items={mealsByType.breakfast}
        onAddPress={onAddFood}
      />

      {/* Lunch */}
      <MealCard
        mealType="lunch"
        title="Lunch"
        recommendedCals={recommended.lunch || 822}
        imageSource={MEAL_ICONS.lunch}
        iconFallback="🥗"
        items={mealsByType.lunch}
        onAddPress={onAddFood}
      />

      {/* Dinner */}
      <MealCard
        mealType="dinner"
        title="Dinner"
        recommendedCals={recommended.dinner || 560}
        imageSource={MEAL_ICONS.dinner}
        iconFallback="🍲"
        items={mealsByType.dinner}
        onAddPress={onAddFood}
        isDimmed={false}
      />

      {/* Snacks */}
      <MealCard
        mealType="snacks"
        title="Snacks"
        recommendedCals={recommended.snacks || 240}
        imageSource={MEAL_ICONS.snacks}
        iconFallback="🍎"
        items={mealsByType.snacks}
        onAddPress={onAddFood}
      />
    </View>
  );
};

export const MealSection = React.memo(MealSectionComponent);

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 4,
  },
});
