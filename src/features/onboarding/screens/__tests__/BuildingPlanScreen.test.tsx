import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildingPlanScreen } from '../BuildingPlanScreen';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withRepeat: (anim: any) => anim,
    withTiming: (value: number) => value,
    Easing: {
      linear: (val: number) => val,
    },
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
  },
}));

describe('BuildingPlanScreen (S11)', () => {
  it('renders title, subtitle, and checklist with personal name', async () => {
    const onComplete = jest.fn();
    const { getByText } = await render(
      <BuildingPlanScreen name="Naveen" onComplete={onComplete} />
    );

    expect(getByText('Crafting your plan')).toBeTruthy();
    expect(getByText('Reading your answers, Naveen')).toBeTruthy();
    expect(getByText('Working out your metabolism')).toBeTruthy();
    expect(getByText('Balancing protein, carbs and fat')).toBeTruthy();
    expect(getByText('Setting a pace for your goal')).toBeTruthy();
    expect(onComplete).toHaveBeenCalled();
  });

  it('falls back to friend when name is omitted', async () => {
    const onComplete = jest.fn();
    const { getByText } = await render(
      <BuildingPlanScreen onComplete={onComplete} />
    );

    expect(getByText('Reading your answers, friend')).toBeTruthy();
  });
});
