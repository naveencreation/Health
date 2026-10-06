import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OnboardingHeader, ONBOARDING_SECTIONS } from '../OnboardingHeader';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('OnboardingHeader', () => {
  it('renders Calorify wordmark and triggers onBack', async () => {
    const onBack = jest.fn();
    const { getByText, getByTestId } = await render(
      <OnboardingHeader onBack={onBack} testID="header" />
    );

    expect(getByText('Calorify')).toBeTruthy();

    const backBtn = getByTestId('header-back');
    fireEvent.press(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders section progress bar with 4 segments when sectionIndex is provided', async () => {
    const { getByTestId } = await render(
      <OnboardingHeader sectionIndex={1} testID="header" />
    );

    expect(getByTestId('header-progress')).toBeTruthy();
    expect(getByTestId('header-segment-0')).toBeTruthy();
    expect(getByTestId('header-segment-1')).toBeTruthy();
    expect(getByTestId('header-segment-2')).toBeTruthy();
    expect(getByTestId('header-segment-3')).toBeTruthy();
  });

  it('includes human-readable section label in accessibilityLabel', async () => {
    const { getByTestId } = await render(
      <OnboardingHeader sectionIndex={0} testID="header" />
    );

    const progressBar = getByTestId('header-progress');
    expect(progressBar.props.accessibilityLabel).toBe(
      `Section 1 of 4: ${ONBOARDING_SECTIONS[0].label}`
    );
  });

  it('renders legacy stepText badge when sectionIndex is not provided', async () => {
    const { getByText } = await render(
      <OnboardingHeader stepText="Step 2 of 7" />
    );

    expect(getByText('Step 2 of 7')).toBeTruthy();
  });

  it('renders Skip button when onSkip is provided and triggers callback', async () => {
    const onSkip = jest.fn();
    const { getByText, getByTestId } = await render(
      <OnboardingHeader onSkip={onSkip} testID="header" />
    );

    expect(getByText('Skip')).toBeTruthy();
    const skipBtn = getByTestId('header-skip');
    fireEvent.press(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
