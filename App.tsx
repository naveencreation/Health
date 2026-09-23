import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Kurale_400Regular } from '@expo-google-fonts/kurale';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { HealthProvider, useAuth, useGoals, useDailyLog } from '@/context/HealthContext';
import { Colors } from '@/theme/colors';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';
import { MealType } from '@/types';

// Structured Screens
import {
  WelcomeScreen,
  TodayScreen,
  DiaryScreen,
  AnalyticsScreen,
  ProfileScreen,
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
} from '@/components';

SplashScreen.preventAutoHideAsync();

function MainApp() {
  const { addWater } = useDailyLog();
  const { userGoals, updateGoals } = useGoals();
  const { isAuthenticated, isAuthLoading, currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  // Ref mirrors activeTab so handleTabChange never needs activeTab in deps
  const activeTabRef = useRef<TabType>('today');
  const scrollOffsetsRef = useRef<Record<TabType, number>>({
    today: 0,
    diary: 0,
    analytics: 0,
    profile: 0,
  });
  const todayScrollRef = useRef<ScrollView>(null);
  const diaryScrollRef = useRef<ScrollView>(null);
  const analyticsScrollRef = useRef<ScrollView>(null);
  const profileScrollRef = useRef<ScrollView>(null);

  // Keep ref in sync with state
  React.useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [foodVisionVisible, setFoodVisionVisible] = useState(false);
  const [byokSetupVisible, setByokSetupVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [riaChatVisible, setRiaChatVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'welcome' | 'signin' | 'signup'>('signin');
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Kurale_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleId = 'calori-hide-scrollbars';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
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

  const handleQuickWater = React.useCallback(() => {
    addWater(250);
  }, [addWater]);

  const handleTabChange = React.useCallback((tab: TabType) => {
    if (tab === 'today' && activeTabRef.current === 'today') {
      todayScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'diary' && activeTabRef.current === 'diary') {
      diaryScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'analytics' && activeTabRef.current === 'analytics') {
      analyticsScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'profile' && activeTabRef.current === 'profile') {
      profileScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    setActiveTab(tab);
  }, []); // stable — reads activeTab via ref, not closure

  const saveScrollOffset = React.useCallback((tab: TabType, offset: number) => {
    scrollOffsetsRef.current[tab] = Math.max(0, offset);
  }, []);
  const saveTodayScrollOffset = React.useCallback((offset: number) => saveScrollOffset('today', offset), [saveScrollOffset]);
  const saveDiaryScrollOffset = React.useCallback((offset: number) => saveScrollOffset('diary', offset), [saveScrollOffset]);
  const saveAnalyticsScrollOffset = React.useCallback((offset: number) => saveScrollOffset('analytics', offset), [saveScrollOffset]);
  const saveProfileScrollOffset = React.useCallback((offset: number) => saveScrollOffset('profile', offset), [saveScrollOffset]);

  // Refs for modal states so BackHandler subscription does not re-register on every toggle
  const modalStatesRef = useRef({
    foodModalVisible,
    foodVisionVisible,
    byokSetupVisible,
    notificationsVisible,
    avatarModalVisible,
    riaChatVisible,
    authModalVisible,
    signOutModalVisible,
  });

  useEffect(() => {
    modalStatesRef.current = {
      foodModalVisible,
      foodVisionVisible,
      byokSetupVisible,
      notificationsVisible,
      avatarModalVisible,
      riaChatVisible,
      authModalVisible,
      signOutModalVisible,
    };
  }, [
    foodModalVisible,
    foodVisionVisible,
    byokSetupVisible,
    notificationsVisible,
    avatarModalVisible,
    riaChatVisible,
    authModalVisible,
    signOutModalVisible,
  ]);

  // Android Hardware Back Handler - Single stable subscription
  useEffect(() => {
    const onHardwareBackPress = () => {
      const ms = modalStatesRef.current;
      if (ms.foodModalVisible) { setFoodModalVisible(false); return true; }
      if (ms.foodVisionVisible) { setFoodVisionVisible(false); return true; }
      if (ms.byokSetupVisible) { setByokSetupVisible(false); return true; }
      if (ms.notificationsVisible) { setNotificationsVisible(false); return true; }
      if (ms.avatarModalVisible) { setAvatarModalVisible(false); return true; }
      if (ms.riaChatVisible) { setRiaChatVisible(false); return true; }
      if (ms.authModalVisible) { setAuthModalVisible(false); return true; }
      if (ms.signOutModalVisible) { setSignOutModalVisible(false); return true; }

      if (activeTabRef.current !== 'today') {
        setActiveTab('today');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, []);

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
  const handleSelectAvatar = React.useCallback((newUrl: string) => updateGoals({ avatarUrl: newUrl }), [updateGoals]);
  const handleOpenFoodVision = React.useCallback(() => setFoodVisionVisible(true), []);
  const handleCloseFoodVision = React.useCallback(() => setFoodVisionVisible(false), []);
  const handleOpenBYOKSetup = React.useCallback(() => setByokSetupVisible(true), []);
  const handleCloseBYOKSetup = React.useCallback(() => setByokSetupVisible(false), []);
  const handleCloseFoodModal = React.useCallback(() => setFoodModalVisible(false), []);
  const handleFoodModalToVision = React.useCallback(() => {
    setFoodModalVisible(false);
    setFoodVisionVisible(true);
  }, []);
  const handleCloseAuthModal = React.useCallback(() => setAuthModalVisible(false), []);

  const isFontsReady = fontsLoaded || fontError;

  if (!isFontsReady || isAuthLoading) {
    return (
      <AppLoadingScreen
        message={!isFontsReady ? 'Loading typography...' : 'Authenticating...'}
        subMessage="Preparing your personalized nutrition dashboard"
      />
    );
  }

  if (!isAuthenticated || authModalVisible) {
    return (
      <WelcomeScreen
        key={authModalVisible ? `auth_modal_${authInitialMode}` : 'welcome_landing'}
        initialMode={authModalVisible ? authInitialMode : 'welcome'}
        onLoginSuccess={handleCloseAuthModal}
        onClose={isAuthenticated ? handleCloseAuthModal : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneContainer}>
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

          {activeTab === 'diary' && (
            <DiaryScreen
              scrollRef={diaryScrollRef}
              initialScrollOffset={scrollOffsetsRef.current.diary}
              onScrollPositionChange={saveDiaryScrollOffset}
              onAddFood={handleOpenFoodLogger}
              onSearchPress={handleGlobalSearchPress}
              onNotificationsPress={handleOpenNotifications}
              onAvatarPress={handleOpenAvatarModal}
              onSignInPress={handleOpenSignIn}
              onSignOutPress={handleSignOutPress}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsScreen
              scrollRef={analyticsScrollRef}
              initialScrollOffset={scrollOffsetsRef.current.analytics}
              onScrollPositionChange={saveAnalyticsScrollOffset}
              onSearchPress={handleGlobalSearchPress}
              onNotificationsPress={handleOpenNotifications}
              onAvatarPress={handleOpenAvatarModal}
              onSignInPress={handleOpenSignIn}
              onSignOutPress={handleSignOutPress}
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
        </View>

        {/* Bottom Navigation */}
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onQuickLogFood={handleOpenFoodLogger}
          onQuickLogWater={handleQuickWater}
          onOpenFoodVision={handleOpenFoodVision}
        />

        {/* Food Logging Modal */}
        <FoodLogModal
          visible={foodModalVisible}
          mealType={activeMealType}
          onClose={handleCloseFoodModal}
          onOpenFoodVision={handleFoodModalToVision}
        />

        {/* AI Food Vision Camera Modal */}
        <FoodVisionModal
          visible={foodVisionVisible}
          onClose={handleCloseFoodVision}
          initialMealType={activeMealType}
          onOpenBYOKSetup={handleOpenBYOKSetup}
        />

        {/* Global BYOK Setup Modal */}
        <BYOKSetupModal
          visible={byokSetupVisible}
          onClose={handleCloseBYOKSetup}
        />

        {/* Notification Center Modal */}
        <NotificationModal
          visible={notificationsVisible}
          onClose={handleCloseNotifications}
        />

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
          title="Sign Out of Calori?"
          message="You will need to sign back in to access your daily meal logs, streaks, and personalized coaching."
          confirmText="Sign Out"
          cancelText="Cancel"
          confirmStyle="destructive"
          iconName="log-out-outline"
          onConfirm={handleConfirmSignOut}
          onCancel={() => setSignOutModalVisible(false)}
        />
      </View>
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  phoneContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: Colors.background,
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
