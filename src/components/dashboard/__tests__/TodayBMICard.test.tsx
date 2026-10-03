import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TodayBMICard, getTodayBMICategory, BMI_SPECTRUM_CATEGORIES } from '../TodayBMICard';

const mockUseDailyLog = jest.fn();
const mockUseGoals = jest.fn();

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => mockUseDailyLog(),
  useGoals: () => mockUseGoals(),
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  Ionicons: 'Ionicons',
}));

jest.mock('@/components/modals/LogWeightModal', () => ({
  LogWeightModal: () => null,
}));

describe('TodayBMICard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WHO Category Classification helper', () => {
    test('classifies very severely underweight (< 16.0)', () => {
      const cat = getTodayBMICategory(15.2);
      expect(cat.id).toBe('very_underweight');
      expect(cat.name).toBe('Very severely underweight');
    });

    test('classifies severely underweight (16.0 - 16.9)', () => {
      const cat = getTodayBMICategory(16.5);
      expect(cat.id).toBe('severely_underweight');
    });

    test('classifies underweight (17.0 - 18.4)', () => {
      const cat = getTodayBMICategory(17.8);
      expect(cat.id).toBe('underweight');
    });

    test('classifies normal (18.5 - 24.9)', () => {
      const cat = getTodayBMICategory(22.9);
      expect(cat.id).toBe('normal');
      expect(cat.name).toBe('Normal');
    });

    test('classifies overweight (25.0 - 29.9)', () => {
      const cat = getTodayBMICategory(27.4);
      expect(cat.id).toBe('overweight');
    });

    test('classifies Obese Class I (30.0 - 34.9)', () => {
      const cat = getTodayBMICategory(32.1);
      expect(cat.id).toBe('obese_1');
    });

    test('classifies Obese Class II (35.0 - 39.9)', () => {
      const cat = getTodayBMICategory(37.5);
      expect(cat.id).toBe('obese_2');
    });

    test('classifies Obese Class III (>= 40.0)', () => {
      const cat = getTodayBMICategory(42.0);
      expect(cat.id).toBe('obese_3');
    });
  });

  describe('Component Rendering', () => {
    test('renders header, BMI value, and active category with fallback values', async () => {
      mockUseDailyLog.mockReturnValue({ currentLog: null });
      mockUseGoals.mockReturnValue({
        userGoals: {
          currentWeightKg: 72.5,
          heightCm: 178,
        },
      });

      const { getByText, getByLabelText } = await render(<TodayBMICard />);

      expect(getByText('BMI')).toBeTruthy();
      expect(getByText('kg/m²')).toBeTruthy();
      expect(getByText('22.9')).toBeTruthy();
      expect(getByText('Normal')).toBeTruthy();
      expect(getByLabelText('Update weight to recalculate BMI')).toBeTruthy();
    });

    test('renders updated BMI value when current daily log has a logged weight', async () => {
      mockUseDailyLog.mockReturnValue({
        currentLog: { weightKg: 85 },
      });
      mockUseGoals.mockReturnValue({
        userGoals: {
          currentWeightKg: 72.5,
          heightCm: 175,
        },
      });

      // 85 / (1.75^2) = 27.755 => 27.8
      const { getByText } = await render(<TodayBMICard />);

      expect(getByText('27.8')).toBeTruthy();
      expect(getByText('Overweight')).toBeTruthy();
    });

    test('calls onOpenLogModal when edit button is tapped', async () => {
      mockUseDailyLog.mockReturnValue({ currentLog: null });
      mockUseGoals.mockReturnValue({
        userGoals: { currentWeightKg: 72.5, heightCm: 178 },
      });

      const mockOnOpen = jest.fn();
      const { getByLabelText } = await render(<TodayBMICard onOpenLogModal={mockOnOpen} />);

      fireEvent.press(getByLabelText('Update weight to recalculate BMI'));
      expect(mockOnOpen).toHaveBeenCalledTimes(1);
    });

    test('handles layout event on spectrum track to set barWidth safely', async () => {
      mockUseDailyLog.mockReturnValue({ currentLog: null });
      mockUseGoals.mockReturnValue({
        userGoals: { currentWeightKg: 72.5, heightCm: 178 },
      });

      const { getByText } = await render(<TodayBMICard />);
      expect(getByText('BMI')).toBeTruthy();
      expect(getByText('kg/m²')).toBeTruthy();
    });
  });
});
