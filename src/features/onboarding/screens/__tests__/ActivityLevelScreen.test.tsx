import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ActivityLevelScreen, activityReply } from '../ActivityLevelScreen';
import { STEP_GOALS, ActivityLevel } from '../../services/onboardingCalculator';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

describe('ActivityLevelScreen (S8)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts with nothing selected and Continue disabled', async () => {
    const onContinue = jest.fn();
    const { getByTestId, queryByTestId, getByText } = await render(
      <ActivityLevelScreen onContinue={onContinue} />
    );

    expect(getByText('How active is a normal week?')).toBeTruthy();
    expect(queryByTestId('activity-ria-reply')).toBeNull();
    expect(getByTestId('activity-continue-button').props.accessibilityState.disabled).toBe(true);
    await act(async () => {
      fireEvent.press(getByTestId('activity-continue-button'));
    });
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('shows the Ria reply for a pick and continues with it', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(<ActivityLevelScreen onContinue={onContinue} />);

    await act(async () => {
      fireEvent.press(getByTestId('activity-card-very_active'));
    });
    expect(getByTestId('activity-ria-reply')).toHaveTextContent(/12,000/);

    await act(async () => {
      fireEvent.press(getByTestId('activity-continue-button'));
    });
    expect(onContinue).toHaveBeenCalledWith('very_active');
  });

  it('restores initialActivityLevel', async () => {
    const { getByTestId } = await render(
      <ActivityLevelScreen onContinue={jest.fn()} initialActivityLevel="lightly_active" />
    );

    expect(getByTestId('activity-card-lightly_active').props.accessibilityState.selected).toBe(
      true
    );
    expect(getByTestId('activity-continue-button').props.accessibilityState.disabled).toBe(false);
  });

  it('activityReply quotes the STEP_GOALS number for each level', () => {
    (Object.keys(STEP_GOALS) as ActivityLevel[]).forEach(level => {
      expect(activityReply(level)).toContain(STEP_GOALS[level].toLocaleString('en-US'));
    });
  });
});
