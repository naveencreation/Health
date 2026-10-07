import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { FoodStyle, Struggle, PendingMeal } from '../services/onboardingDraft';
import {
  getStarterFoods,
  guessMealSlotFromTime,
  StarterFoodItem,
} from '../data/starterFoods';
import {
  getDailyScanStatus,
  incrementDailyScan,
  FREE_DAILY_SCAN_LIMIT,
} from '@/features/nutrition/services/scanLimitService';
import { INITIAL_FOOD_DATABASE } from '@/data/foodDatabase';
import { AIService, AIErrorMapper } from '@/services/ai';

export interface FirstMealWinScreenProps {
  name?: string;
  foodStyle?: FoodStyle;
  struggles?: Struggle[];
  dailyCalorieBudget: number;
  onBack: () => void;
  onContinue: (meal: PendingMeal) => void;
  onSkip: () => void;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type ScreenViewMode = 'select' | 'review' | 'celebrate';

export const FirstMealWinScreen: React.FC<FirstMealWinScreenProps> = ({
  name,
  foodStyle,
  struggles = [],
  dailyCalorieBudget = 2000,
  onBack,
  onContinue,
  onSkip,
  sectionIndex = 3,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  // Screen sub-state
  const [viewMode, setViewMode] = useState<ScreenViewMode>('select');
  const [mealSlot, setMealSlot] = useState<MealSlot>(guessMealSlotFromTime());
  const [selectedFood, setSelectedFood] = useState<StarterFoodItem | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  // Scan limits state
  const [scansRemaining, setScansRemaining] = useState<number>(FREE_DAILY_SCAN_LIMIT);
  const [isCameraPrimerVisible, setIsCameraPrimerVisible] = useState<boolean>(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  // Animation values
  const ringProgress = useSharedValue(0);

  useEffect(() => {
    // Check initial scan limits
    getDailyScanStatus().then(status => {
      setScansRemaining(status.remaining);
    });
  }, []);

  const starterFoods = useMemo(() => {
    return getStarterFoods(foodStyle);
  }, [foodStyle]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase().trim();
    return INITIAL_FOOD_DATABASE.filter(f =>
      f.name.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [searchQuery]);

  // Personalized struggle reassurance line
  const primaryStruggle = struggles[0];
  const struggleInsight = useMemo(() => {
    switch (primaryStruggle) {
      case 'portions':
        return 'Portions estimated automatically — adjust anytime with a single tap.';
      case 'home_cooked':
        return 'Calorify is tuned for home-cooked dishes so you don’t need complex recipe breakdowns.';
      case 'protein':
        return 'Protein tracked automatically to help you hit your daily muscle retention goal.';
      case 'consistency':
        return 'Logging in seconds makes consistency feel effortless every single day.';
      case 'eating_out':
        return 'Fast estimate calibrated for standard restaurant & kitchen servings.';
      default:
        return 'Your first step to intuitive, effortless nutrition tracking.';
    }
  }, [primaryStruggle]);

  // Calculated macro totals for current portion
  const currentCals = Math.round((selectedFood?.calories ?? 0) * portionMultiplier);
  const currentProtein = Math.round((selectedFood?.proteinG ?? 0) * portionMultiplier);
  const currentCarbs = Math.round((selectedFood?.carbsG ?? 0) * portionMultiplier);
  const currentFat = Math.round((selectedFood?.fatG ?? 0) * portionMultiplier);
  const pctOfDaily = Math.min(100, Math.round((currentCals / dailyCalorieBudget) * 100));

  // Trigger celebration animation
  const handleConfirmLog = async () => {
    await haptics.success();
    setViewMode('celebrate');
    ringProgress.value = withTiming(pctOfDaily / 100, { duration: 1200 });
  };

  const handleFinishCelebration = () => {
    if (!selectedFood) return;
    const pendingMeal: PendingMeal = {
      foodName: selectedFood.name,
      calories: currentCals,
      proteinG: currentProtein,
      carbsG: currentCarbs,
      fatG: currentFat,
      portionMultiplier,
      mealSlot,
      photoUri,
      loggedAt: Date.now(),
    };
    onContinue(pendingMeal);
  };

  // Select food item and enter review mode
  const handleSelectFood = (food: StarterFoodItem, uri?: string) => {
    haptics.selection();
    setSelectedFood(food);
    setPhotoUri(uri);
    setPortionMultiplier(1);
    setSearchQuery('');
    setIsSearchActive(false);
    setViewMode('review');
  };

  // Launch camera flow
  const handleLaunchCamera = async () => {
    setIsCameraPrimerVisible(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setIsSearchActive(true);
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
        processCapturedImage(result.assets[0]);
      }
    } catch (err: any) {
      setAnalysisError('Camera was closed or unavailable.');
    }
  };

  // Launch gallery flow
  const handleLaunchGallery = async () => {
    setIsCameraPrimerVisible(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setIsSearchActive(true);
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
        processCapturedImage(result.assets[0]);
      }
    } catch (err: any) {
      setAnalysisError('Photo selection was closed.');
    }
  };

  const processCapturedImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsAnalyzingImage(true);
    setAnalysisError(null);
    try {
      if (asset.base64) {
        await incrementDailyScan();
        const updatedStatus = await getDailyScanStatus();
        setScansRemaining(updatedStatus.remaining);

        const aiResult = await AIService.analyzeFoodImage(asset.base64);
        if (aiResult && aiResult.name) {
          const item: StarterFoodItem = {
            id: `scanned_${Date.now()}`,
            name: aiResult.name,
            icon: '🍽️',
            calories: aiResult.calories,
            proteinG: aiResult.protein,
            carbsG: aiResult.carbs,
            fatG: aiResult.fat,
            servingUnit: aiResult.servingUnit || 'serving',
            badge: 'AI Detected',
          };
          handleSelectFood(item, asset.uri);
          return;
        }
      }
      // If AI failed or not food, provide fallback from starter foods
      const fallback = starterFoods[0];
      handleSelectFood(fallback, asset.uri);
    } catch (err: any) {
      const mapped = AIErrorMapper.fromRawError(err);
      setAnalysisError(mapped.message);
      // Fallback to starter food so user is never blocked
      const fallback = starterFoods[0];
      handleSelectFood(fallback, asset.uri);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // SVG Ring calculation for celebration
  const radius = 72;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~452.38
  const strokeDashoffset = circumference * (1 - pctOfDaily / 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Header */}
        <OnboardingHeader
          onBack={viewMode === 'select' ? onBack : () => setViewMode('select')}
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          sectionProgress={sectionProgress}
        />

        {/* MODE 1: FOOD SELECTION */}
        {viewMode === 'select' && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section */}
            <View style={styles.titleContainer}>
              <Text style={styles.screenTitle}>
                {name ? `Let's log your first meal, ${name}.` : "Let's log your first meal."}
              </Text>
              <Text style={styles.screenSubtitle}>
                Takes about 10 seconds. See how it fits your daily budget.
              </Text>
            </View>

            {/* Meal Slot Selector */}
            <View style={styles.slotRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map(slot => {
                const isActive = mealSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => {
                      haptics.selection();
                      setMealSlot(slot);
                    }}
                    style={[
                      styles.slotPill,
                      isActive ? styles.slotPillActive : styles.slotPillInactive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Log as ${slot}`}
                    testID={`slot-${slot}`}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        isActive ? styles.slotTextActive : styles.slotTextInactive,
                      ]}
                    >
                      {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 1. Hero Card: Scan with AI Vision */}
            <Pressable
              onPress={() => {
                haptics.impactLight();
                setIsCameraPrimerVisible(true);
              }}
              style={({ pressed }) => [
                styles.scanCard,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scan with AI Vision"
              testID="scan-meal-card"
            >
              <View style={styles.scanCardContent}>
                <View style={styles.scanIconBadge}>
                  <Ionicons name="camera" size={24} color={Colors.onPrimary} />
                </View>

                <View style={styles.scanTextCol}>
                  <View style={styles.scanTagRow}>
                    <Text style={styles.scanCardTitle}>Scan with AI Vision</Text>
                    <View style={styles.scanLimitPill}>
                      <Ionicons name="sparkles" size={11} color={Colors.primary} />
                      <Text style={styles.scanLimitText}>
                        {scansRemaining} of 5 free today
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.scanCardSubtitle}>
                    Snap your plate to estimate calories & macros instantly
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </View>
            </Pressable>

            {/* 2. Quick Search Card */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search 1,000+ foods or drinks..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsSearchActive(true)}
                  testID="search-food-input"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* Real-time search dropdown results */}
              {isSearchActive && searchResults.length > 0 && (
                <View style={styles.searchResultsBox}>
                  {searchResults.map(item => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        const starter: StarterFoodItem = {
                          id: item.id,
                          name: item.name,
                          icon: item.icon || '🍽️',
                          calories: item.calories,
                          proteinG: item.protein,
                          carbsG: item.carbs,
                          fatG: item.fat,
                          servingUnit: item.servingUnit || 'serving',
                        };
                        handleSelectFood(starter);
                      }}
                      style={styles.searchResultRow}
                      testID={`search-result-${item.id}`}
                    >
                      <Text style={styles.searchResultIcon}>{item.icon || '🍽️'}</Text>
                      <View style={styles.searchResultTextCol}>
                        <Text style={styles.searchResultName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.searchResultMeta}>
                          {item.calories} kcal · {item.protein}g protein
                        </Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* 3. Quick-Pick Starter Grid */}
            <View style={styles.startersSection}>
              <View style={styles.startersHeader}>
                <Text style={styles.sectionLabel}>
                  Quick pick for {mealSlot}
                </Text>
                <Text style={styles.sectionHint}>Tap to log in 1s</Text>
              </View>

              <View style={styles.startersGrid}>
                {starterFoods.map(food => (
                  <Pressable
                    key={food.id}
                    onPress={() => handleSelectFood(food)}
                    style={({ pressed }) => [
                      styles.starterCard,
                      pressed && styles.cardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${food.name}`}
                    testID={`starter-chip-${food.id}`}
                  >
                    <View style={styles.starterTopRow}>
                      <Text style={styles.starterIcon}>{food.icon}</Text>
                      {food.badge && (
                        <View style={styles.starterBadge}>
                          <Text style={styles.starterBadgeText}>{food.badge}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.starterName} numberOfLines={2}>
                      {food.name}
                    </Text>

                    <View style={styles.starterBottomRow}>
                      <Text style={styles.starterCalories}>{food.calories} kcal</Text>
                      <Text style={styles.starterProtein}>{food.proteinG}g protein</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {/* MODE 2: PORTION REVIEW & CONFIRM */}
        {viewMode === 'review' && selectedFood && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.screenTitle}>Review your meal</Text>
              <Text style={styles.screenSubtitle}>
                Adjust the portion if needed, then confirm to log.
              </Text>
            </View>

            {/* Food Summary Card */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeaderRow}>
                <View style={styles.reviewIconBadge}>
                  <Text style={styles.reviewEmoji}>{selectedFood.icon}</Text>
                </View>
                <View style={styles.reviewTitleCol}>
                  <Text style={styles.reviewFoodName}>{selectedFood.name}</Text>
                  <View style={styles.reviewSlotTag}>
                    <Ionicons name="time-outline" size={13} color={Colors.primary} />
                    <Text style={styles.reviewSlotText}>
                      Logging as {mealSlot.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Calorie & Percent Banner */}
              <View style={styles.reviewCalorieBanner}>
                <View style={styles.calorieBigRow}>
                  <Text style={styles.reviewCalorieNumber}>{currentCals}</Text>
                  <Text style={styles.reviewCalorieUnit}>kcal</Text>
                </View>
                <Text style={styles.reviewCalorieSub}>
                  {pctOfDaily}% of your {dailyCalorieBudget.toLocaleString()} kcal goal
                </Text>
              </View>

              {/* Macro Tiles Duo */}
              <View style={styles.macroTrioRow}>
                <View style={styles.macroPillGreen}>
                  <Text style={styles.macroValueGreen}>{currentProtein}g</Text>
                  <Text style={styles.macroLabelGreen}>Protein</Text>
                </View>

                <View style={styles.macroPillYellow}>
                  <Text style={styles.macroValueYellow}>{currentCarbs}g</Text>
                  <Text style={styles.macroLabelYellow}>Carbs</Text>
                </View>

                <View style={styles.macroPillCoral}>
                  <Text style={styles.macroValueCoral}>{currentFat}g</Text>
                  <Text style={styles.macroLabelCoral}>Fat</Text>
                </View>
              </View>

              {/* Portion Stepper Controls */}
              <View style={styles.portionSection}>
                <Text style={styles.portionLabel}>Portion Size</Text>
                <View style={styles.portionChipsRow}>
                  {[0.5, 1.0, 1.5, 2.0].map(multiplier => {
                    const isSelected = portionMultiplier === multiplier;
                    return (
                      <Pressable
                        key={multiplier}
                        onPress={() => {
                          haptics.selection();
                          setPortionMultiplier(multiplier);
                        }}
                        style={[
                          styles.portionChip,
                          isSelected && styles.portionChipActive,
                        ]}
                        testID={`portion-${multiplier}`}
                      >
                        <Text
                          style={[
                            styles.portionChipText,
                            isSelected && styles.portionChipTextActive,
                          ]}
                        >
                          {multiplier}x
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Struggle insight line */}
              <View style={styles.insightBox}>
                <Ionicons name="sparkles" size={15} color={Colors.primary} style={styles.insightIcon} />
                <Text style={styles.insightText}>{struggleInsight}</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* MODE 3: CELEBRATION (THE AHA WIN MOMENT) */}
        {viewMode === 'celebrate' && selectedFood && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.celebrationContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(400)} style={styles.celebrationCenter}>
              {/* Day 1 Streak Badge */}
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={16} color={Colors.onPrimary} />
                <Text style={styles.streakBadgeText}>DAY 1 STREAK STARTED!</Text>
              </View>

              {/* Animated Calorie Progress Ring */}
              <View style={styles.ringWrapper}>
                <Svg width={180} height={180}>
                  {/* Track Background */}
                  <Circle
                    cx="90"
                    cy="90"
                    r={radius}
                    stroke={Colors.primaryLight}
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Active Fill */}
                  <Circle
                    cx="90"
                    cy="90"
                    r={radius}
                    stroke={Colors.primary}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 90 90)"
                  />
                </Svg>

                <View style={styles.ringCenterText}>
                  <Text style={styles.ringCalorieNumber}>{currentCals}</Text>
                  <Text style={styles.ringCalorieUnit}>of {dailyCalorieBudget} kcal</Text>
                </View>
              </View>

              {/* Victory Message */}
              <Text style={styles.celebrateTitle}>First meal logged!</Text>
              <Text style={styles.celebrateSubtitle}>
                That's {pctOfDaily}% of your daily goal done in one tap. You're already on track for your target.
              </Text>

              {/* Quick Summary Pill */}
              <View style={styles.celebratePillRow}>
                <Text style={styles.celebratePillEmoji}>{selectedFood.icon}</Text>
                <Text style={styles.celebratePillName}>{selectedFood.name}</Text>
                <Text style={styles.celebratePillCals}>{currentCals} kcal</Text>
              </View>
            </Animated.View>
          </ScrollView>
        )}

        {/* Footer Actions */}
        <View style={styles.footerContainer}>
          {viewMode === 'select' && (
            <Pressable
              onPress={onSkip}
              style={styles.skipButton}
              accessibilityRole="button"
              accessibilityLabel="Skip logging first meal for now"
              testID="btn-skip-first-meal"
            >
              <Text style={styles.skipButtonText}>I'll log later on Home</Text>
            </Pressable>
          )}

          {viewMode === 'review' && (
            <Pressable
              onPress={handleConfirmLog}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Confirm and log this meal"
              testID="btn-log-meal"
            >
              <Text style={styles.primaryButtonText}>Log this meal</Text>
            </Pressable>
          )}

          {viewMode === 'celebrate' && (
            <Pressable
              onPress={handleFinishCelebration}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save my plan and continue"
              testID="btn-save-plan"
            >
              <Text style={styles.primaryButtonText}>Save my plan & continue</Text>
            </Pressable>
          )}
        </View>

        {/* Camera Permission Primer Modal */}
        <Modal
          visible={isCameraPrimerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsCameraPrimerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.primerCard}>
              <View style={styles.primerSparkleRow}>
                <Ionicons name="sparkles" size={14} color={Colors.primary} />
                <Text style={styles.primerBadgeText}>AI MEAL VISION</Text>
              </View>

              <Text style={styles.primerTitle}>Scan your food in 3 seconds</Text>
              <Text style={styles.primerSubtitle}>
                Calorify uses your camera to estimate dishes and portions. Photos are processed strictly for nutritional analysis and never shared or sold.
              </Text>

              <View style={styles.primerActions}>
                <Pressable
                  onPress={handleLaunchCamera}
                  style={styles.primerCameraBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Take a photo with camera"
                  testID="btn-open-camera"
                >
                  <Ionicons name="camera" size={18} color={Colors.onPrimary} style={styles.btnIcon} />
                  <Text style={styles.primerCameraBtnText}>Take Photo</Text>
                </Pressable>

                <Pressable
                  onPress={handleLaunchGallery}
                  style={styles.primerGalleryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Choose photo from library"
                  testID="btn-open-gallery"
                >
                  <Ionicons name="images-outline" size={18} color={Colors.textPrimary} style={styles.btnIcon} />
                  <Text style={styles.primerGalleryBtnText}>Choose from Photos</Text>
                </Pressable>

                <Pressable
                  onPress={() => setIsCameraPrimerVisible(false)}
                  style={styles.primerCancelBtn}
                >
                  <Text style={styles.primerCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* AI Loading Modal Overlay */}
        {isAnalyzingImage && (
          <Modal transparent visible={isAnalyzingImage}>
            <View style={styles.modalBackdrop}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingTitle}>Analyzing your plate...</Text>
                <Text style={styles.loadingSubtitle}>
                  Calorify AI is estimating portions and macros
                </Text>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  titleContainer: {
    marginBottom: 20,
  },
  screenTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textSlate800,
    marginBottom: 8,
  },
  screenSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },

  // Meal Slot Selector
  slotRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  slotPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  slotPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  slotPillInactive: {
    backgroundColor: Colors.card,
    borderColor: Colors.borderSubtle,
  },
  slotText: {
    fontSize: 13,
  },
  slotTextActive: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.primary,
  },
  slotTextInactive: {
    fontFamily: Fonts.urbanist.medium,
    color: Colors.textSecondary,
  },

  // Hero Card: Scan AI
  scanCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: 16,
    marginBottom: 16,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  scanCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scanTextCol: {
    flex: 1,
    marginRight: 8,
  },
  scanTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  scanCardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  scanLimitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scanLimitText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.primaryDeep,
  },
  scanCardSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  // Search
  searchContainer: {
    marginBottom: 20,
    position: 'relative',
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  searchResultsBox: {
    marginTop: 6,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingVertical: 6,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceInset,
  },
  searchResultIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  searchResultTextCol: {
    flex: 1,
    marginRight: 8,
  },
  searchResultName: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  searchResultMeta: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // Starters Section
  startersSection: {
    marginBottom: 10,
  },
  startersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  sectionHint: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  startersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  starterCard: {
    width: '48.5%',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  starterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  starterIcon: {
    fontSize: 26,
  },
  starterBadge: {
    backgroundColor: Colors.surfaceInset,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  starterBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    color: Colors.textSlate600,
  },
  starterName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  starterBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  starterCalories: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  starterProtein: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Review Mode Card
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 20,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.stepsLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  reviewEmoji: {
    fontSize: 28,
  },
  reviewTitleCol: {
    flex: 1,
  },
  reviewFoodName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  reviewSlotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewSlotText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  reviewCalorieBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    marginBottom: 16,
  },
  calorieBigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  reviewCalorieNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 36,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  reviewCalorieUnit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  reviewCalorieSub: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.primaryDeep,
    marginTop: 2,
  },
  macroTrioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  macroPillGreen: {
    flex: 1,
    backgroundColor: Colors.proteinLight,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  macroValueGreen: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.proteinDark,
  },
  macroLabelGreen: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.proteinDark,
  },
  macroPillYellow: {
    flex: 1,
    backgroundColor: Colors.carbsLight,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  macroValueYellow: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.carbsDark,
  },
  macroLabelYellow: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.carbsDark,
  },
  macroPillCoral: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  macroValueCoral: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.fatDark,
  },
  macroLabelCoral: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.fatDark,
  },

