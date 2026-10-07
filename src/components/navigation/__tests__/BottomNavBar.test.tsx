import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import { BottomNavBar, BASE_BAR_HEIGHT } from '../BottomNavBar';
import { Colors } from '@/theme/colors';

let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View {...props} testID="svg-icon" />,
    Path: (props: any) => <View {...props} testID="svg-path" />,
  };
});

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('BottomNavBar Component', () => {
  beforeEach(() => {
    mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all four primary tabs and center Scan FAB', async () => {
    const { getByText, findByTestId } = await render(
      <BottomNavBar activeTab="today" onTabChange={jest.fn()} />
    );

    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Track')).toBeTruthy();
    expect(getByText('Insights')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    expect(await findByTestId('center-scan-fab')).toBeTruthy();
  });

  it('indicates the active tab via accessibility state', async () => {
    const { getByRole } = await render(
      <BottomNavBar activeTab="tracker" onTabChange={jest.fn()} />
    );

    const trackTab = getByRole('tab', { name: 'Health Trackers and Biometrics' });
    expect(trackTab.props.accessibilityState).toEqual({ selected: true });

    const todayTab = getByRole('tab', { name: 'Today' });
    expect(todayTab.props.accessibilityState).toEqual({ selected: false });
  });

  it('triggers onTabChange when a tab is pressed', async () => {
    const handleTabChange = jest.fn();
    const { getByText } = await render(
      <BottomNavBar activeTab="today" onTabChange={handleTabChange} />
    );

    fireEvent.press(getByText('Track'));
    await waitFor(() => {
      expect(handleTabChange).toHaveBeenCalledWith('tracker');
    });

    fireEvent.press(getByText('Insights'));
    await waitFor(() => {
      expect(handleTabChange).toHaveBeenCalledWith('analytics');
    });

    fireEvent.press(getByText('Profile'));
    await waitFor(() => {
      expect(handleTabChange).toHaveBeenCalledWith('profile');
    });

    fireEvent.press(getByText('Today'));
    await waitFor(() => {
      expect(handleTabChange).toHaveBeenCalledWith('today');
    });
  });

  it('triggers onOpenFoodVision when center scan button is pressed', async () => {
    const handleOpenFoodVision = jest.fn();
    const { findByTestId } = await render(
      <BottomNavBar
        activeTab="today"
        onTabChange={jest.fn()}
        onOpenFoodVision={handleOpenFoodVision}
      />
    );

    const fab = await findByTestId('center-scan-fab');
    fireEvent.press(fab);
    await waitFor(() => {
      expect(handleOpenFoodVision).toHaveBeenCalledTimes(1);
    });
  });

  it('standardizes base bar height to 64px without safe area inset (Desktop / Android no-gesture)', async () => {
    mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    expect(BASE_BAR_HEIGHT).toBe(64);

    const { findByTestId } = await render(
      <BottomNavBar activeTab="today" onTabChange={jest.fn()} />
    );

    const outerContainer = await findByTestId('bottom-nav-bar');
    const outerStyle = Array.isArray(outerContainer.props.style)
      ? Object.assign({}, ...outerContainer.props.style)
      : outerContainer.props.style;

    expect(outerStyle.height).toBe(64);
    expect(outerStyle.paddingBottom).toBe(0);
    expect(outerStyle.borderTopWidth).toBe(1);
    expect(outerStyle.borderTopColor).toBe(Colors.borderWhisper);

    const innerContent = await findByTestId('bar-content');
    const innerStyle = Array.isArray(innerContent.props.style)
      ? Object.assign({}, ...innerContent.props.style)
      : innerContent.props.style;

    expect(innerStyle.height).toBe(64);
  });

  it('separates 64px visual bar height from hardware safe area bottom inset (iOS / Android gesture)', async () => {
    mockInsets = { top: 47, bottom: 34, left: 0, right: 0 };

    const { findByTestId } = await render(
      <BottomNavBar activeTab="today" onTabChange={jest.fn()} />
    );

    const outerContainer = await findByTestId('bottom-nav-bar');
    const outerStyle = Array.isArray(outerContainer.props.style)
      ? Object.assign({}, ...outerContainer.props.style)
      : outerContainer.props.style;

    // Total height = 64 + 34 = 98px
    expect(outerStyle.height).toBe(98);
    expect(outerStyle.paddingBottom).toBe(34);

    // Inner barContent is strictly 64px
    const innerContent = await findByTestId('bar-content');
    const innerStyle = Array.isArray(innerContent.props.style)
      ? Object.assign({}, ...innerContent.props.style)
      : innerContent.props.style;

    expect(innerStyle.height).toBe(64);
  });

  it('configures center Scan FAB with 52x52 dimensions, 26 radius, 3px white halo, and restrained shadow', async () => {
    const { findByTestId } = await render(
      <BottomNavBar activeTab="today" onTabChange={jest.fn()} />
    );

    const fabPressable = await findByTestId('center-scan-fab');
    const fabStyle = Array.isArray(fabPressable.props.style)
      ? Object.assign({}, ...fabPressable.props.style)
      : fabPressable.props.style;

    expect(fabStyle.width).toBe(52);
    expect(fabStyle.height).toBe(52);
    expect(fabStyle.borderRadius).toBe(26);
    expect(fabStyle.backgroundColor).toBe(Colors.accentLime);
    expect(fabStyle.borderWidth).toBe(3);
    expect(fabStyle.borderColor).toBe('#FFFFFF');
    // Restrained neutral elevation, not green shadow
    expect(fabStyle.shadowColor).toBe('#0F172A');
    expect(fabStyle.shadowOpacity).toBe(0.08);
  });
});
