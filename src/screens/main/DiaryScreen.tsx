import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
import { Header, TopDateStrip, MealSection } from '@/components';
import { MealType } from '@/types';

interface DiaryScreenProps {
  onAddFood: (mealType: MealType) => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
}

export const DiaryScreen: React.FC<DiaryScreenProps> = ({
  onAddFood,
  onSearchPress,
  onNotificationsPress,
  onAvatarPress,
  onSignInPress,
  onSignOutPress,
  scrollRef,
}) => {
  const {
    currentLog,
    totalConsumed,
    totalBurned,
    userGoals,
    totalProtein,
    totalCarbs,
    totalFat,
    remainingCalories,
  } = useHealth();

  const totalItemsLogged = currentLog.meals.length;
  const targetProtein = userGoals.targetProtein || 90;
  const targetCarbs = userGoals.targetCarbs || 110;
  const targetFat = userGoals.targetFat || 70;
  const calorieBudget = userGoals.dailyCalorieBudget || 2200;

  const isOverBudget = remainingCalories < 0;
  const calorieFillPct = Math.min(100, Math.max(0, Math.round((totalConsumed / calorieBudget) * 100)));

  const proteinPct = Math.min(100, Math.max(0, Math.round((totalProtein / targetProtein) * 100)));
  const carbsPct = Math.min(100, Math.max(0, Math.round((totalCarbs / targetCarbs) * 100)));
  const fatPct = Math.min(100, Math.max(0, Math.round((totalFat / targetFat) * 100)));

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 0. Blended Header (Scrolls naturally off-screen with content) */}
      <Header
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
        onAvatarPress={onAvatarPress}
        onSignInPress={onSignInPress}
        onSignOutPress={onSignOutPress}
      />

      {/* 1. Top 7-Day Date Selector Strip (SUN to SAT with active obsidian capsule & circular ring) */}
      <TopDateStrip />

      {/* 2. Daily Nutrition Summary Card */}
      <View style={styles.summaryCard}>
        {/* Header with Title & Status Pill */}
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryTitle}>Daily Nutrition</Text>
            <Text style={styles.summarySubtitle}>
              {totalItemsLogged} {totalItemsLogged === 1 ? 'item' : 'items'} tracked today
            </Text>
          </View>
          <View style={[styles.statusPill, isOverBudget && styles.statusPillOver]}>
            <Text style={[styles.statusPillText, isOverBudget && styles.statusPillTextOver]}>
              {isOverBudget ? '⚠️ Over Budget' : '✓ On Track'}
            </Text>
          </View>
        </View>

        {/* Calorie Telemetry Section */}
        <View style={styles.calorieSection}>
          <View style={styles.calorieMainRow}>
            <View style={styles.calorieLeft}>
              <Text style={[styles.calorieRemainingVal, isOverBudget && styles.calorieOverVal]}>
                {Math.abs(remainingCalories).toLocaleString()}
              </Text>
              <Text style={styles.calorieRemainingUnit}>
                {isOverBudget ? 'kcal over' : 'kcal left'}
              </Text>
            </View>
            <View style={styles.calorieStats}>
              <Text style={styles.calorieStatItem}>
                Eaten <Text style={styles.calorieStatBold}>{totalConsumed}</Text>
              </Text>
              <Text style={styles.calorieStatDivider}>•</Text>
              <Text style={styles.calorieStatItem}>
                Burned <Text style={styles.calorieStatBold}>{totalBurned}</Text>
              </Text>
              <Text style={styles.calorieStatDivider}>•</Text>
              <Text style={styles.calorieStatItem}>
                Goal <Text style={styles.calorieStatBold}>{calorieBudget}</Text>
              </Text>
            </View>
          </View>

          {/* Calorie Budget Bar */}
          <View style={styles.calorieTrack}>
            <View
              style={[
                styles.calorieBar,
                {
                  width: `${calorieFillPct}%`,
                  backgroundColor: isOverBudget ? '#EF4444' : '#10B981',
                },
              ]}
            />
          </View>
        </View>

        {/* 3 Macro Pods (Pastel Cards with Micro Progress Bars) */}
        <View style={styles.macroRow}>
          {/* Protein Pod */}
          <View style={[styles.macroPod, styles.proteinPod]}>
            <View style={styles.macroPodHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#16A34A' }]} />
              <Text style={[styles.macroPodLabel, { color: '#16A34A' }]}>PROTEIN</Text>
            </View>
            <Text style={styles.macroPodVal}>{Math.round(totalProtein)}g</Text>
            <View style={[styles.podTrack, { backgroundColor: '#DCFCE7' }]}>
              <View
                style={[
                  styles.podFill,
                  { width: `${proteinPct}%`, backgroundColor: '#16A34A' },
                ]}
              />
            </View>
            <Text style={styles.macroPodSub}>of {targetProtein}g</Text>
          </View>

          {/* Carbs Pod */}
          <View style={[styles.macroPod, styles.carbsPod]}>
            <View style={styles.macroPodHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#0284C7' }]} />
              <Text style={[styles.macroPodLabel, { color: '#0284C7' }]}>CARBS</Text>
            </View>
            <Text style={styles.macroPodVal}>{Math.round(totalCarbs)}g</Text>
            <View style={[styles.podTrack, { backgroundColor: '#E0F2FE' }]}>
              <View
                style={[
                  styles.podFill,
                  { width: `${carbsPct}%`, backgroundColor: '#0284C7' },
                ]}
              />
            </View>
            <Text style={styles.macroPodSub}>of {targetCarbs}g</Text>
          </View>

          {/* Fat Pod */}
          <View style={[styles.macroPod, styles.fatPod]}>
            <View style={styles.macroPodHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#EA580C' }]} />
              <Text style={[styles.macroPodLabel, { color: '#EA580C' }]}>FAT</Text>
            </View>
            <Text style={styles.macroPodVal}>{Math.round(totalFat)}g</Text>
            <View style={[styles.podTrack, { backgroundColor: '#FFEDD5' }]}>
              <View
                style={[
                  styles.podFill,
                  { width: `${fatPct}%`, backgroundColor: '#EA580C' },
                ]}
              />
            </View>
            <Text style={styles.macroPodSub}>of {targetFat}g</Text>
          </View>
        </View>
      </View>

      {/* Meals List (Breakfast, Lunch, Dinner) */}
      <MealSection onAddFood={onAddFood} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDFAF6',
  },
  content: {
    paddingBottom: 110, // Ensures full clearance above floating bottom navigation bar
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  summarySubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusPillOver: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  statusPillTextOver: {
    color: '#EF4444',
  },
  calorieSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  calorieMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  calorieLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  calorieRemainingVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  calorieOverVal: {
    color: '#EF4444',
  },
  calorieRemainingUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  calorieStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calorieStatItem: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  calorieStatBold: {
    fontFamily: Fonts.poppins.semiBold,
    fontWeight: '600',
    color: '#475569',
  },
  calorieStatDivider: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  calorieTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  calorieBar: {
    height: '100%',
    borderRadius: 3,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPod: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  proteinPod: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  carbsPod: {
    backgroundColor: '#F0F9FF',
    borderColor: '#E0F2FE',
  },
  fatPod: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  macroPodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroPodLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  macroPodVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  podTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  podFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroPodSub: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
  },
});

export const DiaryTab = DiaryScreen;
