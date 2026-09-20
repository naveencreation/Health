import React, { useState, useEffect } from 'react';
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
import { useHealth } from '@/context/HealthContext';
import { AIService, FoodVisionResult } from '@/services/ai';

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
  const { addCustomFood, addMealItem } = useHealth();

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodVisionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Form states in review step
  const [mealSlot, setMealSlot] = useState<MealType>(initialMealType || 'lunch');
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [saveToCustom, setSaveToCustom] = useState(true);
  const [isLoggedSuccess, setIsLoggedSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      checkKeyStatus();
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
    }
  }, [visible, initialMealType]);

  const checkKeyStatus = async () => {
    const configured = await AIService.isKeyConfigured();
    setHasKey(configured);
  };

  const resetFlow = () => {
    setSelectedImageUri(null);
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setAnalysisError(null);
    setPortionMultiplier(1);
    setSaveToCustom(true);
    setIsLoggedSuccess(false);
  };

  const handleLaunchCamera = async () => {
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
      setAnalysisError(err?.message || 'Failed to capture photo from camera.');
    }
  };

  const handleLaunchGallery = async () => {
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
      setAnalysisError(err?.message || 'Failed to select photo from gallery.');
    }
  };

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setSelectedImageUri(asset.uri);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      if (!asset.base64) {
        throw new Error('Image base64 data could not be extracted.');
      }

      const mimeType = asset.mimeType || 'image/jpeg';
      const result = await AIService.analyzeFoodImage(asset.base64, mimeType);
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisError(
        err?.userMessage || err?.message || 'Could not recognize the meal. Please try a clearer food photo.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

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
                <Ionicons name="camera" size={13} color="#F47551" />
                <Text style={styles.badgeText}>AI FOOD RECOGNITION</Text>
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
                <Ionicons name="sparkles" size={28} color="#F47551" />
              </View>
              <Text style={styles.unconfiguredTitle}>Gemini Key Required</Text>
              <Text style={styles.unconfiguredDesc}>
                AI Food Vision analyzes your food photos and calculates calories instantly using Google Gemini. Connect your free personal API key to unlock this feature.
              </Text>

              <Pressable
                style={({ pressed }) => [styles.connectKeyBtn, pressed ? styles.pressedBtn : null]}
                onPress={() => {
                  onClose();
                  onOpenBYOKSetup();
                }}
              >
                <Ionicons name="key" size={16} color="#FFFFFF" />
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
                    Take a photo of your meal or plate. Ria will identify the ingredients, calculate calories, and prepare it for 1-tap logging.
                  </Text>

                  <View style={styles.pickerActionsRow}>
                    <Pressable
                      style={({ pressed }) => [styles.pickerCard, pressed ? styles.pickerCardPressed : null]}
                      onPress={handleLaunchCamera}
                    >
                      <View style={[styles.pickerIconBox, styles.cameraIconBg]}>
                        <Ionicons name="camera" size={28} color="#F47551" />
                      </View>
                      <Text style={styles.pickerCardTitle}>Take Photo</Text>
                      <Text style={styles.pickerCardSubtitle}>Open camera</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.pickerCard, pressed ? styles.pickerCardPressed : null]}
                      onPress={handleLaunchGallery}
                    >
                      <View style={[styles.pickerIconBox, styles.galleryIconBg]}>
                        <Ionicons name="images" size={28} color="#0284C7" />
                      </View>
                      <Text style={styles.pickerCardTitle}>Photo Library</Text>
                      <Text style={styles.pickerCardSubtitle}>Choose from gallery</Text>
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
              {analysisError ? (
                <View style={styles.errorCard}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{analysisError}</Text>
                  <Pressable style={styles.retryBtn} onPress={resetFlow}>
                    <Text style={styles.retryBtnText}>Try Another Photo</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* STEP 3: Successful Analysis Result & Confirmation */}
              {analysisResult && !isLoggedSuccess ? (
                <View style={styles.resultContainer}>
                  <View style={styles.dishTitleRow}>
                    <View style={styles.dishTitleCol}>
                      <Text style={styles.dishName}>{analysisResult.name}</Text>
                      <Text style={styles.dishServing}>
                        Serving: {analysisResult.servingUnit}
                        {analysisResult.notes ? ` • ${analysisResult.notes}` : ''}
                      </Text>
                    </View>
                    <View style={styles.confidencePill}>
                      <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                      <Text style={styles.confidenceText}>Verified</Text>
                    </View>
                  </View>

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
                      >
                        <Ionicons name="remove" size={16} color="#334155" />
                      </Pressable>
                      <Text style={styles.stepVal}>{portionMultiplier}x</Text>
                      <Pressable
                        style={styles.stepBtn}
                        onPress={() => setPortionMultiplier((p) => p + 0.5)}
                      >
                        <Ionicons name="add" size={16} color="#334155" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Meal Slot Selector */}
                  <Text style={styles.slotHeaderLabel}>Log to Meal Slot:</Text>
                  <View style={styles.slotRow}>
                    {(['breakfast', 'lunch', 'snacks', 'dinner'] as MealType[]).map((slot) => {
                      const isSelected = mealSlot === slot;
                      return (
                        <Pressable
                          key={slot}
                          style={[styles.slotPill, isSelected ? styles.slotPillSelected : null]}
                          onPress={() => setMealSlot(slot)}
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
    width: 64,
    height: 64,
    borderRadius: 32,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(244, 117, 81, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    backgroundColor: '#F47551',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    gap: 8,
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  errorText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12.5,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: 'continuous',
    marginTop: 4,
  },
  retryBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11.5,
    color: '#FFFFFF',
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
  slotHeaderLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12.5,
    color: '#334155',
    marginBottom: 8,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  slotPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  slotPillSelected: {
    backgroundColor: 'rgba(244, 117, 81, 0.12)',
    borderColor: '#F47551',
  },
  slotText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
  },
  slotTextSelected: {
    color: '#F47551',
    fontWeight: '700',
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
