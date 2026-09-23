import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useDailyLog } from '@/context/HealthContext';
import { useGoals } from '@/context/HealthContext';
import { TopDateStrip, MealSection } from '@/components';
import { MealType } from '@/types';
import { AnimatedProgressBar } from '@/components/common/AnimatedProgressBar';

interface DiaryScreenProps {
  onAddFood: (mealType: MealType) => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  initialScrollOffset?: number;
  onScrollPositionChange?: (offset: number) => void;
}

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const DiaryScreenComponent: React.FC<DiaryScreenProps> = ({
  onAddFood,
  onSearchPress,
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  // Scroll tracking to reveal date subtitle only when scrolled
  const scrollY = useSharedValue(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 750);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (initialScrollOffset > 0) {
        scrollRef?.current?.scrollTo({ y: initialScrollOffset, animated: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset, scrollRef]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollPositionChange?.(event.nativeEvent.contentOffset.y);
  }, [onScrollPositionChange]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Title scaling from large (1.0) down to compact (0.78)
  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, 50], [0, -4], 'clamp') },
      { scale: interpolate(scrollY.value, [0, 50], [1, 0.78], 'clamp') },
    ],
  }));

  // Reveal subtitle only when scrolled past the visible TopDateStrip
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [20, 50], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [20, 50], [4, 0], 'clamp') }],
  }));

  const {
    currentLog,
    totalConsumed,
    totalBurned,
    totalProtein,
    totalCarbs,
    totalFat,
    totalFiber,
    remainingCalories,
    selectedDate,
    setSelectedDate,
  } = useDailyLog();
  const { userGoals } = useGoals();

  const todayStr = useMemo(() => toDateString(new Date()), []);
  const isViewingToday = selectedDate === todayStr;

  // Format date display for Diary Header (e.g. "Today, 21 Sep" or "Mon, 15 Sep")
  const formattedDate = useMemo(() => {
    if (!selectedDate) return 'Today';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayName = SHORT_DAY_NAMES[d.getDay()];
      const monthName = SHORT_MONTHS[d.getMonth()];
      const dayNum = d.getDate();
      return isViewingToday ? `Today, ${dayNum} ${monthName}` : `${dayName}, ${dayNum} ${monthName}`;
    }
    return selectedDate;
  }, [selectedDate, isViewingToday]);

  const totalItemsLogged = currentLog.meals.length;
  const targetProtein = userGoals.targetProtein || 90;
  const targetCarbs = userGoals.targetCarbs || 110;
  const targetFat = userGoals.targetFat || 70;
  const targetFiber = userGoals.targetFiber || 30;
  const calorieBudget = userGoals.dailyCalorieBudget || 2200;

  const isOverBudget = remainingCalories < 0;
  const effectiveBudget = calorieBudget + totalBurned;
  const calorieFillPct = Math.min(100, Math.max(0, Math.round((totalConsumed / Math.max(1, effectiveBudget)) * 100)));

  const carbsPct = Math.min(100, Math.max(0, Math.round((totalCarbs / Math.max(1, targetCarbs)) * 100)));
  const proteinPct = Math.min(100, Math.max(0, Math.round((totalProtein / Math.max(1, targetProtein)) * 100)));
  const fatPct = Math.min(100, Math.max(0, Math.round((totalFat / Math.max(1, targetFat)) * 100)));

  return (
    <View style={styles.rootContainer}>
      {/* 0. Dedicated Nutrition Diary Header */}
      <View style={styles.diaryHeaderContainer}>
        <View style={styles.diaryHeaderMainRow}>
          {/* Left Title in Animated.View (Exact same center line as Search button!) */}
          <Animated.View
            style={[
              { flex: 1, transformOrigin: 'left center', justifyContent: 'center' },
              titleStyle,
            ]}
          >
            <Text style={styles.diaryHeaderTitle}>Nutrition Diary</Text>
          </Animated.View>

          {/* Right: Quick Search Log Action */}
          <Pressable
            style={({ pressed }) => [styles.circleBtn, pressed ? styles.btnPressed : null]}
            onPress={onSearchPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Search foods in diary"
          >
            <Ionicons name="search-outline" size={18} color="#0F172A" />
          </Pressable>
        </View>

        {/* Floating Subtitle (Revealed on Scroll, 0px footprint at rest so it never misaligns the title!) */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            subtitleStyle,
          ]}
          pointerEvents="none"
        >
          <Text style={styles.diaryHeaderSubtitle} numberOfLines={1}>
            {formattedDate} • {totalItemsLogged} {totalItemsLogged === 1 ? 'item' : 'items'}
          </Text>
        </Animated.View>
      </View>

      {/* Main Scroll Content */}
      <Animated.ScrollView
        ref={scrollRef as any}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F47551"
            colors={['#F47551', '#CDE26D']}
          />
        }
      >
        {/* 1. Top 7-Day Date Selector Strip (SUN to SAT with active obsidian capsule & circular ring) */}
        <TopDateStrip />

        {/* 2. Compact Nutrition Telemetry Strip (~84px tall) */}
        <View style={styles.telemetryCard}>
          {/* Top Row: Calories Left / Over on Left, Telemetry on Right */}
          <View style={styles.telemetryHeaderRow}>
            <View style={styles.telemetryLeftCol}>
              <View style={[styles.statusDot, isOverBudget ? styles.statusDotOver : styles.statusDotOk]} />
              <Text style={[styles.telemetryCalVal, isOverBudget ? styles.telemetryCalOver : null]}>
                {Math.abs(remainingCalories).toLocaleString()}
              </Text>
              <Text style={styles.telemetryCalUnit}>
                {isOverBudget ? 'kcal over' : 'kcal left'}
              </Text>
            </View>

            <View style={styles.telemetryRightCol}>
              <Text style={styles.telemetryStatItem}>
                Eaten <Text style={styles.telemetryStatBold}>{totalConsumed.toLocaleString()}</Text>
              </Text>
              <Text style={styles.telemetryStatDivider}>•</Text>
              <Text style={styles.telemetryStatItem}>
                Goal <Text style={styles.telemetryStatBold}>{calorieBudget.toLocaleString()}</Text>
              </Text>
            </View>
          </View>

          {/* Middle Row: Continuous Calorie Budget Progress Bar */}
          <View
            style={styles.telemetryTrackWrap}
            accessible={true}
            accessibilityLabel={`Calorie budget: ${calorieFillPct}% consumed. ${totalConsumed} of ${effectiveBudget} kilocalories`}
          >
            <AnimatedProgressBar
              progress={totalConsumed / Math.max(1, effectiveBudget)}
              fillColor={isOverBudget ? '#F47551' : '#22C55E'}
              height={5}
              trackColor="#F1F5F9"
            />
          </View>

          {/* Bottom Row: Responsive Equal Macro Columns */}
          <View style={styles.macroStripRow}>
            {/* Carbs Column */}
            <View
              style={styles.macroCol}
              accessible={true}
              accessibilityLabel={`Carbohydrates: ${Math.round(totalCarbs)}g of ${targetCarbs}g`}
            >
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroNameText}>CARBS</Text>
                <Text style={styles.macroGramsText}>{Math.round(totalCarbs)}<Text style={styles.macroTargetText}>/{targetCarbs}g</Text></Text>
              </View>
              <AnimatedProgressBar
                progress={(totalCarbs || 0) / Math.max(1, targetCarbs)}
                fillColor="#EAB308"
                height={3.5}
                trackColor="#FEF9C3"
              />
            </View>

            {/* Protein Column */}
            <View
              style={styles.macroCol}
              accessible={true}
              accessibilityLabel={`Protein: ${Math.round(totalProtein)}g of ${targetProtein}g`}
            >
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroNameText}>PROTEIN</Text>
                <Text style={styles.macroGramsText}>{Math.round(totalProtein)}<Text style={styles.macroTargetText}>/{targetProtein}g</Text></Text>
              </View>
              <AnimatedProgressBar
                progress={(totalProtein || 0) / Math.max(1, targetProtein)}
                fillColor="#22C55E"
                height={3.5}
                trackColor="#DCFCE7"
              />
            </View>

            {/* Fat Column */}
            <View
              style={styles.macroCol}
              accessible={true}
              accessibilityLabel={`Fat: ${Math.round(totalFat)}g of ${targetFat}g`}
            >
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroNameText}>FAT</Text>
                <Text style={styles.macroGramsText}>{Math.round(totalFat)}<Text style={styles.macroTargetText}>/{targetFat}g</Text></Text>
              </View>
              <AnimatedProgressBar
                progress={(totalFat || 0) / Math.max(1, targetFat)}
                fillColor="#F47551"
                height={3.5}
                trackColor="#FFE4D6"
              />
            </View>

            {/* Fiber Column */}
            <View
              style={styles.macroCol}
              accessible={true}
              accessibilityLabel={`Fiber: ${Math.round(totalFiber)}g of ${targetFiber}g`}
            >
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroNameText}>FIBER</Text>
                <Text style={styles.macroGramsText}>{Math.round(totalFiber)}<Text style={styles.macroTargetText}>/{targetFiber}g</Text></Text>
              </View>
              <AnimatedProgressBar
                progress={(totalFiber || 0) / Math.max(1, targetFiber)}
                fillColor="#0D9488"
                height={3.5}
                trackColor="#CCFBF1"
              />
            </View>
          </View>
        </View>

        {/* Meals List (Breakfast, Lunch, Dinner) */}
        <MealSection onAddFood={onAddFood} />
      </Animated.ScrollView>
    </View>
  );
};

