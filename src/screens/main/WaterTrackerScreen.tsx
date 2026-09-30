import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import {
  TopDateStrip,
  HeroDropletCard,
  DailyWaterGoalModal,
  WaterHistoryCard,
  WaterBottomDock,
  CupSizeModal,
} from '@/components';
import { HeroDropletCardRef } from '@/components/water/HeroDropletCard';
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
  const { addWater } = useDailyLog();
  const heroDropletRef = useRef<HeroDropletCardRef>(null);

  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [isCupModalVisible, setIsCupModalVisible] = useState(false);
  const [cupSize, setCupSize] = useState<number>(300);
  const [beverageType, setBeverageType] = useState<string>('water');

  // Handle Android hardware back button
  useEffect(() => {
    const handleHardwareBack = () => {
      onBack();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack
    );
    return () => subscription.remove();
  }, [onBack]);

  const handleDrink = (amount: number, beverage: string) => {
    addWater(amount, beverage);
    heroDropletRef.current?.triggerSlosh('up');
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: Math.max(insets.top, 12) }]}>
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
            onPress={onOpenSettings}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Hydration settings and goals"
          >
            <Ionicons name="settings-outline" size={20} color={Colors.iconNavy} />
          </Pressable>
        </View>
      </View>

      {/* 2. Main Scroll Content Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 100, 120) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Reusable Top Date Strip in Water Mode (Blends directly into canvas like TodayScreen) */}
        <TopDateStrip metric="water" />

        {/* 2. Scaled Hero Droplet Card with Minute Curvature & Interactive Physics */}
        <HeroDropletCard
          ref={heroDropletRef}
          onOpenGoalModal={() => setIsGoalModalVisible(true)}
        />

        {/* 3. Chronological Hydration History & Empty State Card */}
        <WaterHistoryCard />
      </ScrollView>

      {/* 3. Sticky Bottom Action Dock */}
      <WaterBottomDock
        cupSize={cupSize}
        beverageType={beverageType}
        onDrink={handleDrink}
        onOpenCupSelector={() => setIsCupModalVisible(true)}
      />

      {/* 4. Daily Goal Editor Modal Sheet */}
      <DailyWaterGoalModal
        visible={isGoalModalVisible}
        onClose={() => setIsGoalModalVisible(false)}
      />

      {/* 5. Switch Cup Size & Beverage Picker Modal */}
      <CupSizeModal
        visible={isCupModalVisible}
        currentCupSize={cupSize}
        currentBeverage={beverageType}
        onClose={() => setIsCupModalVisible(false)}
        onSelect={(newSize, newBev) => {
          setCupSize(newSize);
          setBeverageType(newBev);
        }}
      />
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
    paddingTop: 8,
    gap: 14,
  },
});
