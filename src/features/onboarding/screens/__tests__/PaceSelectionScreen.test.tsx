import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PaceSelectionScreen, paceReply } from '../PaceSelectionScreen';
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

const base: UserBiometricsInput = {
  age: 28,
  gender: 'male',
  sex: 'male',
  heightCm: 175,
  weightKg: 75,
  targetWeightKg: 70,
  goal: 'lose_weight',
  activityLevel: 'moderately_active',
};

// Small female input: every pace falls below the 1200 kcal floor.
const floored: UserBiometricsInput = {
  age: 25,
  gender: 'female',
  sex: 'female',
  heightCm: 150,
  weightKg: 45,
  targetWeightKg: 42,
  goal: 'lose_weight',
  activityLevel: 'sedentary',
};

describe('PaceSelectionScreen (S9)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts with nothing selected and Continue disabled', async () => {
    const onContinue = jest.fn();
    const { getByTestId, queryByTestId, getByText } = await render(
      <PaceSelectionScreen biometrics={base} onContinue={onContinue} />
    );

    expect(getByText('How fast do you want to go?')).toBeTruthy();
    expect(getByText('RECOMMENDED')).toBeTruthy();
    expect(queryByTestId('pace-ria-reply')).toBeNull();
    expect(getByTestId('pace-card-steady').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('pace-continue-button').props.accessibilityState.disabled).toBe(true);
    await act(async () => {
      fireEvent.press(getByTestId('pace-continue-button'));
    });
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('shows the lose reply and weekly line for a pick, then continues with it', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText, getAllByText } = await render(
      <PaceSelectionScreen biometrics={base} onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('pace-card-steady'));
    });
    expect(getByTestId('pace-ria-reply')).toBeTruthy();
    expect(getByText(paceReply('lose_weight', 'steady'))).toBeTruthy();
    expect(getAllByText(/^−0\.\d kg a week · by /)).toHaveLength(3);
    expect(getByTestId('pace-card-steady').props.accessibilityState.selected).toBe(true);

    await act(async () => {
      fireEvent.press(getByTestId('pace-continue-button'));
    });
    expect(onContinue).toHaveBeenCalledWith('steady');
  });

  it('shows gain copy and a plus sign for a gain goal', async () => {
    const { getByTestId, getByText, getAllByText } = await render(
      <PaceSelectionScreen
        biometrics={{ ...base, goal: 'gain_muscle', targetWeightKg: 80 }}
        onContinue={jest.fn()}
      />
    );
    await act(async () => {
      fireEvent.press(getByTestId('pace-card-faster'));
    });
    expect(getByText(paceReply('gain_muscle', 'faster'))).toBeTruthy();
    expect(getAllByText(/^\+0\.4 kg a week · by /).length).toBe(1);
  });

  it('shows pounds when the unit is lbs', async () => {
    const { getAllByText } = await render(
      <PaceSelectionScreen biometrics={base} weightUnit="lbs" onContinue={jest.fn()} />
    );
    expect(getAllByText(/lb a week/).length).toBe(3);
  });

  it('omits the date when there is no target weight', async () => {
    const { getAllByText, queryByText } = await render(
      <PaceSelectionScreen
        biometrics={{ ...base, targetWeightKg: undefined }}
        onContinue={jest.fn()}
      />
    );
    expect(getAllByText(/kg a week$/).length).toBe(3);
    expect(queryByText(/ by /)).toBeNull();
  });

  it('restores a previously chosen pace', async () => {
    const { getByTestId } = await render(
      <PaceSelectionScreen biometrics={base} initialPace="gentle" onContinue={jest.fn()} />
    );
    expect(getByTestId('pace-card-gentle').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('pace-ria-reply')).toBeTruthy();
  });

  it('shows the safety-floor note only when a pace is floored', async () => {
    const withFloor = await render(
      <PaceSelectionScreen biometrics={floored} onContinue={jest.fn()} />
    );
    expect(withFloor.getByTestId('pace-floor-note')).toBeTruthy();
    expect(withFloor.getByText(/kept at a safe minimum of 1,200 kcal\./)).toBeTruthy();
    withFloor.unmount();

    const without = await render(<PaceSelectionScreen biometrics={base} onContinue={jest.fn()} />);
    expect(without.queryByTestId('pace-floor-note')).toBeNull();
  });

  it('paceReply picks the category by goal', () => {
    expect(paceReply('lose_weight', 'gentle')).toMatch(/less hunger/);
    expect(paceReply('maintain', 'steady')).toBe(paceReply('lose_weight', 'steady'));
    expect(paceReply('gain_muscle', 'gentle')).toMatch(/Leaner gains/);
    expect(paceReply('gain_muscle', 'faster')).toMatch(/Pair it with training/);
  });
});
