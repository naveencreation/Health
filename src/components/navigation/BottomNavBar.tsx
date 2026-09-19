import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
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
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  onQuickLogFood,
  onQuickLogWater,
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
      {/* Figma Frame 297: Bottom Bar */}
      <View style={styles.barContainer}>
        {/* Tab 1: Home Angle */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabChange('today')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Home"
          accessibilityState={{ selected: activeTab === 'today' }}
        >
          <Ionicons
            name={activeTab === 'today' ? 'home' : 'home-outline'}
            size={23}
            color={activeTab === 'today' ? Colors.iconNavy : '#8E95A2'}
          />
          {activeTab === 'today' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        {/* Tab 2: Chef Hat (Meals & Recipes) */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabChange('diary')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Meals Diary"
          accessibilityState={{ selected: activeTab === 'diary' }}
        >
          <MaterialCommunityIcons
            name="chef-hat"
            size={24}
            color={activeTab === 'diary' ? Colors.iconNavy : '#8E95A2'}
          />
          {activeTab === 'diary' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        {/* Center Floating Action Button: Ellipse 7 (56.49px x 56.49px, #CDE26D Lime/Avocado Green) */}
        <View style={styles.centerFabAnchor}>
          <TouchableOpacity
            style={styles.centerFab}
            onPress={() => setQuickSheetVisible(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Log food or water"
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab 3: Chart 2 (Analytics & Statistics) */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabChange('analytics')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Analytics and Trends"
          accessibilityState={{ selected: activeTab === 'analytics' }}
        >
          <Ionicons
            name={activeTab === 'analytics' ? 'bar-chart' : 'bar-chart-outline'}
            size={23}
            color={activeTab === 'analytics' ? Colors.iconNavy : '#8E95A2'}
          />
          {activeTab === 'analytics' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        {/* Tab 4: User Profile */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabChange('profile')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Profile and Goals"
          accessibilityState={{ selected: activeTab === 'profile' }}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={23}
            color={activeTab === 'profile' ? Colors.iconNavy : '#8E95A2'}
          />
          {activeTab === 'profile' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* Quick Action Sheet Modal */}
      <Modal
        visible={quickSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={() => setQuickSheetVisible(false)}
          />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log Nutrition & Habits</Text>
            <Text style={styles.sheetSubtitle}>Choose what you want to add</Text>

            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => handleSelectQuickMeal('breakfast')}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={{ fontSize: 24 }}>🍳</Text>
                </View>
                <Text style={styles.quickActionLabel}>Breakfast</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => handleSelectQuickMeal('lunch')}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={{ fontSize: 24 }}>🥗</Text>
                </View>
                <Text style={styles.quickActionLabel}>Lunch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => handleSelectQuickMeal('snacks')}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ fontSize: 24 }}>🍵</Text>
                </View>
                <Text style={styles.quickActionLabel}>Snacks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => handleSelectQuickMeal('dinner')}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={{ fontSize: 24 }}>🍲</Text>
                </View>
                <Text style={styles.quickActionLabel}>Dinner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={handleSelectQuickWater}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="water" size={24} color="#0284C7" />
                </View>
                <Text style={styles.quickActionLabel}>+250ml Water</Text>
              </TouchableOpacity>
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
    position: 'relative',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.iconNavy,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 16 : 8,
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
});
