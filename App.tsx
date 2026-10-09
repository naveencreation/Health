import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';

import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { HealthProvider, useAuth, useGoals } from '@/context/HealthContext';
import { OverlayProvider, useOverlay, OverlayHost } from '@/navigation';
import { Colors } from '@/theme/colors';
import { MealType } from '@/types';
import { NotificationScheduler } from '@/services/notifications/notificationScheduler';
import { Monitoring } from '@/services/monitoring';

// Structured Screens
import {
  WelcomeScreen,
  TodayScreen,
  TrackerScreen,
  AnalyticsScreen,
  ProfileScreen,
} from '@/screens';

// Components & Navigation
import {
  BottomNavBar,
  TabType,
  ErrorBoundary,
  AppLoadingScreen,
} from '@/components';

SplashScreen.preventAutoHideAsync();

function MainApp() {
  const { userGoals } = useGoals();
  const { isAuthenticated, isAuthLoading, logout } = useAuth();
  const { openModal, closeModal, activeModal } = useOverlay();
  const [activeTab, setActiveTab] = useState<TabType>('today');

  // Ref mirrors activeTab so callbacks never need activeTab in deps
  const activeTabRef = useRef<TabType>('today');
  const activeModalRef = useRef(activeModal);
  const scrollOffsetsRef = useRef<Record<TabType, number>>({
    today: 0,
    tracker: 0,
    analytics: 0,
    profile: 0,
  });
  const todayScrollRef = useRef<ScrollView>(null);
  const trackerScrollRef = useRef<ScrollView>(null);
  const analyticsScrollRef = useRef<ScrollView>(null);
  const profileScrollRef = useRef<ScrollView>(null);

  // Keep refs in sync with state & log screen view
  useEffect(() => {
    activeTabRef.current = activeTab;
    Monitoring.logScreenView(activeTab);
  }, [activeTab]);

  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  // Sync background habit notifications
  useEffect(() => {
    if (isAuthenticated) {
      NotificationScheduler.syncSchedules({
        streakDays: userGoals.streakDays || 0,
        hasLoggedMealsToday: false,
      }).catch(() => {});
    }
  }, [isAuthenticated, userGoals.streakDays]);

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'welcome' | 'signin' | 'signup'>('signin');
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    // Fonts are natively bundled into APK/app binary assets (0ms load time)
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // 1. Google Fonts CDN links with preconnect for optimal speed
      const linkId = 'calori-google-fonts';
      if (!document.getElementById(linkId)) {
        const preconnect1 = document.createElement('link');
        preconnect1.rel = 'preconnect';
        preconnect1.href = 'https://fonts.googleapis.com';
        document.head.appendChild(preconnect1);

        const preconnect2 = document.createElement('link');
        preconnect2.rel = 'preconnect';
        preconnect2.href = 'https://fonts.gstatic.com';
        preconnect2.crossOrigin = 'anonymous';
        document.head.appendChild(preconnect2);

        const fontLink = document.createElement('link');
        fontLink.id = linkId;
        fontLink.rel = 'stylesheet';
        fontLink.href =
          'https://fonts.googleapis.com/css2?family=Kurale&family=Poppins:wght@400;500;600;700&family=Urbanist:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700&display=swap';
        document.head.appendChild(fontLink);
      }

      // 2. Web styles & explicit @font-face aliases for native font names
      const styleId = 'calori-web-typography-and-scrollbars';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          /* Import modern Google Fonts dynamically on Web */
          @import url('https://fonts.googleapis.com/css2?family=Kurale&family=Urbanist:wght@400;500;600;700;800&display=swap');

          /* Map React Native static font names to loaded family */
          @font-face {
            font-family: 'Urbanist_400Regular';
            src: local('Urbanist Regular'), local('Urbanist-Regular'), local('Urbanist');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Urbanist_500Medium';
            src: local('Urbanist Medium'), local('Urbanist-Medium'), local('Urbanist');
            font-weight: 500;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Urbanist_600SemiBold';
            src: local('Urbanist SemiBold'), local('Urbanist-SemiBold'), local('Urbanist');
            font-weight: 600;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Urbanist_700Bold';
            src: local('Urbanist Bold'), local('Urbanist-Bold'), local('Urbanist');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Urbanist_800ExtraBold';
            src: local('Urbanist ExtraBold'), local('Urbanist-ExtraBold'), local('Urbanist');
            font-weight: 800;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Poppins_400Regular';
            src: local('Urbanist Regular'), local('Urbanist'), local('Poppins Regular');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Poppins_500Medium';
            src: local('Urbanist Medium'), local('Urbanist'), local('Poppins Medium');
            font-weight: 500;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Poppins_600SemiBold';
            src: local('Urbanist SemiBold'), local('Urbanist'), local('Poppins SemiBold');
            font-weight: 600;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Poppins_700Bold';
            src: local('Urbanist Bold'), local('Urbanist'), local('Poppins Bold');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Kurale_400Regular';
            src: local('Kurale Regular'), local('Kurale-Regular'), local('Kurale');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }

          /* Default modern sans-serif fallback (Urbanist first) */
          html, body, #root, div, span, text, input, button, textarea {
            font-family: Urbanist, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* Pure warm neutral backdrop for web desktop view */
          html, body, #root {
            background-color: #F4F1EA !important;
          }
          /* Hide scrollbars across Chrome, Safari, Edge, Firefox for pure mobile app feel */
          ::-webkit-scrollbar {
            display: none !important;
            width: 0px !important;
            height: 0px !important;
          }
          * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          /* Eliminate default browser square focus ring on all text inputs */
          input, textarea, select {
            outline: none !important;
            outline-style: none !important;
            outline-width: 0 !important;
            box-shadow: none !important;
          }
          input:focus, textarea:focus, select:focus {
            outline: none !important;
            outline-style: none !important;
            outline-width: 0 !important;
            box-shadow: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const handleOpenFoodLogger = useCallback(
    (mealType: MealType = 'lunch') => {
      openModal({ type: 'foodLog', initialMeal: mealType });
    },
    [openModal]
  );

  const handleGlobalSearchPress = useCallback(() => {
    const hour = new Date().getHours();
    let slot: MealType = 'lunch';
    if (hour < 11) slot = 'breakfast';
    else if (hour < 16) slot = 'lunch';
    else if (hour < 19) slot = 'snacks';
    else slot = 'dinner';
    handleOpenFoodLogger(slot);
  }, [handleOpenFoodLogger]);

  const handleTabChange = useCallback(
    (tab: TabType) => {
      closeModal();
      if (tab === 'today' && activeTabRef.current === 'today') {
        todayScrollRef.current?.scrollTo({ y: 0, animated: true });
      } else if (tab === 'tracker' && activeTabRef.current === 'tracker') {
        trackerScrollRef.current?.scrollTo({ y: 0, animated: true });
      } else if (tab === 'analytics' && activeTabRef.current === 'analytics') {
        analyticsScrollRef.current?.scrollTo({ y: 0, animated: true });
      } else if (tab === 'profile' && activeTabRef.current === 'profile') {
        profileScrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      setActiveTab(tab);
    },
    [closeModal]
  );

  const saveScrollOffset = useCallback((tab: TabType, offset: number) => {
    scrollOffsetsRef.current[tab] = Math.max(0, offset);
  }, []);
  const saveTodayScrollOffset = useCallback(
    (offset: number) => saveScrollOffset('today', offset),
    [saveScrollOffset]
  );
  const saveTrackerScrollOffset = useCallback(
    (offset: number) => saveScrollOffset('tracker', offset),
    [saveScrollOffset]
  );
  const saveAnalyticsScrollOffset = useCallback(
    (offset: number) => saveScrollOffset('analytics', offset),
    [saveScrollOffset]
  );
  const saveProfileScrollOffset = useCallback(
    (offset: number) => saveScrollOffset('profile', offset),
    [saveScrollOffset]
  );

  // Android Hardware Back Handler - Tab return when no modal is active
  useEffect(() => {
    const onHardwareBackPress = () => {
      if (activeModalRef.current !== null) {
        return false;
      }
      if (activeTabRef.current !== 'today') {
        setActiveTab('today');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, []);

  const handleOpenSignIn = useCallback(() => {
    setAuthInitialMode('signin');
    setAuthModalVisible(true);
  }, []);

  const handleSignOutPress = useCallback(() => {
    openModal({ type: 'signOutConfirm' });
  }, [openModal]);

  const handleConfirmSignOut = useCallback(async () => {
    setActiveTab('today');
    await logout();
    setAuthModalVisible(false);
  }, [logout]);

  const handleSignOutCompleted = useCallback(() => {
    setActiveTab('today');
    setAuthModalVisible(false);
  }, []);

  const handleOpenRiaChat = useCallback(() => openModal({ type: 'riaChat' }), [openModal]);
  const handleOpenNotifications = useCallback(() => openModal({ type: 'notifications' }), [openModal]);
  const handleOpenAvatarModal = useCallback(() => openModal({ type: 'avatarPicker' }), [openModal]);
  const handleOpenFoodVision = useCallback(() => openModal({ type: 'foodVision' }), [openModal]);
  const handleOpenWaterTracker = useCallback(() => openModal({ type: 'waterTracker' }), [openModal]);
  const handleOpenWeightTracker = useCallback(() => openModal({ type: 'weightTracker' }), [openModal]);
  const handleOpenStepTracker = useCallback(() => openModal({ type: 'stepTracker' }), [openModal]);

  const handleCloseAuthModal = useCallback(() => setAuthModalVisible(false), []);
  const handleOnboardingStart = useCallback(() => setIsOnboardingActive(true), []);
  const handleOnboardingEnd = useCallback(() => setIsOnboardingActive(false), []);

  const isDataReady = !isAuthLoading;

  // Healthify/Spotify UX pattern:
  // 1. Defer heavy dashboard mounting until brand reveal completes (600ms).
  //    Guarantees 100% of CPU/GPU headroom on JS thread for 60/120 FPS buttery motion.
  // 2. Minimum display time (950ms) for crisp brand appreciation, followed by 300ms dissolve.
  const [isContentMounted, setIsContentMounted] = useState(false);
  const [minDisplayElapsed, setMinDisplayElapsed] = useState(false);

  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setIsContentMounted(true);
    }, 600);

    const displayTimer = setTimeout(() => {
      setMinDisplayElapsed(true);
    }, 950);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(displayTimer);
    };
  }, []);

  const isAppReady = isDataReady && minDisplayElapsed;

  const loaderOpacity = useSharedValue(1);
  const [isOverlayMounted, setIsOverlayMounted] = useState(true);

  useEffect(() => {
    if (isAppReady && isOverlayMounted) {
      loaderOpacity.value = withTiming(0, { duration: 300 }, finished => {
        if (finished) {
          runOnJS(setIsOverlayMounted)(false);
        }
      });
    }
  }, [isAppReady, isOverlayMounted, loaderOpacity]);

  const renderContent = () => {
    if (!isAuthenticated || authModalVisible || isOnboardingActive) {
      return (
        <View style={styles.phoneContainer}>
          <WelcomeScreen
            key={authModalVisible ? `auth_modal_${authInitialMode}` : 'welcome_landing'}
            initialMode={authModalVisible ? authInitialMode : 'welcome'}
            onLoginSuccess={() => {
              setIsOnboardingActive(false);
              handleCloseAuthModal();
            }}
            onOnboardingStart={handleOnboardingStart}
            onOnboardingEnd={handleOnboardingEnd}
            onClose={isAuthenticated ? handleCloseAuthModal : undefined}
          />
        </View>
      );
    }

    return (
      <View style={styles.phoneContainer}>
        {/* Main tabs wrapped with top safe area; bottom handled by BottomNavBar */}
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Only the active tab is mounted; scroll offsets are retained in refs. */}
          <View style={styles.contentArea}>
            {activeTab === 'today' && (
              <TodayScreen
                scrollRef={todayScrollRef}
                initialScrollOffset={scrollOffsetsRef.current.today}
                onScrollPositionChange={saveTodayScrollOffset}
                onAddFood={handleOpenFoodLogger}
                onOpenRiaChat={handleOpenRiaChat}
                onSearchPress={handleGlobalSearchPress}
                onNotificationsPress={handleOpenNotifications}
                onAvatarPress={handleOpenAvatarModal}
                onSignInPress={handleOpenSignIn}
                onSignOutPress={handleSignOutPress}
              />
            )}

            {activeTab === 'tracker' && (
              <TrackerScreen
                scrollRef={trackerScrollRef}
                initialScrollOffset={scrollOffsetsRef.current.tracker}
                onScrollPositionChange={saveTrackerScrollOffset}
                onOpenRiaChat={handleOpenRiaChat}
                onOpenWaterTracker={handleOpenWaterTracker}
                onOpenWeightTracker={handleOpenWeightTracker}
                onOpenStepTracker={handleOpenStepTracker}
                onSearchPress={handleGlobalSearchPress}
                onNotificationsPress={handleOpenNotifications}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsScreen
                scrollRef={analyticsScrollRef}
                initialScrollOffset={scrollOffsetsRef.current.analytics}
                onScrollPositionChange={saveAnalyticsScrollOffset}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                scrollRef={profileScrollRef}
                initialScrollOffset={scrollOffsetsRef.current.profile}
                onScrollPositionChange={saveProfileScrollOffset}
                onSignIn={handleOpenSignIn}
                onSignOut={handleSignOutCompleted}
              />
            )}

            {/* Declarative Overlay & Sub-screen host mounted within contentArea */}
            <OverlayHost
              screenWidth={screenWidth}
              onConfirmSignOut={handleConfirmSignOut}
            />
          </View>

          {/* Bottom Navigation */}
          <BottomNavBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onOpenFoodVision={handleOpenFoodVision}
          />
        </SafeAreaView>
      </View>
    );
  };

  return (
    <View style={styles.rootContainer}>
      {isContentMounted && renderContent()}
      {isOverlayMounted && (
        <AppLoadingScreen
          isReady={true}
          fadeAnim={loaderOpacity}
          pointerEvents={isAppReady ? 'none' : 'auto'}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <HealthProvider>
          <OverlayProvider>
            <StatusBar style="dark" />
            <NavigationBar style="dark" />
            <MainApp />
          </OverlayProvider>
        </HealthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.background,
  },
  phoneContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Colors.background,
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: Colors.border,
        }
      : {}),
  },
  contentArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: Colors.background,
  },
});
