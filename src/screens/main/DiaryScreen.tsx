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
  const effectiveBudget = calorieBudget + totalBurned;
  const calorieFillPct = Math.min(100, Math.max(0, Math.round((totalConsumed / Math.max(1, effectiveBudget)) * 100)));

  const carbsPct = Math.min(100, Math.max(0, Math.round((totalCarbs / Math.max(1, targetCarbs)) * 100)));
  const proteinPct = Math.min(100, Math.max(0, Math.round((totalProtein / Math.max(1, targetProtein)) * 100)));
  const fatPct = Math.min(100, Math.max(0, Math.round((totalFat / Math.max(1, targetFat)) * 100)));

  const subtitleText =
    totalItemsLogged === 0
      ? 'No food logged yet • Tap + below'
      : `${totalItemsLogged} ${totalItemsLogged === 1 ? 'item' : 'items'} logged today`;

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
            <Text style={styles.summarySubtitle}>{subtitleText}</Text>
          </View>
          <View
            style={[styles.statusPill, isOverBudget ? styles.statusPillOver : null]}
            accessible={true}
            accessibilityLabel={isOverBudget ? 'Over calorie budget' : 'Within calorie budget'}
          >
            <Text style={[styles.statusPillText, isOverBudget ? styles.statusPillTextOver : null]}>
              {isOverBudget ? '⚠️ Over Budget' : '✓ Within Budget'}
            </Text>
          </View>
        </View>

        {/* Calorie Telemetry Section */}
        <View style={styles.calorieSection}>
          <View style={styles.calorieMainRow}>
            <View style={styles.calorieLeft}>
              <Text style={[styles.calorieRemainingVal, isOverBudget ? styles.calorieOverVal : null]}>
                {Math.abs(remainingCalories).toLocaleString()}
              </Text>
              <Text style={styles.calorieRemainingUnit}>
                {isOverBudget ? 'kcal over' : 'kcal left'}
              </Text>
            </View>
            <View style={styles.calorieStats}>
              <Text style={styles.calorieStatItem}>
                Eaten <Text style={styles.calorieStatBold}>{totalConsumed.toLocaleString()}</Text>
              </Text>
              <Text style={styles.calorieStatDivider}>•</Text>
              <Text style={styles.calorieStatItem}>
                Burned <Text style={styles.calorieStatBold}>{totalBurned.toLocaleString()}</Text>
              </Text>
              <Text style={styles.calorieStatDivider}>•</Text>
              <Text style={styles.calorieStatItem}>
                Goal <Text style={styles.calorieStatBold}>{calorieBudget.toLocaleString()}</Text>
              </Text>
            </View>
          </View>

          {/* Calorie Budget Bar */}
          <View
            style={styles.calorieTrack}
            accessible={true}
            accessibilityLabel={`Calorie budget progress: ${calorieFillPct}% consumed. ${totalConsumed} of ${effectiveBudget} kilocalories`}
          >
            <View
              style={[
                styles.calorieBar,
                isOverBudget ? styles.calorieBarOver : styles.calorieBarNormal,
                { width: `${calorieFillPct}%` },
              ]}
            />
          </View>
        </View>

        {/* 3 Macro Pods (Frost White Cards with Micro Progress Bars - Carbs, Protein, Fat) */}
        <View style={styles.macroRow}>
          {/* Carbs Pod */}
          <View
            style={styles.macroPod}
            accessible={true}
            accessibilityLabel={`Carbohydrates: ${Math.round(totalCarbs)} grams of ${targetCarbs} grams target (${carbsPct}%)`}
          >
            <View style={styles.macroPodHeader}>
              <View style={[styles.macroDot, styles.dotCarbs]} />
              <Text style={[styles.macroPodLabel, styles.labelCarbs]}>CARBS</Text>
            </View>
            <Text style={styles.macroPodVal}>{Math.round(totalCarbs)}g</Text>
            <View style={[styles.podTrack, styles.trackCarbs]}>
              <View
                style={[
                  styles.podFill,
                  styles.fillCarbs,
                  { width: `${carbsPct}%` },
                ]}
              />
            </View>
            <Text style={styles.macroPodSub}>of {targetCarbs}g</Text>
          </View>

          {/* Protein Pod */}
          <View
            style={styles.macroPod}
            accessible={true}
            accessibilityLabel={`Protein: ${Math.round(totalProtein)} grams of ${targetProtein} grams target (${proteinPct}%)`}
          >
            <View style={styles.macroPodHeader}>
              <View style={[styles.macroDot, styles.dotProtein]} />
              <Text style={[styles.macroPodLabel, styles.labelProtein]}>PROTEIN</Text>
            </View>
            <Text style={styles.macroPodVal}>{Math.round(totalProtein)}g</Text>
            <View style={[styles.podTrack, styles.trackProtein]}>
              <View
                style={[
                  styles.podFill,
                  styles.fillProtein,
                  { width: `${proteinPct}%` },
                ]}
              />
            </View>
            <Text style={styles.macroPodSub}>of {targetProtein}g</Text>
          </View>

          {/* Fat Pod */}
          <View
            style={styles.macroPod}
            accessible={true}
            accessibilityLabel={`Fat: ${Math.round(totalFat)} grams of ${targetFat} grams target (${fatPct}%)`}
          >
            <View style={styles.macroPodHeader}>
              <View style={[styles.macroDot, styles.dotFat]} />
              <Text style={[styles.macroPodLabel, styles.labelFat]}>FAT</Text>
            </View>
            <Text style={styles.macroPodVal}>{Math.round(totalFat)}g</Text>
            <View style={[styles.podTrack, styles.trackFat]}>
              <View
                style={[
                  styles.podFill,
                  styles.fillFat,
                  { width: `${fatPct}%` },
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
    backgroundColor: '#FAF9F6',
  },
  content: {
    paddingBottom: 110, // Ensures full clearance above floating bottom navigation bar
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17.5,
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPillOver: {
    backgroundColor: '#FFF5F1',
    borderColor: '#FFD5C6',
  },
  statusPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  statusPillTextOver: {
    color: '#F47551',
  },
  calorieSection: {
    backgroundColor: '#FAF9F6',
    borderRadius: 16,
    borderCurve: 'continuous',
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
    color: '#F47551',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
  calorieBarNormal: {
    backgroundColor: '#10B981',
  },
  calorieBarOver: {
    backgroundColor: '#F47551',
  },
  dotCarbs: {
    backgroundColor: '#F8D558',
  },
  labelCarbs: {
    color: '#B45309',
  },
  trackCarbs: {
    backgroundColor: '#FEF9C3',
  },
  fillCarbs: {
    backgroundColor: '#F8D558',
  },
  dotProtein: {
    backgroundColor: '#67BD6E',
  },
  labelProtein: {
    color: '#15803D',
  },
  trackProtein: {
    backgroundColor: '#DCFCE7',
  },
  fillProtein: {
    backgroundColor: '#67BD6E',
  },
  dotFat: {
    backgroundColor: '#F47551',
  },
  labelFat: {
    color: '#C2410C',
  },
  trackFat: {
    backgroundColor: '#FFE4D6',
  },
  fillFat: {
    backgroundColor: '#F47551',
  },
});

export const DiaryTab = DiaryScreen;
