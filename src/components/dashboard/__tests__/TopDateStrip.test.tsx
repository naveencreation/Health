import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopDateStrip } from '../TopDateStrip';
import { toDateString, parseDateString, SHORT_DAY_NAMES } from '@/utils/dateUtils';

const mockSetSelectedDate = jest.fn();
const mockShiftDate = jest.fn();
const mockUseDailyLog = jest.fn();
const mockUseGoals = jest.fn();

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => mockUseDailyLog(),
  useGoals: () => mockUseGoals(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockModal = ({ visible, children, ...props }: any) => {
    return visible ? React.createElement(View, props, children) : null;
  };
  MockModal.default = MockModal;
  MockModal.displayName = 'Modal';
  return MockModal;
});

describe('TopDateStrip (Option C: Controlled Rolling Window)', () => {
  const realToday = toDateString(new Date());

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGoals.mockReturnValue({
      userGoals: {
        dailyCalorieBudget: 2000,
        waterGoalMl: 2000,
        stepGoal: 10000,
      },
    });
  });

  test('renders 7 rolling days ending at today when viewing today', async () => {
    mockUseDailyLog.mockReturnValue({
      selectedDate: realToday,
      setSelectedDate: mockSetSelectedDate,
      shiftDate: mockShiftDate,
      dailyLogs: {},
    });

    const { getByLabelText, queryByLabelText } = await render(<TopDateStrip />);

    // Today should be selected in the strip
    const todayDate = parseDateString(realToday);
    const todayDayName = SHORT_DAY_NAMES[todayDate.getDay()];
    const todayLabel = `Selected ${todayDayName} ${todayDate.getDate()}`;
    expect(getByLabelText(todayLabel)).toBeTruthy();

    // "Return to today" button should NOT be displayed when viewing today
    expect(queryByLabelText('Return to today')).toBeNull();

    // Next week forward chevron MUST be disabled at today boundary
    const nextWeekBtn = getByLabelText('Next week');
    expect(nextWeekBtn.props.accessibilityState).toEqual({ disabled: true });

    // Pressing disabled next week chevron should not shift date
    fireEvent.press(nextWeekBtn);
    expect(mockShiftDate).not.toHaveBeenCalled();
  });

  test('shows "Return to today" button and allows jumping to today when viewing past date', async () => {
    // 3 days in the past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);
    const pastDateStr = toDateString(pastDate);

    mockUseDailyLog.mockReturnValue({
      selectedDate: pastDateStr,
      setSelectedDate: mockSetSelectedDate,
      shiftDate: mockShiftDate,
      dailyLogs: {},
    });

    const { getByLabelText } = await render(<TopDateStrip />);

    const returnTodayBtn = getByLabelText('Return to today');
    expect(returnTodayBtn).toBeTruthy();

    fireEvent.press(returnTodayBtn);
    expect(mockSetSelectedDate).toHaveBeenCalledWith(realToday);
  });

  test('allows navigating backwards to previous weeks', async () => {
    mockUseDailyLog.mockReturnValue({
      selectedDate: realToday,
      setSelectedDate: mockSetSelectedDate,
      shiftDate: mockShiftDate,
      dailyLogs: {},
    });

    const { getByLabelText } = await render(<TopDateStrip />);

    const prevWeekBtn = getByLabelText('Previous week');
    expect(prevWeekBtn).toBeTruthy();

    fireEvent.press(prevWeekBtn);
    expect(mockShiftDate).toHaveBeenCalledWith(-7);
  });

  test('allows selecting a past date pill within the 7-day strip', async () => {
    mockUseDailyLog.mockReturnValue({
      selectedDate: realToday,
      setSelectedDate: mockSetSelectedDate,
      shiftDate: mockShiftDate,
      dailyLogs: {},
    });

    const { getByLabelText } = await render(<TopDateStrip />);

    // 1 day ago pill should be selectable
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDayName = SHORT_DAY_NAMES[yesterday.getDay()];
    const yLabel = `Select ${yDayName} ${yesterday.getDate()}`;

    const yesterdayPill = getByLabelText(yLabel);
    expect(yesterdayPill).toBeTruthy();

    fireEvent.press(yesterdayPill);
    expect(mockSetSelectedDate).toHaveBeenCalledWith(toDateString(yesterday));
  });

  test('calendar modal disables future days and forward month button', async () => {
    mockUseDailyLog.mockReturnValue({
      selectedDate: realToday,
      setSelectedDate: mockSetSelectedDate,
      shiftDate: mockShiftDate,
      dailyLogs: {},
    });

    const { getByLabelText, findByLabelText } = await render(<TopDateStrip />);

    // Open calendar modal
    const changeMonthBtn = getByLabelText(/Change month/);
    fireEvent.press(changeMonthBtn);

    // Close calendar button should be present
    expect(await findByLabelText('Close calendar')).toBeTruthy();

    // Next month button must be disabled since we are currently viewing the current month
    const nextMonthBtn = await findByLabelText('Next month');
    expect(nextMonthBtn.props.accessibilityState).toEqual({ disabled: true });

    // Jump to today button in modal
    const modalTodayBtn = await findByLabelText('Jump to today');
    fireEvent.press(modalTodayBtn);
    expect(mockSetSelectedDate).toHaveBeenCalledWith(realToday);
  });
});
