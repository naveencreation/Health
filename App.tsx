import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Kurale_400Regular } from '@expo-google-fonts/kurale';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { HealthProvider, useHealth } from './src/context/HealthContext';
import { Colors } from './src/theme/colors';
import { Header } from './src/components/Header';
import { CalorieBudgetCard } from './src/components/CalorieBudgetCard';
import { DietJourneyChart } from './src/components/DietJourneyChart';
import { RiaCoachCard } from './src/components/RiaCoachCard';
import { MealSection } from './src/components/MealSection';
import { DailyHabitsCard } from './src/components/DailyHabitsCard';
import { DiaryTab } from './src/components/DiaryTab';
import { AnalyticsTab } from './src/components/AnalyticsTab';
import { ProfileTab } from './src/components/ProfileTab';
import { BottomNavBar, TabType } from './src/components/BottomNavBar';
import { FoodLogModal } from './src/components/FoodLogModal';
import { SearchFoodModal } from './src/components/SearchFoodModal';
import { NotificationModal } from './src/components/NotificationModal';
import { AvatarPickerModal } from './src/components/AvatarPickerModal';
import { RiaChatModal } from './src/components/RiaChatModal';
import { DEFAULT_AVATAR_URL } from './src/data/avatars';
import { MealType } from './src/types';

function MainApp() {
  const { addWater, userGoals, updateGoals } = useHealth();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [riaChatVisible, setRiaChatVisible] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.phoneContainer}>
        {/* Top Header */}
        <Header
          onSearchPress={() => setSearchModalVisible(true)}
          onNotificationsPress={() => setNotificationsVisible(true)}
          onAvatarPress={() => setAvatarModalVisible(true)}
        />

        {/* Tab Content */}
        <View style={styles.contentArea}>
          {activeTab === 'today' && (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Figma Hero Widget: Calorie Arc & Macro Triad */}
              <CalorieBudgetCard />

              {/* Figma Section: Track your diet journey area wave & days */}
              <DietJourneyChart />

              {/* Figma Frame 299 & Meal Slots: Date Picker situated directly above Meals */}
              <MealSection onAddFood={handleOpenFoodLogger} />

              {/* Ria AI Nutritionist Coach Insights */}
              <RiaCoachCard onOpenChat={() => setRiaChatVisible(true)} />

              {/* Side-by-Side Habits: Hydration & Activity Dual Dials */}
              <DailyHabitsCard />
            </ScrollView>
          )}

          {activeTab === 'diary' && <DiaryTab onAddFood={handleOpenFoodLogger} />}

          {activeTab === 'analytics' && <AnalyticsTab />}

          {activeTab === 'profile' && <ProfileTab />}
        </View>

        {/* Bottom Navigation */}
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onQuickLogFood={handleOpenFoodLogger}
          onQuickLogWater={handleQuickWater}
        />

        {/* Food Logging Modal (from meal slots or '+' button) */}
        <FoodLogModal
          visible={foodModalVisible}
          mealType={activeMealType}
          onClose={() => setFoodModalVisible(false)}
        />

        {/* Global Food Search Modal (from Header search icon) */}
        <SearchFoodModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
        />

        {/* Notification Center Modal (from Header bell icon) */}
        <NotificationModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />

        {/* Avatar Picker Modal (from Header avatar or Profile avatar) */}
        <AvatarPickerModal
          visible={avatarModalVisible}
          currentAvatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
          onClose={() => setAvatarModalVisible(false)}
          onSelectAvatar={(newUrl) => updateGoals({ avatarUrl: newUrl })}
        />

        {/* Ria AI Interactive Chat Modal (from Ria Coach card) */}
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
    <HealthProvider>
      <MainApp />
    </HealthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.card,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
    alignItems: 'center',
  },
  phoneContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480, // Clean mobile viewport frame on desktop browsers
    backgroundColor: Colors.background,
    // Add subtle shadow and border when viewed on wide desktop monitors
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
