import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ScannedProductCard } from '../ScannedProductCard';
import { NormalizedFoodItem } from '@/types/barcode';

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    impactHeavy: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    warning: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => <View testID="mock-expo-image" {...props} />,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('ScannedProductCard', () => {
  const mockProduct: NormalizedFoodItem = {
    id: '8901030383748',
    name: 'Greek Yogurt Plain',
    brand: 'Epigamia',
    servingSize: '100 g',
    caloriesPer100g: 85,
    proteinGrams: 6,
    carbsGrams: 7.5,
    fatGrams: 3.2,
    fiberGrams: 1.2,
    source: 'barcode',
  };

  const mockAddMeal = jest.fn();
  const mockScanAgain = jest.fn();
  const mockEnterManually = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product details and macros accurately', async () => {
    const { getByText } = await render(
      <ScannedProductCard
        product={mockProduct}
        initialMealType="breakfast"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
        onEnterManually={mockEnterManually}
      />
    );

    // Product identity
    expect(getByText('Greek Yogurt Plain')).toBeTruthy();
    expect(getByText('EPIGAMIA')).toBeTruthy();
    expect(getByText('100 g')).toBeTruthy();

    // 4 Bento Macro Cells
    expect(getByText('85')).toBeTruthy(); // Calories
    expect(getByText('6')).toBeTruthy(); // Protein
    expect(getByText('7.5')).toBeTruthy(); // Carbs
    expect(getByText('3.2')).toBeTruthy(); // Fat
  });

  it('updates macros and calories when portion multiplier changes', async () => {
    const { getByText, getByRole } = await render(
      <ScannedProductCard
        product={mockProduct}
        initialMealType="breakfast"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    const preset2x = getByRole('button', { name: 'Set portion to 2 times' });
    fireEvent.press(preset2x);

    await waitFor(() => {
      expect(getByText('170')).toBeTruthy();
      expect(getByText('12')).toBeTruthy();
      expect(getByText('15')).toBeTruthy();
      expect(getByText('6.4')).toBeTruthy();
    });
  });

  it('triggers onAddMeal with selected meal type, product, and multiplier', async () => {
    const { getByText, getByRole } = await render(
      <ScannedProductCard
        product={mockProduct}
        initialMealType="lunch"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    const snacksTab = getByRole('button', { name: 'Select Snacks' });
    fireEvent.press(snacksTab);

    await waitFor(() => {
      expect(getByRole('button', { name: /Add to Snacks/i })).toBeTruthy();
    });

    const addPortionBtn = getByRole('button', { name: 'Increase portion' });
    fireEvent.press(addPortionBtn);

    await waitFor(() => {
      expect(getByText('1.25x')).toBeTruthy();
    });

    const addBtn = getByRole('button', { name: /Add to Snacks/i });
    fireEvent.press(addBtn);

    await waitFor(() => {
      expect(mockAddMeal).toHaveBeenCalledWith('snacks', mockProduct, 1.25);
    });
  });

  it('renders not found error state with manual entry option', async () => {
    const { getByText, getByRole } = await render(
      <ScannedProductCard
        product={null}
        error="Product not found in Open Food Facts database."
        scannedCode="9999999999999"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
        onEnterManually={mockEnterManually}
      />
    );

    await waitFor(() => {
      expect(getByText('Packaged Item Not Found')).toBeTruthy();
      expect(getByText('9999999999999')).toBeTruthy();
    });

    const manualBtn = getByRole('button', { name: 'Enter food details manually' });
    fireEvent.press(manualBtn);

    await waitFor(() => {
      expect(mockEnterManually).toHaveBeenCalledWith('9999999999999');
    });

    const scanAgainBtn = getByRole('button', { name: 'Scan another barcode' });
    fireEvent.press(scanAgainBtn);

    await waitFor(() => {
      expect(mockScanAgain).toHaveBeenCalled();
    });
  });

  it('renders estimated banner when product has isEstimated true', async () => {
    const estimatedProduct: NormalizedFoodItem = {
      ...mockProduct,
      isEstimated: true,
      estimatedCategory: 'Buttermilk',
      caloriesPer100g: 28,
      proteinGrams: 1.8,
      carbsGrams: 2.5,
      fatGrams: 1.2,
    };

    const { getByText, getByRole } = await render(
      <ScannedProductCard
        product={estimatedProduct}
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    expect(getByText(/Estimated from Buttermilk/i)).toBeTruthy();
    expect(getByText(/Open Food Facts lacks nutrition table for this barcode/i)).toBeTruthy();
    expect(getByRole('button', { name: 'Adjust macros from packaging' })).toBeTruthy();
  });

  it('allows editing packaging values and applies overridden macros to onAddMeal', async () => {
    const estimatedProduct: NormalizedFoodItem = {
      ...mockProduct,
      isEstimated: true,
      estimatedCategory: 'Buttermilk',
      caloriesPer100g: 28,
      proteinGrams: 1.8,
      carbsGrams: 2.5,
      fatGrams: 1.2,
    };

    const { getByRole, getByTestId, getByText } = await render(
      <ScannedProductCard
        product={estimatedProduct}
        initialMealType="lunch"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    // Open inline editor
    const adjustBtn = getByRole('button', { name: 'Adjust macros from packaging' });
    fireEvent.press(adjustBtn);

    await waitFor(() => {
      expect(getByTestId('input-calories')).toBeTruthy();
    });

    // Change calories to 35, protein to 2.2
    const calInput = getByTestId('input-calories');
    fireEvent.changeText(calInput, '35');

    await waitFor(() => {
      expect(calInput.props.value).toBe('35');
    });

    // Save package values
    const saveBtn = getByRole('button', { name: 'Save package values' });
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(getByText('35')).toBeTruthy();
    });

    // Add meal with updated packaging macros
    const addBtn = getByRole('button', { name: /Add to Lunch/i });
    fireEvent.press(addBtn);

    await waitFor(() => {
      expect(mockAddMeal).toHaveBeenCalledWith(
        'lunch',
        expect.objectContaining({
          caloriesPer100g: 35,
          isEstimated: false,
        }),
        1.0
      );
    });
  });

  it('triggers onClose when close button is pressed on the top navigation bar', async () => {
    const mockClose = jest.fn();
    const { getByRole } = await render(
      <ScannedProductCard
        product={mockProduct}
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
        onClose={mockClose}
      />
    );

    const closeBtn = getByRole('button', { name: 'Close' });
    fireEvent.press(closeBtn);

    expect(mockClose).toHaveBeenCalled();
  });

  it('renders verified barcode pill in hero card meta', async () => {
    const { getByText } = await render(
      <ScannedProductCard
        product={mockProduct}
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    expect(getByText('8901030383748')).toBeTruthy();
  });
});
