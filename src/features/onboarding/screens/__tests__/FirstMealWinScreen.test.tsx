import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  FirstMealWinScreen,
  portionWords,
  portionCaption,
  scaleAmount,
  formatClock,
  slotRiaLine,
  loggedSummary,
} from '../FirstMealWinScreen';
import { DEMO_A11Y_LABEL } from '../../components/FirstMealDemo';
import { getStarterFoods } from '../../data/starterFoods';
import { INITIAL_FOOD_DATABASE } from '@/data/foodDatabase';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
  },
}));

const Reanimated = jest.requireMock('react-native-reanimated');

describe('FirstMealWinScreen helpers', () => {
  it('describes portions in words', () => {
    expect(portionWords(0.5, 'plate')).toBe('half a plate');
    expect(portionWords(1, 'plate')).toBe('1 plate');
    expect(portionWords(1.5, 'plate')).toBe('1½ plates');
    expect(portionWords(2, 'dish')).toBe('2 dishes');
    expect(portionCaption(0.5, 'bowl')).toBe('half');
    expect(portionCaption(2, 'bowl')).toBe('bowls');
    expect(portionWords(1.5, 'katori (150g)')).toBe('1½ katoris (150g)');
    expect(portionWords(2, 'tbsp (15g)')).toBe('2 tbsp (15g)');
    expect(portionCaption(2, 'katori (150g)')).toBe('katoris');
    expect(portionCaption(1, 'plate (250g)')).toBe('plate');
  });

  it('scales amounts to one decimal', () => {
    expect(scaleAmount(13, 1.5)).toBe(19.5);
    expect(scaleAmount(52, 1.5)).toBe(78);
    expect(scaleAmount(7, 0.5)).toBe(3.5);
  });

  it('formats the clock and the Ria slot line', () => {
    expect(formatClock(new Date(2026, 0, 1, 13, 5))).toBe('1:05 pm');
    expect(formatClock(new Date(2026, 0, 1, 0, 30))).toBe('12:30 am');
    const now = new Date(2026, 0, 1, 13, 5);
    expect(slotRiaLine(now, 'lunch', 'lunch')).toBe(
      'It’s 1:05 pm, so I’ve put this under lunch. Tap another meal if it wasn’t.'
    );
    expect(slotRiaLine(now, 'lunch', 'dinner')).toBe('Got it, dinner.');
  });

  it('summarises the logged meal against the budget', () => {
    expect(loggedSummary(510, 1307)).toEqual({
      pct: 39,
      barFraction: 510 / 1307,
      left: 797,
      over: 0,
    });
    expect(loggedSummary(2000, 1500)).toMatchObject({ barFraction: 1, left: 0, over: 500 });
    expect(loggedSummary(300, 0)).toMatchObject({ pct: 0, barFraction: 0 });
  });
});

