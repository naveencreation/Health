import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
import { MealSection } from '@/components';
import { MealType } from '@/types';

interface DiaryScreenProps {
  onAddFood: (mealType: MealType) => void;
}

export const DiaryScreen: React.FC<DiaryScreenProps> = ({ onAddFood }) => {
  const { currentLog, totalConsumed, userGoals, totalProtein, totalCarbs, totalFat } = useHealth();

  const totalDishesLogged = currentLog.meals.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryTitle}>Daily Nutrition Diary</Text>
            <Text style={styles.summarySubtitle}>
              {totalDishesLogged} {totalDishesLogged === 1 ? 'dish' : 'dishes'} tracked today
            </Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeVal}>{totalConsumed}</Text>
            <Text style={styles.totalBadgeUnit}>kcal</Text>
          </View>
        </View>

        <View style={styles.macroStrip}>
          <View style={styles.macroItem}>
            <Text style={[styles.macroVal, { color: Colors.protein }]}>{totalProtein}g</Text>
            <Text style={styles.macroKey}>Protein</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={[styles.macroVal, { color: Colors.carbs }]}>{totalCarbs}g</Text>
            <Text style={styles.macroKey}>Carbs</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={[styles.macroVal, { color: Colors.fat }]}>{totalFat}g</Text>
            <Text style={styles.macroKey}>Fat</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroVal}>{Math.max(0, userGoals.dailyCalorieBudget - totalConsumed)}</Text>
            <Text style={styles.macroKey}>Balance</Text>
          </View>
        </View>
      </View>

      <MealSection onAddFood={onAddFood} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  summarySubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  totalBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#FFF1ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD9CF',
  },
  totalBadgeVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  totalBadgeUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  macroStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  macroKey: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});

export const DiaryTab = DiaryScreen;
