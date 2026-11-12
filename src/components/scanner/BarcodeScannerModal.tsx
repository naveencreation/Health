import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Linking } from 'react-native';
import { CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MealType } from '@/types';
import { NormalizedFoodItem, normalizedFoodToFoodItem } from '@/types/barcode';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useNutrition } from '@/features/nutrition/hooks/useNutrition';
import { ProfileButton, SheetHeader } from '@/components/profile/ProfileUI';
import { ScannedProductCard } from './ScannedProductCard';
import { haptics } from '@/utils/haptics';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  initialMealType?: MealType;
  onMealLogged?: (mealType: MealType, foodName: string, calories: number) => void;
  onEnterManually?: (barcode: string) => void;
  onOpenManualSearch?: () => void;
}

const FRAME_W = 280;
const FRAME_H = 180;

export function BarcodeScannerModal({
  visible,
  onClose,
  initialMealType = 'lunch',
  onMealLogged,
  onEnterManually,
  onOpenManualSearch,
}: BarcodeScannerModalProps) {
  const insets = useSafeAreaInsets();
  const { addMealItem, mealCalories, calorieBudget, caloriesBurned } = useNutrition();

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

  // Reset scanner state when the modal opens or closes
  useEffect(() => {
    if (visible) scanAgain();
    else reset();
  }, [visible, scanAgain, reset]);

  const handleClose = () => {
    haptics.selection().catch(() => {});
    reset();
    onClose();
  };

  const handleAddMeal = (mealType: MealType, product: NormalizedFoodItem, multiplier: number) => {
    // One serving per quantity unit; the converter scales per-100 g values (TD-H19)
    const foodItem = normalizedFoodToFoodItem(product);
    addMealItem(mealType, foodItem, multiplier);
    onMealLogged?.(mealType, foodItem.name, Math.round(foodItem.calories * multiplier));
    handleClose();
  };

  const handleManualEntry = (code: string) => {
    handleClose();
    onEnterManually?.(code);
  };

  const handleManualSearch = onOpenManualSearch
    ? () => {
        handleClose();
        onOpenManualSearch();
      }
    : undefined;

  const isSheetOpen = !!scannedProduct || !!scanError;
  // Denied for good: the OS won't show the prompt again, only Settings can grant it
  const blocked = permission?.status === 'denied' && permission.canAskAgain === false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar style={permission?.granted && !isSheetOpen ? 'light' : 'dark'} />
      {!permission?.granted ? (
        // 3A · Camera permission
        <SafeAreaView style={styles.light} edges={['top']}>
          <SheetHeader
            title="Scan packaged food"
            subtitle="Barcodes on packs and labels"
            onClose={handleClose}
            closeLabel="Close camera"
          />
          <View style={styles.permissionBody}>
            <View style={styles.permissionIcon}>
              <Ionicons name="barcode-outline" size={34} color={Colors.primaryDark} />
            </View>
            <Text style={styles.permissionTitle} accessibilityRole="header">
              Camera access needed
            </Text>
            <Text style={styles.permissionText}>
              {blocked
                ? 'Camera access is off for Calorify. Turn it on in Settings to scan barcodes.'
                : 'Calorify uses the camera only while this screen is open, to read barcodes.'}
            </Text>
          </View>
          <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
            <ProfileButton
              label={blocked ? 'Open settings' : 'Allow camera'}
              variant="primary"
              onPress={() => {
                haptics.selection().catch(() => {});
                if (blocked) Linking.openSettings().catch(() => {});
                else requestPermission();
              }}
              accessibilityLabel={blocked ? 'Open settings' : 'Grant camera permission'}
            />
            {handleManualSearch ? (
              <ProfileButton label="Search foods instead" onPress={handleManualSearch} />
            ) : null}
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.dark}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={isTorchOn}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
            }}
            onBarcodeScanned={isScanningLocked || isSheetOpen ? undefined : handleBarcodeScanned}
          />

          {!isSheetOpen ? (
            // 3B · Scanning
            <>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={styles.mask} />
                <View style={styles.cutoutRow}>
                  <View style={styles.mask} />
                  <View style={styles.frame}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </View>
                  <View style={styles.mask} />
                </View>
                <View style={[styles.mask, styles.maskBottom]}>
                  <View style={styles.pill} accessibilityLiveRegion="polite">
                    {isLoading ? (
                      <>
                        <ActivityIndicator size="small" color={Colors.textInverse} />
                        <Text style={styles.pillText}>
                          {`Looking up ${scannedCode ?? 'food'}…`}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.pillText}>Hold steady. It scans on its own.</Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={[styles.topBar, { top: insets.top + 10 }]}>
                <Pressable
                  style={({ pressed }) => [styles.glassBtn, pressed && styles.pressed]}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close scanner"
                >
                  <Ionicons name="close" size={22} color={Colors.textInverse} />
                </Pressable>
                <View style={styles.topTitle}>
                  <Text style={styles.topTitleText} accessibilityRole="header">
                    Scan barcode
                  </Text>
                  <Text style={styles.topSubText}>
                    Adding to {initialMealType.charAt(0).toUpperCase() + initialMealType.slice(1)}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.glassBtn,
                    isTorchOn && styles.glassBtnOn,
                    pressed && styles.pressed,
                  ]}
                  onPress={toggleTorch}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isTorchOn }}
                  accessibilityLabel={isTorchOn ? 'Turn torch off' : 'Turn torch on'}
                >
                  <Ionicons
                    name={isTorchOn ? 'flash' : 'flash-outline'}
                    size={20}
                    color={isTorchOn ? Colors.warningDark : Colors.textInverse}
                  />
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.sheet}>
              <ScannedProductCard
                product={scannedProduct}
                error={scanError}
                scannedCode={scannedCode}
                initialMealType={initialMealType}
                onAddMeal={handleAddMeal}
                onScanAgain={scanAgain}
                onEnterManually={handleManualEntry}
                onClose={handleClose}
                mealCalories={mealCalories}
                allowance={mealCalories ? calorieBudget + caloriesBurned : undefined}
              />
            </View>
          )}
        </View>
      )}
    </Modal>
  );
}

const MASK = 'rgba(15, 23, 42, 0.62)';

const styles = StyleSheet.create({
  light: { flex: 1, backgroundColor: Colors.background },
  dark: { flex: 1, backgroundColor: Colors.inverseSurface },
  pressed: { opacity: 0.85 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    backgroundColor: Colors.background,
  },

  permissionBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  mask: { flex: 1, backgroundColor: MASK },
  maskBottom: { alignItems: 'center', paddingTop: 24 },
  cutoutRow: { flexDirection: 'row', height: FRAME_H },
  frame: { width: FRAME_W, height: FRAME_H },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Colors.textInverse },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.overlayDark,
  },
  pillText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textInverse },

  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.overlayDark,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  glassBtnOn: { backgroundColor: Colors.warningLight, borderColor: Colors.warningLight },
  topTitle: { flex: 1, alignItems: 'center' },
  topTitleText: { fontFamily: Fonts.urbanist.bold, fontSize: 17, color: Colors.textInverse },
  topSubText: { fontFamily: Fonts.urbanist.medium, fontSize: 13, color: Colors.borderMedium },

  sheet: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.background },
});
