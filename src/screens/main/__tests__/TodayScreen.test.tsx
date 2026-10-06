import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { TodayScreen } from '../TodayScreen';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedScrollHandler: () => () => {},
    runOnJS: (fn: any) => fn,
    withTiming: (value: number) => value,
    interpolate: (_value: number, _input: number[], output: number[]) => output[1],
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/components', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Header: ({ onRiaPress }: any) => (
      <Pressable testID="header-component" onPress={onRiaPress}>
        <Text>Header</Text>
      </Pressable>
    ),
    TopDateStrip: () => <Text testID="top-date-strip">TopDateStrip</Text>,
    HeroCalorieCard: () => <Text testID="hero-calorie-card">HeroCalorieCard</Text>,
    MealSection: ({ onAddFood }: any) => (
      <Pressable testID="meal-section" onPress={() => onAddFood('breakfast')}>
        <Text>MealSection</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/features/ria', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    FloatingRiaButton: ({ onPress, onQuickAction }: any) => (
      <Pressable
        testID="floating-ria-button"
        onPress={onPress}
        onLongPress={() => onQuickAction?.('day_review')}
      >
        <Text>FloatingRiaButton</Text>
      </Pressable>
    ),
  };
});

describe('TodayScreen', () => {
  const mockAddFood = jest.fn();
  const mockOpenRiaChat = jest.fn();
  const mockOpenFoodVision = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Header, TopDateStrip, HeroCalorieCard, MealSection and FloatingRiaButton', async () => {
    const { getByTestId } = await render(
      <TodayScreen
        onAddFood={mockAddFood}
        onOpenRiaChat={mockOpenRiaChat}
        onOpenFoodVision={mockOpenFoodVision}
      />
    );

    expect(getByTestId('header-component')).toBeTruthy();
    expect(getByTestId('top-date-strip')).toBeTruthy();
    expect(getByTestId('hero-calorie-card')).toBeTruthy();
    expect(getByTestId('meal-section')).toBeTruthy();
    expect(getByTestId('floating-ria-button')).toBeTruthy();
  });

  test('wires onRiaPress from Header to onOpenRiaChat', async () => {
    const { getByTestId } = await render(
      <TodayScreen
        onAddFood={mockAddFood}
        onOpenRiaChat={mockOpenRiaChat}
        onOpenFoodVision={mockOpenFoodVision}
      />
    );

    fireEvent.press(getByTestId('header-component'));
    expect(mockOpenRiaChat).toHaveBeenCalledTimes(1);
  });

  test('wires tap on FloatingRiaButton to onOpenRiaChat', async () => {
    const { getByTestId } = await render(
      <TodayScreen
        onAddFood={mockAddFood}
        onOpenRiaChat={mockOpenRiaChat}
        onOpenFoodVision={mockOpenFoodVision}
      />
    );

    fireEvent.press(getByTestId('floating-ria-button'));
    expect(mockOpenRiaChat).toHaveBeenCalledTimes(1);
  });

  test('wires long press quick action to onOpenRiaChat with custom prompt', async () => {
    const { getByTestId } = await render(
      <TodayScreen
        onAddFood={mockAddFood}
        onOpenRiaChat={mockOpenRiaChat}
        onOpenFoodVision={mockOpenFoodVision}
      />
    );

    fireEvent(getByTestId('floating-ria-button'), 'longPress');
    expect(mockOpenRiaChat).toHaveBeenCalledWith(
      'How is my nutrition and activity looking today? Give me a full review.'
    );
  });
});
