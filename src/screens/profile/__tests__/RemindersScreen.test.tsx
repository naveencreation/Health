import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { RemindersScreen } from '../RemindersScreen';
import { NotificationStorage, NotificationScheduler } from '@/services/notifications';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/context/HealthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'u1' } }),
  useGoals: () => ({ userGoals: {} }),
  useDailyLog: () => ({ dailyLogs: {}, todayStr: '2026-11-12' }),
}));

const settings = {
  version: 2,
  enabled: true,
  quietHours: { start: '22:00', end: '07:00' },
  meals: { enabled: true, breakfast: '08:30', lunch: '13:00', dinner: '22:30', skipsBreakfast: false },
  water: { enabled: true, intervalMinutes: 120 },
  steps: { enabled: true },
  streak: { enabled: false },
  weight: { enabled: false, time: '07:30' },
};

jest.mock('@/services/notifications', () => ({
  NotificationStorage: { loadSettings: jest.fn(), updateSettings: jest.fn() },
  NotificationScheduler: { syncSchedules: jest.fn() },
  NotificationService: {
    requestPermission: jest.fn().mockResolvedValue(true),
    getPermissionStatus: jest.fn().mockResolvedValue(true),
    scheduleNotification: jest.fn(),
  },
  // Real overnight-window check isn't needed; 22:30 counts as quiet, everything else doesn't
  isInsideQuietHours: (d: Date) => d.getHours() >= 22,
  buildSyncOptions: () => ({}),
}));

describe('RemindersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NotificationStorage.loadSettings as jest.Mock).mockResolvedValue(settings);
    (NotificationStorage.updateSettings as jest.Mock).mockResolvedValue(settings);
  });

  it('loads settings, flags a meal time inside quiet hours, and saves a toggle', async () => {
    const screen = await render(<RemindersScreen onBack={jest.fn()} />);

    expect(await screen.findByText('Quiet hours')).toBeTruthy();
    expect(screen.getByText("Inside quiet hours, so it won't ring")).toBeTruthy();

    await act(async () => {
      fireEvent(screen.getByLabelText('Water reminders'), 'valueChange', false);
    });
    expect(NotificationStorage.updateSettings).toHaveBeenCalledWith({ waterReminder: false }, 'u1');
    expect(NotificationScheduler.syncSchedules).toHaveBeenCalled();
  });

  it('reloads the stored state and shows an error when a save fails', async () => {
    (NotificationStorage.updateSettings as jest.Mock).mockRejectedValueOnce(new Error('disk'));
    const screen = await render(<RemindersScreen onBack={jest.fn()} />);
    await screen.findByText('Quiet hours');

    await act(async () => {
      fireEvent(screen.getByLabelText('Water reminders'), 'valueChange', false);
    });

    expect(await screen.findByText("Couldn't save that change. Try again.")).toBeTruthy();
    expect(NotificationStorage.loadSettings).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Water reminders').props.value).toBe(true);
  });
});
