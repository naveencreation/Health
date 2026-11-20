import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirstMealWalkthrough } from '../FirstMealWalkthrough';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (value: number) => ({ value, get: () => value, set: () => {} }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    Easing: { bezier: () => () => 0, linear: (v: number) => v, ease: () => 0 },
    useReducedMotion: () => true,
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../FirstMealDemo', () => ({ FirstMealDemo: () => null }));

const mockOpenModal = jest.fn();
let mockActiveModal: unknown = null;
jest.mock('@/navigation/OverlayContext', () => ({
  useOverlay: () => ({ activeModal: mockActiveModal, openModal: mockOpenModal }),
}));

let mockLogs: Record<string, { meals: unknown[] }> = {};
let mockName = 'Priya';
jest.mock('@/context/HealthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'uid1' } }),
  useGoals: () => ({ userGoals: { name: mockName } }),
  useDailyLog: () => ({ dailyLogs: mockLogs }),
}));

const KEY = '@calori_uid1_first_meal_walkthrough_v1';
const onOpenRia = jest.fn();
const setup = (tab = 'today') =>
  render(<FirstMealWalkthrough activeTab={tab} onOpenRia={onOpenRia} />);

describe('FirstMealWalkthrough', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockActiveModal = null;
    mockLogs = {};
    mockName = 'Priya';
  });

  it('shows the intro with the name, and Try it now opens the camera', async () => {
    await AsyncStorage.setItem(KEY, 'intro');
    const { getByText, getByTestId } = await setup();
    await waitFor(() => expect(getByText('Snap your first meal, Priya')).toBeTruthy());
    fireEvent.press(getByTestId('btn-walkthrough-try'));
    expect(mockOpenModal).toHaveBeenCalledWith({ type: 'foodVision' });
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBe('ria_tip'));
  });

  it('drops the name when there is none', async () => {
    await AsyncStorage.setItem(KEY, 'intro');
    mockName = 'Friend';
    const { getByText } = await setup();
    await waitFor(() => expect(getByText('Snap your first meal')).toBeTruthy());
  });

  it('Later moves to the tip state without opening the camera', async () => {
    await AsyncStorage.setItem(KEY, 'intro');
    const { getByTestId, queryByTestId } = await setup();
    fireEvent.press(await waitFor(() => getByTestId('btn-walkthrough-later')));
    await waitFor(() => expect(queryByTestId('btn-walkthrough-later')).toBeNull());
    expect(mockOpenModal).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(KEY)).toBe('ria_tip');
  });

  it('marks done silently when the user already has meals', async () => {
    await AsyncStorage.setItem(KEY, 'intro');
    mockLogs = { '2026-01-01': { meals: [{}] } };
    const { queryByTestId } = await setup();
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBe('done'));
    expect(queryByTestId('btn-walkthrough-try')).toBeNull();
  });

  it('shows nothing when no state is stored', async () => {
    const { queryByTestId } = await setup();
    await new Promise(r => setTimeout(r, 20));
    expect(queryByTestId('btn-walkthrough-try')).toBeNull();
    expect(queryByTestId('walkthrough-tip')).toBeNull();
  });

  it('shows the tip after a meal and Got it finishes it', async () => {
    await AsyncStorage.setItem(KEY, 'ria_tip');
    mockLogs = { '2026-01-01': { meals: [{}] } };
    const { getByTestId, queryByTestId } = await setup();
    fireEvent.press(await waitFor(() => getByTestId('btn-walkthrough-got-it')));
    await waitFor(() => expect(queryByTestId('walkthrough-tip')).toBeNull());
    expect(onOpenRia).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(KEY)).toBe('done');
  });

  it('opens Nomzo when the tip body is tapped', async () => {
    await AsyncStorage.setItem(KEY, 'ria_tip');
    mockLogs = { '2026-01-01': { meals: [{}] } };
    const { getByTestId } = await setup();
    fireEvent.press(await waitFor(() => getByTestId('walkthrough-tip')));
    expect(onOpenRia).toHaveBeenCalledTimes(1);
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBe('done'));
  });

  it('holds the tip back on other tabs', async () => {
    await AsyncStorage.setItem(KEY, 'ria_tip');
    mockLogs = { '2026-01-01': { meals: [{}] } };
    const { queryByTestId } = await setup('profile');
    await new Promise(r => setTimeout(r, 20));
    expect(queryByTestId('walkthrough-tip')).toBeNull();
  });
});
