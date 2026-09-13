import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { MealType } from '../types';

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
        >
          <Ionicons
            name={activeTab === 'today' ? 'home' : 'home-outline'}
            size={23}
            color={activeTab === 'today' ? Colors.iconNavy : '#8E95A2'}
          />
        </TouchableOpacity>

        {/* Tab 2: Chef Hat (Meals & Recipes) */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabChange('diary')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={activeTab === 'diary' ? 'chef-hat' : 'chef-hat'}
            size={24}
            color={activeTab === 'diary' ? Colors.iconNavy : '#8E95A2'}
          />
        </TouchableOpacity>

        {/* Center Floating Action Button: Ellipse 7 (56.49px x 56.49px, #CDE26D Lime/Avocado Green) */}
        <View style={styles.centerFabAnchor}>
          <TouchableOpacity
            style={styles.centerFab}
            onPress={() => setQuickSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab 3: Chart 2 (Analytics & Statistics) */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabChange('analytics')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'analytics' ? 'bar-chart' : 'bar-chart-outline'}
            size={23}
            color={activeTab === 'analytics' ? Colors.iconNavy : '#8E95A2'}
          />
        </TouchableOpacity>

        {/* Tab 4: User Profile */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabChange('profile')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={23}
            color={activeTab === 'profile' ? Colors.iconNavy : '#8E95A2'}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Action Sheet Modal */}
      <Modal visible={quickSheetVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setQuickSheetVisible(false)}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log Nutrition & Habits</Text>
            <Text style={styles.sheetSubtitle}>Choose what you want to add</Text>

            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => handleSelectQuickMeal('breakfast')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={{ fontSize: 24 }}>🍳</Text>
                </View>
                <Text style={styles.quickActionLabel}>Breakfast</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => handleSelectQuickMeal('lunch')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={{ fontSize: 24 }}>🥗</Text>
                </View>
                <Text style={styles.quickActionLabel}>Lunch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => handleSelectQuickMeal('snacks')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ fontSize: 24 }}>🍵</Text>
                </View>
                <Text style={styles.quickActionLabel}>Snacks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => handleSelectQuickMeal('dinner')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={{ fontSize: 24 }}>🍲</Text>
                </View>
                <Text style={styles.quickActionLabel}>Dinner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={handleSelectQuickWater}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="water" size={24} color="#0284C7" />
                </View>
                <Text style={styles.quickActionLabel}>+250ml Water</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Frame 297: height 61px, background #FFFFFF, border: 1px solid #D0D5DD
  barContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 64,
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
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sheetSubtitle: {
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
    gap: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 82,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
