import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AboutYouScreen } from '../AboutYouScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

const press = async (el: unknown) => {
  await act(async () => {
    fireEvent.press(el as never);
  });
};

describe('AboutYouScreen (S5)', () => {
  it('renders title, sex options and wheel; continue does nothing without a sex', async () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = await render(<AboutYouScreen onContinue={onContinue} />);

    expect(getByText('A little about you')).toBeTruthy();
    expect(getByTestId('sex-option-female')).toBeTruthy();
    expect(getByTestId('sex-option-male')).toBeTruthy();
    expect(getByTestId('sex-option-prefer_not_to_say')).toBeTruthy();
    expect(getByTestId('age-scroll-wheel')).toBeTruthy();

    await press(getByTestId('about-you-continue-button'));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('continues with picked sex and initial age', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <AboutYouScreen onContinue={onContinue} initialAge={28} />
    );

    await press(getByTestId('sex-option-female'));
    await press(getByTestId('about-you-continue-button'));
    expect(onContinue).toHaveBeenCalledWith('female', 28);
  });

  it('restores initialSex', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(
      <AboutYouScreen onContinue={onContinue} initialSex="male" />
    );

    await press(getByTestId('about-you-continue-button'));
    expect(onContinue).toHaveBeenCalledWith('male', 25);
  });

  it('shows the average note for prefer not to say', async () => {
    const { getByTestId, getByText } = await render(<AboutYouScreen onContinue={jest.fn()} />);

    await press(getByTestId('sex-option-prefer_not_to_say'));
    expect(getByText("No problem. I'll use an average of both.")).toBeTruthy();
  });

  it('blocks continue under 13', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <AboutYouScreen onContinue={onContinue} initialAge={11} />
    );

    await press(getByTestId('sex-option-male'));
    expect(getByTestId('age-policy-banner')).toBeTruthy();
    expect(getByText('Calorify is for ages 13 and up.')).toBeTruthy();
    await press(getByTestId('about-you-continue-button'));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('shows the teen message for 13 to 17 and still continues', async () => {
    const onContinue = jest.fn();
    const { getByTestId, getByText } = await render(
      <AboutYouScreen onContinue={onContinue} initialAge={15} />
    );

    await press(getByTestId('sex-option-female'));
    expect(getByTestId('age-policy-banner')).toBeTruthy();
    expect(
      getByText(
        "Since you're still growing, I'll keep your plan at maintenance to support your energy."
      )
    ).toBeTruthy();
    await press(getByTestId('about-you-continue-button'));
    expect(onContinue).toHaveBeenCalledWith('female', 15);
  });

  it('steps the age with the adjustable accessibility action', async () => {
    const onContinue = jest.fn();
    const { getByTestId } = await render(<AboutYouScreen onContinue={onContinue} />);

    await press(getByTestId('sex-option-female'));
    await act(async () => {
      fireEvent(getByTestId('age-scroll-wheel-container'), 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      });
    });
    await press(getByTestId('about-you-continue-button'));
    expect(onContinue).toHaveBeenCalledWith('female', 26);
  });
});
