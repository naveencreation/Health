import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

import { haptics } from '@/utils/haptics';

export type TabType = 'today' | 'tracker' | 'analytics' | 'profile';

interface BottomNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenFoodVision?: () => void;
}

const BottomNavBarComponent: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenFoodVision,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);

  const handleTabPress = (tab: TabType) => {
    haptics.selection().catch(() => {});
    onTabChange(tab);
  };

  const handleCameraPress = () => {
    haptics.impactMedium().catch(() => {});
    if (onOpenFoodVision) onOpenFoodVision();
  };

  return (
    <View
      style={[styles.barContainer, { paddingBottom: bottomPadding, height: 56 + bottomPadding }]}
    >
      {/* Tab 1: Today */}
      <Pressable
        style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
        onPress={() => handleTabPress('today')}
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

      {/* Tab 2: Health Trackers & Biometrics (pulse-outline) */}
      <Pressable
        style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
        onPress={() => handleTabPress('tracker')}
        accessibilityRole="tab"
        accessibilityLabel="Health Trackers and Biometrics"
        accessibilityState={{ selected: activeTab === 'tracker' }}
      >
        <Ionicons
          name={activeTab === 'tracker' ? 'pulse' : 'pulse-outline'}
          size={20}
          color={activeTab === 'tracker' ? Colors.iconNavy : '#8E95A2'}
        />
        <Text style={[styles.tabLabel, activeTab === 'tracker' ? styles.tabLabelActive : null]}>
          Tracker
        </Text>
      </Pressable>

      {/* Center Floating Action Button: AI Camera Snap (Ellipse 7, #CDE26D Lime/Avocado Green) */}
      <View style={styles.centerFabAnchor}>
        <Pressable
          style={({ pressed }) => [styles.centerFab, pressed ? styles.fabPressed : null]}
          onPress={handleCameraPress}
          accessibilityRole="button"
          accessibilityLabel="Snap and analyze meal with Ria AI"
        >
          <Ionicons name="camera-outline" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Tab 3: Analytics */}
      <Pressable
        style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
        onPress={() => handleTabPress('analytics')}
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
        onPress={() => handleTabPress('profile')}
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
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10,
    color: '#8E95A2',
    marginTop: 3,
  },
  tabLabelActive: {
    fontFamily: Fonts.urbanist.semiBold,
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