  // Portion Stepper
  portionSection: {
    marginBottom: 16,
  },
  portionLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  portionChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  portionChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderInset,
    alignItems: 'center',
  },
  portionChipActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  portionChipText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  portionChipTextActive: {
    color: Colors.onPrimary,
  },

  // Insight Box
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceLow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderInset,
    gap: 8,
  },
  insightIcon: {
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSlate600,
  },

  // Celebration Mode
  celebrationContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  celebrationCenter: {
    width: '100%',
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  streakBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.onPrimary,
    letterSpacing: 0.5,
  },
  ringWrapper: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  ringCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCalorieNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 34,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  ringCalorieUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  celebrateTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 30,
    lineHeight: 38,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrateSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  celebratePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  celebratePillEmoji: {
    fontSize: 18,
  },
  celebratePillName: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  celebratePillCals: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.primary,
  },

  // Footer & Buttons
  footerContainer: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 12,
  },
  primaryButton: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: Colors.onPrimary,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlayScrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  primerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  primerSparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  primerBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.primaryDeep,
    letterSpacing: 0.5,
  },
  primerTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  primerSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  primerActions: {
    gap: 10,
  },
  primerCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primerCameraBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.onPrimary,
  },
  primerGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceInset,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primerGalleryBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  btnIcon: {
    marginRight: 8,
  },
  primerCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  primerCancelText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loadingCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  loadingTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