describe('FirstMealWinScreen', () => {
  const props = {
    name: 'Alex',
    foodStyle: 'vegetarian' as const,
    dailyCalorieBudget: 1307,
    onBack: jest.fn(),
    onContinue: jest.fn(),
    onSkip: jest.fn(),
  };
  const starters = getStarterFoods('vegetarian');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 1, 13, 5)); // lunch time
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows the demo and starter rows with nothing preselected and Continue disabled', async () => {
    const { getByText, getByTestId } = await render(<FirstMealWinScreen {...props} />);
    expect(getByText('Here’s how logging works, Alex')).toBeTruthy();
    expect(getByTestId('first-meal-demo').props.accessibilityLabel).toBe(DEMO_A11Y_LABEL);
    starters.forEach(f => {
      expect(getByTestId(`starter-row-${f.id}`).props.accessibilityState.selected).toBe(false);
    });
    expect(getByTestId('btn-first-meal-continue').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(getByTestId('btn-first-meal-continue'));
    expect(getByText('Here’s how logging works, Alex')).toBeTruthy();
  });

  it('keeps the demo running without crashing and toggles pause on tap', async () => {
    const { getByTestId } = await render(<FirstMealWinScreen {...props} />);
    const demo = () => getByTestId('first-meal-demo');
    expect(demo().props.accessibilityHint).toBe('Double tap to pause.');
    await act(async () => {
      jest.advanceTimersByTime(7000);
    });
    await fireEvent.press(demo());
    expect(demo().props.accessibilityHint).toBe('Paused. Double tap to play.');
    await fireEvent.press(demo());
    expect(demo().props.accessibilityHint).toBe('Double tap to pause.');
  });

  it('does not autoplay under reduced motion and advances on tap', async () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const { getByTestId } = await render(<FirstMealWinScreen {...props} />);
    const demo = getByTestId('first-meal-demo');
    expect(demo.props.accessibilityHint).toBe('Double tap to show the next step.');
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(timeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 3000);
    await fireEvent.press(demo);
    expect(getByTestId('first-meal-demo')).toBeTruthy();
  });

  it('logs a starter meal end to end with the time-based default slot', async () => {
    const food = starters[0];
    const { getByTestId, getByText, queryByTestId } = await render(
      <FirstMealWinScreen {...props} />
    );

    await fireEvent.press(getByTestId(`starter-row-${food.id}`));
    expect(getByTestId(`starter-row-${food.id}`).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(getByTestId('btn-first-meal-continue'));

    expect(getByText('How much did you have?')).toBeTruthy();
    expect(getByTestId('slot-lunch').props.accessibilityState.selected).toBe(true);
    expect(getByText(/It’s 1:05 pm, so I’ve put this under lunch/)).toBeTruthy();
    expect(getByTestId('meal-kcal').props.children).toBe(food.calories);

    await fireEvent.press(getByTestId('portion-1.5'));
    expect(getByTestId('meal-kcal').props.children).toBe(Math.round(food.calories * 1.5));

    await fireEvent.press(getByTestId('btn-log-meal'));
    expect(getByText('Logged, Alex')).toBeTruthy();
    expect(getByText(`${food.name}, 1½ plates, for lunch.`)).toBeTruthy();
    expect(queryByTestId('btn-skip-first-meal')).toBeNull();

    await fireEvent.press(getByTestId('btn-save-plan'));
    expect(props.onContinue).toHaveBeenCalledTimes(1);
    const meal = props.onContinue.mock.calls[0][0];
    expect(meal).toMatchObject({
      foodName: food.name,
      calories: Math.round(food.calories * 1.5),
      proteinG: scaleAmount(food.proteinG, 1.5),
      carbsG: scaleAmount(food.carbsG, 1.5),
      fatG: scaleAmount(food.fatG, 1.5),
      portionMultiplier: 1.5,
      mealSlot: 'lunch',
    });
    expect(meal.photoUri).toBeUndefined();
    expect(typeof meal.loggedAt).toBe('number');
  });

  it('passes a changed slot through to onContinue', async () => {
    const { getByTestId, getByText } = await render(<FirstMealWinScreen {...props} />);
    await fireEvent.press(getByTestId(`starter-row-${starters[1].id}`));
    await fireEvent.press(getByTestId('btn-first-meal-continue'));
    await fireEvent.press(getByTestId('slot-dinner'));
    expect(getByText('Got it, dinner.')).toBeTruthy();
    await fireEvent.press(getByTestId('btn-log-meal'));
    await fireEvent.press(getByTestId('btn-save-plan'));
    expect(props.onContinue.mock.calls[0][0].mealSlot).toBe('dinner');
  });

  it('back goes logged to review to select, then calls onBack', async () => {
    const { getByTestId, getByText, getByLabelText } = await render(
      <FirstMealWinScreen {...props} />
    );
    await fireEvent.press(getByTestId(`starter-row-${starters[0].id}`));
    await fireEvent.press(getByTestId('btn-first-meal-continue'));
    await fireEvent.press(getByTestId('btn-log-meal'));
    await fireEvent.press(getByLabelText(/back/i));
    expect(getByText('How much did you have?')).toBeTruthy();
    await fireEvent.press(getByLabelText(/back/i));
    expect(getByText('Here’s how logging works, Alex')).toBeTruthy();
    await fireEvent.press(getByLabelText(/back/i));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('skip calls onSkip', async () => {
    const { getByTestId } = await render(<FirstMealWinScreen {...props} />);
    await fireEvent.press(getByTestId('btn-skip-first-meal'));
    expect(props.onSkip).toHaveBeenCalledTimes(1);
  });

  it('searches the food database and selects a result', async () => {
    const { getByTestId, getByText } = await render(<FirstMealWinScreen {...props} />);
    const target = INITIAL_FOOD_DATABASE.find(f => f.name.toLowerCase().includes('dal'))!;
    await fireEvent.changeText(getByTestId('search-food-input'), 'dal');
    await fireEvent.press(getByTestId(`search-result-${target.id}`));
    expect(getByTestId(`starter-row-${target.id}`).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(getByTestId('btn-first-meal-continue'));
    expect(getByText(target.name)).toBeTruthy();
  });

  it('omits the name when none is given', async () => {
    const { getByText } = await render(<FirstMealWinScreen {...props} name={undefined} />);
    expect(getByText('Here’s how logging works')).toBeTruthy();
  });
});
