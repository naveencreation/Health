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
    const { getByText, getByLabelText } = await render(
      <ScannedProductCard
        product={mockProduct}
        initialMealType="breakfast"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
        onEnterManually={mockEnterManually}
      />
    );

    expect(getByText('Greek Yogurt Plain')).toBeTruthy();
    expect(getByText('Epigamia')).toBeTruthy();
    expect(getByText('serving · 100 g')).toBeTruthy();

    expect(getByLabelText('85 calories')).toBeTruthy();
    expect(getByLabelText('Protein 6 grams')).toBeTruthy();
    expect(getByLabelText('Carbs 7.5 grams')).toBeTruthy();
    expect(getByLabelText('Fat 3.2 grams')).toBeTruthy();
  });

  it('shows one labelled serving, not 100 g (TD-H19)', async () => {
    const { getByLabelText, getByText } = await render(
      <ScannedProductCard
        product={{ ...mockProduct, servingSize: '30 g', servingSizeGrams: 30, caloriesPer100g: 500 }}
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    expect(getByLabelText('150 calories')).toBeTruthy();
    expect(getByText('serving · 30 g')).toBeTruthy();
  });

  it('updates macros and calories when portion multiplier changes', async () => {
    const { getByLabelText, getByRole } = await render(
      <ScannedProductCard
        product={mockProduct}
        initialMealType="breakfast"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    fireEvent.press(getByRole('button', { name: 'Select 2 servings' }));

    await waitFor(() => {
      expect(getByLabelText('170 calories')).toBeTruthy();
      expect(getByLabelText('Protein 12 grams')).toBeTruthy();
      expect(getByLabelText('Carbs 15 grams')).toBeTruthy();
      expect(getByLabelText('Fat 6.4 grams')).toBeTruthy();
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

    fireEvent.press(getByRole('tab', { name: 'Select Snacks' }));

    await waitFor(() => {
      expect(getByRole('button', { name: /Add to Snacks/i })).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: 'Increase portion by 0.25' }));

    await waitFor(() => {
      expect(getByText('1.25')).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: /Add to Snacks/i }));

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
      expect(getByText("We don't know this one yet")).toBeTruthy();
      expect(getByText('9999999999999')).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: 'Enter food details manually' }));

    await waitFor(() => {
      expect(mockEnterManually).toHaveBeenCalledWith('9999999999999');
    });

    fireEvent.press(getByRole('button', { name: 'Scan another barcode' }));

    await waitFor(() => {
      expect(mockScanAgain).toHaveBeenCalled();
    });
  });

  it('shows the lookup error text when the failure is not a missing product', async () => {
    const { getByText } = await render(
      <ScannedProductCard
        product={null}
        error="Request timed out while contacting Open Food Facts."
        scannedCode="123"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    expect(getByText("Couldn't look this up")).toBeTruthy();
    expect(getByText('Request timed out while contacting Open Food Facts.')).toBeTruthy();
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
    expect(getByText(/Open Food Facts has no nutrition table for this barcode/i)).toBeTruthy();
    expect(getByRole('button', { name: 'Edit nutrition from label' })).toBeTruthy();
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

    const { getByRole, getByTestId, getByLabelText } = await render(
      <ScannedProductCard
        product={estimatedProduct}
        initialMealType="lunch"
        onAddMeal={mockAddMeal}
        onScanAgain={mockScanAgain}
      />
    );

    fireEvent.press(getByRole('button', { name: 'Edit nutrition from label' }));

    await waitFor(() => {
      expect(getByTestId('input-calories')).toBeTruthy();
    });

    const calInput = getByTestId('input-calories');
    fireEvent.changeText(calInput, '35');

    await waitFor(() => {
      expect(calInput.props.value).toBe('35');
    });

    fireEvent.press(getByRole('button', { name: 'Save package values' }));

    await waitFor(() => {
      expect(getByLabelText('35 calories')).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: /Add to Lunch/i }));

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

    fireEvent.press(getByRole('button', { name: 'Close' }));

    expect(mockClose).toHaveBeenCalled();
  });

  it('shows the barcode in the product meta line', async () => {
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
