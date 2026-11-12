import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useDailyLog, useGoals } from '@/context/HealthContext';
import { AchievementBadge } from '../components/AchievementBadge';
import { CelebrationModal } from '../components/CelebrationModal';
import {
  AchievementEvaluator,
  EvaluatedAchievement,
  EvaluationResult,
} from '../engine/AchievementEvaluator';
import { BadgeCategory } from '../engine/achievementRules';
import { haptics } from '@/utils/haptics';
import {
  SubScreenHeader,
  ProfileButton,
  profileCard,
  profileScreenStyles,
} from '@/components/profile/ProfileUI';

export interface AchievementCenterScreenProps {
  onBack?: () => void;
}

type FilterCategory = 'all' | BadgeCategory;

const CATEGORY_TABS: { id: FilterCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'consistency', label: 'Streaks' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'hydration', label: 'Hydration' },
  { id: 'movement', label: 'Movement' },
];

export const AchievementCenterScreen: React.FC<AchievementCenterScreenProps> = ({ onBack }) => {
  const { dailyLogs, currentLog } = useDailyLog();
  const { userGoals } = useGoals();
  const uid = useAuth().currentUser?.id;

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [celebrationAchievement, setCelebrationAchievement] = useState<EvaluatedAchievement | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAchievements() {
      try {
        const result = await AchievementEvaluator.evaluate(
          {
            dailyLogs,
            currentLog,
            userGoals,
            consecutiveDaysLogged: userGoals.streakDays || 0,
          },
          uid
        );

        if (isMounted) {
          setEvaluation(result);
          setFailed(false);
          // Auto-trigger celebration if any new badge was unlocked
          if (result.newlyUnlocked.length > 0) {
            setCelebrationAchievement(result.newlyUnlocked[0]);
          }
        }
      } catch (err) {
        if (__DEV__) console.error('[AchievementCenter] Failed to evaluate achievements', err);
        if (isMounted) setFailed(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAchievements();

    return () => {
      isMounted = false;
    };
  }, [dailyLogs, currentLog, userGoals, uid, attempt]);

  const filteredAchievements = useMemo(() => {
    if (!evaluation) return [];
    if (selectedCategory === 'all') return evaluation.allAchievements;
    return evaluation.allAchievements.filter(a => a.definition.category === selectedCategory);
  }, [evaluation, selectedCategory]);

  const handleSelectTab = async (cat: FilterCategory) => {
    await haptics.selection();
    setSelectedCategory(cat);
  };

  const streakDays = userGoals.streakDays || 0;
  const unlockedCount = evaluation?.totalUnlockedCount ?? 0;
  const totalCount = evaluation?.totalAchievementsCount ?? 0;
  const overallPercent = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <View style={profileScreenStyles.root}>
      <SubScreenHeader
        title="Achievements"
        subtitle={`${streakDays}-day streak`}
        onBack={() => onBack?.()}
        backLabel="Go back"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.centerText}>Checking your badges…</Text>
        </View>
      ) : failed && !evaluation ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>{"Couldn't load your achievements."}</Text>
          <ProfileButton
            label="Try again"
            onPress={() => {
              setLoading(true);
              setAttempt(a => a + 1);
            }}
          />
        </View>
      ) : (
        <ScrollView
          style={profileScreenStyles.scroll}
          contentContainerStyle={profileScreenStyles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[profileCard, styles.hero]}
            accessible
            accessibilityLabel={`${unlockedCount} of ${totalCount} achievements unlocked, ${overallPercent} percent`}
          >
            <Text style={styles.heroLabel}>OVERALL COMPLETION</Text>
            <View style={styles.heroScoreRow}>
              <Text style={styles.heroScore}>{unlockedCount}</Text>
              <Text style={styles.heroTotal}>of {totalCount} unlocked</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${overallPercent}%` }]} />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
            accessibilityRole="tablist"
          >
            {CATEGORY_TABS.map(tab => {
              const isActive = selectedCategory === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={({ pressed }) => [
                    styles.tab,
                    isActive && styles.tabActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleSelectTab(tab.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Filter by ${tab.label}`}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredAchievements.length === 0 ? (
            <Text style={styles.centerText}>No badges in this category yet.</Text>
          ) : (
            <View style={styles.badgeList}>
              {filteredAchievements.map(item => (
                <AchievementBadge
                  key={item.definition.id}
                  achievement={item}
                  onPress={a => {
                    if (a.isUnlocked) setCelebrationAchievement(a);
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <CelebrationModal
        visible={!!celebrationAchievement}
        achievement={celebrationAchievement}
        onClose={() => setCelebrationAchievement(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  centerText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  hero: { padding: 16 },
  heroLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: Colors.textSecondary,
  },
  heroScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  heroScore: { fontFamily: Fonts.urbanist.extraBold, fontSize: 32, color: Colors.textPrimary },
  heroTotal: { fontFamily: Fonts.urbanist.medium, fontSize: 15, color: Colors.textSecondary },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainer,
    overflow: 'hidden',
    marginTop: 10,
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  tabsRow: { flexDirection: 'row', gap: 8 },
  tab: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tabActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  tabText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSlate600 },
  tabTextActive: { color: Colors.textInverse },
  pressed: { opacity: 0.85 },
  badgeList: { gap: 2 },
});

export default AchievementCenterScreen;
