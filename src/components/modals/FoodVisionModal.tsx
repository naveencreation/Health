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
}

const FoodVisionModalComponent: React.FC<FoodVisionModalProps> = ({
  visible,
  onClose,
  initialMealType,
  onOpenBYOKSetup,
}) => {
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

      AIService.isKeyConfigured().then((configured) => {
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

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
              <Ionicons name="close" size={20} color="#64748B" />
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
                Calorify uses Google Gemini's advanced multimodal vision to analyze food photos, estimate portion sizes, and calculate calories instantly. Connect your free personal API key to unlock AI features.
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
                    Snap a new photo of your meal or select a picture you already took from your phone. Ria will identify the ingredients, calculate calories, and prepare it for logging.
                  </Text>

                  <View style={styles.pickerActionsRow}>
                    <Pressable
                      style={({ pressed }) => [styles.pickerCard, pressed ? styles.pickerCardPressed : null]}
                      onPress={handleLaunchCamera}
                      accessibilityRole="button"
                      accessibilityLabel="Take a photo with camera"
                    >
                      <View style={[styles.pickerIconBox, styles.cameraIconBg]}>
                        <Ionicons name="camera-outline" size={28} color="#F47551" />
                      </View>
                      <Text style={styles.pickerCardTitle}>Take Photo</Text>
                      <Text style={styles.pickerCardSubtitle}>Snap with camera</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.pickerCard, pressed ? styles.pickerCardPressed : null]}
                      onPress={handleLaunchGallery}
                      accessibilityRole="button"
                      accessibilityLabel="Choose photo already taken from library"
                    >
                      <View style={[styles.pickerIconBox, styles.galleryIconBg]}>
                        <Ionicons name="images-outline" size={28} color="#0284C7" />
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
                  <Image source={{ uri: selectedImageUri }} style={styles.foodImagePreview} contentFit="cover" />

                  {isAnalyzing ? (
                    <View style={styles.analyzingOverlay}>
                      <ActivityIndicator size="large" color="#F47551" />
                      <Text style={styles.analyzingTitle}>Ria is analyzing your food...</Text>
                      <Text style={styles.analyzingSubtitle}>Calculating calories, protein & macros</Text>
                    </View>
                  ) : null}

                  {!isAnalyzing ? (
                    <Pressable style={styles.retakeBtn} onPress={resetFlow}>
                      <Ionicons name="refresh" size={14} color="#FFFFFF" />
                      <Text style={styles.retakeBtnText}>Retake</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* ERROR STATE */}
              {analysisError ? (() => {
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
                          <Ionicons name="cloud-offline-outline" size={20} color="#DC2626" />
                        ) : isImageOrNotFood ? (
                          <Ionicons name="fast-food-outline" size={20} color="#EA580C" />
                        ) : (
                          <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
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
                      {analysisError.userMessage || 'An unexpected issue occurred while analyzing this food photo.'}
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
                          <Ionicons name="refresh" size={16} color="#FFFFFF" />
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
                        <Ionicons name="images-outline" size={15} color="#475569" />
                        <Text style={styles.secondaryErrorActionText}>
                          {selectedAsset ? 'Choose Different Photo' : 'Dismiss'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })() : null}

              {/* STEP 3: Successful Analysis Result & Confirmation */}
              {analysisResult && !isLoggedSuccess ? (
                <View style={styles.resultContainer}>
                  <View style={styles.dishTitleRow}>
                    <View style={styles.dishTitleCol}>
                      <Text style={styles.dishName}>{analysisResult.name}</Text>
                      <Text style={styles.dishServing}>
                        Serving: {analysisResult.servingUnit}
                      </Text>
                    </View>
                    <View style={styles.confidencePill}>
                      <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
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
                        <Text style={styles.riaCoachLabel}>Ria's Gemini Vision Breakdown</Text>
                        <Text style={styles.riaCoachNote}>{analysisResult.notes}</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* 4 Macro Pods (Sunny Vitality Palette) */}
                  <View style={styles.macroGrid}>
                    <View style={[styles.macroPod, styles.podCalories]}>
                      <Text style={[styles.macroVal, { color: '#F47551' }]}>
                        {Math.round(analysisResult.calories * portionMultiplier)}
                      </Text>
                      <Text style={styles.macroLbl}>Calories</Text>
                    </View>

                    <View style={[styles.macroPod, styles.podProtein]}>
                      <Text style={[styles.macroVal, { color: '#16A34A' }]}>
                        {(analysisResult.protein * portionMultiplier).toFixed(1)}g
                      </Text>
                      <Text style={styles.macroLbl}>Protein</Text>
                    </View>

                    <View style={[styles.macroPod, styles.podCarbs]}>
                      <Text style={[styles.macroVal, { color: '#D97706' }]}>
                        {(analysisResult.carbs * portionMultiplier).toFixed(1)}g
                      </Text>
                      <Text style={styles.macroLbl}>Carbs</Text>
                    </View>

                    <View style={[styles.macroPod, styles.podFat]}>
                      <Text style={[styles.macroVal, { color: '#EA580C' }]}>
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
                        onPress={() => setPortionMultiplier((p) => Math.max(0.5, p - 0.5))}
                        hitSlop={4}
                      >
                        <Ionicons name="remove" size={16} color="#334155" />
                      </Pressable>
                      <Text style={styles.stepVal}>{portionMultiplier}x</Text>
                      <Pressable
                        style={styles.stepBtn}
                        onPress={() => setPortionMultiplier((p) => p + 0.5)}
                        hitSlop={4}
                      >
                        <Ionicons name="add" size={16} color="#334155" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Context-Aware Meal Slot Selector (Tap to change) */}
                  <View style={styles.slotHeaderRow}>
                    <Text style={styles.slotHeaderLabel}>Log to Meal Slot:</Text>
                    <Text style={styles.slotHeaderHint}>Tap to change</Text>
                  </View>
                  <View style={styles.slotRow}>
                    {(['breakfast', 'lunch', 'snacks', 'dinner'] as MealType[]).map((slot) => {
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
                          <Text style={[styles.slotText, isSelected ? styles.slotTextSelected : null]}>
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
                      color={saveToCustom ? Colors.primary : '#94A3B8'}
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
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>
                      Log to {mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} ({Math.round(analysisResult.calories * portionMultiplier)} kcal)
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* SUCCESS CONFIRMATION */}
              {isLoggedSuccess ? (
                <View style={styles.successContainer}>
                  <View style={styles.successCheckCircle}>
                    <Ionicons name="checkmark" size={32} color="#16A34A" />
                  </View>
                  <Text style={styles.successTitle}>Meal Logged Successfully!</Text>
                  <Text style={styles.successDesc}>
                    {analysisResult?.name} has been added to your {mealSlot} and saved to your Custom Foods.
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
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#E2E8F0',
        }
      : {}),
  },
  dragHandle: {
    width: 42,
    height: 5,
    backgroundColor: '#CBD5E1',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#F47551',
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: 'continuous',
    backgroundColor: '#F1F5F9',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  unconfiguredDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  connectKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  connectKeyBtnText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressedBtn: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  pickerSection: {
    paddingVertical: 12,
  },
  pickerIntro: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 20,
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  pickerCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  pickerCardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#E0F2FE',
  },
  pickerCardTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  pickerCardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
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
    borderColor: '#E2E8F0',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  analyzingSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#E2E8F0',
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#FFFFFF',
  },
  errorCardContainer: {
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  keyErrorCardBorder: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(78, 130, 238, 0.3)',
  },
  generalErrorCardBorder: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FECACA',
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
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitleBox: {
    flex: 1,
  },
  errorCategoryRow: {
    marginBottom: 2,
  },
  errorCategoryText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  errorTitleText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorBodyText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#475569',
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
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  keyActionBtnBg: {
    backgroundColor: '#1E293B',
  },
  retryActionBtnBg: {
    backgroundColor: '#F47551',
  },
  primaryErrorActionText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryErrorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  secondaryErrorActionText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12.5,
    color: '#475569',
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dishServing: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 4,
  },
  confidenceText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 10,
    color: '#16A34A',
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
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  podProtein: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  podCarbs: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FEF08A',
  },
  podFat: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FFE4E6',
  },
  macroVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  macroLbl: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  portionLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#334155',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13,
    color: '#0F172A',
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
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12.5,
    color: '#334155',
  },
  slotHeaderHint: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPillSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F47551',
  },
  slotPillPressed: {
    opacity: 0.8,
  },
  slotText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#64748B',
    includeFontPadding: false,
  },
  slotTextSelected: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#F47551',
    fontWeight: '700',
    includeFontPadding: false,
  },
  riaCoachBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 11,
    color: '#EA580C',
    letterSpacing: 0.2,
    marginBottom: 2,
    includeFontPadding: false,
  },
  riaCoachNote: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#334155',
    includeFontPadding: false,
  },
  customCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
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
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#0F172A',
  },
  checkSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F47551',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 6,
  },
  successDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export const FoodVisionModal = React.memo(FoodVisionModalComponent);
