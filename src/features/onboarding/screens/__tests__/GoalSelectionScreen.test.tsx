import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { GoalSelectionScreen } from '../GoalSelectionScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

const LOSE_REPLY = "Good call. I'll set a gentle calorie budget you can actually stick to.";

describe('GoalSelectionScreen (S3)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders personalized title with user name and all 4 goal options', async () => {
    const { getByText, getByTestId } = await render(<GoalSelectionScreen name="Aarav" />);

    expect(getByText('Aarav')).toBeTruthy();
    expect(getByText(/What brings you here,/)).toBeTruthy();
    expect(getByTestId('goal-card-lose')).toBeTruthy();
    expect(getByTestId('goal-card-maintain')).toBeTruthy();
    expect(getByTestId('goal-card-build')).toBeTruthy();
    expect(getByTestId('goal-card-understand')).toBeTruthy();
  });

  it('starts with nothing selected and Continue disabled', async () => {
    const onContinue = jest.fn();
    const { getByTestId, queryByTestId } = await render(
      <GoalSelectionScreen onContinue={onContinue} />
    );

    expect(getByTestId('goal-continue-button').props.accessibilityState.disabled).toBe(true);
    await act(async () => {
      fireEvent.press(getByTestId('goal-continue-button'));
    });

    expect(onContinue).not.toHaveBeenCalled();
    expect(queryByTestId('goal-ria-reply')).toBeNull();
  });

  it('shows Ria reply on selection and advances when Continue is pressed', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <GoalSelectionScreen name="Aarav" onContinue={onContinue} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('goal-card-lose'));
    });

    expect(getByText(LOSE_REPLY)).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('goal-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith('lose_weight', 'lose');
  });

  it('supports selecting "Understand what I eat" and manual Continue', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <GoalSelectionScreen onContinue={onContinue} />
    );

    expect(getByText('Understand what I eat')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('goal-card-understand'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('goal-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith('maintain', 'understand');
  });

  it('restores selection from initialIntent', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <GoalSelectionScreen initialIntent="build" onContinue={onContinue} />
    );

    expect(getByTestId('goal-continue-button').props.accessibilityState.disabled).toBe(false);
    expect(getByTestId('goal-ria-reply')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('goal-continue-button'));
    });

    expect(onContinue).toHaveBeenCalledWith('gain_muscle', 'build');
  });
});
