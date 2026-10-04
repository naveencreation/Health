import { DailyLog, UserGoals } from '@/types';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type BadgeCategory = 'nutrition' | 'hydration' | 'movement' | 'consistency';

export interface GamificationEvaluationInput {
  dailyLogs: Record<string, DailyLog>;
  currentLog?: DailyLog;
  userGoals: UserGoals;
  consecutiveDaysLogged: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  iconName: string;
  maxProgress: number;
  evaluate: (input: GamificationEvaluationInput) => {
    isUnlocked: boolean;
    currentProgress: number;
  };
}

export interface UnlockedAchievementRecord {
  id: string;
  unlockedAt: string; // ISO date string
}

export const TIER_COLORS: Record<BadgeTier, { primary: string; bg: string; border: string }> = {
  bronze: { primary: '#CD7F32', bg: '#FDF4EB', border: '#EDD6C0' },
  silver: { primary: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
  gold: { primary: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  diamond: { primary: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC' },
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // 1. Consistency: First Log
  {
    id: 'first_meal_log',
    title: 'First Step',
    description: 'Log your very first meal or nutrition entry.',
    tier: 'bronze',
    category: 'consistency',
    iconName: 'flag',
    maxProgress: 1,
    evaluate: ({ dailyLogs, currentLog }) => {
      const allLogs = Object.values(dailyLogs);
      const hasAnyMeal =
        allLogs.some((l) => (l.meals || []).length > 0) ||
        ((currentLog?.meals || []).length > 0);
      return {
        isUnlocked: hasAnyMeal,
        currentProgress: hasAnyMeal ? 1 : 0,
      };
    },
  },

  // 2. Consistency: 3-Day Streak
  {
    id: 'streak_3_days',
    title: '3-Day Ignition',
    description: 'Maintain a 3-day daily logging streak.',
    tier: 'bronze',
    category: 'consistency',
    iconName: 'flame',
    maxProgress: 3,
    evaluate: ({ consecutiveDaysLogged, userGoals }) => {
      const streak = Math.max(consecutiveDaysLogged, userGoals.streakDays || 0);
      return {
        isUnlocked: streak >= 3,
        currentProgress: Math.min(3, streak),
      };
    },
  },

  // 3. Consistency: 7-Day Streak
  {
    id: 'streak_7_days',
    title: 'Week of Dedication',
    description: 'Log consistently for 7 days in a row.',
    tier: 'silver',
    category: 'consistency',
    iconName: 'flame',
    maxProgress: 7,
    evaluate: ({ consecutiveDaysLogged, userGoals }) => {
      const streak = Math.max(consecutiveDaysLogged, userGoals.streakDays || 0);
      return {
        isUnlocked: streak >= 7,
        currentProgress: Math.min(7, streak),
      };
    },
  },

  // 4. Consistency: 30-Day Streak
  {
    id: 'streak_30_days',
    title: 'Habit Master',
    description: 'Complete 30 consecutive days of wellness logging.',
    tier: 'gold',
    category: 'consistency',
    iconName: 'trophy',
    maxProgress: 30,
    evaluate: ({ consecutiveDaysLogged, userGoals }) => {
      const streak = Math.max(consecutiveDaysLogged, userGoals.streakDays || 0);
      return {
        isUnlocked: streak >= 30,
        currentProgress: Math.min(30, streak),
      };
    },
  },

  // 5. Hydration: Daily Water Target
  {
    id: 'water_target_reached',
    title: 'Hydro Pioneer',
    description: 'Meet your daily water goal in a single day.',
    tier: 'bronze',
    category: 'hydration',
    iconName: 'water',
    maxProgress: 1,
    evaluate: ({ dailyLogs, currentLog, userGoals }) => {
      const target = userGoals.waterGoalMl || 2000;
      const allLogs = Object.values(dailyLogs);
      if (currentLog) allLogs.push(currentLog);
      const metGoal = allLogs.some((l) => (l.waterMl || 0) >= target);
      return {
        isUnlocked: metGoal,
        currentProgress: metGoal ? 1 : 0,
      };
    },
  },

  // 6. Hydration: 3-Day Hydration Streak
  {
    id: 'water_master_3',
    title: 'Hydro Flow',
    description: 'Reach your water target 3 different days.',
    tier: 'silver',
    category: 'hydration',
    iconName: 'water',
    maxProgress: 3,
    evaluate: ({ dailyLogs, currentLog, userGoals }) => {
      const target = userGoals.waterGoalMl || 2000;
      const allLogs = Object.values(dailyLogs);
      if (currentLog && !dailyLogs[currentLog.date]) allLogs.push(currentLog);
      const daysMet = allLogs.filter((l) => (l.waterMl || 0) >= target).length;
      return {
        isUnlocked: daysMet >= 3,
        currentProgress: Math.min(3, daysMet),
      };
    },
  },

  // 7. Movement: 10,000 Steps in One Day
  {
    id: 'steps_10k_daily',
    title: '10K Milestone',
    description: 'Walk 10,000 steps in a single day.',
    tier: 'silver',
    category: 'movement',
    iconName: 'footsteps',
    maxProgress: 10000,
    evaluate: ({ dailyLogs, currentLog }) => {
      const allLogs = Object.values(dailyLogs);
      if (currentLog) allLogs.push(currentLog);
      let maxSteps = 0;
      for (const log of allLogs) {
        if ((log.steps || 0) > maxSteps) maxSteps = log.steps || 0;
      }
      return {
        isUnlocked: maxSteps >= 10000,
        currentProgress: Math.min(10000, maxSteps),
      };
    },
  },

  // 8. Movement: First Workout Logged
  {
    id: 'first_workout_logged',
    title: 'Active Spark',
    description: 'Log your first workout or activity session.',
    tier: 'bronze',
    category: 'movement',
    iconName: 'fitness',
    maxProgress: 1,
    evaluate: ({ dailyLogs, currentLog }) => {
      const allLogs = Object.values(dailyLogs);
      if (currentLog) allLogs.push(currentLog);
      const hasWorkout = allLogs.some((l) => (l.activities || []).length > 0);
      return {
        isUnlocked: hasWorkout,
        currentProgress: hasWorkout ? 1 : 0,
      };
    },
  },

  // 9. Nutrition: Balanced Calorie Day
  {
    id: 'calorie_budget_balanced',
    title: 'Precision Eater',
    description: 'Eat within 10% of your daily calorie budget.',
    tier: 'gold',
    category: 'nutrition',
    iconName: 'restaurant',
    maxProgress: 1,
    evaluate: ({ dailyLogs, currentLog, userGoals }) => {
      const target = userGoals.dailyCalorieBudget || 2000;
      const lower = target * 0.9;
      const upper = target * 1.1;

      const allLogs = Object.values(dailyLogs);
      if (currentLog) allLogs.push(currentLog);

      const hitTarget = allLogs.some((l) => {
        const cals = (l.meals || []).reduce((acc, m) => acc + (m.calories || 0), 0);
        return cals >= lower && cals <= upper;
      });

      return {
        isUnlocked: hitTarget,
        currentProgress: hitTarget ? 1 : 0,
      };
    },
  },

  // 10. Nutrition: Protein Power (Hit daily protein target)
  {
    id: 'protein_goal_met',
    title: 'Protein Power',
    description: 'Hit or exceed your daily protein target.',
    tier: 'gold',
    category: 'nutrition',
    iconName: 'barbell',
    maxProgress: 1,
    evaluate: ({ dailyLogs, currentLog, userGoals }) => {
      const targetProtein = userGoals.targetProtein || 120;
      const allLogs = Object.values(dailyLogs);
      if (currentLog) allLogs.push(currentLog);

      const hitProtein = allLogs.some((l) => {
        const protein = (l.meals || []).reduce((acc, m) => acc + (m.protein || 0), 0);
        return protein >= targetProtein;
      });

      return {
        isUnlocked: hitProtein,
        currentProgress: hitProtein ? 1 : 0,
      };
    },
  },

  // 11. Consistency: Diamond Century Club
  {
    id: 'streak_100_days',
    title: 'Century Club',
    description: 'Achieve an astonishing 100-day logging streak.',
    tier: 'diamond',
    category: 'consistency',
    iconName: 'ribbon',
    maxProgress: 100,
    evaluate: ({ consecutiveDaysLogged, userGoals }) => {
      const streak = Math.max(consecutiveDaysLogged, userGoals.streakDays || 0);
      return {
        isUnlocked: streak >= 100,
        currentProgress: Math.min(100, streak),
      };
    },
  },
];
