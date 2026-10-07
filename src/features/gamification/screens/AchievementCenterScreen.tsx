import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { AchievementBadge } from '../components/AchievementBadge';
import { StreakFlameBadge } from '../components/StreakFlameBadge';
import { CelebrationModal } from '../components/CelebrationModal';
import {
  AchievementEvaluator,
  EvaluatedAchievement,
  EvaluationResult,
} from '../engine/AchievementEvaluator';
import { BadgeCategory } from '../engine/achievementRules';
import { haptics } from '@/utils/haptics';

export interface AchievementCenterScreenProps {
  onBack?: () => void;
}

type FilterCategory = 'all' | BadgeCategory;

const CATEGORY_TABS: Array<{ id: FilterCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'consistency', label: 'Streaks' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'hydration', label: 'Hydration' },
  { id: 'movement', label: 'Movement' },
];

export const AchievementCenterScreen: React.FC<AchievementCenterScreenProps> = ({ onBack }) => {
  const { dailyLogs, currentLog } = useDailyLog();
  const { userGoals } = useGoals();

  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [celebrationAchievement, setCelebrationAchievement] = useState<EvaluatedAchievement | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAchievements() {
      try {
        const result = await AchievementEvaluator.evaluate({
          dailyLogs,
          currentLog,
          userGoals,
          consecutiveDaysLogged: userGoals.streakDays || 0,
        });

        if (isMounted) {
          setEvaluation(result);
          // Auto-trigger celebration if any new badge was unlocked
          if (result.newlyUnlocked.length > 0) {
            setCelebrationAchievement(result.newlyUnlocked[0]);
          }
        }
      } catch (err) {
        console.error('[AchievementCenter] Failed to evaluate achievements', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAchievements();

    return () => {
      isMounted = false;
    };
  }, [dailyLogs, currentLog, userGoals]);

  const filteredAchievements = useMemo(() => {
    if (!evaluation) return [];
    if (selectedCategory === 'all') return evaluation.allAchievements;
    return evaluation.allAchievements.filter(a => a.definition.category === selectedCategory);
  }, [evaluation, selectedCategory]);

  const handleSelectTab = async (cat: FilterCategory) => {
    await haptics.selection();
    setSelectedCategory(cat);
  };

  const handleBack = async () => {
    await haptics.impactLight();
    if (onBack) onBack();
  };

  const unlockedCount = evaluation?.totalUnlockedCount || 0;
  const totalCount = evaluation?.totalAchievementsCount || 1;
  const overallPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
            onPress={handleBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <Text style={styles.headerTitle}>Achievements</Text>

        <StreakFlameBadge streakDays={userGoals.streakDays || 0} size="small" />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Auditing trophies & streaks...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner Card */}
          <View style={styles.heroBanner}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>OVERALL COMPLETION</Text>
              <View style={styles.heroScoreRow}>
                <Text style={styles.heroScoreText}>{unlockedCount}</Text>
                <Text style={styles.heroTotalText}>/ {totalCount} Trophies</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${overallPercent}%` }]} />
              </View>
              <Text style={styles.heroPercentText}>{overallPercent}% Mastered</Text>
            </View>

            <View style={styles.trophyIconCircle}>
              <Ionicons name="trophy" size={32} color="#F59E0B" />
            </View>
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {CATEGORY_TABS.map(tab => {
              const isActive = selectedCategory === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.tabPill, isActive && styles.activeTabPill]}
                  onPress={() => handleSelectTab(tab.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${tab.label}`}
                >
                  <Text style={[styles.tabPillText, isActive && styles.activeTabPillText]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Badge List */}
          <View style={styles.badgeList}>
            {filteredAchievements.map(item => (
              <AchievementBadge
                key={item.definition.id}
                achievement={item}
                onPress={a => {
                  if (a.isUnlocked) {
                    setCelebrationAchievement(a);
                  }
                }}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Celebration Modal */}
      <CelebrationModal
        visible={!!celebrationAchievement}
        achievement={celebrationAchievement}
        onClose={() => setCelebrationAchievement(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#64748B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: 20,
  },
  heroLeft: {
    flex: 1,
    marginRight: 16,
  },
  heroLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  heroScoreText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 32,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroTotalText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#64748B',
  },
  heroProgressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  heroPercentText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  trophyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  activeTabPill: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabPillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#64748B',
  },
  activeTabPillText: {
    color: '#FFFFFF',
  },
  badgeList: {
    gap: 2,
  },
});

export default AchievementCenterScreen;
