import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

export interface BeverageDefinition {
  id: string;
  name: string;
  iconName: any;
  iconFamily: 'ionicons' | 'mci' | 'svg';
  color: string;
  bgColor: string;
}

export const BEVERAGE_DEFINITIONS: BeverageDefinition[] = [
  { id: 'water', name: 'Water', iconName: 'water', iconFamily: 'svg', color: '#0284C7', bgColor: '#E0F2FE' },
  { id: 'coffee', name: 'Coffee', iconName: 'cafe-outline', iconFamily: 'ionicons', color: '#854D0E', bgColor: '#FEF3C7' },
  { id: 'tea', name: 'Tea', iconName: 'tea', iconFamily: 'mci', color: '#15803D', bgColor: '#DCFCE7' },
  { id: 'juice', name: 'Juice', iconName: 'cup-water', iconFamily: 'mci', color: '#EA580C', bgColor: '#FFEDD5' },
  { id: 'sport', name: 'Sport Drink', iconName: 'bottle-tonic-outline', iconFamily: 'mci', color: '#0284C7', bgColor: '#E0F2FE' },
  { id: 'coconut', name: 'Coconut Water', iconName: 'leaf-outline', iconFamily: 'ionicons', color: '#16A34A', bgColor: '#DCFCE7' },
  { id: 'smoothie', name: 'Smoothie', iconName: 'blender-outline', iconFamily: 'mci', color: '#9333EA', bgColor: '#F3E8FF' },
  { id: 'chocolate', name: 'Chocolate', iconName: 'coffee', iconFamily: 'mci', color: '#78350F', bgColor: '#FEF3C7' },
  { id: 'carbonated', name: 'Carbonated', iconName: 'glass-cocktail', iconFamily: 'mci', color: '#F97316', bgColor: '#FFEDD5' },
  { id: 'soda', name: 'Soda', iconName: 'glass-flute', iconFamily: 'mci', color: '#E11D48', bgColor: '#FFE4E6' },
  { id: 'wine', name: 'Wine', iconName: 'wine-outline', iconFamily: 'ionicons', color: '#9F1239', bgColor: '#FFE4E6' },
  { id: 'beer', name: 'Beer', iconName: 'beer-outline', iconFamily: 'ionicons', color: '#D97706', bgColor: '#FEF9C3' },
  { id: 'liquor', name: 'Liquor', iconName: 'bottle-tonic-plus-outline', iconFamily: 'mci', color: '#475569', bgColor: '#F1F5F9' },
];

export const getBeverageConfig = (beverageId?: string): BeverageDefinition => {
  if (!beverageId) return BEVERAGE_DEFINITIONS[0];
  const found = BEVERAGE_DEFINITIONS.find((b) => b.id.toLowerCase() === beverageId.toLowerCase());
  return found || BEVERAGE_DEFINITIONS[0];
};

export const getBeverageName = (beverageId?: string): string => {
  return getBeverageConfig(beverageId).name;
};

export const getBeverageColor = (beverageId?: string): string => {
  return getBeverageConfig(beverageId).color;
};

export const getBeverageBg = (beverageId?: string): string => {
  return getBeverageConfig(beverageId).bgColor;
};

// Mini Translucent Water Glass SVG Vector
export const MiniWaterGlassSvg: React.FC<{ size?: number; fillPercent?: number }> = ({
  size = 20,
  fillPercent = 0.65,
}) => {
  const height = Math.round(size * 1.2);
  return (
    <Svg width={size} height={height} viewBox="0 0 20 24">
      <Path
        d="M 3 2 L 5 21 C 5.2 22.5 7 23 10 23 C 13 23 14.8 22.5 15 21 L 17 2 Z"
        fill="#E0F2FE"
        stroke="#38BDF8"
        strokeWidth={1.2}
      />
      <Path
        d={`M 4.2 ${24 - 24 * fillPercent} L 5 21 C 5.2 22.5 7 23 10 23 C 13 23 14.8 22.5 15 21 L 15.8 ${24 - 24 * fillPercent} Z`}
        fill="#0284C7"
      />
      <Circle cx="8" cy="18" r="0.8" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="12" cy="15" r="0.9" fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
};

// Universal Beverage Icon Renderer
export const renderBeverageIconElement = (
  beverageId?: string,
  size: number = 20,
  overrideColor?: string
): React.ReactElement => {
  const config = getBeverageConfig(beverageId);
  const color = overrideColor || config.color;

  if (config.id === 'water') {
    return <MiniWaterGlassSvg size={size} fillPercent={0.75} />;
  }

  if (config.iconFamily === 'ionicons') {
    return <Ionicons name={config.iconName} size={size} color={color} />;
  }

  return <MaterialCommunityIcons name={config.iconName} size={size} color={color} />;
};
