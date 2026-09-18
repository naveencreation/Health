import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Alert,
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
  Header,
  BottomNavBar,
  TabType,
  FoodLogModal,
  SearchFoodModal,
  NotificationModal,
  AvatarPickerModal,
  RiaChatModal,
  ErrorBoundary,
} from '@/components';

function MainApp() {
  const { addWater, userGoals, updateGoals, isAuthenticated, isAuthLoading, currentUser, logout } = useHealth();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [riaChatVisible, setRiaChatVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'welcome' | 'signin' | 'signup'>('signin');

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

  const handleOpenFoodLogger = (mealType: MealType) => {
    setActiveMealType(mealType);
    setFoodModalVisible(true);
  };

  const handleQuickWater = () => {
    addWater(250);
  };

  const handleOpenSignIn = () => {
    setAuthInitialMode('signin');
    setAuthModalVisible(true);
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out of Calori?');
      if (confirmed) {
        await logout();
        setAuthModalVisible(false);
      }
      return;
    }
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Calori?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            setAuthModalVisible(false);
          },
        },
      ]
    );
  };

  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || authModalVisible) {
    return (
      <WelcomeScreen
        initialMode={!isAuthenticated ? 'signin' : authInitialMode}
        onLoginSuccess={() => setAuthModalVisible(false)}
        onClose={isAuthenticated ? () => setAuthModalVisible(false) : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.phoneContainer}>
        {/* Top Header */}
        <Header
          onSearchPress={() => setSearchModalVisible(true)}
          onNotificationsPress={() => setNotificationsVisible(true)}
          onAvatarPress={() => setAvatarModalVisible(true)}
          onSignInPress={handleOpenSignIn}
          onSignOutPress={handleSignOut}
        />

        {/* Tab Content */}
        <View style={styles.contentArea}>
          {activeTab === 'today' && (
            <TodayScreen
              onAddFood={handleOpenFoodLogger}
              onOpenRiaChat={() => setRiaChatVisible(true)}
            />
          )}

          {activeTab === 'diary' && <DiaryScreen onAddFood={handleOpenFoodLogger} />}

          {activeTab === 'analytics' && <AnalyticsScreen />}

          {activeTab === 'profile' && (
            <ProfileScreen
              onSignIn={handleOpenSignIn}
              onSignOut={handleSignOut}
            />
          )}
        </View>

        {/* Bottom Navigation */}
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onQuickLogFood={handleOpenFoodLogger}
          onQuickLogWater={handleQuickWater}
        />

        {/* Food Logging Modal */}
        <FoodLogModal
          visible={foodModalVisible}
          mealType={activeMealType}
          onClose={() => setFoodModalVisible(false)}
        />

        {/* Global Food Search Modal */}
        <SearchFoodModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
        />

        {/* Notification Center Modal */}
        <NotificationModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />

        {/* Avatar Picker Modal */}
        <AvatarPickerModal
          visible={avatarModalVisible}
          currentAvatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
          onClose={() => setAvatarModalVisible(false)}
          onSelectAvatar={(newUrl) => updateGoals({ avatarUrl: newUrl })}
        />

        {/* Ria AI Interactive Chat Modal */}
        <RiaChatModal
          visible={riaChatVisible}
          onClose={() => setRiaChatVisible(false)}
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
    backgroundColor: Colors.card,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
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
  },
});
