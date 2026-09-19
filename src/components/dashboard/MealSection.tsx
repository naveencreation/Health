import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MealCard } from '../diary/MealCard';
import { MealType } from '@/types';
import { useHealth } from '@/context/HealthContext';

interface MealSectionProps {
  onAddFood: (mealType: MealType) => void;
}

export const MealSection: React.FC<MealSectionProps> = ({ onAddFood }) => {
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
      {/* Add Breakfast */}
      <MealCard
        mealType="breakfast"
        title="Add Breakfast"
        recommendedCals={recommended.breakfast || 550}
        imageUrl="https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=150&auto=format&fit=crop&q=80"
        iconFallback="🍳"
        items={mealsByType.breakfast}
        onAddPress={onAddFood}
      />

      {/* Figma Rectangle 32: Add Lunch */}
      <MealCard
        mealType="lunch"
        title="Add Lunch"
        recommendedCals={recommended.lunch || 650}
        imageUrl="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80"
        iconFallback="🥗"
        items={mealsByType.lunch}
        onAddPress={onAddFood}
      />

      {/* Figma Rectangle 33: Add Dinner (dimmed opacity 0.2 when empty per Figma) */}
      <MealCard
        mealType="dinner"
        title="Add Dinner"
        recommendedCals={recommended.dinner || 550}
        imageUrl="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=150&auto=format&fit=crop&q=80"
        iconFallback="🍲"
        items={mealsByType.dinner}
        onAddPress={onAddFood}
        isDimmed={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
});
