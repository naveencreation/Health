import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AchievementCenterScreen } from '../AchievementCenterScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockDailyLogs = {};
const mockCurrentLog = { date: '2026-10-04', waterMl: 0, steps: 0, activities: [], meals: [] };
const mockUserGoals = {
  name: 'User',
  dailyCalorieBudget: 2000,
  targetCarbs: 220,
  targetProtein: 140,
  targetFat: 60,
  targetFiber: 25,
  waterGoalMl: 2500,
  stepGoal: 10000,
  currentWeightKg: 70,
  targetWeightKg: 65,
  streakDays: 4,
};

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    dailyLogs: mockDailyLogs,
    currentLog: mockCurrentLog,
  }),
  useGoals: () => ({
    userGoals: mockUserGoals,
  }),
}));

const mockEvaluationData = {
  allAchievements: [
    {
      definition: {
        id: 'water_target_reached',
        title: 'Hydro Pioneer',
        description: 'Meet your daily water goal in a single day.',
        tier: 'bronze' as const,
        category: 'hydration' as const,
        iconName: 'water',
        maxProgress: 1,
        evaluate: () => ({ isUnlocked: true, currentProgress: 1 }),
      },
      isUnlocked: true,
      currentProgress: 1,
      maxProgress: 1,
      progressPercent: 100,
    },
    {
      definition: {
        id: 'streak_3_days',
        title: '3-Day Ignition',
        description: 'Maintain a 3-day daily logging streak.',
        tier: 'bronze' as const,
        category: 'consistency' as const,
        iconName: 'flame',
        maxProgress: 3,
        evaluate: () => ({ isUnlocked: true, currentProgress: 3 }),
      },
      isUnlocked: true,
      currentProgress: 3,
      maxProgress: 3,
      progressPercent: 100,
    },
  ],
  newlyUnlocked: [],
  totalUnlockedCount: 2,
  totalAchievementsCount: 2,
};

jest.mock('../../engine/AchievementEvaluator', () => ({
  AchievementEvaluator: {
    evaluate: jest.fn().mockImplementation(() => Promise.resolve(mockEvaluationData)),
  },
}));

describe('AchievementCenterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header, overall completion banner, and category tabs', async () => {
    const onBack = jest.fn();

    const { getByText, findByText } = await render(
      <AchievementCenterScreen onBack={onBack} />
    );

    expect(getByText('Achievements')).toBeTruthy();

    const completionLabel = await findByText('OVERALL COMPLETION');
    expect(completionLabel).toBeTruthy();

    expect(getByText('All')).toBeTruthy();
    expect(getByText('Streaks')).toBeTruthy();
    expect(getByText('Nutrition')).toBeTruthy();
    expect(getByText('Hydration')).toBeTruthy();
    expect(getByText('Movement')).toBeTruthy();
  });

  it('filters achievements when category tabs are pressed', async () => {
    const { findByText, getByText } = await render(
      <AchievementCenterScreen />
    );

    await findByText('OVERALL COMPLETION');

    const hydrationTab = getByText('Hydration');
    fireEvent.press(hydrationTab);

    await waitFor(() => {
      expect(getByText('Hydro Pioneer')).toBeTruthy();
    });
  });

  it('calls onBack when back button is tapped', async () => {
    const onBack = jest.fn();

    const { getByRole, findByText } = await render(
      <AchievementCenterScreen onBack={onBack} />
    );

    await findByText('OVERALL COMPLETION');

    const backBtn = getByRole('button', { name: 'Go back' });
    fireEvent.press(backBtn);

    await waitFor(() => {
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });
});
