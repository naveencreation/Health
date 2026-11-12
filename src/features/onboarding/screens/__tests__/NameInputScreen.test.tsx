import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NameInputScreen } from '../NameInputScreen';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
    impactLight: jest.fn(),
  },
}));

describe('NameInputScreen (S2)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders question, input and a disabled continue button when empty', async () => {
    const { getByText, getByTestId } = await render(<NameInputScreen onContinue={jest.fn()} />);

    expect(getByText('What should I call you?')).toBeTruthy();
    expect(getByTestId('name-input-field')).toBeTruthy();
    expect(getByTestId('name-continue-button').props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('enables continue once a name is typed', async () => {
    const { getByTestId } = await render(<NameInputScreen onContinue={jest.fn()} />);

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input-field'), 'Priya');
    });

    expect(getByTestId('name-continue-button').props.accessibilityState).toEqual({
      disabled: false,
    });
  });

  it('shows the greeting bubble then calls onContinue after 800ms', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(<NameInputScreen onContinue={onContinue} />);

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input-field'), 'Priya');
    });
    await act(async () => {
      fireEvent.press(getByTestId('name-continue-button'));
    });

    expect(getByTestId('name-greeting-bubble')).toBeTruthy();
    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith('Priya');
  });

  it('advances immediately on tap during the wait, and only once', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(<NameInputScreen onContinue={onContinue} />);

    await act(async () => {
      fireEvent.changeText(getByTestId('name-input-field'), 'Priya');
    });
    await act(async () => {
      fireEvent.press(getByTestId('name-continue-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('name-screen-tap'));
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith('Priya');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('skip without onSkip continues as "friend"', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(<NameInputScreen onContinue={onContinue} />);

    await act(async () => {
      fireEvent.press(getByTestId('onboarding-header-skip'));
    });

    expect(onContinue).toHaveBeenCalledWith('friend');
  });

  it('skip with onSkip calls onSkip only', async () => {
    const onContinue = jest.fn();
    const onSkip = jest.fn();
    const { getByTestId } = await render(
      <NameInputScreen onContinue={onContinue} onSkip={onSkip} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('onboarding-header-skip'));
    });

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
