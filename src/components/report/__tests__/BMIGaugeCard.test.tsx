import React from 'react';
import { render } from '@testing-library/react-native';
import { BMIGaugeCard, getBMICategory, BMI_CATEGORIES } from '../BMIGaugeCard';

describe('BMIGaugeCard', () => {
  describe('WHO Category Classification helper', () => {
    test('classifies very severely underweight (< 16.0)', () => {
      const cat = getBMICategory(15.2);
      expect(cat.id).toBe('very_severely_underweight');
      expect(cat.name).toBe('Very severely underweight');
    });

    test('classifies severely underweight (16.0 - 16.9)', () => {
      const cat = getBMICategory(16.5);
      expect(cat.id).toBe('severely_underweight');
    });

    test('classifies underweight (17.0 - 18.4)', () => {
      const cat = getBMICategory(17.8);
      expect(cat.id).toBe('underweight');
    });

    test('classifies normal (18.5 - 24.9)', () => {
      const cat = getBMICategory(22.9);
      expect(cat.id).toBe('normal');
      expect(cat.name).toBe('Normal');
    });

    test('classifies overweight (25.0 - 29.9)', () => {
      const cat = getBMICategory(27.4);
      expect(cat.id).toBe('overweight');
    });

    test('classifies Obese Class I (30.0 - 34.9)', () => {
      const cat = getBMICategory(32.1);
      expect(cat.id).toBe('obese_1');
    });

    test('classifies Obese Class II (35.0 - 39.9)', () => {
      const cat = getBMICategory(37.5);
      expect(cat.id).toBe('obese_2');
    });

    test('classifies Obese Class III (>= 40.0)', () => {
      const cat = getBMICategory(42.0);
      expect(cat.id).toBe('obese_3');
    });
  });

  describe('Component Rendering', () => {
    test('renders normal BMI state (22.9) with header, central readout, and categories', async () => {
      // 72.5 kg at 178 cm => 72.5 / (1.78^2) = 22.88 => 22.9
      const { getByText, getAllByText } = await render(
        <BMIGaugeCard weightKg={72.5} heightCm={178} />
      );

      // Header title and central label both display "BMI (kg/m2)"
      const bmiLabels = getAllByText('BMI (kg/m2)');
      expect(bmiLabels.length).toBeGreaterThanOrEqual(2);

      // Status pill and category row both display Normal
      const normalElements = getAllByText('Normal');
      expect(normalElements.length).toBe(2);

      // Central numeric readout displays 22.9
      expect(getByText('22.9')).toBeTruthy();

      // All 8 categories are rendered in the classification table
      BMI_CATEGORIES.forEach((cat) => {
        expect(getByText(cat.rangeLabel)).toBeTruthy();
      });
    });

    test('handles fallback when weightKg is missing or null without crashing', async () => {
      const { getByText, getAllByText } = await render(
        <BMIGaugeCard weightKg={null} heightCm={178} />
      );

      const normalElements = getAllByText('Normal');
      expect(normalElements.length).toBe(2);
      expect(getByText('22.9')).toBeTruthy();
    });

    test('renders overweight status correctly when weight reflects BMI >= 25', async () => {
      // 85 kg at 175 cm => 85 / (1.75^2) = 27.76 => 27.8
      const { getByText, getAllByText } = await render(
        <BMIGaugeCard weightKg={85} heightCm={175} />
      );

      const overweightElements = getAllByText('Overweight');
      expect(overweightElements.length).toBe(2);
      expect(getByText('27.8')).toBeTruthy();
      expect(getByText('BMI 25.0 - 29.9')).toBeTruthy();
    });
  });
});
