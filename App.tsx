import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Kurale_400Regular } from '@expo-google-fonts/kurale';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { HealthProvider, useHealth } from '@/context/HealthContext';
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

function MainApp() {
  const { addWater, userGoals, updateGoals, isAuthenticated, isAuthLoading, currentUser, logout } = useHealth();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [visitedTabs, setVisitedTabs] = useState<Record<TabType, boolean>>({
    today: true,
    diary: false,
    analytics: false,
    profile: false,
  });
  const todayScrollRef = useRef<ScrollView>(null);
  const diaryScrollRef = useRef<ScrollView>(null);
  const analyticsScrollRef = useRef<ScrollView>(null);
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

  const [fontsLoaded] = useFonts({
    Kurale_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      const linkId = 'calori-figma-google-fonts';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Kurale&family=Poppins:wght@400;500;600;700&display=swap';
        document.head.appendChild(link);
      }

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
    if (tab === 'today' && activeTab === 'today') {
      todayScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'diary' && activeTab === 'diary') {
      diaryScrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'analytics' && activeTab === 'analytics') {
      analyticsScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    setVisitedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
    setActiveTab(tab);
  }, [activeTab]);

  // Android Hardware Back Handler
  useEffect(() => {
    const onHardwareBackPress = () => {
      // 1. Modals priority: if any top-level modal is active, dismiss it first
      if (foodModalVisible) {
        setFoodModalVisible(false);
        return true;
      }
      if (foodVisionVisible) {
        setFoodVisionVisible(false);
        return true;
      }
      if (byokSetupVisible) {
        setByokSetupVisible(false);
        return true;
      }
      if (notificationsVisible) {
        setNotificationsVisible(false);
        return true;
      }
      if (avatarModalVisible) {
        setAvatarModalVisible(false);
        return true;
      }
      if (riaChatVisible) {
        setRiaChatVisible(false);
        return true;
      }
      if (authModalVisible) {
        setAuthModalVisible(false);
        return true;
      }
      if (signOutModalVisible) {
        setSignOutModalVisible(false);
        return true;
      }

      // 2. Tab hierarchy: if on a secondary tab, return to Today home tab
      if (activeTab !== 'today') {
        setActiveTab('today');
        return true;
      }

      // 3. Already on Today tab root: permit native exit
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [
    activeTab,
    foodModalVisible,
    foodVisionVisible,
    byokSetupVisible,
    notificationsVisible,
    avatarModalVisible,
    riaChatVisible,
    authModalVisible,
    signOutModalVisible,
  ]);

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
  const handleBackToToday = React.useCallback(() => handleTabChange('today'), [handleTabChange]);
  const handleCloseAuthModal = React.useCallback(() => setAuthModalVisible(false), []);

  const isFontsReady = Platform.OS === 'web' || fontsLoaded;

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
      <StatusBar style="dark" />
      {Platform.OS === 'android' ? (
        <RNStatusBar backgroundColor="#FAF9F6" barStyle="dark-content" />
      ) : null}
      <View style={styles.phoneContainer}>
        {/* Tab Content with Offscreen Preservation & Lazy Initial Mount */}
        <View style={styles.contentArea}>
          <View style={[styles.tabContainer, activeTab !== 'today' ? styles.tabHidden : null]}>
            <TodayScreen
              scrollRef={todayScrollRef}
              onAddFood={handleOpenFoodLogger}
              onOpenRiaChat={handleOpenRiaChat}
              onSearchPress={handleGlobalSearchPress}
              onNotificationsPress={handleOpenNotifications}
              onAvatarPress={handleOpenAvatarModal}
              onSignInPress={handleOpenSignIn}
              onSignOutPress={handleSignOutPress}
            />
          </View>

          {visitedTabs.diary && (
            <View style={[styles.tabContainer, activeTab !== 'diary' ? styles.tabHidden : null]}>
              <DiaryScreen
                scrollRef={diaryScrollRef}
                onAddFood={handleOpenFoodLogger}
                onSearchPress={handleGlobalSearchPress}
                onNotificationsPress={handleOpenNotifications}
                onAvatarPress={handleOpenAvatarModal}
                onSignInPress={handleOpenSignIn}
                onSignOutPress={handleSignOutPress}
              />
            </View>
          )}

          {visitedTabs.analytics && (
            <View style={[styles.tabContainer, activeTab !== 'analytics' ? styles.tabHidden : null]}>
              <AnalyticsScreen
                scrollRef={analyticsScrollRef}
                onSearchPress={handleGlobalSearchPress}
                onNotificationsPress={handleOpenNotifications}
                onAvatarPress={handleOpenAvatarModal}
                onSignInPress={handleOpenSignIn}
                onSignOutPress={handleSignOutPress}
              />
            </View>
          )}

          {visitedTabs.profile && (
            <View style={[styles.tabContainer, activeTab !== 'profile' ? styles.tabHidden : null]}>
              <ProfileScreen
                onSignIn={handleOpenSignIn}
                onSignOut={handleSignOutCompleted}
                onBack={handleBackToToday}
              />
            </View>
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
  tabContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabHidden: {
    display: 'none',
  },
});
