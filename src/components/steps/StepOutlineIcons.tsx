import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

export interface StepIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * 👣 Minimalist Dual Shoe Soles / Footsteps Vector Outline
 * Matching the sample screenshot's clean orange outline footprints
 */
export const FootstepsOutlineSvg: React.FC<StepIconProps> = ({
  size = 18,
  color = '#F97316',
  strokeWidth = 1.6,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Left Footprint / Shoe Sole */}
    <Path
      d="M7.2 4.2C5.5 4.5 4.5 6.5 4.5 9.2C4.5 11.8 5.8 13.5 6 15C6.2 16.5 5.5 18 6.5 19.5C7.3 20.7 9 20.5 9.5 19.2C10.2 17.5 9.2 15.5 8.8 14C8.4 12.5 9.5 10 9.5 7.5C9.5 5.2 8.5 4 7.2 4.2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 14.2C7 14.5 8.2 14.2 9 13.5"
      stroke={color}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
      opacity={0.8}
    />

    {/* Right Footprint / Shoe Sole */}
    <Path
      d="M16.8 4.2C18.5 4.5 19.5 6.5 19.5 9.2C19.5 11.8 18.2 13.5 18 15C17.8 16.5 18.5 18 17.5 19.5C16.7 20.7 15 20.5 14.5 19.2C13.8 17.5 14.8 15.5 15.2 14C15.6 12.5 14.5 10 14.5 7.5C14.5 5.2 15.5 4 16.8 4.2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18 14.2C17 14.5 15.8 14.2 15 13.5"
      stroke={color}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
      opacity={0.8}
    />
  </Svg>
);

/**
 * ⏱️ Minimalist Clock Vector Outline
 * Fresh emerald green outline dial with crisp 9:00/12:00 hands
 */
export const ClockOutlineSvg: React.FC<StepIconProps> = ({
  size = 18,
  color = '#22C55E',
  strokeWidth = 1.6,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Outer Dial Circle */}
    <Circle
      cx="12"
      cy="12"
      r="9"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    {/* Clock Hands pointing to 9 o'clock / 12 o'clock */}
    <Path
      d="M12 7.5V12H7.8"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * 🔥 Minimalist Flame Vector Outline
 * Asymmetric dual-peak flame with cleft notch and lower-right accent streak
 * Matching the exact fitness/calorie reference icon
 */
export const FlameOutlineSvg: React.FC<StepIconProps> = ({
  size = 20,
  color = '#EF4444',
  strokeWidth = 1.6,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Outer Double-Peak Flame Contour */}
    <Path
      d="M8.2 8C8.2 8 9.6 10.2 11 10.2C11.6 7.6 13.2 3.6 14.6 3.4C16.8 5.6 18.8 10 18.8 14C18.8 17.8 15.8 20.8 12 20.8C8.2 20.8 5.2 17.8 5.2 14C5.2 10.8 7.2 8.6 8.2 8Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Lower-Right Interior Accent Streak */}
    <Path
      d="M14.2 13.8C15 14.8 14.8 16.2 13.5 17.2"
      stroke={color}
      strokeWidth={strokeWidth * 0.95}
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * 📍 Minimalist Location Pin Vector Outline
 * Sky blue map marker contour with inner circle
 */
export const LocationPinOutlineSvg: React.FC<StepIconProps> = ({
  size = 18,
  color = '#0EA5E9',
  strokeWidth = 1.6,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Map Pin Teardrop Contour */}
    <Path
      d="M12 21C12 21 18.5 14.5 18.5 9.5C18.5 5.9 15.6 3 12 3C8.4 3 5.5 5.9 5.5 9.5C5.5 14.5 12 21 12 21Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Central Target Circle */}
    <Circle
      cx="12"
      cy="9.5"
      r="2.6"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </Svg>
);

/**
 * Empty State Illustration: Minimal Outline Running Shoes
 */
export const EmptyShoesOutlineSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 80,
  color = '#CBD5E1',
}) => (
  <Svg width={size} height={size * 0.75} viewBox="0 0 80 60" fill="none">
    {/* Left Sneaker Outline */}
    <Path
      d="M12 36C15 36 20 33 24 26C27 21 31 20 36 22L38 27L42 27C44 32 42 36 40 37L12 37C10.5 37 10 36 12 36Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 40H44C45.5 40 46 41 45 42.5C44 44 42 44.5 40 44.5H12C10 44.5 8.5 43.5 9 42C9.2 41 9.6 40 10 40Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M26 25L30 30"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <Path
      d="M29 23L33 28"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
    />

    {/* Right Sneaker Outline (Offset) */}
    <Path
      d="M42 28C45 28 50 25 54 18C57 13 61 12 66 14L68 19L72 19C74 24 72 28 70 29L42 29C40.5 29 40 28 42 28Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.6}
    />
    <Path
      d="M40 32H74C75.5 32 76 33 75 34.5C74 36 72 36.5 70 36.5H42C40 36.5 38.5 35.5 39 34C39.2 33 39.6 32 40 32Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.6}
    />
  </Svg>
);
