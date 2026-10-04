import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StepTrackerScreen } from '../StepTrackerScreen';
import * as health from '@/features/health';
import { Platform } from 'react-native';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedProps: (factory: () => unknown) => factory(),
    withSequence: (...args: any[]) => args[0],
    withTiming: (value: number) => value,
    withSpring: (value: number) => value,
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockAddSteps = jest.fn();
const mockBatchUpdateDailySteps = jest.fn();
const mockTodayStr = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
})();

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: mockTodayStr,
    currentLog: { steps: 5200 },
    dailyLogs: {
      [mockTodayStr]: { steps: 5200 },
    },
    addSteps: mockAddSteps,
    batchUpdateDailySteps: mockBatchUpdateDailySteps,
  }),
  useGoals: () => ({
    userGoals: { stepGoal: 10000 },
  }),
}));

jest.mock('@/components/dashboard/TopDateStrip', () => ({
  TopDateStrip: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text testID="top-date-strip">TopDateStrip</Text>;
  },
}));

jest.mock('@/features/health', () => ({
  connectHealth: jest.fn(),
  getTodaySteps: jest.fn(),
  getTodayStepsRecords: jest.fn().mockResolvedValue([]),
  hasStepsPermission: jest.fn(),
  openHealthSettings: jest.fn(),
  syncRolling48Hours: jest.fn(),
  backfillPastSevenDays: jest.fn().mockResolvedValue([]),
  isBackfillCompleted: jest.fn().mockResolvedValue(true),
  fetchSingleDaySteps: jest.fn().mockResolvedValue({ steps: 0, records: [] }),
}));

describe('StepTrackerScreen', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    (health.hasStepsPermission as jest.Mock).mockResolvedValue(false);
    (health.syncRolling48Hours as jest.Mock).mockResolvedValue({
      today: { dateStr: '2026-10-02', steps: 0, records: [] },
      yesterday: { dateStr: '2026-10-01', steps: 0, records: [] },
    });
    (health.isBackfillCompleted as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  test('renders header title, top date strip, and redesigned hero card with 4 micro-metrics', async () => {
    const mockBack = jest.fn();
    const { getByText, getAllByText, getByLabelText } = await render(
      <StepTrackerScreen onBack={mockBack} />
    );

    expect(getByText('Step Tracker')).toBeTruthy();
    expect(getByLabelText('Go back')).toBeTruthy();
    expect(getByText('TopDateStrip')).toBeTruthy();
    expect(getByText('DAILY STEP GOAL')).toBeTruthy();
    expect(getAllByText('5,200').length).toBe(2); // In Gauge + in Micro-metrics
    expect(getByText('/10,000 steps')).toBeTruthy();
    expect(getByText('52% of goal')).toBeTruthy();

    // 4 micro-metric columns
    expect(getByText('STEPS')).toBeTruthy();
    expect(getByText('TIME')).toBeTruthy();
    expect(getByText('CALORIES')).toBeTruthy();
    expect(getByText('DISTANCE')).toBeTruthy();
  });

  test('calls onBack when back button is pressed', async () => {
    const mockBack = jest.fn();
    const { getByLabelText } = await render(<StepTrackerScreen onBack={mockBack} />);

    fireEvent.press(getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('calls connectHealth when Connect button is pressed and runs rolling 48h sync', async () => {
    (health.connectHealth as jest.Mock).mockResolvedValue({
      success: true,
      reason: null,
    });
    (health.getTodaySteps as jest.Mock).mockResolvedValue(7842);
    (health.syncRolling48Hours as jest.Mock).mockResolvedValue({
      today: { dateStr: mockTodayStr, steps: 7842, records: [] },
      yesterday: { dateStr: '2026-10-01', steps: 5000, records: [] },
    });

    const mockBack = jest.fn();
    const { getByLabelText, findAllByText, findByText } = await render(
      <StepTrackerScreen onBack={mockBack} />
    );

    fireEvent.press(getByLabelText('Connect Health Connect'));

    const stepElements = await findAllByText('7,842');
    expect(stepElements.length).toBeGreaterThanOrEqual(1);
    expect(await findByText('✓ 7,842 steps')).toBeTruthy();
  });

  test('executes Tier 1 7-day backfill on first connect if not already completed', async () => {
    (health.connectHealth as jest.Mock).mockResolvedValue({
      success: true,
      reason: null,
    });
    (health.isBackfillCompleted as jest.Mock).mockResolvedValue(false);
    (health.backfillPastSevenDays as jest.Mock).mockResolvedValue([
      { dateStr: '2026-10-01', steps: 6000, records: [] },
      { dateStr: '2026-09-30', steps: 4500, records: [] },
    ]);
    (health.syncRolling48Hours as jest.Mock).mockResolvedValue({
      today: { dateStr: mockTodayStr, steps: 8000, records: [] },
      yesterday: { dateStr: '2026-10-01', steps: 6000, records: [] },
    });

    const mockBack = jest.fn();
    const { getByLabelText, findByText } = await render(<StepTrackerScreen onBack={mockBack} />);

    fireEvent.press(getByLabelText('Connect Health Connect'));

    expect(await findByText('✓ 8,000 steps')).toBeTruthy();
    expect(health.backfillPastSevenDays).toHaveBeenCalled();
    expect(mockBatchUpdateDailySteps).toHaveBeenCalled();
  });
});
