import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import { Header, TopDateStrip, HeroCalorieCard, MealSection, TodayMetricGrid } from '@/components';
import { MealType } from '@/types';
import { Colors } from '@/theme/colors';

interface TodayScreenProps {
  onAddFood: (mealType: MealType) => void;
  onEditGoal?: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
  onSignInPress?: () => void;
  onOpenWaterTracker?: () => void;
  onOpenWeightTracker?: () => void;
  onOpenStepTracker?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  initialScrollOffset?: number;
  onScrollPositionChange?: (offset: number) => void;
}

const TodayScreenComponent: React.FC<TodayScreenProps> = ({
  onAddFood,
  onEditGoal,
  onSearchPress,
  onNotificationsPress,
  onAvatarPress,
  onSignInPress,
  onOpenWaterTracker,
  onOpenWeightTracker,
  onOpenStepTracker,
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  // Scroll tracking for in-place morphing header
  const scrollY = useSharedValue(0);
  const isScrolledSV = useSharedValue(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (initialScrollOffset > 0) {
        scrollRef?.current?.scrollTo({ y: initialScrollOffset, animated: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset, scrollRef]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollPositionChange?.(event.nativeEvent.contentOffset.y);
    },
    [onScrollPositionChange]
  );

  // 60fps UI-thread scroll handler; JS state only flips on threshold crossing
  const handleScroll = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
      const y = event.contentOffset.y;
      if (y > 35 && !isScrolledSV.value) {
        isScrolledSV.value = true;
        runOnJS(setIsScrolled)(true);
      } else if (y <= 35 && isScrolledSV.value) {
        isScrolledSV.value = false;
        runOnJS(setIsScrolled)(false);
      }
    },
  });

  return (
    <View style={styles.container}>
      {/* 0. Continuous Morphing Header (Always anchored, morphs in-place) */}
      <Header
        scrollY={scrollY}
        isScrolled={isScrolled}
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
        onAvatarPress={onAvatarPress}
        onSignInPress={onSignInPress}
      />

      {/* Main Scroll Content */}
      <Animated.ScrollView
        ref={scrollRef as any}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {/* 1. Client's Exact 7-Day Date Selector Strip */}
        <TopDateStrip />

        {/* 2. Hero Calorie Card */}
        <HeroCalorieCard onEditGoal={onEditGoal} />

        {/* 3. Meals Section (Breakfast, Lunch, Dinner, Snacks) */}
        <MealSection onAddFood={onAddFood} />

        {/* 4. Water, weight, BMI and steps at a glance */}
        <TodayMetricGrid
          onOpenWater={onOpenWaterTracker}
          onOpenWeight={onOpenWeightTracker}
          onOpenSteps={onOpenStepTracker}
          onEditGoal={onEditGoal}
        />
      </Animated.ScrollView>
    </View>
  );
};

export const TodayScreen = React.memo(TodayScreenComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
