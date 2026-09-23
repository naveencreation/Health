import React, { Profiler } from 'react';
import { render } from '@testing-library/react-native';
import type { LoggedMealItem } from '@/types';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    interpolate: (_value: number, _input: number[], output: number[]) => output[1],
  };
});

jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/components/common/AnimatedProgressBar', () => ({ AnimatedProgressBar: 'AnimatedProgressBar' }));

import { MealCard } from '../MealCard';

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    removeMealItem: jest.fn(),
    updateMealQuantity: jest.fn(),
  }),
}));

const items: LoggedMealItem[] = Array.from({ length: 100 }, (_, index) => ({
  id: `benchmark-meal-${index}`,
  foodId: `food-${index}`,
  name: `Benchmark meal item ${index}`,
  mealType: index % 4 === 0 ? 'breakfast' : index % 4 === 1 ? 'lunch' : index % 4 === 2 ? 'snacks' : 'dinner',
  servingUnit: '1 serving',
  quantity: 1,
  calories: 100 + index,
  carbs: 10,
  protein: 8,
  fat: 4,
  fiber: 2,
  loggedAt: '2026-09-23T00:00:00.000Z',
}));

describe('MealCard large dataset benchmark harness', () => {
  test('renders 100 rows and records a React commit duration', async () => {
    let commitDuration = -1;
    const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
    await render(
      <Profiler id="MealCard-100-items" onRender={(_id, _phase, actualDuration) => { commitDuration = actualDuration; }}>
        {mealTypes.map((mealType) => (
          <MealCard
            key={mealType}
            mealType={mealType}
            title={mealType}
            recommendedCals={800}
            iconFallback="🥗"
            items={items.filter((item) => item.mealType === mealType)}
            onAddPress={jest.fn()}
          />
        ))}
      </Profiler>
    );

    expect(commitDuration).toBeGreaterThanOrEqual(0);
  });
});
