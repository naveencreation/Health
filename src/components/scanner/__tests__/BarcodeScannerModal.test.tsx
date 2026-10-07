import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BarcodeScannerModal } from '../BarcodeScannerModal';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useDailyLog } from '@/context/HealthContext';
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

// Mock expo-camera
jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  return {
    CameraView: (props: any) => <View testID="mock-camera-view" {...props} />,
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

// Mock HealthContext
jest.mock('@/context/HealthContext', () => ({
  useDailyLog: jest.fn(),
}));

// Mock useBarcodeScanner hook
jest.mock('@/hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: jest.fn(),
}));

describe('BarcodeScannerModal', () => {
  const mockAddMealItem = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnMealLogged = jest.fn();
  const mockOnEnterManually = jest.fn();
  const mockScanAgain = jest.fn();
  const mockReset = jest.fn();
  const mockToggleTorch = jest.fn();
  const mockRequestPermission = jest.fn();

  const mockProduct: NormalizedFoodItem = {
    id: '8901030383748',
    name: 'Greek Yogurt Plain',
    brand: 'Epigamia',
    servingSize: '100 g',
    servingSizeGrams: 100,
    caloriesPer100g: 85,
    proteinGrams: 6,
    carbsGrams: 7.5,
    fatGrams: 3.2,
    source: 'barcode',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useDailyLog as jest.Mock).mockReturnValue({
      addMealItem: mockAddMealItem,
    });

    (useBarcodeScanner as jest.Mock).mockReturnValue({
      permission: { granted: true },
      requestPermission: mockRequestPermission,
      isScanningLocked: false,
      isLoading: false,
      scannedProduct: null,
      scanError: null,
      scannedCode: null,
      isTorchOn: false,
      toggleTorch: mockToggleTorch,
      handleBarcodeScanned: jest.fn(),
      scanAgain: mockScanAgain,
      reset: mockReset,
    });
  });

  it('renders permission required state when camera permission is not granted', async () => {
    (useBarcodeScanner as jest.Mock).mockReturnValue({
      permission: { granted: false },
      requestPermission: mockRequestPermission,
      isScanningLocked: false,
      isLoading: false,
      scannedProduct: null,
      scanError: null,
      scannedCode: null,
      isTorchOn: false,
      toggleTorch: mockToggleTorch,
      handleBarcodeScanned: jest.fn(),
      scanAgain: mockScanAgain,
      reset: mockReset,
    });

    const { getByText, getByRole } = await render(
      <BarcodeScannerModal visible={true} onClose={mockOnClose} />
    );

    expect(getByText('Camera Access Required')).toBeTruthy();
    expect(getByRole('button', { name: 'Grant camera permission' })).toBeTruthy();

    const grantBtn = getByRole('button', { name: 'Grant camera permission' });
    fireEvent.press(grantBtn);
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('renders live camera viewfinder when permission is granted and no item is scanned', async () => {
    const { getByTestId, getByText, getByRole } = await render(
      <BarcodeScannerModal visible={true} onClose={mockOnClose} />
    );

    expect(getByTestId('mock-camera-view')).toBeTruthy();
    expect(getByText('Scan Barcode')).toBeTruthy();
    expect(getByText('Align barcode inside the frame')).toBeTruthy();

    const closeBtn = getByRole('button', { name: 'Close scanner' });
    fireEvent.press(closeBtn);
    expect(mockReset).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('toggles torch when torch button is pressed', async () => {
    const { getByRole } = await render(
      <BarcodeScannerModal visible={true} onClose={mockOnClose} />
    );

    const torchBtn = getByRole('button', { name: 'Turn torch on' });
    fireEvent.press(torchBtn);
    expect(mockToggleTorch).toHaveBeenCalled();
  });

  it('switches to dedicated full-screen food logging card when a product is detected', async () => {
    (useBarcodeScanner as jest.Mock).mockReturnValue({
      permission: { granted: true },
      requestPermission: mockRequestPermission,
      isScanningLocked: true,
      isLoading: false,
      scannedProduct: mockProduct,
      scanError: null,
      scannedCode: '8901030383748',
      isTorchOn: false,
      toggleTorch: mockToggleTorch,
      handleBarcodeScanned: jest.fn(),
      scanAgain: mockScanAgain,
      reset: mockReset,
    });

    const { getByText, queryByText, getByRole } = await render(
      <BarcodeScannerModal
        visible={true}
        onClose={mockOnClose}
        initialMealType="breakfast"
        onMealLogged={mockOnMealLogged}
      />
    );

    // Viewfinder overlay text should NOT be present on full-screen logging card
    expect(queryByText('Align barcode inside the frame')).toBeNull();

    // Dedicated Full-Screen Header and Content
    expect(getByText('Log Scanned Item')).toBeTruthy();
    expect(getByText('Greek Yogurt Plain')).toBeTruthy();
    expect(getByText('EPIGAMIA')).toBeTruthy();
    expect(getByText('Assign to meal')).toBeTruthy();
    expect(getByText('Portion Size')).toBeTruthy();

    // Log the meal
    const logButton = getByRole('button', { name: /Add to Breakfast/i });
    fireEvent.press(logButton);

    await waitFor(() => {
      expect(mockAddMealItem).toHaveBeenCalledWith(
        'breakfast',
        expect.objectContaining({
          name: 'Greek Yogurt Plain (Epigamia)',
          calories: 85,
        }),
        1
      );
      expect(mockOnMealLogged).toHaveBeenCalledWith(
        'breakfast',
        'Greek Yogurt Plain (Epigamia)',
        85
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('returns to camera when back button is pressed on the full-screen card', async () => {
    (useBarcodeScanner as jest.Mock).mockReturnValue({
      permission: { granted: true },
      requestPermission: mockRequestPermission,
      isScanningLocked: true,
      isLoading: false,
      scannedProduct: mockProduct,
      scanError: null,
      scannedCode: '8901030383748',
      isTorchOn: false,
      toggleTorch: mockToggleTorch,
      handleBarcodeScanned: jest.fn(),
      scanAgain: mockScanAgain,
      reset: mockReset,
    });

    const { getByRole } = await render(
      <BarcodeScannerModal visible={true} onClose={mockOnClose} />
    );

    const backBtn = getByRole('button', { name: 'Back to scanner' });
    fireEvent.press(backBtn);
    expect(mockScanAgain).toHaveBeenCalled();
  });

  it('renders dedicated full-screen error state when item is not found', async () => {
    (useBarcodeScanner as jest.Mock).mockReturnValue({
      permission: { granted: true },
      requestPermission: mockRequestPermission,
      isScanningLocked: true,
      isLoading: false,
      scannedProduct: null,
      scanError: 'Product not found in Open Food Facts database.',
      scannedCode: '1234567890',
      isTorchOn: false,
      toggleTorch: mockToggleTorch,
      handleBarcodeScanned: jest.fn(),
      scanAgain: mockScanAgain,
      reset: mockReset,
    });

    const { getByText, getByRole } = await render(
      <BarcodeScannerModal
        visible={true}
        onClose={mockOnClose}
        onEnterManually={mockOnEnterManually}
      />
    );

    expect(getByText('Packaged Item Not Found')).toBeTruthy();
    expect(getByText('1234567890')).toBeTruthy();

    const manualBtn = getByRole('button', { name: 'Enter food details manually' });
    fireEvent.press(manualBtn);
    expect(mockOnEnterManually).toHaveBeenCalledWith('1234567890');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
