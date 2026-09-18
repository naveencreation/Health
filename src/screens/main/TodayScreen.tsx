import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import {
  CalorieBudgetCard,
  DietJourneyChart,
  MealSection,
  RiaCoachCard,
  DailyHabitsCard,
} from '@/components';
import { MealType } from '@/types';

interface TodayScreenProps {
  onAddFood: (mealType: MealType) => void;
  onOpenRiaChat: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onAddFood, onOpenRiaChat }) => {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Calorie Arc & Macro Triad */}
      <CalorieBudgetCard />

      {/* Track your diet journey area wave & days */}
      <DietJourneyChart />

      {/* Date Picker situated directly above Meals */}
      <MealSection onAddFood={onAddFood} />

      {/* Ria AI Nutritionist Coach Insights */}
      <RiaCoachCard onOpenChat={onOpenRiaChat} />

      {/* Side-by-Side Habits: Hydration & Activity Dual Dials */}
      <DailyHabitsCard />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
