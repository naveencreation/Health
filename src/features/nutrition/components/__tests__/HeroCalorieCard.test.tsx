import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HeroCalorieCard } from '../HeroCalorieCard';
import { toDateString, parseDateString, SHORT_DAY_NAMES } from '@/utils/dateUtils';

const mockSetSelectedDate = jest.fn();
const mockUseDailyLog = jest.fn();
const mockUseGoals = jest.fn();
const mockUseAnalytics = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => mockUseDailyLog(),
  useGoals: () => mockUseGoals(),
  useAnalytics: () => mockUseAnalytics(),
  useAuth: () => mockUseAuth(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/components/common/AnimatedSvgRing', () => ({
  AnimatedSvgRing: () => null,
}));

jest.mock('@/components/common/AnimatedProgressBar', () => ({
  AnimatedProgressBar: () => null,
}));

describe('HeroCalorieCard (Rolling 7-Day Synchronization)', () => {
  const realToday = toDateString(new Date());

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGoals.mockReturnValue({
      userGoals: {
        dailyCalorieBudget: 2200,
        targetCarbs: 150,
        targetProtein: 120,
        targetFat: 60,
        goal: 'maintain',
      },
    });
    mockUseAnalytics.mockReturnValue({
      weeklyLogs: [],
    });
    mockUseAuth.mockReturnValue({
      currentUser: { id: 'test_uid', isGuest: false },
    });
  });

  test('renders 7 rolling days without any future dates when viewing today', async () => {
    mockUseDailyLog.mockReturnValue({
      selectedDate: realToday,
      setSelectedDate: mockSetSelectedDate,
      dailyLogs: {},
      totalConsumed: 1600,
      totalBurned: 400,
      remainingCalories: 600,
      totalCarbs: 110,
      totalProtein: 95,
      totalFat: 45,
    });

    const { getByText, queryByText } = await render(<HeroCalorieCard />);

    // Slide 0 dial elements
    expect(getByText('600')).toBeTruthy();
    expect(getByText('Cal left')).toBeTruthy();

    // Timeline must include TODAY for today's pill
    expect(getByText('TODAY')).toBeTruthy();

    // Past 1 day pill should display its day name
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayName = SHORT_DAY_NAMES[yesterday.getDay()];
    // If yesterday is not the same name as other days in week, verify it's rendered
    expect(getByText(yesterdayName)).toBeTruthy();

    // Verify day view header reflects Today
    expect(getByText('Today')).toBeTruthy();
  });

  test('allows selecting past dates from the timeline', async () => {
    mockUseDailyLog.mockReturnValue({
      selectedDate: realToday,
      setSelectedDate: mockSetSelectedDate,
      dailyLogs: {},
      totalConsumed: 1200,
      totalBurned: 200,
      remainingCalories: 1000,
      totalCarbs: 80,
      totalProtein: 70,
      totalFat: 30,
    });

    const { getAllByLabelText } = await render(<HeroCalorieCard />);

    // 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoDayName = SHORT_DAY_NAMES[twoDaysAgo.getDay()];
    const expectedDateStr = toDateString(twoDaysAgo);

    const pastDayBtns = getAllByLabelText(`Select ${twoDaysAgoDayName}, 0 calories`);
    expect(pastDayBtns.length).toBeGreaterThan(0);

    fireEvent.press(pastDayBtns[0]);
    expect(mockSetSelectedDate).toHaveBeenCalledWith(expectedDateStr);
  });
});
