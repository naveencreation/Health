import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  Animated,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  Header,
  TopDateStrip,
  HeroCalorieCard,
  MealSection,
  RiaCoachCard,
  DailyHabitsCard,
} from '@/components';
import { MealType } from '@/types';

interface TodayScreenProps {
  onAddFood: (mealType: MealType) => void;
  onOpenRiaChat: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
}

const TodayScreenComponent: React.FC<TodayScreenProps> = ({
  onAddFood,
  onOpenRiaChat,
  onSearchPress,
  onNotificationsPress,
  onAvatarPress,
  onSignInPress,
  onSignOutPress,
  scrollRef,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  // Scroll tracking for in-place morphing header
  const scrollY = useRef(new Animated.Value(0)).current;
  const isScrolledRef = useRef(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 750);
  }, []);

  // 60fps Native-driven scroll handler
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: Platform.OS !== 'web',
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        if (y > 35 && !isScrolledRef.current) {
          isScrolledRef.current = true;
          setIsScrolled(true);
        } else if (y <= 35 && isScrolledRef.current) {
          isScrolledRef.current = false;
          setIsScrolled(false);
        }
      },
    }
  );

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
        onSignOutPress={onSignOutPress}
      />

      {/* Main Scroll Content */}
      <Animated.ScrollView
        ref={scrollRef as any}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F47551"
            colors={['#F47551', '#CDE26D']}
          />
        }
      >
        {/* 1. Client's Exact 7-Day Date Selector Strip */}
        <TopDateStrip />

        {/* 2. Hero Calorie Card */}
        <HeroCalorieCard />

        {/* 3. Meals Section (Breakfast, Lunch, Dinner) */}
        <MealSection onAddFood={onAddFood} />

        {/* 4. Ria AI Nutritionist Coach Insights */}
        <RiaCoachCard onOpenChat={onOpenRiaChat} />

        {/* 5. Side-by-Side Habits: Hydration & Activity Dual Dials */}
        <DailyHabitsCard />
      </Animated.ScrollView>
    </View>
  );
};

export const TodayScreen = React.memo(TodayScreenComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
