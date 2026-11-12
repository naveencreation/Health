import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { RiaMealCardView } from '../RiaMealCardView';
import { RiaWaterCardView } from '../RiaWaterCardView';
import { RiaWeightCardView } from '../RiaWeightCardView';
import { RiaPlanChangeCardView } from '../RiaPlanChangeCardView';
import { RiaDayReviewCardView } from '../RiaDayReviewCardView';
import { scoreLabel } from '../RiaPlateDistributionCardView';
import { MealCardData } from '@/services/ai/types/ai.types';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));

const meal: MealCardData = {
  slot: 'lunch',
  state: 'proposed',
  assumption: '1 glass taken as 250 mL.',
  items: [
    {
      name: 'Paneer kathi roll',
      qty: 1,
      unit: 'roll',
      kcal: 410,
      protein: 16,
      carbs: 40,
      fat: 20,
      source: 'catalog',
    },
    {
      name: 'Mango lassi',
      qty: 250,
      unit: 'mL',
      kcal: 260,
      protein: 8,
      carbs: 38,
      fat: 9,
      source: 'estimate',
    },
  ],
};

describe('Ria cards', () => {
  it('meal: shows the total and logs or dismisses', async () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();
    const { getByText, getByLabelText } = await render(
      <RiaMealCardView data={meal} onConfirm={onConfirm} onDismiss={onDismiss} />
    );

    expect(getByLabelText('Proposed Lunch, 670 kcal')).toBeTruthy();
    expect(getByText('1 glass taken as 250 mL.')).toBeTruthy();
    expect(getByLabelText('estimated')).toBeTruthy();
    await fireEvent.press(getByLabelText('Log to Lunch, 670 calories'));
    await fireEvent.press(getByText('Not now'));
    expect(onConfirm).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('meal: a duplicate warning turns the button into Log again', async () => {
    const { getByText } = await render(
      <RiaMealCardView
        data={{ ...meal, duplicateWarning: 'You logged this 4m ago.' }}
        onConfirm={jest.fn()}
      />
    );
    expect(getByText('Log again')).toBeTruthy();
  });

  it('meal: logged shows Undo only until the window closes', async () => {
    jest.useFakeTimers();
    const now = Date.now();
    const onUndo = jest.fn();
    const { getByText, queryByText } = await render(
      <RiaMealCardView
        data={{ ...meal, state: 'logged', loggedAt: now, undoUntil: now + 3000 }}
        onUndo={onUndo}
      />
    );

    expect(getByText('Added to Lunch')).toBeTruthy();
    expect(getByText('Undo · 3s')).toBeTruthy();
    // Each tick schedules the next after React re-renders, so step one second at a time
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(queryByText(/Undo/)).toBeNull();
    jest.useRealTimers();
  });

  it('meal: dismissed collapses to one line and Show brings it back', async () => {
    const { getByText, getByLabelText, queryByText } = await render(
      <RiaMealCardView data={{ ...meal, state: 'dismissed' }} onConfirm={jest.fn()} />
    );
    expect(getByText('Lunch · 670 kcal not logged')).toBeTruthy();
    expect(queryByText('Paneer kathi roll')).toBeNull();
    await fireEvent.press(getByLabelText('Show card: Lunch · 670 kcal not logged'));
    expect(getByText('Paneer kathi roll')).toBeTruthy();
  });

  it('water: logs the amount', async () => {
    const onConfirm = jest.fn();
    const { getByLabelText } = await render(
      <RiaWaterCardView data={{ amountMl: 250, state: 'proposed' }} onConfirm={onConfirm} />
    );
    await fireEvent.press(getByLabelText('Log 250 millilitres of water'));
    expect(onConfirm).toHaveBeenCalledWith(250);
  });

  it('water: no Undo once the window has passed', async () => {
    const { getByText, queryByText } = await render(
      <RiaWaterCardView
        data={{ amountMl: 250, state: 'logged', undoUntil: 1 }}
        onUndo={jest.fn()}
      />
    );
    expect(getByText('Added to today')).toBeTruthy();
    expect(queryByText(/Undo/)).toBeNull();
  });

  it('weight: describes the change and repeats a large jump on the button', async () => {
    const { getByText } = await render(
      <RiaWeightCardView
        data={{
          weightKg: 76,
          previousWeightKg: 72.4,
          deltaKg: 3.6,
          needsSanityConfirm: true,
          state: 'proposed',
        }}
        onConfirm={jest.fn()}
      />
    );
    expect(getByText('3.6 kg up since last entry')).toBeTruthy();
    expect(
      getByText("That's a big change from 72.4 kg. Check the number before saving.")
    ).toBeTruthy();
    expect(getByText('Save 76.0 kg')).toBeTruthy();
  });

  it('plan change: shows each change and marks unchanged targets', async () => {
    const onApply = jest.fn();
    const { getByLabelText, getByText } = await render(
      <RiaPlanChangeCardView
        data={{
          calories: 1650,
          protein: 110,
          carbs: 170,
          fat: 55,
          currentCalories: 1800,
          currentProtein: 90,
          currentCarbs: 200,
          currentFat: 55,
          reason: 'Your loss has slowed',
          state: 'proposed',
        }}
        onApply={onApply}
        onDismiss={jest.fn()}
      />
    );
    expect(getByLabelText('Calories from 1,800 to 1,650')).toBeTruthy();
    expect(getByLabelText('Fat stays 55 g')).toBeTruthy();
    await fireEvent.press(getByText('Apply new plan'));
    expect(onApply).toHaveBeenCalled();
  });

  it('day review: says how far over budget', async () => {
    const { getByText } = await render(
      <RiaDayReviewCardView
        data={{
          caloriesConsumed: 1800,
          calorieTarget: 1650,
          proteinConsumed: 80,
          proteinTarget: 90,
          carbsConsumed: 200,
          carbsTarget: 200,
          fatConsumed: 60,
          fatTarget: 55,
          win: 'Protein at breakfast',
          focus: 'Lighter dinner',
        }}
      />
    );
    expect(getByText('150 kcal over · 109% of your budget')).toBeTruthy();
  });

  it('plate: score labels by band', () => {
    expect(scoreLabel(85).label).toBe('Well balanced');
    expect(scoreLabel(60).label).toBe('Mostly balanced');
    expect(scoreLabel(59).label).toBe('Needs work');
  });
});
