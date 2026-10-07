import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';

import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { HealthProvider, useAuth, useGoals } from '@/context/HealthContext';
import { Colors } from '@/theme/colors';
import { MealType } from '@/types';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';
import { NotificationScheduler } from '@/services/notifications/notificationScheduler';

// Structured Screens
import {
  WelcomeScreen,
  TodayScreen,
  TrackerScreen,
  AnalyticsScreen,
  ProfileScreen,
  WaterTrackerScreen,
  WeightTrackerScreen,
  StepTrackerScreen,
} from '@/screens';

// Components, Navigation & Modals
import {
  BottomNavBar,
  TabType,
  FoodLogModal,
  NotificationModal,
  AvatarPickerModal,
  RiaChatModal,
  ConfirmationModal,
  ErrorBoundary,
  FoodVisionModal,
  BYOKSetupModal,
  AppLoadingScreen,
  SlideInSubScreen,
  BarcodeScannerModal,
} from '@/components';

SplashScreen.preventAutoHideAsync();

function MainApp() {
  const { userGoals, updateGoals } = useGoals();
  const { isAuthenticated, isAuthLoading, currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  // Ref mirrors activeTab so handleTabChange never needs activeTab in deps
  const activeTabRef = useRef<TabType>('today');
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

  // Keep ref in sync with state
  React.useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Sync background habit notifications
  useEffect(() => {
    if (isAuthenticated) {
      NotificationScheduler.syncSchedules({
        streakDays: userGoals.streakDays || 0,
        hasLoggedMealsToday: false,
      }).catch(() => {});
    }
  }, [isAuthenticated, userGoals.streakDays]);

  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [foodVisionVisible, setFoodVisionVisible] = useState(false);
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const [manualBarcodePrefill, setManualBarcodePrefill] = useState<string | null>(null);
  const [byokSetupVisible, setByokSetupVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [riaChatVisible, setRiaChatVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'welcome' | 'signin' | 'signup'>('signin');
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const [waterTrackerVisible, setWaterTrackerVisible] = useState(false);
  const [isClosingWaterTracker, setIsClosingWaterTracker] = useState(false);

  const handleOpenWaterTracker = useCallback(() => {
    setIsClosingWaterTracker(false);
    setWaterTrackerVisible(true);
  }, []);

  const handleCloseWaterTracker = useCallback(() => {
    setIsClosingWaterTracker(true);
  }, []);

  const handleWaterTrackerClosed = useCallback(() => {
    setIsClosingWaterTracker(false);
    setWaterTrackerVisible(false);
  }, []);

  const [weightTrackerVisible, setWeightTrackerVisible] = useState(false);
  const [isClosingWeightTracker, setIsClosingWeightTracker] = useState(false);

  const handleOpenWeightTracker = useCallback(() => {
    setIsClosingWeightTracker(false);
    setWeightTrackerVisible(true);
  }, []);

  const handleCloseWeightTracker = useCallback(() => {
    setIsClosingWeightTracker(true);
  }, []);

  const handleWeightTrackerClosed = useCallback(() => {
    setIsClosingWeightTracker(false);
    setWeightTrackerVisible(false);
  }, []);

  const [stepTrackerVisible, setStepTrackerVisible] = useState(false);
  const [isClosingStepTracker, setIsClosingStepTracker] = useState(false);

  const handleOpenStepTracker = useCallback(() => {
    setIsClosingStepTracker(false);
    setStepTrackerVisible(true);
  }, []);

  const handleCloseStepTracker = useCallback(() => {
    setIsClosingStepTracker(true);
  }, []);

  const handleStepTrackerClosed = useCallback(() => {
    setIsClosingStepTracker(false);
    setStepTrackerVisible(false);
  }, []);

  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

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

  const handleOpenFoodLogger = React.useCallback((mealType: MealType = 'lunch') => {
    setActiveMealType(mealType);
    setFoodModalVisible(true);
  }, []);

  const handleGlobalSearchPress = React.useCallback(() => {
    const hour = new Date().getHours();
    let slot: MealType = 'lunch';
    if (hour < 11) slot = 'breakfast';
    else if (hour < 16) slot = 'lunch';
    else if (hour < 19) slot = 'snacks';
    else slot = 'dinner';
    handleOpenFoodLogger(slot);
  }, [handleOpenFoodLogger]);

  const handleTabChange = React.useCallback(
    (tab: TabType) => {
      if (waterTrackerVisible) {
        handleCloseWaterTracker();
      }
      if (weightTrackerVisible) {
        handleCloseWeightTracker();
      }
      if (stepTrackerVisible) {
        handleCloseStepTracker();
      }
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
    [
      waterTrackerVisible,
      handleCloseWaterTracker,
      weightTrackerVisible,
      handleCloseWeightTracker,
      stepTrackerVisible,
      handleCloseStepTracker,
    ]
  );

  const saveScrollOffset = React.useCallback((tab: TabType, offset: number) => {
    scrollOffsetsRef.current[tab] = Math.max(0, offset);
  }, []);
  const saveTodayScrollOffset = React.useCallback(
    (offset: number) => saveScrollOffset('today', offset),
    [saveScrollOffset]
  );
  const saveTrackerScrollOffset = React.useCallback(
    (offset: number) => saveScrollOffset('tracker', offset),
    [saveScrollOffset]
  );
  const saveAnalyticsScrollOffset = React.useCallback(
    (offset: number) => saveScrollOffset('analytics', offset),
    [saveScrollOffset]
  );
  const saveProfileScrollOffset = React.useCallback(
    (offset: number) => saveScrollOffset('profile', offset),
    [saveScrollOffset]
  );

  // Refs for modal states so BackHandler subscription does not re-register on every toggle
  const modalStatesRef = useRef({
    foodModalVisible,
    foodVisionVisible,
    barcodeScannerVisible,
    byokSetupVisible,
    notificationsVisible,
    avatarModalVisible,
    riaChatVisible,
    authModalVisible,
    signOutModalVisible,
    waterTrackerVisible,
    weightTrackerVisible,
    stepTrackerVisible,
  });

  useEffect(() => {
    modalStatesRef.current = {
      foodModalVisible,
      foodVisionVisible,
      barcodeScannerVisible,
      byokSetupVisible,
      notificationsVisible,
      avatarModalVisible,
      riaChatVisible,
      authModalVisible,
      signOutModalVisible,
      waterTrackerVisible,
      weightTrackerVisible,
      stepTrackerVisible,
    };
  }, [
    foodModalVisible,
    foodVisionVisible,
    barcodeScannerVisible,
    byokSetupVisible,
    notificationsVisible,
    avatarModalVisible,
    riaChatVisible,
    authModalVisible,
    signOutModalVisible,
    waterTrackerVisible,
    weightTrackerVisible,
    stepTrackerVisible,
  ]);

  // Android Hardware Back Handler - Single stable subscription
  useEffect(() => {
    const onHardwareBackPress = () => {
      const ms = modalStatesRef.current;
      if (ms.waterTrackerVisible) {
        handleCloseWaterTracker();
        return true;
      }
      if (ms.weightTrackerVisible) {
        handleCloseWeightTracker();
        return true;
      }
      if (ms.stepTrackerVisible) {
        handleCloseStepTracker();
        return true;
      }
      if (ms.foodModalVisible) {
        setFoodModalVisible(false);
        return true;
      }
      if (ms.foodVisionVisible) {
        setFoodVisionVisible(false);
        return true;
      }
      if (ms.barcodeScannerVisible) {
        setBarcodeScannerVisible(false);
        return true;
      }
      if (ms.byokSetupVisible) {
        setByokSetupVisible(false);
        return true;
      }
      if (ms.notificationsVisible) {
        setNotificationsVisible(false);
        return true;
      }
      if (ms.avatarModalVisible) {
        setAvatarModalVisible(false);
        return true;
      }
      if (ms.riaChatVisible) {
        setRiaChatVisible(false);
        return true;
      }
      if (ms.authModalVisible) {
        setAuthModalVisible(false);
        return true;
      }
      if (ms.signOutModalVisible) {
        setSignOutModalVisible(false);
        return true;
      }

      if (activeTabRef.current !== 'today') {
        setActiveTab('today');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [handleCloseWaterTracker, handleCloseWeightTracker]);

  const handleOpenSignIn = React.useCallback(() => {
    setAuthInitialMode('signin');
    setAuthModalVisible(true);
  }, []);

  const handleSignOutPress = React.useCallback(() => {
    setSignOutModalVisible(true);
  }, []);

  const handleConfirmSignOut = React.useCallback(async () => {
    setSignOutModalVisible(false);
    setActiveTab('today');
    await logout();
    setAuthModalVisible(false);
  }, [logout]);

  const handleSignOutCompleted = React.useCallback(() => {
    setActiveTab('today');
    setAuthModalVisible(false);
  }, []);

  const handleOpenRiaChat = React.useCallback(() => setRiaChatVisible(true), []);
  const handleCloseRiaChat = React.useCallback(() => setRiaChatVisible(false), []);
  const handleOpenNotifications = React.useCallback(() => setNotificationsVisible(true), []);
  const handleCloseNotifications = React.useCallback(() => setNotificationsVisible(false), []);
  const handleOpenAvatarModal = React.useCallback(() => setAvatarModalVisible(true), []);
  const handleCloseAvatarModal = React.useCallback(() => setAvatarModalVisible(false), []);
  const handleSelectAvatar = React.useCallback(
    (newUrl: string) => updateGoals({ avatarUrl: newUrl }),
    [updateGoals]
  );
  const handleOpenFoodVision = React.useCallback(() => setFoodVisionVisible(true), []);
  const handleCloseFoodVision = React.useCallback(() => setFoodVisionVisible(false), []);
  const handleOpenBarcodeScanner = React.useCallback(() => setBarcodeScannerVisible(true), []);
  const handleCloseBarcodeScanner = React.useCallback(() => setBarcodeScannerVisible(false), []);
  const handleOpenBYOKSetup = React.useCallback(() => setByokSetupVisible(true), []);
  const handleCloseBYOKSetup = React.useCallback(() => setByokSetupVisible(false), []);
  const handleCloseFoodModal = React.useCallback(() => {
    setFoodModalVisible(false);
    setManualBarcodePrefill(null);
  }, []);
  const handleFoodModalToVision = React.useCallback(() => {
    setFoodModalVisible(false);
    setFoodVisionVisible(true);
  }, []);
  const handleFoodModalToBarcode = React.useCallback(() => {
    setFoodModalVisible(false);
    setBarcodeScannerVisible(true);
  }, []);
  const handleFoodVisionToModal = React.useCallback(() => {
    setFoodVisionVisible(false);
    setFoodModalVisible(true);
  }, []);
  const handleFoodVisionToBarcode = React.useCallback(() => {
    setFoodVisionVisible(false);
    setBarcodeScannerVisible(true);
  }, []);
  const handleBarcodeEnterManually = React.useCallback((barcode: string) => {
    setBarcodeScannerVisible(false);
    setManualBarcodePrefill(barcode);
    setFoodModalVisible(true);
  }, []);
  const handleCloseAuthModal = React.useCallback(() => setAuthModalVisible(false), []);
  const handleOnboardingStart = React.useCallback(() => setIsOnboardingActive(true), []);
  const handleOnboardingEnd = React.useCallback(() => setIsOnboardingActive(false), []);

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
  }, [isAppReady]);

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

            {/* Slide-In Water Tracker Sub-Screen (Mounted within contentArea so BottomNavBar remains visible) */}
            {waterTrackerVisible && (
              <SlideInSubScreen
                screenWidth={Math.min(screenWidth, 480)}
                isClosing={isClosingWaterTracker}
                onClosed={handleWaterTrackerClosed}
                zIndex={200}
              >
                <WaterTrackerScreen onBack={handleCloseWaterTracker} />
              </SlideInSubScreen>
            )}

            {/* Slide-In Weight Tracker Sub-Screen */}
            {weightTrackerVisible && (
              <SlideInSubScreen
                screenWidth={Math.min(screenWidth, 480)}
                isClosing={isClosingWeightTracker}
                onClosed={handleWeightTrackerClosed}
                zIndex={200}
              >
                <WeightTrackerScreen onBack={handleCloseWeightTracker} />
              </SlideInSubScreen>
            )}

            {/* Slide-In Step Tracker Sub-Screen */}
            {stepTrackerVisible && (
              <SlideInSubScreen
                screenWidth={Math.min(screenWidth, 480)}
                isClosing={isClosingStepTracker}
                onClosed={handleStepTrackerClosed}
                zIndex={200}
              >
                <StepTrackerScreen onBack={handleCloseStepTracker} />
              </SlideInSubScreen>
            )}
          </View>

          {/* Bottom Navigation */}
          <BottomNavBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onOpenFoodVision={handleOpenFoodVision}
          />
        </SafeAreaView>

        {/* Food Logging Modal */}
        <FoodLogModal
          visible={foodModalVisible}
          mealType={activeMealType}
          onClose={handleCloseFoodModal}
          onOpenFoodVision={handleFoodModalToVision}
          onOpenBarcodeScanner={handleFoodModalToBarcode}
          prefillBarcode={manualBarcodePrefill}
        />

        {/* AI Food Vision Camera Modal */}
        <FoodVisionModal
          visible={foodVisionVisible}
          onClose={handleCloseFoodVision}
          initialMealType={activeMealType}
          onOpenBYOKSetup={handleOpenBYOKSetup}
          onOpenManualSearch={handleFoodVisionToModal}
          onOpenBarcodeScanner={handleFoodVisionToBarcode}
        />

        {/* Packaged Food Barcode Scanner Modal */}
        <BarcodeScannerModal
          visible={barcodeScannerVisible}
          onClose={handleCloseBarcodeScanner}
          initialMealType={activeMealType}
          onEnterManually={handleBarcodeEnterManually}
        />

        {/* Global BYOK Setup Modal */}
        <BYOKSetupModal visible={byokSetupVisible} onClose={handleCloseBYOKSetup} />

        {/* Notification Center Modal */}
        <NotificationModal visible={notificationsVisible} onClose={handleCloseNotifications} />

        {/* Avatar Picker Modal */}
        <AvatarPickerModal
          visible={avatarModalVisible}
          currentAvatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
          onClose={handleCloseAvatarModal}
          onSelectAvatar={handleSelectAvatar}
        />

        {/* Ria AI Interactive Chat Modal */}
        <RiaChatModal
          visible={riaChatVisible}
          onClose={handleCloseRiaChat}
          onOpenBYOKSetup={handleOpenBYOKSetup}
        />

        {/* In-App Sign Out Confirmation Modal */}
        <ConfirmationModal
          visible={signOutModalVisible}
          title="Sign Out of Calorify?"
          message="You will need to sign back in to access your daily meal logs, streaks, and personalized coaching."
          confirmText="Sign Out"
          cancelText="Cancel"
          confirmStyle="destructive"
          iconName="log-out-outline"
          onConfirm={handleConfirmSignOut}
          onCancel={() => setSignOutModalVisible(false)}
        />
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
          <StatusBar style="dark" />
          <NavigationBar style="dark" />
          <MainApp />
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
    backgroundColor: Colors.background,
  },
});
