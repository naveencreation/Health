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
import {
  TopDateStrip,
  RiaCoachCard,
  WaterTracker,
  WeightTrackerCard,
  TodayBMICard,
  DailyHabitsCard,
} from '@/components';

export interface TrackerScreenProps {
  onOpenRiaChat?: () => void;
  onOpenWaterTracker?: () => void;
  onOpenWeightTracker?: () => void;
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

const TrackerScreenComponent: React.FC<TrackerScreenProps> = ({
  onOpenRiaChat,
  onOpenWaterTracker,
  onOpenWeightTracker,
  onSearchPress,
  onNotificationsPress,
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  const [refreshing, setRefreshing] = useState(false);
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

  // Title scaling from large down to compact
  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, 50], [0, -4], 'clamp') },
      { scale: interpolate(scrollY.value, [0, 50], [1, 0.85], 'clamp') },
    ],
  }));

  // Reveal subtitle only when scrolled past top
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [20, 50], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [20, 50], [4, 0], 'clamp') }],
  }));

  const { selectedDate } = useDailyLog();
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const isViewingToday = selectedDate === todayStr;

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

  const handleRiaChat = useCallback(() => {
    onOpenRiaChat?.();
  }, [onOpenRiaChat]);

  return (
    <View style={styles.rootContainer}>
      {/* 0. Dedicated Tracker Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Animated.View
            style={[
              { flex: 1, transformOrigin: 'left center', justifyContent: 'center' },
              titleStyle,
            ]}
          >
            <Text style={styles.headerTitle}>Trackers</Text>
          </Animated.View>

          {/* Quick Actions */}
          <View style={styles.headerRightActions}>
            {onSearchPress && (
              <Pressable
                style={({ pressed }) => [styles.circleBtn, pressed ? styles.btnPressed : null]}
                onPress={onSearchPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Search in trackers"
              >
                <Ionicons name="search-outline" size={18} color={Colors.iconNavy} />
              </Pressable>
            )}
            {onNotificationsPress && (
              <Pressable
                style={({ pressed }) => [styles.circleBtn, pressed ? styles.btnPressed : null]}
                onPress={onNotificationsPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={18} color={Colors.iconNavy} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Floating Subtitle on scroll */}
        <Animated.View style={[styles.subtitleContainer, subtitleStyle]} pointerEvents="none">
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {formattedDate} • Biometrics & Habits
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
        {/* 1. Date Selector Strip */}
        <TopDateStrip />

        {/* 2. Top Deck: Ria AI Coach Assistant */}
        <RiaCoachCard onOpenChat={handleRiaChat} />

        {/* 3. Water Tracker Droplet Card */}
        <WaterTracker onPressHeader={onOpenWaterTracker} />

        {/* 4. Weight Tracker Card */}
        <WeightTrackerCard onOpenFullTracker={onOpenWeightTracker} />

        {/* 5. Compact BMI Spectrum Card */}
        <TodayBMICard />

        {/* 6. Dual Dial Daily Habits (Hydration & Activity) */}
        <DailyHabitsCard />
      </Animated.ScrollView>
    </View>
  );
};

export const TrackerScreen = React.memo(TrackerScreenComponent);

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  headerContainer: {
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    minHeight: 64,
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 26,
    lineHeight: 32,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: 4,
    left: 16,
    right: 60,
  },
  headerSubtitle: {
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
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
    paddingBottom: 110, // Full clearance above floating bottom navigation bar
  },
});