export const DiaryScreen = React.memo(DiaryScreenComponent);
export const DiaryTab = DiaryScreen;

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  diaryHeaderContainer: {
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    minHeight: 64,
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
  },
  diaryHeaderMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  diaryHeaderTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 26,
    lineHeight: 32,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: 4,
    left: 16,
    right: 60,
  },
  diaryHeaderSubtitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    includeFontPadding: false,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  content: {
    paddingBottom: 110, // Ensures full clearance above floating bottom navigation bar
  },
  telemetryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  telemetryLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOk: {
    backgroundColor: '#22C55E',
  },
  statusDotOver: {
    backgroundColor: '#F47551',
  },
  telemetryCalVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  telemetryCalOver: {
    color: '#F47551',
  },
  telemetryCalUnit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#64748B',
  },
  telemetryRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryStatItem: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  telemetryStatBold: {
    fontFamily: Fonts.poppins.semiBold,
    color: '#0F172A',
  },
  telemetryStatDivider: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  telemetryTrackWrap: {
    marginBottom: 10,
  },
  macroStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  macroCol: {
    flex: 1,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  macroNameText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 9.5,
    color: '#64748B',
    letterSpacing: 0.3,
  },
  macroGramsText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#0F172A',
  },
  macroTargetText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 9.5,
    color: '#94A3B8',
  },
});
