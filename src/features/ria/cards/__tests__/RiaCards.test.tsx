import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { RiaMealCardView } from '../RiaMealCardView';
import { RiaWaterCardView } from '../RiaWaterCardView';
import { RiaWeightCardView } from '../RiaWeightCardView';
import { RiaDayReviewCardView } from '../RiaDayReviewCardView';
import { RiaSuggestionCardView } from '../RiaSuggestionCardView';
import { RiaPlanChangeCardView } from '../RiaPlanChangeCardView';
import { RiaActionCard } from '../RiaActionCard';
import {
  MealCardData,
  WaterCardData,
  WeightCardData,
  DayReviewCardData,
  SuggestionCardData,
  PlanChangeCardData,
} from '@/services/ai/types/ai.types';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    impactLight: jest.fn().mockResolvedValue(undefined),
    selection: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Ria Action Cards Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RiaMealCardView', () => {
    const mockMealData: MealCardData = {
      slot: 'lunch',
      items: [
        {
          id: 'item_1',
          name: 'Paneer Bhurji',
          qty: 1,
          unit: 'katori',
          kcal: 220,
          protein: 14,
          carbs: 6,
          fat: 16,
          source: 'estimate',
        },
      ],
      state: 'proposed',
      assumption: '1 katori ~ 150g',
    };

    it('renders proposed meal card and triggers onConfirm', async () => {
      const onConfirm = jest.fn();
      const onUndo = jest.fn();

      const { getByTestId, getByText, getAllByText } = await render(
        <RiaMealCardView data={mockMealData} onConfirm={onConfirm} onUndo={onUndo} />
      );

      expect(getByText('Paneer Bhurji')).toBeTruthy();
      expect(getAllByText('220 kcal').length).toBeGreaterThanOrEqual(1);
      expect(getByText('1 katori ~ 150g')).toBeTruthy();

      const confirmBtn = getByTestId('ria-meal-card-confirm-btn');
      await act(async () => {
        fireEvent.press(confirmBtn);
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('shows duplicate warning banner when present', async () => {
      const dupData: MealCardData = {
        ...mockMealData,
        duplicateWarning: 'You logged this 4m ago. Add again?',
      };

      const { getByText } = await render(
        <RiaMealCardView data={dupData} onConfirm={jest.fn()} onUndo={jest.fn()} />
      );

      expect(getByText('You logged this 4m ago. Add again?')).toBeTruthy();
    });

    it('renders logged state with live 10s undo countdown and triggers onUndo', async () => {
      const onUndo = jest.fn();
      const loggedData: MealCardData = {
        ...mockMealData,
        state: 'logged',
        loggedAt: Date.now(),
        undoUntil: Date.now() + 10000,
        entryIds: ['item_1'],
      };

      const { getByTestId, getByText } = await render(
        <RiaMealCardView data={loggedData} onConfirm={jest.fn()} onUndo={onUndo} />
      );

      expect(getByText('Logged to Lunch')).toBeTruthy();
      expect(getByText(/Undo expires in \d+s/)).toBeTruthy();

      const undoBtn = getByTestId('ria-meal-card-undo-btn');
      await act(async () => {
        fireEvent.press(undoBtn);
      });

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('renders photo thumbnail banner when photoThumbUri is provided', async () => {
      const mealWithPhoto: MealCardData = {
        ...mockMealData,
        photoThumbUri: 'file:///local/scanned_meal.jpg',
      };

      const { getByTestId, getByText } = await render(
        <RiaMealCardView data={mealWithPhoto} onConfirm={jest.fn()} onUndo={jest.fn()} />
      );

      expect(getByTestId('ria-meal-card-photo-thumb')).toBeTruthy();
      expect(getByText('Scanned plate')).toBeTruthy();
    });
  });

  describe('RiaWaterCardView', () => {
    const mockWaterData: WaterCardData = {
      amountMl: 250,
      state: 'proposed',
    };

    it('renders proposed water card and adjusts amount with quick chips', async () => {
      const onConfirm = jest.fn();
      const onUndo = jest.fn();

      const { getByTestId, getByText } = await render(
        <RiaWaterCardView data={mockWaterData} onConfirm={onConfirm} onUndo={onUndo} />
      );

      expect(getByText('Hydration Log')).toBeTruthy();

      // Tap +500 ml chip
      const chip500 = getByText('+500 ml');
      await act(async () => {
        fireEvent.press(chip500);
      });

      const confirmBtn = getByTestId('ria-water-card-confirm-btn');
      await act(async () => {
        fireEvent.press(confirmBtn);
      });

      expect(onConfirm).toHaveBeenCalledWith(500);
    });

    it('renders logged state with 10s undo countdown and handles undo', async () => {
      const onUndo = jest.fn();
      const loggedData: WaterCardData = {
        amountMl: 350,
        state: 'logged',
        loggedAt: Date.now(),
        undoUntil: Date.now() + 10000,
      };

      const { getByTestId, getByText } = await render(
        <RiaWaterCardView data={loggedData} onConfirm={jest.fn()} onUndo={onUndo} />
      );

      expect(getByText(/Added 350 ml water/)).toBeTruthy();

      const undoBtn = getByTestId('ria-water-card-undo-btn');
      await act(async () => {
        fireEvent.press(undoBtn);
      });

      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('RiaWeightCardView', () => {
    it('renders proposed weight card with delta and triggers onConfirm', async () => {
      const onConfirm = jest.fn();
      const data: WeightCardData = {
        weightKg: 68.2,
        previousWeightKg: 68.5,
        deltaKg: -0.3,
        state: 'proposed',
      };

      const { getByTestId, getByText } = await render(
        <RiaWeightCardView data={data} onConfirm={onConfirm} />
      );

      expect(getByText('Log Weigh-In')).toBeTruthy();
      expect(getByText('68.2 kg')).toBeTruthy();
      expect(getByText(/-0.3 kg vs last entry/)).toBeTruthy();

      const confirmBtn = getByTestId('ria-weight-card-confirm-btn');
      await act(async () => {
        fireEvent.press(confirmBtn);
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('renders sanity warning banner when weight jump exceeds 3 kg', async () => {
      const data: WeightCardData = {
        weightKg: 64.0,
        previousWeightKg: 68.5,
        deltaKg: -4.5,
        needsSanityConfirm: true,
        state: 'proposed',
      };

      const { getByTestId, getByText } = await render(
        <RiaWeightCardView data={data} onConfirm={jest.fn()} />
      );

      expect(getByTestId('ria-weight-card-sanity-banner')).toBeTruthy();
      expect(getByText(/Notice: This is a 4.5 kg change/)).toBeTruthy();
    });
  });

  describe('RiaDayReviewCardView', () => {
    it('renders nutrition review with macro progress, win, and focus', async () => {
      const data: DayReviewCardData = {
        caloriesConsumed: 1650,
        calorieTarget: 2000,
        proteinConsumed: 95,
        proteinTarget: 120,
        carbsConsumed: 180,
        carbsTarget: 220,
        fatConsumed: 55,
        fatTarget: 65,
        win: 'Hit your fiber target and completed a morning walk.',
        focus: 'Plan an evening source of lean protein.',
      };

      const { getByText } = await render(<RiaDayReviewCardView data={data} />);

      expect(getByText('Day in Review')).toBeTruthy();
      expect(getByText('1650 / 2000 kcal')).toBeTruthy();
      expect(getByText('Hit your fiber target and completed a morning walk.')).toBeTruthy();
      expect(getByText('Plan an evening source of lean protein.')).toBeTruthy();
    });
  });

  describe('RiaSuggestionCardView', () => {
    it('renders meal options and handles onLogOption', async () => {
      const onLogOption = jest.fn();
      const data: SuggestionCardData = {
        options: [
          {
            name: 'Moong Dal Chilla',
            kcal: 210,
            protein: 12,
            carbs: 28,
            fat: 4,
            portion: '2 pieces',
            tag: 'High Protein',
          },
        ],
      };

      const { getByTestId, getByText } = await render(
        <RiaSuggestionCardView data={data} onLogOption={onLogOption} />
      );

      expect(getByText('Suggested Options')).toBeTruthy();
      expect(getByText('Moong Dal Chilla')).toBeTruthy();
      expect(getByText('High Protein')).toBeTruthy();

      const logBtn = getByTestId('ria-suggestion-card-log-btn-0');
      await act(async () => {
        fireEvent.press(logBtn);
      });

      expect(onLogOption).toHaveBeenCalledWith(data.options[0]);
    });
  });

  describe('RiaPlanChangeCardView', () => {
    it('renders proposed plan change with deltas and triggers onApply', async () => {
      const onApply = jest.fn();
      const data: PlanChangeCardData = {
        calories: 1850,
        protein: 110,
        carbs: 210,
        fat: 60,
        currentCalories: 2000,
        currentProtein: 100,
        currentCarbs: 230,
        currentFat: 65,
        reason: 'Adjusting for steady fat loss rate',
        state: 'proposed',
      };

      const { getByTestId, getByText } = await render(
        <RiaPlanChangeCardView data={data} onApply={onApply} />
      );

      expect(getByText('Adjust Plan')).toBeTruthy();
      expect(getByText('1850 kcal')).toBeTruthy();
      expect(getByText('"Adjusting for steady fat loss rate"')).toBeTruthy();

      const applyBtn = getByTestId('ria-plan-change-card-apply-btn');
      await act(async () => {
        fireEvent.press(applyBtn);
      });

      expect(onApply).toHaveBeenCalledTimes(1);
    });
  });

  describe('RiaActionCard Root Router', () => {
    it('correctly routes to specialized view based on card.type', async () => {
      const mealCard = {
        type: 'meal' as const,
        data: {
          slot: 'dinner' as const,
          items: [{ name: 'Soup', qty: 1, unit: 'bowl', kcal: 120, protein: 4, carbs: 18, fat: 2, source: 'catalog' as const }],
          state: 'proposed' as const,
        },
      };

      const { getByTestId, getByText } = await render(
        <RiaActionCard card={mealCard} messageId="msg_1" onConfirmMeal={jest.fn()} />
      );

      expect(getByTestId('ria-action-card-meal')).toBeTruthy();
      expect(getByText('Soup')).toBeTruthy();
    });
  });
});
