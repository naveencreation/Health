import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useGoals, useAnalytics } from '@/context/HealthContext';

interface AwardsScreenProps {
  onBack: () => void;
}

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export const AwardsScreen: React.FC<AwardsScreenProps> = ({ onBack }) => {
  const { userGoals } = useGoals();
  const { dailyLogs } = useAnalytics();
  const streakDays = userGoals.streakDays || 1;

  // Real database analytics derived from dailyLogs
  const logsList = Object.values(dailyLogs || {});
  const totalLifetimeSteps = logsList.reduce((sum, l) => sum + (l.steps || 0), 0);
  const targetWater = userGoals.waterGoalMl || 2000;
  const targetFiber = userGoals.targetFiber || 30;
  const daysWaterGoalMet = logsList.filter((l) => (l.waterMl || 0) >= targetWater).length;
  const daysMealsLogged = logsList.filter((l) => Array.isArray(l.meals) && l.meals.length > 0).length;

  // Fiber: days where total fiber intake >= daily target
  const daysFiberGoalMet = logsList.filter((l) => {
    if (!Array.isArray(l.meals) || l.meals.length === 0) return false;
    const fiberTotal = l.meals.reduce((sum, m) => sum + (m.fiber || 0), 0);
    return fiberTotal >= targetFiber;
  }).length;

  // Workout Warrior: any 7-day rolling window with 3+ workout sessions
  const sortedDates = Object.keys(dailyLogs || {}).sort();
  let maxWorkoutsInAnyWeek = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    let weekCount = 0;
    for (let j = i; j < Math.min(i + 7, sortedDates.length); j++) {
      const log = dailyLogs[sortedDates[j]];
      if (log && Array.isArray(log.activities)) {
        weekCount += log.activities.length;
      }
    }
    if (weekCount > maxWorkoutsInAnyWeek) maxWorkoutsInAnyWeek = weekCount;
  }

  const awards = [
    {
      id: 'streak-7',
      title: '7-Day Discipline',
      desc: 'Logged nutrition and activity for 7 consecutive days',
      icon: 'flame',
      color: '#EA580C',
      bgColor: '#FFEDD5',
      unlocked: streakDays >= 7,
      progress: streakDays >= 7 ? 'Unlocked' : `${streakDays} / 7 days`,
    },
    {
      id: 'hydration-master',
      title: 'Hydration Pioneer',
      desc: `Achieved daily ${(targetWater / 1000).toFixed(1)}L water intake target 5 times`,
      icon: 'water',
      color: '#2563EB',
      bgColor: '#DBEAFE',
      unlocked: daysWaterGoalMet >= 5,
      progress: daysWaterGoalMet >= 5 ? 'Unlocked' : `${daysWaterGoalMet} / 5 days`,
    },
    {
      id: 'macro-balance',
      title: 'Nutritional Consistency',
      desc: 'Logged complete daily meals on at least 3 separate days',
      icon: 'ribbon',
      color: '#16A34A',
      bgColor: '#DCFCE7',
      unlocked: daysMealsLogged >= 3,
      progress: daysMealsLogged >= 3 ? 'Unlocked' : `${daysMealsLogged} / 3 days`,
    },
    {
      id: 'century-club',
      title: 'Century Stepper',
      desc: 'Accumulate 100,000 total recorded steps in Calori',
      icon: 'footsteps',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      unlocked: totalLifetimeSteps >= 100000,
      progress: totalLifetimeSteps >= 100000 ? 'Unlocked' : `${totalLifetimeSteps.toLocaleString()} / 100,000`,
    },
    {
      id: 'fiber-champion',
      title: 'Fiber Champion',
      desc: `Hit your daily fiber goal of ${targetFiber}g on 5 separate days`,
      icon: 'leaf',
      color: '#0D9488',
      bgColor: '#CCFBF1',
      unlocked: daysFiberGoalMet >= 5,
      progress: daysFiberGoalMet >= 5 ? 'Unlocked' : `${daysFiberGoalMet} / 5 days`,
    },
    {
      id: 'workout-warrior',
      title: 'Workout Warrior',
      desc: 'Log 3 or more workouts in a single week',
      icon: 'barbell',
      color: '#7C3AED',
      bgColor: '#F3F0FF',
      unlocked: maxWorkoutsInAnyWeek >= 3,
      progress: maxWorkoutsInAnyWeek >= 3 ? 'Unlocked' : `${maxWorkoutsInAnyWeek} / 3 sessions`,
    },
  ];

  const unlockedCount = awards.filter((a) => a.unlocked).length;

  return (
    <View style={styles.rootContainer}>
      {/* 1. Unified Top Navigation Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [styles.headerBackBtn, pressed ? styles.btnPressed : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Go back to profile"
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Awards & Badges
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Milestones, streaks & accomplishments
            </Text>
          </View>

          <View style={styles.unlockedBadge}>
            <Ionicons name="trophy" size={13} color="#D97706" />
            <Text style={styles.unlockedBadgeText}>
              {unlockedCount}/{awards.length}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Spotlight Hero */}
        <View
          style={styles.streakHero}
          accessible={true}
          accessibilityLabel={`Current active logging streak: ${streakDays} days. On fire.`}
        >
          <View style={styles.streakIconCircle}>
            <Ionicons name="flame" size={28} color="#EA580C" />
          </View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakVal}>{streakDays} {streakDays === 1 ? 'Day' : 'Days'}</Text>
            <Text style={styles.streakLabel}>Current Active Logging Streak</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>ON FIRE</Text>
          </View>
        </View>

        {/* Badges Section Header */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeader}>Trophies & Milestones</Text>
          <Text style={styles.sectionCountText}>
            {unlockedCount} of {awards.length} earned
          </Text>
        </View>

        {/* Awards List */}
        <View style={styles.awardsList}>
          {awards.map((item, index) => (
            <View key={item.id}>
              <View
                style={[styles.awardItem, !item.unlocked ? styles.awardItemLocked : null]}
                accessible={true}
                accessibilityLabel={`${item.title}, ${item.unlocked ? 'Unlocked' : 'In progress'}. ${item.desc}. ${item.progress}`}
              >
                <View style={[styles.awardIconBox, { backgroundColor: item.unlocked ? item.bgColor : '#F1F5F9' }]}>
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.unlocked ? item.color : '#94A3B8'}
                  />
                </View>
                <View style={styles.awardTextStack}>
                  <View style={styles.awardTitleRow}>
                    <Text style={[styles.awardTitle, !item.unlocked ? styles.awardTitleLocked : null]}>
                      {item.title}
                    </Text>
                    <View style={[styles.statusChip, item.unlocked ? styles.statusChipUnlocked : styles.statusChipLocked]}>
                      <Text style={[styles.awardProgress, item.unlocked ? styles.awardUnlockedText : null]}>
                        {item.progress}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.awardDesc}>{item.desc}</Text>
                </View>
              </View>
              {index < awards.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    minHeight: 64,
    justifyContent: 'center',
    zIndex: 10,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    lineHeight: 28,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginTop: 1,
    includeFontPadding: false,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unlockedBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    includeFontPadding: false,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120, // Full clearance above floating bottom nav
    gap: 16,
  },
  streakHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  streakIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: {
    flex: 1,
  },
  streakVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    lineHeight: 26,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  streakLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginTop: 1,
  },
  streakBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeader: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionCountText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
  awardsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  awardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  awardItemLocked: {
    opacity: 0.75,
  },
  awardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardTextStack: {
    flex: 1,
  },
  awardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  awardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  awardTitleLocked: {
    color: '#475569',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusChipUnlocked: {
    backgroundColor: '#DCFCE7',
  },
  statusChipLocked: {
    backgroundColor: '#F1F5F9',
  },
  awardProgress: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  awardUnlockedText: {
    color: '#16A34A',
    fontWeight: '700',
  },
  awardDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
});
