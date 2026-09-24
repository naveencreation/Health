import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MealType } from '@/types';

export type TabType = 'today' | 'diary' | 'analytics' | 'profile';

interface BottomNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onQuickLogFood?: (mealType: MealType) => void;
  onQuickLogWater?: () => void;
  onOpenFoodVision?: () => void;
}

const BottomNavBarComponent: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenFoodVision,
}) => {
  return (
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

      {/* Center Floating Action Button: AI Camera Snap (Ellipse 7, #CDE26D Lime/Avocado Green) */}
      <View style={styles.centerFabAnchor}>
        <Pressable
          style={({ pressed }) => [styles.centerFab, pressed ? styles.fabPressed : null]}
          onPress={onOpenFoodVision}
          accessibilityRole="button"
          accessibilityLabel="Snap and analyze meal with Ria AI"
        >
          <Ionicons name="camera-outline" size={26} color="#FFFFFF" />
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
  );
};

const styles = StyleSheet.create({
  // Frame 297: height 64px (76px on iOS for safe area), background #FFFFFF, hairline top border
  barContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: Platform.OS === 'ios' ? 76 : 64,
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 500,
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
    zIndex: 501,
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
    zIndex: 502,
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.93 }],
  },
});

export const BottomNavBar = React.memo(BottomNavBarComponent);

