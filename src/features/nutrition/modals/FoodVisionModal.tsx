import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Switch,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MotionCurves } from '@/theme/motion';
import { MealType, FoodItem } from '@/types';
import { useFoodData, useDailyLog, useAuth } from '@/context/HealthContext';
import { AIService, FoodVisionResult, AIError, AIErrorMapper } from '@/services/ai';
import { GeminiIcon } from '@/components/common/GeminiIcon';
import { Monitoring } from '@/services/monitoring';
import { mealPhotoService } from '@/services/storage/mealPhotoService';
import {
  ProfileButton,
  SettingsRow,
  SettingsSection,
  SheetHeader,
  SheetNotice,
} from '@/components/profile/ProfileUI';
import { FULL_DAY_NAMES, SHORT_MONTHS, parseDateString } from '@/utils/dateUtils';
import { useNutrition } from '../hooks/useNutrition';
import { getMealTarget } from '../services/nutritionAnalytics';
import {
  MacroSummary,
  MealBudgetBar,
  MealImpact,
  MealSwitcher,
  PresetChips,
  SectionLabel,
  foodUiStyles as ui,
  mealLabel,
} from '../components/FoodLogUI';

interface FoodVisionModalProps {
  visible: boolean;
  onClose: () => void;
  initialMealType?: MealType;
  onOpenBYOKSetup: () => void;
  onOpenManualSearch?: () => void;
  onOpenBarcodeScanner?: () => void;
}

const PORTIONS = [0.5, 0.75, 1, 1.5, 2];
const PORTION_TEXT: Record<number, string> = {
  0.5: '½×',
  0.75: '¾×',
  1: '1×',
  1.5: '1½×',
  2: '2×',
};
const SWITCH_TRACK = { false: Colors.borderMedium, true: Colors.primary };
const TIPS = [
  'Fit the whole plate in the frame',
  'Shoot from above in good light',
  'One meal per photo',
];

const KEY_ERRORS = ['INVALID_KEY', 'EXPIRED_OR_REVOKED_KEY', 'NO_KEY_CONFIGURED', 'QUOTA_EXCEEDED'];
const PHOTO_ERRORS = ['INVALID_STRUCTURED_OUTPUT', 'INPUT_TOO_LARGE', 'INVALID_REQUEST'];

const mealFromHour = (hour: number): MealType =>
  hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 19 ? 'snacks' : 'dinner';

const formatServing = (unit?: string): string => {
  const trimmed = (unit || 'serving').trim();
  return /^\d/.test(trimmed) ? trimmed : `1 ${trimmed}`;
};

