import { useState, useCallback, useRef } from 'react';
import { useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { BarcodeService } from '@/services/barcodeService';
import { NormalizedFoodItem } from '@/types/barcode';
import { haptics } from '@/utils/haptics';

export interface UseBarcodeScannerReturn {
  permission: ReturnType<typeof useCameraPermissions>[0];
  requestPermission: ReturnType<typeof useCameraPermissions>[1];
  isScanningLocked: boolean;
  isLoading: boolean;
  scannedProduct: NormalizedFoodItem | null;
  scanError: string | null;
  scannedCode: string | null;
  isTorchOn: boolean;
  toggleTorch: () => void;
  handleBarcodeScanned: (result: BarcodeScanningResult) => Promise<void>;
  scanAgain: () => void;
  reset: () => void;
}

export function useBarcodeScanner(): UseBarcodeScannerReturn {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningLocked, setIsScanningLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<NormalizedFoodItem | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Lock ref to immediately guard against concurrent frame firings before React re-render
  const isLockedRef = useRef(false);

  const toggleTorch = useCallback(() => {
    setIsTorchOn(prev => !prev);
    haptics.selection().catch(() => {});
  }, []);

  const handleBarcodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (isLockedRef.current) return;

    const code = result?.data?.trim();
    if (!code) return;

    // Immediately lock to prevent 30 rapid-fire frames per second
    isLockedRef.current = true;
    setIsScanningLocked(true);
    setScannedCode(code);
    setIsLoading(true);
    setScanError(null);

    // Tactile acknowledgment of detection
    haptics.impactLight().catch(() => {});

    try {
      const res = await BarcodeService.fetchProductByBarcode(code);

      if (res.success && res.data) {
        setScannedProduct(res.data);
        setScanError(null);
        haptics.success().catch(() => {});
      } else {
        setScannedProduct(null);
        setScanError(res.message || 'Product not found in Open Food Facts database.');
        haptics.warning().catch(() => {});
      }
    } catch (err: any) {
      setScannedProduct(null);
      setScanError(err.message || 'Network error occurred while fetching food details.');
      haptics.error().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scanAgain = useCallback(() => {
    setScannedProduct(null);
    setScanError(null);
    setScannedCode(null);
    setIsLoading(false);

    // 400ms buffer before unlocking camera frames to prevent immediate re-scan
    setTimeout(() => {
      isLockedRef.current = false;
      setIsScanningLocked(false);
    }, 400);
  }, []);

  const reset = useCallback(() => {
    isLockedRef.current = false;
    setIsScanningLocked(false);
    setIsLoading(false);
    setScannedProduct(null);
    setScanError(null);
    setScannedCode(null);
    setIsTorchOn(false);
  }, []);

  return {
    permission,
    requestPermission,
    isScanningLocked,
    isLoading,
    scannedProduct,
    scanError,
    scannedCode,
    isTorchOn,
    toggleTorch,
    handleBarcodeScanned,
    scanAgain,
    reset,
  };
}
