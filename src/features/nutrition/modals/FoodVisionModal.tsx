import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MealType, FoodItem } from '@/types';
import { useFoodData, useDailyLog } from '@/context/HealthContext';
import { AIService, FoodVisionResult, AIError, AIErrorMapper } from '@/services/ai';
import { GeminiIcon } from '@/components/common/GeminiIcon';

interface FoodVisionModalProps {
  visible: boolean;
  onClose: () => void;
  initialMealType?: MealType;
  onOpenBYOKSetup: () => void;
  onOpenManualSearch?: () => void;
  onOpenBarcodeScanner?: () => void;
}

const FoodVisionModalComponent: React.FC<FoodVisionModalProps> = ({
  visible,
  onClose,
  initialMealType,
  onOpenBYOKSetup,
  onOpenManualSearch,
  onOpenBarcodeScanner,
}) => {
  const insets = useSafeAreaInsets();
  const { addCustomFood } = useFoodData();
  const { addMealItem } = useDailyLog();

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodVisionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<AIError | null>(null);

  // Form states in review step
  const [mealSlot, setMealSlot] = useState<MealType>(initialMealType || 'lunch');
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [saveToCustom, setSaveToCustom] = useState(true);
  const [isLoggedSuccess, setIsLoggedSuccess] = useState(false);

  const resetFlow = useCallback(() => {
    setSelectedImageUri(null);
    setSelectedAsset(null);
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setAnalysisError(null);
    setPortionMultiplier(1);
    setSaveToCustom(true);
    setIsLoggedSuccess(false);
  }, []);

  const processImage = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    setSelectedAsset(asset);
    setSelectedImageUri(asset.uri);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      if (!asset.base64) {
        throw AIErrorMapper.createError(
          'INVALID_REQUEST',
          'Image data could not be read from this photo. Please try another photo.'
        );
      }

      const mimeType = asset.mimeType || 'image/jpeg';
      const result = await AIService.analyzeFoodImage(asset.base64, mimeType);
      setAnalysisResult(result);
    } catch (err: any) {
      const mapped = AIErrorMapper.fromRawError(err);
      setAnalysisError(mapped);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleRetryAnalysis = useCallback(() => {
    if (selectedAsset) {
      processImage(selectedAsset);
    } else {
      resetFlow();
    }
  }, [selectedAsset, processImage, resetFlow]);

  const handleLaunchCamera = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Access Required',
          'Calorify needs camera permission to snap and analyze your meals.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        processImage(result.assets[0]);
      }
    } catch (err: any) {
      const mapped = AIErrorMapper.fromRawError(err);
      setAnalysisError(mapped);
    }
  }, [processImage]);

  const handleLaunchGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Access Required',
          'Calorify needs library permission to select meal photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        processImage(result.assets[0]);
      }
    } catch (err: any) {
      const mapped = AIErrorMapper.fromRawError(err);
      setAnalysisError(mapped);
    }
  }, [processImage]);

  useEffect(() => {
    if (visible) {
      resetFlow();
      if (initialMealType) {
        setMealSlot(initialMealType);
      } else {
        const hour = new Date().getHours();
        if (hour < 11) setMealSlot('breakfast');
        else if (hour < 16) setMealSlot('lunch');
        else if (hour < 19) setMealSlot('snacks');
        else setMealSlot('dinner');
      }

      AIService.isKeyConfigured().then(configured => {
        setHasKey(configured);
      });
    }
  }, [visible, initialMealType, resetFlow]);

  const handleConfirmAndLog = () => {
    if (!analysisResult) return;

    // 1. Optionally save to User-Scoped Custom Foods
    let foodItemToLog: FoodItem;

    if (saveToCustom) {
      foodItemToLog = addCustomFood({
        name: analysisResult.name,
        category: analysisResult.category,
        categoryLabel: analysisResult.categoryLabel,
        servingUnit: analysisResult.servingUnit,
        defaultServingSize: analysisResult.defaultServingSize,
        calories: analysisResult.calories,
        carbs: analysisResult.carbs,
        protein: analysisResult.protein,
        fat: analysisResult.fat,
        fiber: analysisResult.fiber,
        icon: '🍱',
        imageUrl: selectedImageUri || undefined,
      });
    } else {
      foodItemToLog = {
        id: 'temp_' + Date.now(),
        name: analysisResult.name,
        category: analysisResult.category,
        categoryLabel: analysisResult.categoryLabel,
        servingUnit: analysisResult.servingUnit,
        defaultServingSize: analysisResult.defaultServingSize,
        calories: analysisResult.calories,
        carbs: analysisResult.carbs,
        protein: analysisResult.protein,
        fat: analysisResult.fat,
        fiber: analysisResult.fiber,
        icon: '🍱',
        imageUrl: selectedImageUri || undefined,
        isCustom: true,
      };
    }

    // 2. Add to Daily Log under chosen slot with portion multiplier
    addMealItem(mealSlot, foodItemToLog, portionMultiplier);

    setIsLoggedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={selectedImageUri ? styles.fullScreenOverlay : styles.modalOverlay}>
        {!selectedImageUri && <Pressable style={styles.backdropPressable} onPress={onClose} />}

        <View style={[
          selectedImageUri ? styles.fullScreenContainer : styles.sheetContainer,
          selectedImageUri && { paddingTop: Math.max(insets.top, 20) }
        ]}>
          {!selectedImageUri && <View style={styles.dragHandle} />}

          {/* Top Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              <View style={styles.badgeRow}>
                <GeminiIcon size={12} />
                <Text style={styles.badgeText}>POWERED BY GOOGLE GEMINI</Text>
              </View>
              <Text style={styles.sheetTitle}>Snap & Log Meal</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedSubtle : null]}
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Unconfigured API Key State */}
          {hasKey === false ? (
            <View style={styles.unconfiguredContainer}>
              <View style={styles.unconfiguredIconBox}>
                <GeminiIcon size={38} />
              </View>
              <Text style={styles.unconfiguredTitle}>Google Gemini Key Required</Text>
              <Text style={styles.unconfiguredDesc}>
                {
                  "Calorify uses Google Gemini's advanced multimodal vision to analyze food photos, estimate portion sizes, and calculate calories instantly. Connect your free personal API key to unlock AI features."
                }
              </Text>

              <Pressable
                style={({ pressed }) => [styles.connectKeyBtn, pressed ? styles.pressedBtn : null]}
                onPress={() => {
                  onClose();
                  onOpenBYOKSetup();
                }}
              >
                <GeminiIcon size={18} />
                <Text style={styles.connectKeyBtnText}>Connect Free Gemini Key</Text>
              </Pressable>

              {/* 1-Tap Manual Logging Fallback */}
              <View style={styles.unconfiguredDivider}>
                <View style={styles.unconfiguredLine} />
                <Text style={styles.unconfiguredOrText}>OR LOG MANUALLY</Text>
                <View style={styles.unconfiguredLine} />
              </View>

              <View style={styles.unconfiguredActionsRow}>
                {onOpenManualSearch ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.unconfiguredAltBtn,
                      pressed ? styles.pressedBtn : null,
                    ]}
                    onPress={() => {
                      onClose();
                      onOpenManualSearch();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Search foods manually"
                  >
                    <Ionicons name="search-outline" size={16} color={Colors.textPrimary} />
                    <Text style={styles.unconfiguredAltBtnText}>Search Foods</Text>
                  </Pressable>
                ) : null}

                {onOpenBarcodeScanner ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.unconfiguredAltBtn,
                      pressed ? styles.pressedBtn : null,
                    ]}
                    onPress={() => {
                      onClose();
                      onOpenBarcodeScanner();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Scan food barcode"
                  >
                    <Ionicons name="barcode-outline" size={16} color={Colors.textPrimary} />
                    <Text style={styles.unconfiguredAltBtnText}>Scan Barcode</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollInner}
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
            >
              {/* STEP 1: Initial Image Picker Buttons */}
              {!selectedImageUri ? (
                <View style={styles.pickerSection}>
                  <Text style={styles.pickerIntro}>
                    Snap a new photo of your meal or select a picture you already took from your
                    phone. Ria will identify the ingredients, calculate calories, and prepare it for
                    logging.
                  </Text>

                  <View style={styles.pickerActionsRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.pickerCard,
                        pressed ? styles.pickerCardPressed : null,
                      ]}
                      onPress={handleLaunchCamera}
                      accessibilityRole="button"
                      accessibilityLabel="Take a photo with camera"
                    >
                      <View style={[styles.pickerIconBox, styles.cameraIconBg]}>
                        <Ionicons name="camera-outline" size={28} color={Colors.primary} />
                      </View>
                      <Text style={styles.pickerCardTitle}>Take Photo</Text>
                      <Text style={styles.pickerCardSubtitle}>Snap with camera</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.pickerCard,
                        pressed ? styles.pickerCardPressed : null,
                      ]}
                      onPress={handleLaunchGallery}
                      accessibilityRole="button"
                      accessibilityLabel="Choose photo already taken from library"
                    >
                      <View style={[styles.pickerIconBox, styles.galleryIconBg]}>
                        <Ionicons name="images-outline" size={28} color={Colors.water} />
                      </View>
                      <Text style={styles.pickerCardTitle}>Photo Library</Text>
                      <Text style={styles.pickerCardSubtitle}>Already taken</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* STEP 2: Selected Image + Analysis Radar */}
              {selectedImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImageUri }}
                    style={styles.foodImagePreview}
                    contentFit="cover"
                  />

                  {isAnalyzing ? (
                    <View style={styles.analyzingOverlay}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.analyzingTitle}>Ria is analyzing your food...</Text>
                      <Text style={styles.analyzingSubtitle}>
                        Calculating calories, protein & macros
                      </Text>
                    </View>
                  ) : null}

                  {!isAnalyzing ? (
                    <Pressable style={styles.retakeBtn} onPress={resetFlow}>
                      <Ionicons name="refresh" size={14} color={Colors.onPrimary} />
                      <Text style={styles.retakeBtnText}>Retake</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* ERROR STATE */}
              {analysisError
                ? (() => {
                    const isKeyError =
                      analysisError.type === 'INVALID_KEY' ||
                      analysisError.type === 'EXPIRED_OR_REVOKED_KEY' ||
                      analysisError.type === 'NO_KEY_CONFIGURED';
                    const isQuotaError = analysisError.type === 'QUOTA_EXCEEDED';
                    const isRateLimit = analysisError.type === 'RATE_LIMIT';
                    const isNetworkOrTimeout =
                      analysisError.type === 'NETWORK_ERROR' ||
                      analysisError.type === 'TIMEOUT' ||
                      analysisError.type === 'MODEL_UNAVAILABLE' ||
                      analysisError.type === 'SERVER_ERROR' ||
                      isRateLimit;
                    const isImageOrNotFood =
                      analysisError.type === 'INVALID_STRUCTURED_OUTPUT' ||
                      analysisError.type === 'INPUT_TOO_LARGE' ||
                      analysisError.type === 'INVALID_REQUEST';

                    return (
                      <View
                        style={[
                          styles.errorCardContainer,
                          isKeyError ? styles.keyErrorCardBorder : styles.generalErrorCardBorder,
                        ]}
                      >
                        {/* Top Header Badge */}
                        <View style={styles.errorIconHeaderRow}>
                          <View
                            style={[
                              styles.errorIconBadge,
                              isKeyError ? styles.keyErrorIconBg : styles.generalErrorIconBg,
                            ]}
                          >
                            {isKeyError ? (
                              <GeminiIcon size={20} />
                            ) : isNetworkOrTimeout ? (
                              <Ionicons name="cloud-offline-outline" size={20} color={Colors.dangerDark} />
                            ) : isImageOrNotFood ? (
                              <Ionicons name="fast-food-outline" size={20} color={Colors.primary} />
                            ) : (
                              <Ionicons name="alert-circle-outline" size={20} color={Colors.dangerDark} />
                            )}
                          </View>

                          <View style={styles.errorTitleBox}>
                            <View style={styles.errorCategoryRow}>
                              <Text
                                style={[
                                  styles.errorCategoryText,
                                  isKeyError ? { color: '#4E82EE' } : { color: '#DC2626' },
                                ]}
                              >
                                {isKeyError
                                  ? 'GEMINI API KEY'
                                  : isQuotaError
                                    ? 'USAGE LIMIT'
                                    : isNetworkOrTimeout
                                      ? 'CONNECTION'
                                      : 'FOOD VISION'}
                              </Text>
                            </View>
                            <Text style={styles.errorTitleText}>
                              {analysisError.userTitle || 'AI Analysis Notice'}
                            </Text>
                          </View>
                        </View>

                        {/* Friendly Empathic Message */}
                        <Text style={styles.errorBodyText}>
                          {analysisError.userMessage ||
                            'An unexpected issue occurred while analyzing this food photo.'}
                        </Text>

                        {/* Contextual Action Buttons */}
                        <View style={styles.errorActionsRow}>
                          {isKeyError || isQuotaError ? (
                            <Pressable
                              style={({ pressed }) => [
                                styles.primaryErrorActionBtn,
                                styles.keyActionBtnBg,
                                pressed ? styles.btnPressed : null,
                              ]}
                              onPress={() => {
                                onClose();
                                onOpenBYOKSetup();
                              }}
                            >
                              <GeminiIcon size={16} />
                              <Text style={styles.primaryErrorActionText}>
                                {analysisError.actionLabel || 'Update Gemini Key'}
                              </Text>
                            </Pressable>
                          ) : null}

                          {selectedAsset && (isNetworkOrTimeout || analysisError.retryable) ? (
                            <Pressable
                              style={({ pressed }) => [
                                styles.primaryErrorActionBtn,
                                styles.retryActionBtnBg,
                                pressed ? styles.btnPressed : null,
                              ]}
                              onPress={handleRetryAnalysis}
                            >
                              <Ionicons name="refresh" size={16} color={Colors.onPrimary} />
                              <Text style={styles.primaryErrorActionText}>
                                {analysisError.actionLabel || 'Retry Analysis'}
                              </Text>
                            </Pressable>
                          ) : null}

                          <Pressable
                            style={({ pressed }) => [
                              styles.secondaryErrorActionBtn,
                              pressed ? styles.pickerCardPressed : null,
                            ]}
                            onPress={resetFlow}
                          >
                            <Ionicons name="images-outline" size={15} color={Colors.textSlate600} />
                            <Text style={styles.secondaryErrorActionText}>
                              {selectedAsset ? 'Choose Different Photo' : 'Dismiss'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })()
                : null}

              {/* STEP 3: Successful Analysis Result & Confirmation */}
              {analysisResult && !isLoggedSuccess ? (
                <View style={styles.resultContainer}>
                  <View style={styles.dishTitleRow}>
                    <View style={styles.dishTitleCol}>
                      <Text style={styles.dishName}>{analysisResult.name}</Text>
                      <Text style={styles.dishServing}>Serving: {analysisResult.servingUnit}</Text>
                    </View>
                    <View style={styles.confidencePill}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                      <Text style={styles.confidenceText}>Verified</Text>
                    </View>
                  </View>

                  {/* Ria Coach Nutrition Breakdown */}
                  {analysisResult.notes ? (
                    <View style={styles.riaCoachBubble}>
                      <View style={styles.riaCoachIcon}>
                        <GeminiIcon size={16} />
                      </View>
                      <View style={styles.riaCoachTextCol}>
                        <Text style={styles.riaCoachLabel}>{"Ria's Gemini Vision Breakdown"}</Text>
                        <Text style={styles.riaCoachNote}>{analysisResult.notes}</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* 4 Macro Pods (Sunny Vitality Palette) */}
                  <View style={styles.macroGrid}>
                    <View style={[styles.macroPod, styles.podCalories]}>
                      <Text style={[styles.macroVal, { color: Colors.primary }]}>
                        {Math.round(analysisResult.calories * portionMultiplier)}
                      </Text>
                      <Text style={styles.macroLbl}>Calories</Text>
                    </View>

                    <View style={[styles.macroPod, styles.podProtein]}>
                      <Text style={[styles.macroVal, { color: Colors.proteinDark }]}>
                        {(analysisResult.protein * portionMultiplier).toFixed(1)}g
                      </Text>
                      <Text style={styles.macroLbl}>Protein</Text>
                    </View>

                    <View style={[styles.macroPod, styles.podCarbs]}>
                      <Text style={[styles.macroVal, { color: Colors.carbsDark }]}>
                        {(analysisResult.carbs * portionMultiplier).toFixed(1)}g
                      </Text>
                      <Text style={styles.macroLbl}>Carbs</Text>
                    </View>

                    <View style={[styles.macroPod, styles.podFat]}>
                      <Text style={[styles.macroVal, { color: Colors.fatDark }]}>
                        {(analysisResult.fat * portionMultiplier).toFixed(1)}g
                      </Text>
                      <Text style={styles.macroLbl}>Fat</Text>
                    </View>
                  </View>

                  {/* Portion Multiplier Stepper */}
                  <View style={styles.portionRow}>
                    <Text style={styles.portionLabel}>Portion Size:</Text>
                    <View style={styles.stepperContainer}>
                      <Pressable
                        style={styles.stepBtn}
                        onPress={() => setPortionMultiplier(p => Math.max(0.5, p - 0.5))}
                        hitSlop={4}
                      >
                        <Ionicons name="remove" size={16} color={Colors.textSlate700} />
                      </Pressable>
                      <Text style={styles.stepVal}>{portionMultiplier}x</Text>
                      <Pressable
                        style={styles.stepBtn}
                        onPress={() => setPortionMultiplier(p => p + 0.5)}
                        hitSlop={4}
                      >
                        <Ionicons name="add" size={16} color={Colors.textSlate700} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Context-Aware Meal Slot Selector (Tap to change) */}
                  <View style={styles.slotHeaderRow}>
                    <Text style={styles.slotHeaderLabel}>Log to Meal Slot:</Text>
                    <Text style={styles.slotHeaderHint}>Tap to change</Text>
                  </View>
                  <View style={styles.slotRow}>
                    {(['breakfast', 'lunch', 'snacks', 'dinner'] as MealType[]).map(slot => {
                      const isSelected = mealSlot === slot;
                      return (
                        <Pressable
                          key={slot}
                          style={({ pressed }) => [
                            styles.slotPill,
                            isSelected ? styles.slotPillSelected : null,
                            pressed ? styles.slotPillPressed : null,
                          ]}
                          onPress={() => setMealSlot(slot)}
                          hitSlop={4}
                        >
                          <Text
                            style={[styles.slotText, isSelected ? styles.slotTextSelected : null]}
                          >
                            {slot.charAt(0).toUpperCase() + slot.slice(1)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Save to Custom Foods Checkbox */}
                  <Pressable
                    style={styles.customCheckRow}
                    onPress={() => setSaveToCustom(!saveToCustom)}
                  >
                    <Ionicons
                      name={saveToCustom ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={saveToCustom ? Colors.primary : Colors.textMuted}
                    />
                    <View style={styles.checkTextCol}>
                      <Text style={styles.checkTitle}>Save to My Custom Foods</Text>
                      <Text style={styles.checkSubtitle}>
                        Add to your private library for 1-tap re-logging without re-taking photos.
                      </Text>
                    </View>
                  </Pressable>

                  {/* Confirm & Log Button */}
                  <Pressable
                    style={({ pressed }) => [styles.confirmBtn, pressed ? styles.btnPressed : null]}
                    onPress={handleConfirmAndLog}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
                    <Text style={styles.confirmBtnText}>
                      Log to {mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} (
                      {Math.round(analysisResult.calories * portionMultiplier)} kcal)
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* SUCCESS CONFIRMATION */}
              {isLoggedSuccess ? (
                <View style={styles.successContainer}>
                  <View style={styles.successCheckCircle}>
                    <Ionicons name="checkmark" size={32} color={Colors.success} />
                  </View>
                  <Text style={styles.successTitle}>Meal Logged Successfully!</Text>
                  <Text style={styles.successDesc}>
                    {analysisResult?.name} has been added to your {mealSlot} and saved to your
                    Custom Foods.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.background,
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.15)',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: Colors.borderInset,
        }
      : {}),
  },
  dragHandle: {
    width: 42,
    height: 5,
    backgroundColor: Colors.borderMedium,
    borderRadius: 3,
    borderCurve: 'continuous',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerTitleBox: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  badgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedSubtle: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  scrollInner: {
    paddingBottom: 24,
  },
  unconfiguredContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  unconfiguredIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderCurve: 'continuous',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(78, 130, 238, 0.25)',
    shadowColor: '#4E82EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  unconfiguredTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  unconfiguredDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  connectKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inverseSurface,
    paddingHorizontal: 22,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  connectKeyBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  unconfiguredDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    width: '100%',
    gap: 12,
  },
  unconfiguredLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderInset,
  },
  unconfiguredOrText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  unconfiguredActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  unconfiguredAltBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  unconfiguredAltBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  pressedBtn: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  pickerSection: {
    paddingVertical: 12,
  },
  pickerIntro: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 20,
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  pickerCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
  },
  pickerCardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: Colors.surfaceLow,
  },
  pickerIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cameraIconBg: {
    backgroundColor: 'rgba(244, 117, 81, 0.12)',
  },
  galleryIconBg: {
    backgroundColor: Colors.waterTrack,
  },
  pickerCardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pickerCardSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderInset,
  },
  foodImagePreview: {
    width: '100%',
    height: '100%',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  analyzingTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.onPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  analyzingSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.borderInset,
    marginTop: 4,
    textAlign: 'center',
  },
  retakeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 4,
  },
  retakeBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.onPrimary,
  },
  errorCardContainer: {
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  keyErrorCardBorder: {
    backgroundColor: Colors.card,
    borderColor: 'rgba(78, 130, 238, 0.3)',
  },
  generalErrorCardBorder: {
    backgroundColor: Colors.card,
    borderColor: Colors.dangerLight,
  },
  errorIconHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  errorIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyErrorIconBg: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: 'rgba(78, 130, 238, 0.25)',
  },
  generalErrorIconBg: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
  },
  errorTitleBox: {
    flex: 1,
  },
  errorCategoryRow: {
    marginBottom: 2,
  },
  errorCategoryText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  errorTitleText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  errorBodyText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.textSlate600,
    lineHeight: 18,
    marginBottom: 16,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryErrorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  keyActionBtnBg: {
    backgroundColor: Colors.inverseSurface,
  },
  retryActionBtnBg: {
    backgroundColor: Colors.primary,
  },
  primaryErrorActionText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.onPrimary,
  },
  secondaryErrorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceInset,
    borderWidth: 1,
    borderColor: Colors.borderInset,
    gap: 6,
  },
  secondaryErrorActionText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSlate600,
  },
  resultContainer: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
  },
  dishTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dishTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  dishName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dishServing: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.proteinLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.proteinBorder,
    gap: 4,
  },
  confidenceText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    color: Colors.success,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  macroPod: {
    flex: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  podCalories: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  podProtein: {
    backgroundColor: Colors.proteinLight,
    borderColor: Colors.proteinBorder,
  },
  podCarbs: {
    backgroundColor: Colors.carbsLight,
    borderColor: Colors.carbsBorder,
  },
  podFat: {
    backgroundColor: Colors.fatLight,
    borderColor: Colors.fatBorder,
  },
  macroVal: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
  },
  macroLbl: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceInset,
  },
  portionLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSlate700,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceInset,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 3,
    gap: 8,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slotHeaderLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSlate700,
  },
  slotHeaderHint: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  slotPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1.5,
    borderColor: Colors.borderInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  slotPillPressed: {
    opacity: 0.8,
  },
  slotText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    includeFontPadding: false,
  },
  slotTextSelected: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.primary,
    includeFontPadding: false,
  },
  riaCoachBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.25)',
    marginBottom: 14,
    gap: 10,
  },
  riaCoachIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 117, 81, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  riaCoachTextCol: {
    flex: 1,
  },
  riaCoachLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.primaryDark,
    letterSpacing: 0.2,
    marginBottom: 2,
    includeFontPadding: false,
  },
  riaCoachNote: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSlate700,
    includeFontPadding: false,
  },
  customCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceLow,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  checkTextCol: {
    flex: 1,
  },
  checkTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  checkSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderCurve: 'continuous',
    backgroundColor: Colors.proteinLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.proteinDark,
    marginBottom: 6,
  },
  successDesc: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: Colors.successDark,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export const FoodVisionModal = React.memo(FoodVisionModalComponent);
