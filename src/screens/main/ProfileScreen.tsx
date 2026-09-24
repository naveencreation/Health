import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  BackHandler,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useGoals } from '@/context/HealthContext';
import {
  ProfileHeaderCard,
  ProfileQuickNavGrid,
  ProfileMetricInspector,
  AvatarPickerModal,
} from '@/components';
import {
  AwardsScreen,
  MetabolicSummaryScreen,
  PreferencesScreen,
  GoalsScreen,
} from '@/screens/profile';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';

const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };

export type ProfileSubView = 'main' | 'awards' | 'summary' | 'preferences' | 'goals';

interface ProfileScreenProps {
  onSignIn?: () => void;
  onSignOut?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  initialScrollOffset?: number;
  onScrollPositionChange?: (offset: number) => void;
}

interface SlideInSubScreenProps {
  children: React.ReactNode;
  isClosing: boolean;
  onClosed: () => void;
  screenWidth: number;
  zIndex: number;
}

const SlideInSubScreen: React.FC<SlideInSubScreenProps> = ({
  children,
  isClosing,
  onClosed,
  screenWidth,
  zIndex,
}) => {
  const translateX = useSharedValue(screenWidth);

  useEffect(() => {
    translateX.value = withTiming(0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [screenWidth, translateX]);

  useEffect(() => {
    if (isClosing) {
      translateX.value = withTiming(
        screenWidth,
        {
          duration: 220,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(onClosed)();
          }
        }
      );
    }
  }, [isClosing, screenWidth, translateX, onClosed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.subScreenContainer, { zIndex }, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const ProfileScreenComponent: React.FC<ProfileScreenProps> = ({
  onSignIn,
  onSignOut,
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  const { width: screenWidth } = useWindowDimensions();

  const { userGoals, updateGoals } = useGoals();
  const { currentUser } = useAuth();

  // Navigation Sub-View Stack ('awards' | 'summary' | 'preferences' | 'goals')
  const [navStack, setNavStack] = useState<Exclude<ProfileSubView, 'main'>[]>([]);
  const [closingView, setClosingView] = useState<Exclude<ProfileSubView, 'main'> | null>(null);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

  const handleOpenSubView = useCallback((view: Exclude<ProfileSubView, 'main'>) => {
    if (closingView) return;
    setNavStack((prev) => {
      if (prev[prev.length - 1] === view) return prev;
      return [...prev, view];
    });
  }, [closingView]);

  const handleBack = useCallback(() => {
    if (navStack.length === 0 || closingView) return;
    const topView = navStack[navStack.length - 1];
    setClosingView(topView);
  }, [navStack, closingView]);

  const handleClosed = useCallback((view: Exclude<ProfileSubView, 'main'>) => {
    setNavStack((prev) => prev.filter((item) => item !== view));
    setClosingView((prev) => (prev === view ? null : prev));
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

  // Hardware Back Handler on Android
  useEffect(() => {
    const onBackPress = () => {
      if (navStack.length > 0) {
        handleBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [navStack.length, handleBack]);

  const renderSubScreenContent = (view: Exclude<ProfileSubView, 'main'>) => {
    switch (view) {
      case 'awards':
        return <AwardsScreen onBack={handleBack} />;
      case 'summary':
        return (
          <MetabolicSummaryScreen
            onBack={handleBack}
            onOpenGoals={() => handleOpenSubView('goals')}
          />
        );
      case 'preferences':
        return (
          <PreferencesScreen
            onBack={handleBack}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
          />
        );
      case 'goals':
        return <GoalsScreen onBack={handleBack} />;
      default:
        return null;
    }
  };

  // Derived Biometrics & Health Baseline
  const weightNum = userGoals.currentWeightKg || 74.2;
  const targetWeightNum = userGoals.targetWeightKg || 68.0;
  const startWeight = userGoals.startWeightKg || userGoals.currentWeightKg || weightNum;
  const heightNum = userGoals.heightCm || 178;
  const heightM = heightNum / 100;
  const bmi = (weightNum / (heightM * heightM)).toFixed(1);
  const bmiNum = parseFloat(bmi);

  const getBmiStatus = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (val < 25) return { label: 'Healthy Weight', color: '#16A34A' };
    if (val < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
  };

  const bmiStatus = getBmiStatus(bmiNum);
  const streakDays = userGoals.streakDays || 7;

  return (
    <View style={styles.rootContainer}>
      {/* 0. Dedicated Profile & Account Top App Bar - Completely blended with background */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          {/* Title: Clean static header title */}
          <View style={styles.headerTitleContainer}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
            >
              Profile & Account
            </Text>
          </View>

          {/* Right Action: Settings Gear Button */}
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed ? styles.btnPressed : null]}
            onPress={() => handleOpenSubView('preferences')}
            hitSlop={HIT_SLOP_8}
            accessibilityRole="button"
            accessibilityLabel="Open settings and preferences"
          >
            <Ionicons name="settings-outline" size={19} color="#0F172A" />
          </Pressable>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {/* 1. User Identity Card (Avatar + Name + Status + Streak) */}
        <ProfileHeaderCard
          name={currentUser?.name || userGoals.name || ''}
          email={currentUser?.email || (currentUser?.isGuest ? 'guest.user@calori.fit' : '')}
          avatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
          onEditAvatar={() => setAvatarPickerVisible(true)}
          isGuest={currentUser?.isGuest}
          onOpenSettings={() => handleOpenSubView('preferences')}
          streakDays={streakDays}
          showNav={false}
        />

        {/* 2. 2×2 Quick Navigation Matrix */}
        <ProfileQuickNavGrid
          streakDays={streakDays}
          calorieBudget={userGoals.dailyCalorieBudget}
          riaTone={userGoals.riaTone}
          onOpenAwards={() => handleOpenSubView('awards')}
          onOpenSummary={() => handleOpenSubView('summary')}
          onOpenPreferences={() => handleOpenSubView('preferences')}
          onOpenGoals={() => handleOpenSubView('goals')}
        />

        {/* 3. Interactive Biometric Telemetry Inspector */}
        <ProfileMetricInspector
          bmi={bmi}
          bmiStatus={bmiStatus}
          heightCm={heightNum}
          weightNum={weightNum}
          targetWeightNum={targetWeightNum}
          startWeight={startWeight}
          calorieBudget={userGoals.dailyCalorieBudget}
          targetProtein={userGoals.targetProtein}
          targetCarbs={userGoals.targetCarbs}
          targetFat={userGoals.targetFat}
          stepGoal={userGoals.stepGoal}
          waterGoal={userGoals.waterGoalMl}
          onOpenGoalsModal={() => handleOpenSubView('goals')}
        />
      </ScrollView>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        visible={avatarPickerVisible}
        currentAvatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
        onClose={() => setAvatarPickerVisible(false)}
        onSelectAvatar={(newUrl) => updateGoals({ avatarUrl: newUrl })}
      />

      {/* Full-Page Native Stack Sub-Screens (Awards, Summary, Preferences, Goals) */}
      {navStack.map((view, index) => (
        <SlideInSubScreen
          key={view}
          zIndex={10 + index}
          screenWidth={screenWidth}
          isClosing={closingView === view}
          onClosed={() => handleClosed(view)}
        >
          {renderSubScreenContent(view)}
        </SlideInSubScreen>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 56,
    justifyContent: 'center',
    zIndex: 10,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 26,
    lineHeight: 32,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120, // Clear bottom nav bar
    gap: 14,
  },
  subScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    ...(Platform.OS !== 'android'
      ? {
          shadowColor: '#0F172A',
          shadowOffset: { width: -3, height: 0 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        }
      : {}),
  },
});

export const ProfileScreen = React.memo(ProfileScreenComponent);
export const ProfileTab = ProfileScreen;
