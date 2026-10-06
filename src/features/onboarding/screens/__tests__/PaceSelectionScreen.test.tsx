import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PaceSelectionScreen } from '../PaceSelectionScreen';
import { UserBiometricsInput } from '../../services/onboardingCalculator';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

describe('PaceSelectionScreen (S9)', () => {
  const mockBiometrics: UserBiometricsInput = {
    age: 28,
    gender: 'male',
    sex: 'male',
    heightCm: 175,
    weightKg: 75,
    targetWeightKg: 70,
    goal: 'lose_weight',
    activityLevel: 'moderately_active',
  };

  it('renders all 3 pace cards and highlights Recommended badge on Steady', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(
      <PaceSelectionScreen
        biometrics={mockBiometrics}
        onContinue={onContinue}
      />
    );

    expect(getByText('How fast do you want to go?')).toBeTruthy();
    expect(getByTestId('pace-card-gentle')).toBeTruthy();
    expect(getByTestId('pace-card-steady')).toBeTruthy();
    expect(getByTestId('pace-card-faster')).toBeTruthy();
    expect(getByText('Recommended')).toBeTruthy();
  });

  it('selects faster pace and calls onContinue', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <PaceSelectionScreen
        biometrics={mockBiometrics}
        onContinue={onContinue}
      />
    );

    await act(async () => {
      fireEvent.press(getByTestId('pace-card-faster'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('pace-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith('faster');
  });
});
