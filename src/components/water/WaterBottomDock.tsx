import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

export interface WaterBottomDockProps {
  cupSize: number;
  beverageType?: string;
  onDrink: (amountMl: number, beverageType: string) => void;
  onOpenCupSelector: () => void;
  style?: StyleProp<ViewStyle>;
}

// Compact Drinking Glass SVG for the circular dock button
const DockGlassIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 20 24">
    <Path
      d="M 3 2 L 5 21 C 5.2 22.5 7 23 10 23 C 13 23 14.8 22.5 15 21 L 17 2 Z"
      fill="#E0F2FE"
      stroke="#38BDF8"
      strokeWidth={1.4}
    />
    <Path
      d="M 4.2 10 L 5 21 C 5.2 22.5 7 23 10 23 C 13 23 14.8 22.5 15 21 L 15.8 10 Z"
      fill="#0284C7"
    />
    <Circle cx="8" cy="18" r="0.9" fill="#FFFFFF" opacity={0.9} />
    <Circle cx="12" cy="15" r="1" fill="#FFFFFF" opacity={0.9} />
  </Svg>
);

export const WaterBottomDock: React.FC<WaterBottomDockProps> = ({
  cupSize = 300,
  beverageType = 'water',
  onDrink,
  onOpenCupSelector,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const [isDrinking, setIsDrinking] = useState(false);

  const handlePressDrink = () => {
    if (isDrinking) return;
    setIsDrinking(true);
    onDrink(cupSize, beverageType);

    // Revert state after momentary feedback animation (matching reference screenshot)
    setTimeout(() => {
      setIsDrinking(false);
    }, 650);
  };

  const renderBeverageIcon = () => {
    switch (beverageType) {
      case 'coffee':
        return <Ionicons name="cafe-outline" size={22} color="#854D0E" />;
      case 'tea':
        return <MaterialCommunityIcons name="tea" size={22} color="#15803D" />;
      case 'juice':
        return <MaterialCommunityIcons name="cup-water" size={22} color="#EA580C" />;
      case 'sport':
        return <MaterialCommunityIcons name="bottle-tonic-outline" size={22} color="#0284C7" />;
      case 'wine':
        return <Ionicons name="wine-outline" size={22} color="#9F1239" />;
      case 'beer':
        return <Ionicons name="beer-outline" size={22} color="#D97706" />;
      default:
        return <DockGlassIcon size={20} />;
    }
  };

  return (
    <View
      style={[
        styles.dockContainer,
        { paddingBottom: Math.max(insets.bottom, 16) },
        style,
      ]}
    >
      {/* 1. Left Circular Cup / Beverage Selector Button */}
      <Pressable
        style={({ pressed }) => [
          styles.cupSelectorBtn,
          pressed && styles.btnPressed,
        ]}
        onPress={onOpenCupSelector}
        accessibilityRole="button"
        accessibilityLabel="Change cup size or beverage type"
      >
        {renderBeverageIcon()}
      </Pressable>

      {/* 2. Primary Drink Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.drinkBtn,
          isDrinking && styles.drinkBtnActive,
          pressed && styles.btnPressed,
        ]}
        onPress={handlePressDrink}
        disabled={isDrinking}
        accessibilityRole="button"
        accessibilityLabel={`Drink ${cupSize} mL of ${beverageType}`}
      >
        <Text
          style={[
            styles.drinkBtnText,
            isDrinking && styles.drinkBtnTextActive,
          ]}
        >
          {isDrinking ? 'Drinking...' : `Drink (${cupSize} mL)`}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  cupSelectorBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  drinkBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: Colors.water,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.water,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  drinkBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.water,
    shadowOpacity: 0.08,
  },
  drinkBtnText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  drinkBtnTextActive: {
    fontFamily: Fonts.poppins.semiBold,
    color: Colors.water,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
