import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { IconSizes, ActionIcons } from '@/theme/icons';
import { haptics } from '@/utils/haptics';

export type TabType = 'today' | 'tracker' | 'analytics' | 'profile';

export const BASE_BAR_HEIGHT = 64;

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
  const bottomInset = insets.bottom;

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
      testID="bottom-nav-bar"
      style={[
        styles.barContainer,
        {
          height: BASE_BAR_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <View testID="bar-content" style={styles.barContent}>
        {/* Tab 1: Today */}
        <Pressable
          style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
          onPress={() => handleTabPress('today')}
          accessibilityRole="tab"
          accessibilityLabel="Today"
          accessibilityState={{ selected: activeTab === 'today' }}
        >
          <Ionicons
            name={activeTab === 'today' ? ActionIcons.navTodayActive : ActionIcons.navToday}
            size={IconSizes.standard}
            color={activeTab === 'today' ? Colors.textPrimary : Colors.textMuted}
          />
          <Text style={[styles.tabLabel, activeTab === 'today' ? styles.tabLabelActive : null]}>
            Today
          </Text>
        </Pressable>

        {/* Tab 2: Health Trackers & Biometrics (heart-pulse -> pulse) */}
        <Pressable
          style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
          onPress={() => handleTabPress('tracker')}
          accessibilityRole="tab"
          accessibilityLabel="Health Trackers and Biometrics"
          accessibilityState={{ selected: activeTab === 'tracker' }}
        >
          <Ionicons
            name={activeTab === 'tracker' ? ActionIcons.navTrackActive : ActionIcons.navTrack}
            size={IconSizes.standard}
            color={activeTab === 'tracker' ? Colors.textPrimary : Colors.textMuted}
          />
          <Text style={[styles.tabLabel, activeTab === 'tracker' ? styles.tabLabelActive : null]}>
            Track
          </Text>
        </Pressable>

        {/* Center Floating Action Button: AI Camera Snap (52x52, #CDE26D Lime Accent) */}
        <View style={styles.centerFabAnchor}>
          <Pressable
            testID="center-scan-fab"
            style={({ pressed }) => [styles.centerFab, pressed ? styles.fabPressed : null]}
            onPress={handleCameraPress}
            accessibilityRole="button"
            accessibilityLabel="Snap and analyze meal with Ria AI"
          >
            <Ionicons name={ActionIcons.navScan} size={IconSizes.prominent} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Tab 3: Analytics / Insights */}
        <Pressable
          style={({ pressed }) => [styles.tabButton, pressed ? styles.pressedTab : null]}
          onPress={() => handleTabPress('analytics')}
          accessibilityRole="tab"
          accessibilityLabel="Insights and Trends"
          accessibilityState={{ selected: activeTab === 'analytics' }}
        >
          <Ionicons
            name={activeTab === 'analytics' ? ActionIcons.navInsightsActive : ActionIcons.navInsights}
            size={IconSizes.standard}
            color={activeTab === 'analytics' ? Colors.textPrimary : Colors.textMuted}
          />
          <Text style={[styles.tabLabel, activeTab === 'analytics' ? styles.tabLabelActive : null]}>
            Insights
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
            name={activeTab === 'profile' ? ActionIcons.navProfileActive : ActionIcons.navProfile}
            size={IconSizes.standard}
            color={activeTab === 'profile' ? Colors.textPrimary : Colors.textMuted}
          />
          <Text style={[styles.tabLabel, activeTab === 'profile' ? styles.tabLabelActive : null]}>
            Profile
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Persistent Navigation Shell: 64px base height (+ hardware safe area inset)
  barContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    position: 'relative',
    zIndex: 500,
    width: '100%',
  },
  barContent: {
    height: BASE_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  pressedTab: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  tabLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textMuted,
    marginTop: 3,
  },
  tabLabelActive: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
  },
  centerFabAnchor: {
    width: 64,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 501,
  },
  // Primary Food Vision Scan FAB: 52x52px, #CDE26D Lime Accent, 3px white halo, restrained neutral elevation
  centerFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accentLime,
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 502,
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
});

export const BottomNavBar = React.memo(BottomNavBarComponent);
