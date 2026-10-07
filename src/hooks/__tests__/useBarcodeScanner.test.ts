import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBarcodeScanner } from '../useBarcodeScanner';
import { BarcodeService } from '@/services/barcodeService';

// Mock expo-camera
const mockRequestPermission = jest.fn().mockResolvedValue({ granted: true });
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: true }, mockRequestPermission],
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    warning: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('useBarcodeScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default states', async () => {
    const { result } = await renderHook(() => useBarcodeScanner());

    expect(result.current.permission).toEqual({ granted: true });
    expect(result.current.isScanningLocked).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.scannedProduct).toBeNull();
    expect(result.current.scanError).toBeNull();
    expect(result.current.scannedCode).toBeNull();
    expect(result.current.isTorchOn).toBe(false);
  });

  it('toggles torch on and off', async () => {
    const { result } = await renderHook(() => useBarcodeScanner());

    await act(async () => {
      result.current.toggleTorch();
    });
    expect(result.current.isTorchOn).toBe(true);

    await act(async () => {
      result.current.toggleTorch();
    });
    expect(result.current.isTorchOn).toBe(false);
  });

  it('successfully locks and loads product on barcode scan', async () => {
    const mockProduct = {
      id: '8901030383748',
      name: 'Greek Yogurt Plain',
      brand: 'Epigamia',
      caloriesPer100g: 85,
      proteinGrams: 6,
      carbsGrams: 7.5,
      fatGrams: 3.2,
      source: 'barcode' as const,
    };

    jest.spyOn(BarcodeService, 'fetchProductByBarcode').mockResolvedValue({
      success: true,
      data: mockProduct,
    });

    const { result } = await renderHook(() => useBarcodeScanner());

    await act(async () => {
      await result.current.handleBarcodeScanned({
        data: '8901030383748',
        type: 'ean13',
      } as any);
    });

    expect(result.current.isScanningLocked).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.scannedCode).toBe('8901030383748');
    expect(result.current.scannedProduct).toEqual(mockProduct);
    expect(result.current.scanError).toBeNull();
  });

  it('handles scan error when product is not found', async () => {
    jest.spyOn(BarcodeService, 'fetchProductByBarcode').mockResolvedValue({
      success: false,
      error: 'NOT_FOUND',
      message: 'Product not found in Open Food Facts database.',
    });

    const { result } = await renderHook(() => useBarcodeScanner());

    await act(async () => {
      await result.current.handleBarcodeScanned({
        data: '9999999999999',
        type: 'ean13',
      } as any);
    });

    expect(result.current.isScanningLocked).toBe(true);
    expect(result.current.scannedProduct).toBeNull();
    expect(result.current.scanError).toBe('Product not found in Open Food Facts database.');
  });

  it('guards against rapid-fire repeated frames when locked', async () => {
    const fetchSpy = jest.spyOn(BarcodeService, 'fetchProductByBarcode').mockResolvedValue({
      success: true,
      data: { id: '111', name: 'Item', caloriesPer100g: 100, proteinGrams: 2, carbsGrams: 10, fatGrams: 1, source: 'barcode' },
    });

    const { result } = await renderHook(() => useBarcodeScanner());

    await act(async () => {
      // First frame
      await result.current.handleBarcodeScanned({ data: '111', type: 'ean13' } as any);
      // Immediately subsequent frames while locked
      await result.current.handleBarcodeScanned({ data: '111', type: 'ean13' } as any);
      await result.current.handleBarcodeScanned({ data: '111', type: 'ean13' } as any);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('resets state and unlocks camera when scanAgain is called', async () => {
    jest.spyOn(BarcodeService, 'fetchProductByBarcode').mockResolvedValue({
      success: true,
      data: { id: '111', name: 'Item', caloriesPer100g: 100, proteinGrams: 2, carbsGrams: 10, fatGrams: 1, source: 'barcode' },
    });

    const { result } = await renderHook(() => useBarcodeScanner());

    await act(async () => {
      await result.current.handleBarcodeScanned({ data: '111', type: 'ean13' } as any);
    });

    expect(result.current.isScanningLocked).toBe(true);

    await act(async () => {
      result.current.scanAgain();
    });

    expect(result.current.scannedProduct).toBeNull();
    expect(result.current.scannedCode).toBeNull();

    await waitFor(() => {
      expect(result.current.isScanningLocked).toBe(false);
    });
  });
});
