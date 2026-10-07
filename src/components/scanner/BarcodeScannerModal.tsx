import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MealType } from '@/types';
import { normalizedFoodToFoodItem } from '@/types/barcode';
import { useDailyLog } from '@/context/HealthContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { ScannedProductCard } from './ScannedProductCard';
import { haptics } from '@/utils/haptics';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  initialMealType?: MealType;
  onMealLogged?: (mealType: MealType, foodName: string, calories: number) => void;
  onEnterManually?: (barcode: string) => void;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  initialMealType = 'lunch',
  onMealLogged,
  onEnterManually,
}: BarcodeScannerModalProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { addMealItem } = useDailyLog();

  const {
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
  } = useBarcodeScanner();

  // Reset scanner state when modal opens or closes
  useEffect(() => {
    if (visible) {
      scanAgain();
    } else {
      reset();
    }
  }, [visible, scanAgain, reset]);

  const handleClose = () => {
    haptics.selection().catch(() => {});
    reset();
    onClose();
  };

  const handleAddMeal = (
    mealType: MealType,
    product: any,
    multiplier: number
  ) => {
    const foodItem = normalizedFoodToFoodItem(product);
    addMealItem(mealType, foodItem, multiplier);

    if (onMealLogged) {
      const cals = Math.round(product.caloriesPer100g * multiplier);
      onMealLogged(mealType, foodItem.name, cals);
    }

    handleClose();
  };

  const handleManualEntry = (code: string) => {
    handleClose();
    if (onEnterManually) {
      onEnterManually(code);
    }
  };

  const isSheetOpen = !!scannedProduct || !!scanError;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* Camera or Permission Fallback */}
        {!permission?.granted ? (
          <SafeAreaView style={styles.permissionContainer} edges={['top', 'bottom']}>
            <View style={styles.permissionHeader}>
              <Pressable
                style={({ pressed }) => [
                  styles.headerCircleBtn,
                  pressed ? styles.btnPressedSubtle : null,
                ]}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close camera"
              >
                <Ionicons name="close" size={20} color="#0F172A" />
              </Pressable>
            </View>

            <View style={styles.permissionCard}>
              <View style={styles.permissionIconCircle}>
                <Ionicons name="camera-outline" size={36} color={Colors.primary} />
              </View>

              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionDescription}>
                Calorify uses your device camera to scan barcodes on packaged foods for instant macro logging.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.grantButton,
                  pressed ? styles.btnPressedPrimary : null,
                ]}
                onPress={() => {
                  haptics.selection().catch(() => {});
                  requestPermission();
                }}
                accessibilityRole="button"
                accessibilityLabel="Grant camera permission"
              >
                <Text style={styles.grantButtonText}>Grant Camera Permission</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            {/* Live Camera View */}
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={isTorchOn}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'qr',
                  'code128',
                  'code39',
                ],
              }}
              onBarcodeScanned={
                isScanningLocked || isSheetOpen ? undefined : handleBarcodeScanned
              }
            />

            {/* Viewfinder Translucent Mask & Corner Frame */}
            {!isSheetOpen ? (
              <View style={styles.overlayContainer} pointerEvents="box-none">
                {/* Top Mask */}
                <View style={[styles.maskBlock, { height: (windowHeight - 200) / 2 - 30 }]} />

                {/* Center Cutout Row */}
                <View style={styles.cutoutRow}>
                  <View style={styles.maskSideBlock} />

                  {/* Viewfinder Box */}
                  <View style={styles.viewfinderFrame}>
                    {/* 4 Corner Accents */}
                    <View style={[styles.cornerGuide, styles.cornerTopLeft]} />
                    <View style={[styles.cornerGuide, styles.cornerTopRight]} />
                    <View style={[styles.cornerGuide, styles.cornerBottomLeft]} />
                    <View style={[styles.cornerGuide, styles.cornerBottomRight]} />

                    {/* Loading Spinner during lookup */}
                    {isLoading ? (
                      <View style={styles.loadingSpinnerContainer}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={styles.loadingText}>Looking up food...</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.maskSideBlock} />
                </View>

                {/* Bottom Mask with Help Text */}
                <View style={styles.maskBottomBlock}>
                  <View style={styles.instructionPill}>
                    <Ionicons name="scan" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.instructionText}>
                      Align barcode inside the frame
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Floating Top Controls Header */}
            {!isSheetOpen ? (
              <View style={[styles.topHeader, { top: Math.max(insets.top, 16) }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.headerCircleBtn,
                    pressed ? styles.btnPressedSubtle : null,
                  ]}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close scanner"
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </Pressable>

                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitleText}>Scan Barcode</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.headerCircleBtn,
                    isTorchOn ? styles.headerCircleBtnTorchActive : null,
                    pressed ? styles.btnPressedSubtle : null,
                  ]}
                  onPress={toggleTorch}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={isTorchOn ? 'Turn torch off' : 'Turn torch on'}
                >
                  <Ionicons
                    name={isTorchOn ? 'flash' : 'flash-outline'}
                    size={20}
                    color={isTorchOn ? '#B45309' : '#0F172A'}
                  />
                </Pressable>
              </View>
            ) : null}

            {/* Dedicated Full-Screen Food Logging Experience */}
            {isSheetOpen ? (
              <View style={styles.fullScreenCardWrapper}>
                <ScannedProductCard
                  product={scannedProduct}
                  error={scanError}
                  scannedCode={scannedCode}
                  initialMealType={initialMealType}
                  onAddMeal={handleAddMeal}
                  onScanAgain={scanAgain}
                  onEnterManually={handleManualEntry}
                  onClose={handleClose}
                />
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Permission View
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  permissionHeader: {
    paddingTop: 12,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 60,
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDescription: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  grantButton: {
    width: '100%',
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grantButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },

  // Viewfinder Overlay
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  maskBlock: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    width: '100%',
  },
  cutoutRow: {
    flexDirection: 'row',
    height: 200,
  },
  maskSideBlock: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  viewfinderFrame: {
    width: 280,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskBottomBlock: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    paddingTop: 24,
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  instructionText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Corner Guides
  cornerGuide: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 8,
  },

  loadingSpinnerContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  loadingText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 8,
  },

  // Top Floating Controls Header
  topHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerCircleBtnTorchActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  headerTitleContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitleText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Dedicated Full Screen Card Container
  fullScreenCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAF9F6',
    zIndex: 20,
  },

  btnPressedPrimary: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  btnPressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
