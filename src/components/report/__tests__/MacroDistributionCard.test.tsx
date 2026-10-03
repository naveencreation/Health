import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  MacroDistributionCard,
  DayMacroRatioData,
  formatMacroValue,
} from '../MacroDistributionCard';

describe('MacroDistributionCard', () => {
  const sampleDays: DayMacroRatioData[] = [
    { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', proteinGrams: 130, carbsGrams: 210, fatGrams: 60, fiberGrams: 28 },
    { dateStr: '2026-09-17', dayNum: 17, dayName: 'T', proteinGrams: 145, carbsGrams: 190, fatGrams: 55, fiberGrams: 32 },
    { dateStr: '2026-09-18', dayNum: 18, dayName: 'W', proteinGrams: 120, carbsGrams: 240, fatGrams: 70, fiberGrams: 25 },
    { dateStr: '2026-09-19', dayNum: 19, dayName: 'T', proteinGrams: 150, carbsGrams: 220, fatGrams: 62, fiberGrams: 30 },
    { dateStr: '2026-09-20', dayNum: 20, dayName: 'F', proteinGrams: 160, carbsGrams: 200, fatGrams: 68, fiberGrams: 35 },
    { dateStr: '2026-09-21', dayNum: 21, dayName: 'S', proteinGrams: 135, carbsGrams: 230, fatGrams: 58, fiberGrams: 26 },
    { dateStr: '2026-09-22', dayNum: 22, dayName: 'S', proteinGrams: 140, carbsGrams: 215, fatGrams: 64, fiberGrams: 29 },
  ];

  test('renders title, legend items, and day numbers 16-22', async () => {
    const handleSelectDay = jest.fn();
    const { getByText } = await render(
      <MacroDistributionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
        targets={{ protein: 140, carbs: 220, fat: 65, fiber: 30 }}
      />
    );

    // Title
    expect(getByText('Nutrition (g)')).toBeTruthy();

    // Default dropdown button label
    expect(getByText('Protein')).toBeTruthy();

    // Legends
    expect(getByText('Selected')).toBeTruthy();
    expect(getByText('Protein Goal (140g)')).toBeTruthy();

    // Day numbers
    expect(getByText('16')).toBeTruthy();
    expect(getByText('17')).toBeTruthy();
    expect(getByText('18')).toBeTruthy();
    expect(getByText('19')).toBeTruthy();
    expect(getByText('20')).toBeTruthy();
    expect(getByText('21')).toBeTruthy();
    expect(getByText('22')).toBeTruthy();
  });

  test('calls onSelectDay when pressing an X-axis day button', async () => {
    const handleSelectDay = jest.fn();
    const { getByText } = await render(
      <MacroDistributionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={handleSelectDay}
        targets={{ protein: 140, carbs: 220, fat: 65, fiber: 30 }}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('19'));
    });
    expect(handleSelectDay).toHaveBeenCalledWith(3);
  });

  test('switches macro using the dropdown menu', async () => {
    const { getByText, getByLabelText } = await render(
      <MacroDistributionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={jest.fn()}
        targets={{ protein: 140, carbs: 220, fat: 65, fiber: 30 }}
      />
    );

    // Open dropdown modal
    const dropdownTrigger = getByLabelText(/Select Macronutrient/i);
    await act(async () => {
      fireEvent.press(dropdownTrigger);
    });

    // Select Carbs
    const carbsOption = getByLabelText('Select Carbs');
    await act(async () => {
      fireEvent.press(carbsOption);
    });

    // Verify legend changed to Carbs Goal
    expect(getByText('Carbs Goal (220g)')).toBeTruthy();
  });

  test('switches between bar and line chart modes using toggle button', async () => {
    const { getByLabelText } = await render(
      <MacroDistributionCard
        days={sampleDays}
        selectedIndex={1}
        onSelectDay={jest.fn()}
        targets={{ protein: 140, carbs: 220, fat: 65, fiber: 30 }}
      />
    );

    const lineBtn = getByLabelText('Show Line Chart view');
    expect(lineBtn).toBeTruthy();
    await act(async () => {
      fireEvent.press(lineBtn);
    });

    const barBtn = getByLabelText('Show Bar Chart view');
    expect(barBtn).toBeTruthy();
    await act(async () => {
      fireEvent.press(barBtn);
    });
  });

  test('displays empty banner when all days have 0g for selected macro', async () => {
    const emptyDays: DayMacroRatioData[] = [
      { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 },
      { dateStr: '2026-09-17', dayNum: 17, dayName: 'T', proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 },
    ];

    const { getByText } = await render(
      <MacroDistributionCard
        days={emptyDays}
        selectedIndex={0}
        onSelectDay={jest.fn()}
        targets={{ protein: 140, carbs: 220, fat: 65, fiber: 30 }}
      />
    );

    expect(getByText(/No protein logged for this period yet/i)).toBeTruthy();
  });

  describe('formatMacroValue', () => {
    test('formats whole numbers without unnecessary decimal digits', () => {
      expect(formatMacroValue(0)).toBe('0');
      expect(formatMacroValue(140)).toBe('140');
      expect(formatMacroValue(65)).toBe('65');
    });

    test('ensures at most one digit after the decimal point', () => {
      expect(formatMacroValue(24.7)).toBe('24.7');
      expect(formatMacroValue(24.6666667)).toBe('24.7');
      expect(formatMacroValue(12.34)).toBe('12.3');
      expect(formatMacroValue(12.35)).toBe('12.4');
      expect(formatMacroValue(0.8000000000000002)).toBe('0.8');
    });

    test('handles fallback for invalid or NaN inputs', () => {
      expect(formatMacroValue(NaN)).toBe('0');
      expect(formatMacroValue(undefined as any)).toBe('0');
    });
  });

  test('renders decimal macro values accurately in the teardrop pin tooltip', async () => {
    const decimalDays: DayMacroRatioData[] = [
      { dateStr: '2026-09-16', dayNum: 16, dayName: 'M', proteinGrams: 28.74, carbsGrams: 110.36, fatGrams: 42.19, fiberGrams: 15.62 },
    ];

    const { getByText } = await render(
      <MacroDistributionCard
        days={decimalDays}
        selectedIndex={0}
        onSelectDay={jest.fn()}
        targets={{ protein: 140, carbs: 220, fat: 65, fiber: 30 }}
        defaultMacro="protein"
      />
    );

    // 28.74 rounds to 28.7 (exactly one digit after decimal point)
    expect(getByText('28.7')).toBeTruthy();
  });
});

