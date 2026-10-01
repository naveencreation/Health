import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import {
  TopDateStrip,
  HeroDropletCard,
  DailyWaterGoalModal,
  WaterHistoryCard,
  CupSizeModal,
  HydrationSettingsModal,
  SlideInSubScreen,
} from '@/components';
import { HeroDropletCardRef } from '@/components/water/HeroDropletCard';
import { WaterIntakeHistoryScreen } from './WaterIntakeHistoryScreen';
import { useDailyLog } from '@/context/HealthContext';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export interface WaterTrackerScreenProps {
  onBack: () => void;
  onOpenSettings?: () => void;
}

export const WaterTrackerScreen: React.FC<WaterTrackerScreenProps> = ({
  onBack,
  onOpenSettings,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { selectedDate, dailyLogs, addWater } = useDailyLog();
  const heroDropletRef = useRef<HeroDropletCardRef>(null);

  const currentWater = dailyLogs[selectedDate]?.waterMl ?? 0;

  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [isCupModalVisible, setIsCupModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [cupSize, setCupSize] = useState<number>(300);
  const [beverageType, setBeverageType] = useState<string>('water');

  // Load saved container preferences (cupSize & beverageType)
  useEffect(() => {
    AsyncStorage.getItem('@calori_water_cup_pref')
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (typeof parsed.size === 'number' && parsed.size > 0) {
              setCupSize(parsed.size);
            }
            if (typeof parsed.beverage === 'string' && parsed.beverage) {
              setBeverageType(parsed.beverage);
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectCup = (newSize: number, newBev: string) => {
    setCupSize(newSize);
    setBeverageType(newBev);
    AsyncStorage.setItem(
      '@calori_water_cup_pref',
      JSON.stringify({ size: newSize, beverage: newBev })
    ).catch(() => {});
  };

  // Real-world today reference to guard against future date logging
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const isFutureDate = selectedDate > todayStr;

  // Dedicated Full-Screen Water Intake History sub-screen
  const [isHistoryScreenVisible, setIsHistoryScreenVisible] = useState(false);
  const [isClosingHistory, setIsClosingHistory] = useState(false);

  // Handle Android hardware back button
  useEffect(() => {
    const handleHardwareBack = () => {
      if (isHistoryScreenVisible) {
        setIsClosingHistory(true);
        return true;
      }
      onBack();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack
    );
    return () => subscription.remove();
  }, [onBack, isHistoryScreenVisible]);

  const handleDrink = (amount: number, beverage: string) => {
    if (isFutureDate) return;
    addWater(amount, beverage);
    heroDropletRef.current?.triggerSlosh('up');
  };

  const handleDeduct = (amount: number) => {
    if (isFutureDate || currentWater <= 0) return;
    addWater(-amount);
    heroDropletRef.current?.triggerSlosh('down');
  };

  const handlePressSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setIsSettingsModalVisible(true);
    }
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: 6 }]}>
      {/* 1. Top Navigation Bar */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [
              styles.circleNavBtn,
              pressed && styles.circleNavBtnPressed,
            ]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Back to today dashboard"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.iconNavy} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Water Tracker
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.circleNavBtn,
              pressed && styles.circleNavBtnPressed,
            ]}
            onPress={handlePressSettings}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Hydration settings and goals"
          >
            <Ionicons name="settings-outline" size={20} color={Colors.iconNavy} />
          </Pressable>
        </View>
      </View>

      {/* 2. Main Scrollable Dashboard Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Reusable Top Date Strip in Water Mode */}
        <TopDateStrip metric="water" />

        {/* Scaled Hero Droplet Card with Symmetrical Stepper Trio */}
        <HeroDropletCard
          ref={heroDropletRef}
          cupSize={cupSize}
          beverageType={beverageType}
          isFutureDate={isFutureDate}
          onDrink={handleDrink}
          onDeduct={handleDeduct}
          onOpenGoalModal={() => setIsGoalModalVisible(true)}
          onOpenCupSelector={() => setIsCupModalVisible(true)}
        />

        {/* Compact History Card Preview (3 items + View All) */}
        <WaterHistoryCard
          onViewAll={() => setIsHistoryScreenVisible(true)}
        />
      </ScrollView>

      {/* 5. Daily Goal Editor Modal Sheet */}
      <DailyWaterGoalModal
        visible={isGoalModalVisible}
        onClose={() => setIsGoalModalVisible(false)}
      />

      {/* 6. Switch Cup Size & Beverage Picker Modal */}
      <CupSizeModal
        visible={isCupModalVisible}
        currentCupSize={cupSize}
        currentBeverage={beverageType}
        onClose={() => setIsCupModalVisible(false)}
        onSelect={handleSelectCup}
      />

      {/* 7. Hydration Settings & Preferences Modal */}
      <HydrationSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        onOpenGoalModal={() => setIsGoalModalVisible(true)}
      />

      {/* 8. Dedicated Full-Screen Water Intake History Screen */}
      {isHistoryScreenVisible && (
        <SlideInSubScreen
          isClosing={isClosingHistory}
          onClosed={() => {
            setIsHistoryScreenVisible(false);
            setIsClosingHistory(false);
          }}
          screenWidth={Math.min(screenWidth, 480)}
          zIndex={200}
        >
          <WaterIntakeHistoryScreen onBack={() => setIsClosingHistory(true)} />
        </SlideInSubScreen>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: Colors.background,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  circleNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  circleNavBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    gap: 12,
  },
});
