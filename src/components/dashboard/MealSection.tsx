import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MealCard } from '../diary/MealCard';
import { MealType } from '@/types';
import { useHealth } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';

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
      {/* Section Header: Eaten */}
      <Text style={styles.sectionTitle}>Eaten</Text>

      {/* Breakfast */}
      <MealCard
        mealType="breakfast"
        title="Breakfast"
        recommendedCals={recommended.breakfast || 588}
        imageUrl="https://images.unsplash.com/photo-1525351484163-7529414344d8?w=150&auto=format&fit=crop&q=80"
        iconFallback="🍳"
        items={mealsByType.breakfast}
        onAddPress={onAddFood}
      />

      {/* Lunch */}
      <MealCard
        mealType="lunch"
        title="Lunch"
        recommendedCals={recommended.lunch || 822}
        imageUrl="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80"
        iconFallback="🥗"
        items={mealsByType.lunch}
        onAddPress={onAddFood}
      />

      {/* Dinner */}
      <MealCard
        mealType="dinner"
        title="Dinner"
        recommendedCals={recommended.dinner || 658}
        imageUrl="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=150&auto=format&fit=crop&q=80"
        iconFallback="🍲"
        items={mealsByType.dinner}
        onAddPress={onAddFood}
        isDimmed={false}
      />
    </View>
  );
};

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
