import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MealType } from '@/types';

export type TabType = 'today' | 'diary' | 'analytics' | 'profile';

interface BottomNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onQuickLogFood: (mealType: MealType) => void;
  onQuickLogWater: () => void;
  onOpenFoodVision?: () => void;
}

const BottomNavBarComponent: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  onQuickLogFood,
  onQuickLogWater,
  onOpenFoodVision,
}) => {
  const [quickSheetVisible, setQuickSheetVisible] = useState(false);

  const handleSelectQuickMeal = (mealType: MealType) => {
    setQuickSheetVisible(false);
    onQuickLogFood(mealType);
  };

  const handleSelectQuickWater = () => {
    setQuickSheetVisible(false);
    onQuickLogWater();
  };

  return (
    <>
      {/* Frame 297: Bottom Bar with Micro-Labels */}
      <View style={styles.barContainer}>
        {/* Tab 1: Today */}
        <Pressable
          style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
          onPress={() => onTabChange('today')}
          accessibilityRole="tab"
          accessibilityLabel="Today"
          accessibilityState={{ selected: activeTab === 'today' }}
        >
          <Ionicons
            name={activeTab === 'today' ? 'home' : 'home-outline'}
            size={20}
            color={activeTab === 'today' ? Colors.iconNavy : '#8E95A2'}
          />
          <Text style={[styles.tabLabel, activeTab === 'today' ? styles.tabLabelActive : null]}>
            Today
          </Text>
        </Pressable>

        {/* Tab 2: Meals Diary (book-outline) */}
        <Pressable
          style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
          onPress={() => onTabChange('diary')}
          accessibilityRole="tab"
          accessibilityLabel="Meals Diary"
          accessibilityState={{ selected: activeTab === 'diary' }}
        >
          <Ionicons
            name={activeTab === 'diary' ? 'book' : 'book-outline'}
            size={20}
            color={activeTab === 'diary' ? Colors.iconNavy : '#8E95A2'}
          />
          <Text style={[styles.tabLabel, activeTab === 'diary' ? styles.tabLabelActive : null]}>
            Diary
          </Text>
        </Pressable>

        {/* Center Floating Action Button: Ellipse 7 (56.49px x 56.49px, #CDE26D Lime/Avocado Green) */}
        <View style={styles.centerFabAnchor}>
          <Pressable
            style={({ pressed }) => [styles.centerFab, pressed ? styles.fabPressed : null]}
            onPress={() => setQuickSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Log food or water"
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Tab 3: Analytics */}
        <Pressable
          style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
          onPress={() => onTabChange('analytics')}
          accessibilityRole="tab"
          accessibilityLabel="Analytics and Trends"
          accessibilityState={{ selected: activeTab === 'analytics' }}
        >
          <Ionicons
            name={activeTab === 'analytics' ? 'bar-chart' : 'bar-chart-outline'}
            size={20}
            color={activeTab === 'analytics' ? Colors.iconNavy : '#8E95A2'}
          />
          <Text style={[styles.tabLabel, activeTab === 'analytics' ? styles.tabLabelActive : null]}>
            Analytics
          </Text>
        </Pressable>

        {/* Tab 4: User Profile */}
        <Pressable
          style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
          onPress={() => onTabChange('profile')}
          accessibilityRole="tab"
          accessibilityLabel="Profile and Goals"
          accessibilityState={{ selected: activeTab === 'profile' }}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={20}
            color={activeTab === 'profile' ? Colors.iconNavy : '#8E95A2'}
          />
          <Text style={[styles.tabLabel, activeTab === 'profile' ? styles.tabLabelActive : null]}>
            Profile
          </Text>
        </Pressable>
      </View>

      {/* Quick Action Sheet Modal */}
      <Modal
        visible={quickSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.backdropDismiss}
            onPress={() => setQuickSheetVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss quick log sheet"
          />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log Nutrition & Habits</Text>
            <Text style={styles.sheetSubtitle}>Choose what you want to add</Text>

            {/* Featured: AI Food Vision Camera Snap */}
            {onOpenFoodVision ? (
              <Pressable
                style={({ pressed }) => [styles.visionHeroBtn, pressed ? styles.visionHeroBtnPressed : null]}
                onPress={() => {
                  setQuickSheetVisible(false);
                  onOpenFoodVision();
                }}
                accessibilityRole="button"
                accessibilityLabel="AI Snap & Log Meal"
              >
                <View style={styles.visionHeroIconBox}>
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.visionHeroTextBox}>
                  <View style={styles.visionHeroTagRow}>
                    <Text style={styles.visionHeroTag}>AI POWERED</Text>
                    <View style={styles.visionHeroSparkle}>
                      <Ionicons name="sparkles" size={10} color="#F47551" />
                    </View>
                  </View>
                  <Text style={styles.visionHeroTitle}>AI Snap & Log Meal</Text>
                  <Text style={styles.visionHeroSubtitle}>
                    Instant calorie, protein & macro calculation from a photo
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#F47551" />
              </Pressable>
            ) : null}

            <View style={styles.quickGrid}>
              <Pressable
                style={({ pressed }) => [styles.quickActionItem, pressed ? styles.quickActionItemPressed : null]}
                onPress={() => handleSelectQuickMeal('breakfast')}
                accessibilityRole="button"
                accessibilityLabel="Log breakfast"
              >
                <View style={[styles.quickActionIcon, styles.iconBgBreakfast]}>
                  <Ionicons name="sunny" size={24} color="#EA580C" />
                </View>
                <Text style={styles.quickActionLabel}>Breakfast</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickActionItem, pressed ? styles.quickActionItemPressed : null]}
                onPress={() => handleSelectQuickMeal('lunch')}
                accessibilityRole="button"
                accessibilityLabel="Log lunch"
              >
                <View style={[styles.quickActionIcon, styles.iconBgLunch]}>
                  <Ionicons name="restaurant" size={24} color="#10B981" />
                </View>
                <Text style={styles.quickActionLabel}>Lunch</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickActionItem, pressed ? styles.quickActionItemPressed : null]}
                onPress={() => handleSelectQuickMeal('snacks')}
                accessibilityRole="button"
                accessibilityLabel="Log snacks"
              >
                <View style={[styles.quickActionIcon, styles.iconBgSnacks]}>
                  <Ionicons name="cafe" size={24} color="#D97706" />
                </View>
                <Text style={styles.quickActionLabel}>Snacks</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickActionItem, pressed ? styles.quickActionItemPressed : null]}
                onPress={() => handleSelectQuickMeal('dinner')}
                accessibilityRole="button"
                accessibilityLabel="Log dinner"
              >
                <View style={[styles.quickActionIcon, styles.iconBgDinner]}>
                  <Ionicons name="moon" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.quickActionLabel}>Dinner</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickActionItem, pressed ? styles.quickActionItemPressed : null]}
                onPress={handleSelectQuickWater}
                accessibilityRole="button"
                accessibilityLabel="Log 250ml water"
              >
                <View style={[styles.quickActionIcon, styles.iconBgWater]}>
                  <Ionicons name="water" size={24} color="#0284C7" />
                </View>
                <Text style={styles.quickActionLabel}>+250ml Water</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Frame 297: height 64px (76px on iOS for safe area), background #FFFFFF, border: 1px solid #D0D5DD
  barContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: Platform.OS === 'ios' ? 76 : 64,
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
    borderTopWidth: 1,
    borderTopColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  pressedTab: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },
  tabLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#8E95A2',
    marginTop: 3,
  },
  tabLabelActive: {
    fontFamily: Fonts.poppins.semiBold,
    fontWeight: '600',
    color: Colors.iconNavy,
  },
  centerFabAnchor: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ellipse 7: 56.49px x 56.49px, background: #CDE26D (Lime/Avocado Green)
  centerFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentLime, // #CDE26D
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 16,
    shadowColor: '#7A9A20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.93 }],
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 10000,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 19,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 76,
  },
  quickActionItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  iconBgBreakfast: {
    backgroundColor: '#FFF7ED',
  },
  iconBgLunch: {
    backgroundColor: '#ECFDF5',
  },
  iconBgSnacks: {
    backgroundColor: '#FEF3C7',
  },
  iconBgDinner: {
    backgroundColor: '#EDE9FE',
  },
  iconBgWater: {
    backgroundColor: '#E0F2FE',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  visionHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 117, 81, 0.3)',
    marginBottom: 16,
    gap: 12,
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  visionHeroBtnPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#FFEDD5',
  },
  visionHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: '#F47551',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  visionHeroTextBox: {
    flex: 1,
  },
  visionHeroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  visionHeroTag: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 9.5,
    color: '#F47551',
    letterSpacing: 0.5,
  },
  visionHeroSparkle: {
    marginLeft: 2,
  },
  visionHeroTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  visionHeroSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
});

export const BottomNavBar = React.memo(BottomNavBarComponent);