/** Photo with a slow scan line while Gemini reads it; static line under reduced motion. */
const ScanningPhoto: React.FC<{ uri: string; scanning: boolean; dimmed?: boolean }> = ({
  uri,
  scanning,
  dimmed,
}) => {
  const progress = useSharedValue(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (cancelled) return;
      progress.value = reduced
        ? 0.5
        : withRepeat(withTiming(1, { duration: 1800, easing: MotionCurves.easeInOut }), -1, true);
    });
    return () => {
      cancelled = true;
      cancelAnimation(progress);
    };
  }, [scanning, progress]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * Math.max(0, height - 2) }],
  }));

  return (
    <View style={styles.photoFrame} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      {dimmed ? <View style={styles.photoDim} /> : null}
      {scanning ? <Animated.View style={[styles.scanLine, lineStyle]} /> : null}
    </View>
  );
};

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
  const { selectedDate } = useDailyLog();
  const { currentUser } = useAuth();
  const { addMealItem, mealCalories, calorieBudget, caloriesBurned, caloriesConsumed } =
    useNutrition();

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodVisionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<AIError | null>(null);

  // Review step
  const [mealSlot, setMealSlot] = useState<MealType>(initialMealType || 'lunch');
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [saveToCustom, setSaveToCustom] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggedSuccess, setIsLoggedSuccess] = useState(false);

  // Ignores a Gemini reply that lands after the user picked another photo or reset
  const requestIdRef = useRef(0);

  const resetFlow = useCallback(() => {
    requestIdRef.current += 1;
    setSelectedImageUri(null);
    setSelectedAsset(null);
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setAnalysisError(null);
    setPortionMultiplier(1);
    setSaveToCustom(true);
    setIsSaving(false);
    setIsLoggedSuccess(false);
  }, []);

  const processImage = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const requestId = ++requestIdRef.current;
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
      if (requestId !== requestIdRef.current) return;
      setAnalysisResult(result);
      Monitoring.logEvent('food_vision_success', {
        food_name: result.name,
        calories: result.calories,
      });
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      const mapped = AIErrorMapper.fromRawError(err);
      setAnalysisError(mapped);
      Monitoring.recordError(err, 'AIService.analyzeFoodImage failed', {
        errorType: mapped.type,
      });
    } finally {
      if (requestId === requestIdRef.current) setIsAnalyzing(false);
    }
  }, []);

  const handleRetryAnalysis = useCallback(() => {
    if (selectedAsset) processImage(selectedAsset);
    else resetFlow();
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
      setAnalysisError(AIErrorMapper.fromRawError(err));
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
      setAnalysisError(AIErrorMapper.fromRawError(err));
    }
  }, [processImage]);

  useEffect(() => {
    if (!visible) return;
    resetFlow();
    setMealSlot(initialMealType || mealFromHour(new Date().getHours()));
    AIService.isKeyConfigured().then(setHasKey);
  }, [visible, initialMealType, resetFlow]);

  const handleConfirmAndLog = async () => {
    if (!analysisResult || isSaving) return;
    setIsSaving(true);

    const mealId = 'meal_' + Date.now();
    let finalPhotoUri = selectedImageUri || undefined;

    // 1. Local copy in the app's document directory
    if (selectedAsset?.base64 || selectedImageUri) {
      try {
        finalPhotoUri = await mealPhotoService.saveMealPhotoLocally(
          mealId,
          selectedAsset?.base64 || selectedImageUri || ''
        );
      } catch {
        finalPhotoUri = selectedImageUri || undefined;
      }
    }

    // 2. Background owner-scoped upload; guests stay local
    if (currentUser?.id && !currentUser?.isGuest && selectedAsset?.base64) {
      mealPhotoService.uploadMealPhoto(currentUser.id, mealId, selectedAsset.base64).catch(() => {
        // The local photo stays in the document directory
      });
    }

    const food = {
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
      imageUrl: finalPhotoUri,
    };
    const foodItemToLog: FoodItem = saveToCustom
      ? addCustomFood(food)
      : { ...food, id: mealId, isCustom: true };

    addMealItem(mealSlot, foodItemToLog, portionMultiplier);
    setIsSaving(false);
    setIsLoggedSuccess(true);
  };

  const openElsewhere = (open?: () => void) =>
    open
      ? () => {
          onClose();
          open();
        }
      : undefined;
  const openKeySetup = openElsewhere(onOpenBYOKSetup)!;
  const openSearch = openElsewhere(onOpenManualSearch);
  const openScanner = openElsewhere(onOpenBarcodeScanner);

  const dayLabel = selectedDate
    ? (() => {
        const d = parseDateString(selectedDate);
        return `${FULL_DAY_NAMES[d.getDay()]}, ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
      })()
    : '';
  const mealTitle = mealLabel(mealSlot);
  const footerPad = { paddingBottom: Math.max(16, insets.bottom + 8) };
  const allowance = calorieBudget + caloriesBurned;

  const header = (title: string, subtitle: string) => (
    <SheetHeader
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      closeLabel="Close snap and log"
    />
  );

  // 2A · No Gemini key yet
  const renderNoKey = () => (
    <>
      {header('Snap and log', 'Log a meal from a photo')}
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body}>
        <View style={[ui.card, styles.keyCard]}>
          <View style={styles.keyIcon}>
            <GeminiIcon size={28} />
          </View>
          <Text style={styles.keyTitle} accessibilityRole="header">
            Connect Gemini to use photos
          </Text>
          <Text style={[ui.body, styles.center]}>
            Ria uses your own free Google Gemini key to read meals. It takes about two minutes.
          </Text>
          <View style={styles.keyNote}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.keyNoteText}>Your key stays on this device</Text>
          </View>
        </View>
        {openSearch || openScanner ? (
          <SettingsSection title="Or log another way">
            {openSearch ? (
              <SettingsRow
                icon="search"
                iconColor={Colors.primaryDark}
                iconBackground={Colors.primaryContainer}
                title="Search foods"
                subtitle="Everyday Indian dishes"
                onPress={openSearch}
                accessibilityLabel="Search foods manually"
              />
            ) : null}
            {openScanner ? (
              <SettingsRow
                icon="barcode-outline"
                iconColor={Colors.primaryDark}
                iconBackground={Colors.primaryContainer}
                title="Scan a barcode"
                subtitle="For packaged food"
                onPress={openScanner}
                accessibilityLabel="Scan food barcode"
              />
            ) : null}
          </SettingsSection>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, footerPad]}>
        <ProfileButton label="Connect Gemini key" variant="primary" onPress={openKeySetup} />
      </View>
    </>
  );

  // 2B · Choose a photo
  const renderPicker = () => (
    <>
      {header('Snap and log', `${mealTitle} · ${dayLabel}`)}
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body}>
        <View style={styles.pickRow}>
          <Pressable
            style={({ pressed }) => [
              styles.pickCard,
              styles.pickCardPrimary,
              pressed && ui.pressed,
            ]}
            onPress={handleLaunchCamera}
            accessibilityRole="button"
            accessibilityLabel="Take a photo with camera"
          >
            <Ionicons name="camera" size={26} color={Colors.onPrimary} />
            <Text style={[styles.pickTitle, styles.onPrimary]}>Take photo</Text>
            <Text style={[styles.pickSub, styles.onPrimarySoft]}>Use the camera</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.pickCard, pressed && ui.pressed]}
            onPress={handleLaunchGallery}
            accessibilityRole="button"
            accessibilityLabel="Choose photo already taken from library"
          >
            <Ionicons name="images-outline" size={26} color={Colors.textPrimary} />
            <Text style={styles.pickTitle}>From gallery</Text>
            <Text style={styles.pickSub}>A photo you took</Text>
          </Pressable>
        </View>

        {analysisError ? (
          <SheetNotice kind="error" text={analysisError.userMessage || analysisError.message} />
        ) : null}

        <SettingsSection title="For the best estimate">
          {TIPS.map(tip => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="checkmark" size={18} color={Colors.primary} />
              <Text style={ui.rowTitle}>{tip}</Text>
            </View>
          ))}
        </SettingsSection>

        <Text style={[ui.body, styles.privacy]}>
          Photos go to Google Gemini with your key for analysis. The photo is kept with the meal in
          your log.
        </Text>
      </ScrollView>
    </>
  );

  // 2C · Analysing
  const renderAnalysing = (uri: string) => (
    <>
      {header('Snap and log', `${mealTitle} · ${dayLabel}`)}
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body}>
        <ScanningPhoto uri={uri} scanning />
        <View style={styles.centerBlock} accessibilityLiveRegion="polite">
          <Text style={styles.stateTitle}>Ria is reading your plate…</Text>
          <Text style={[ui.body, styles.center]}>Finding the dishes, then estimating portions</Text>
        </View>
      </ScrollView>
      <View style={[styles.footer, footerPad]}>
        <ProfileButton label="Use a different photo" onPress={resetFlow} />
      </View>
    </>
  );

  // 2E · Error, with the primary action chosen by error code
  const renderError = (uri: string, error: AIError) => {
    const isKey = KEY_ERRORS.includes(error.type);
    const isPhoto = PHOTO_ERRORS.includes(error.type);
    const primaryIsNewPhoto = !isKey && (isPhoto || !selectedAsset);
    const primaryLabel = isKey
      ? 'Update Gemini key'
      : primaryIsNewPhoto
        ? 'Use a different photo'
        : 'Try again';
    const showNewPhotoSecondary = !openSearch && !primaryIsNewPhoto;
    const text = [error.userTitle, error.userMessage || 'Something went wrong reading this photo.']
      .filter(Boolean)
      .join('. ');
    return (
      <>
        {header('Snap and log', `${mealTitle} · ${dayLabel}`)}
        <ScrollView style={styles.flex1} contentContainerStyle={styles.body}>
          <ScanningPhoto uri={uri} scanning={false} dimmed />
          <SheetNotice kind="error" text={text} />
        </ScrollView>
        <View style={[styles.footer, footerPad]}>
          <ProfileButton
            label={primaryLabel}
            variant="primary"
            onPress={isKey ? openKeySetup : primaryIsNewPhoto ? resetFlow : handleRetryAnalysis}
          />
          {openSearch ? (
            <ProfileButton label="Search foods instead" onPress={openSearch} />
          ) : showNewPhotoSecondary ? (
            <ProfileButton label="Use a different photo" onPress={resetFlow} />
          ) : null}
        </View>
      </>
    );
  };

  // 2D · Review the estimate
  const renderReview = (uri: string, result: FoodVisionResult) => {
    const kcal = Math.round(result.calories * portionMultiplier);
    const lowConfidence = result.confidence === 'low';
    return (
      <>
        {header('Review meal', 'Check it before you log')}
        <ScrollView style={styles.flex1} contentContainerStyle={styles.body}>
          <View style={styles.reviewHero}>
            <Image source={{ uri }} style={styles.reviewThumb} contentFit="cover" />
            <View style={styles.flex1}>
              <Text style={ui.title} numberOfLines={2} accessibilityRole="header">
                {result.name}
              </Text>
              <View style={[styles.pill, lowConfidence && styles.pillLow]}>
                <Text style={[styles.pillText, lowConfidence && styles.pillTextLow]}>
                  {formatServing(result.servingUnit)}
                  {result.confidence ? ` · ${mealLabel(result.confidence)} confidence` : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.gap8}>
            <MacroSummary
              calories={kcal}
              protein={result.protein * portionMultiplier}
              carbs={result.carbs * portionMultiplier}
              fat={result.fat * portionMultiplier}
            />
            {result.notes ? <Text style={[ui.body, styles.note]}>{result.notes}</Text> : null}
          </View>

          <View>
            <SectionLabel title="Portion" />
            <PresetChips
              value={portionMultiplier}
              presets={PORTIONS}
              onChange={setPortionMultiplier}
              format={v => PORTION_TEXT[v] ?? `${v}×`}
            />
          </View>

          <View>
            <SectionLabel title="Meal" />
            <MealSwitcher value={mealSlot} onChange={setMealSlot} showIcons={false} />
          </View>

          <SettingsSection>
            <SettingsRow
              title="Save to My foods"
              subtitle="Find it in search next time"
              accessibilityLabel="Save to My foods"
              trailing={
                <Switch
                  value={saveToCustom}
                  onValueChange={setSaveToCustom}
                  trackColor={SWITCH_TRACK}
                  thumbColor={Colors.card}
                  ios_backgroundColor={Colors.borderMedium}
                  accessibilityLabel="Save to My foods"
                />
              }
            />
          </SettingsSection>
        </ScrollView>
        <View style={[styles.footer, footerPad]}>
          <MealImpact
            logged={mealCalories[mealSlot] || 0}
            adding={kcal}
            target={getMealTarget(allowance, mealSlot)}
          />
          <ProfileButton
            label={`Add to ${mealTitle} · ${kcal} kcal`}
            variant="primary"
            onPress={handleConfirmAndLog}
            loading={isSaving}
            accessibilityLabel={`Add to ${mealTitle}, ${kcal} calories`}
          />
        </View>
      </>
    );
  };

  // 2F · Logged
  const renderLogged = (result: FoodVisionResult) => {
    const kcal = Math.round(result.calories * portionMultiplier);
    const protein = Math.round(result.protein * portionMultiplier);
    const left = Math.round(allowance - caloriesConsumed);
    return (
      <>
        <ScrollView style={styles.flex1} contentContainerStyle={[styles.body, styles.loggedBody]}>
          <View style={styles.centerBlock} accessibilityLiveRegion="polite">
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={34} color={Colors.onPrimary} />
            </View>
            <Text style={styles.stateTitle} accessibilityRole="header">
              Added to {mealTitle}
            </Text>
            <Text style={[ui.body, styles.center]}>
              {result.name} · {kcal} kcal · {protein} g protein
            </Text>
          </View>
          <View style={[ui.card, styles.todayCard]}>
            <View style={styles.todayRow}>
              <Text style={ui.rowTitle}>Today</Text>
              <Text style={ui.rowSubtitle}>
                <Text style={styles.strong}>{Math.round(caloriesConsumed).toLocaleString()}</Text>{' '}
                of {Math.round(allowance).toLocaleString()} kcal
              </Text>
            </View>
            <MealBudgetBar logged={caloriesConsumed} target={allowance} />
            <Text style={[ui.rowSubtitle, left < 0 && styles.overText]}>
              {left >= 0
                ? `${left.toLocaleString()} kcal left for today`
                : `${(-left).toLocaleString()} kcal over for today`}
            </Text>
          </View>
        </ScrollView>
        <View style={[styles.footer, footerPad]}>
          <ProfileButton label="Done" variant="primary" onPress={onClose} />
          <ProfileButton label="Snap another" onPress={resetFlow} />
        </View>
      </>
    );
  };

  const renderStep = () => {
    if (hasKey === false) return renderNoKey();
    if (isLoggedSuccess && analysisResult) return renderLogged(analysisResult);
    if (!selectedImageUri) return renderPicker();
    if (isAnalyzing) return renderAnalysing(selectedImageUri);
    if (analysisError) return renderError(selectedImageUri, analysisError);
    if (analysisResult) return renderReview(selectedImageUri, analysisResult);
    return renderPicker();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root} edges={['top']}>
        {renderStep()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  gap8: { gap: 8 },
  strong: { fontFamily: Fonts.urbanist.bold, color: Colors.textPrimary },
  overText: { color: Colors.warningDark },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 24 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    backgroundColor: Colors.background,
  },
  centerBlock: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  stateTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  keyCard: { alignItems: 'center', padding: 20, gap: 8 },
  keyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  keyTitle: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  keyNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  keyNoteText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSecondary },

  pickRow: { flexDirection: 'row', gap: 12 },
  pickCard: {
    flex: 1,
    minHeight: 132,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 2,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 0,
  },
  pickCardPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pickTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 14,
  },
  pickSub: { fontFamily: Fonts.urbanist.regular, fontSize: 13, color: Colors.textSecondary },
  onPrimary: { color: Colors.onPrimary },
  onPrimarySoft: { color: Colors.primaryLight },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  privacy: { marginHorizontal: 4 },

  photoFrame: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainer,
  },
  photoDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlayScrim,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: Colors.primaryMuted,
  },

  reviewHero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reviewThumb: { width: 84, height: 84, borderRadius: 10, borderCurve: 'continuous' },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.surfaceContainer,
  },
  pillLow: { backgroundColor: Colors.warningLight },
  pillText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 12, color: Colors.textSecondary },
  pillTextLow: { color: Colors.warningDark },
  note: { marginHorizontal: 4 },

  loggedBody: { paddingTop: 48 },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  todayCard: { padding: 16, gap: 10 },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});

export const FoodVisionModal = React.memo(FoodVisionModalComponent);
