import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 750);
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#F47551"
          colors={['#F47551', '#CDE26D']}
        />
      }
    >
      {/* 0. Blended Header (Scrolls naturally off-screen with content) */}
      <Header
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
        onAvatarPress={onAvatarPress}
        onSignInPress={onSignInPress}
        onSignOutPress={onSignOutPress}
      />

      {/* 1. Top 7-Day Date Selector Strip (SUN to SAT with active obsidian capsule & circular ring) */}
      <TopDateStrip />

      {/* 2. Hero Calorie Card (Goal, Eaten & Burned, Cal left circular dial, Carb/Proteins/Fat bars) */}
      <HeroCalorieCard />

      {/* 3. Meals Section (Breakfast, Lunch, Dinner with live items & quick-add) */}
      <MealSection onAddFood={onAddFood} />

      {/* 4. Ria AI Nutritionist Coach Insights */}
      <RiaCoachCard onOpenChat={onOpenRiaChat} />

      {/* 5. Side-by-Side Habits: Hydration & Activity Dual Dials */}
      <DailyHabitsCard />
    </ScrollView>
  );
};

export const TodayScreen = React.memo(TodayScreenComponent);

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContent: {
    paddingBottom: 32,
  },
});


