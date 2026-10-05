import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { SoftPaywallScreen } from '../SoftPaywallScreen';
import { CalculatedHealthPlan } from '../../services/onboardingCalculator';
import * as useProModule from '@/features/subscription/hooks/usePro';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    impactMedium: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    selection: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('SoftPaywallScreen', () => {
  const mockPlan: CalculatedHealthPlan = {
    dailyCalorieBudget: 1850,
    bmr: 1600,
    tdee: 2200,
    targetProteinG: 139,
    targetCarbsG: 231,
    targetFatG: 41,
    targetFiberG: 28,
    targetWaterMl: 2500,
    stepGoal: 8000,
  };

  const defaultProps = {
    name: 'Dev',
    plan: mockPlan,
    onContinue: jest.fn(),
    onSkip: jest.fn(),
    onBack: jest.fn(),
  };

  const mockPurchasePlan = jest.fn();
  const mockRestorePurchases = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(useProModule, 'usePro').mockReturnValue({
      isPro: false,
      activePlanId: undefined,
      expiresAt: undefined,
      loading: false,
      purchasePlan: mockPurchasePlan,
      restorePurchases: mockRestorePurchases,
      canAccess: jest.fn(),
      refreshEntitlement: jest.fn(),
    });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);
  });

  it('renders title, personalized plan chip, and Pro value pillars', async () => {
    const { getByText } = await render(<SoftPaywallScreen {...defaultProps} />);

    // Title & Subtitle
    expect(getByText('Accelerate your plan, Dev.')).toBeTruthy();
    expect(getByText(/Members with Pro hit their target 1850 kcal budget/)).toBeTruthy();

    // Plan chip
    expect(getByText('Calibrated for Dev · 1850 kcal/day target')).toBeTruthy();

    // 4 Value Pillars
    expect(getByText('Unlimited AI Meal Vision')).toBeTruthy();
    expect(getByText('Dynamic Adaptive Coaching')).toBeTruthy();
    expect(getByText('30-Day Deep Trend Graphs')).toBeTruthy();
    expect(getByText('Priority Backup & Sync')).toBeTruthy();
  });

  it('renders the 3-step trust trial timeline', async () => {
    const { getByText } = await render(<SoftPaywallScreen {...defaultProps} />);

    expect(getByText('HOW YOUR FREE TRIAL WORKS')).toBeTruthy();
    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Instant full Pro access. Cost: $0.00 today.')).toBeTruthy();
    expect(getByText('Day 5')).toBeTruthy();
    expect(getByText('Gentle reminder notification before your trial ends.')).toBeTruthy();
    expect(getByText('Day 7')).toBeTruthy();
    expect(getByText('Billed only if you love it. Cancel anytime with 1 tap.')).toBeTruthy();
  });

  it('allows toggling between Annual and Monthly plans and updates CTA text', async () => {
    const { getByTestId, getByText } = await render(<SoftPaywallScreen {...defaultProps} />);

    // Initial state: Annual plan selected
    expect(getByText('Start 7-Day Free Trial')).toBeTruthy();

    // Select Monthly
    fireEvent.press(getByTestId('plan-option-monthly'));
    await waitFor(() => {
      expect(getByText('Upgrade to Pro')).toBeTruthy();
    });

    // Select Annual again
    fireEvent.press(getByTestId('plan-option-annual'));
    await waitFor(() => {
      expect(getByText('Start 7-Day Free Trial')).toBeTruthy();
    });
  });

  it('initiates trial purchase and calls onContinue upon success', async () => {
    mockPurchasePlan.mockResolvedValueOnce({ success: true });

    const { getByTestId } = await render(<SoftPaywallScreen {...defaultProps} />);

    fireEvent.press(getByTestId('btn-start-trial'));

    await waitFor(() => {
      expect(mockPurchasePlan).toHaveBeenCalledWith('pro_annual');
      expect(defaultProps.onContinue).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message if trial purchase fails', async () => {
    mockPurchasePlan.mockResolvedValueOnce({
      success: false,
      error: 'User cancelled payment or card declined.',
    });

    const { getByTestId, getByText } = await render(<SoftPaywallScreen {...defaultProps} />);

    fireEvent.press(getByTestId('btn-start-trial'));

    await waitFor(() => {
      expect(mockPurchasePlan).toHaveBeenCalledWith('pro_annual');
      expect(getByText('User cancelled payment or card declined.')).toBeTruthy();
      expect(defaultProps.onContinue).not.toHaveBeenCalled();
    });
  });

  it('calls onSkip when bottom "Continue with Free Plan" is tapped', async () => {
    const { getByTestId } = await render(<SoftPaywallScreen {...defaultProps} />);

    fireEvent.press(getByTestId('btn-continue-free'));
    await waitFor(() => {
      expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onSkip when top header "Skip" button is tapped', async () => {
    const { getByTestId } = await render(<SoftPaywallScreen {...defaultProps} />);

    fireEvent.press(getByTestId('btn-paywall-skip-header'));
    await waitFor(() => {
      expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onBack when back button is pressed', async () => {
    const { getByTestId } = await render(<SoftPaywallScreen {...defaultProps} />);

    fireEvent.press(getByTestId('btn-paywall-back'));
    await waitFor(() => {
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });
  });

  it('restores purchases successfully and calls onContinue', async () => {
    mockRestorePurchases.mockResolvedValueOnce({ restored: true });

    const { getByTestId } = await render(<SoftPaywallScreen {...defaultProps} />);

    fireEvent.press(getByTestId('btn-restore-purchases'));

    await waitFor(() => {
      expect(mockRestorePurchases).toHaveBeenCalledTimes(1);
      expect(defaultProps.onContinue).toHaveBeenCalledTimes(1);
    });
  });

  it('displays message when restore finds no prior subscription', async () => {
    mockRestorePurchases.mockResolvedValueOnce({ restored: false });

    const { getByTestId, getByText } = await render(<SoftPaywallScreen {...defaultProps} />);

    fireEvent.press(getByTestId('btn-restore-purchases'));

    await waitFor(() => {
      expect(mockRestorePurchases).toHaveBeenCalledTimes(1);
      expect(getByText('No previous active subscription found.')).toBeTruthy();
      expect(defaultProps.onContinue).not.toHaveBeenCalled();
    });
  });
});
