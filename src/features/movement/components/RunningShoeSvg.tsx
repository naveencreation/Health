import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle, Ellipse, Defs, LinearGradient, Stop, G } from 'react-native-svg';

export interface RunningShoeSvgProps {
  width?: number;
  height?: number;
  primaryColor?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * High-quality vector athletic running shoe icon.
 * Features sculpted aerodynamic sole, cushion midsole, breathable upper mesh,
 * speed swoosh streak, lace eyelets, and an ambient ground shadow.
 */
export const RunningShoeSvg: React.FC<RunningShoeSvgProps> = ({
  width = 110,
  height = 68,
  primaryColor = '#EA580C', // Calorify flame orange
  accentColor = '#0F172A', // Deep slate navy
  style,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 72" fill="none" style={style}>
      <Defs>
        {/* Sole & Midsole Shadow Gradient */}
        <LinearGradient id="soleGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0F172A" />
          <Stop offset="0.7" stopColor="#1E293B" />
          <Stop offset="1" stopColor={primaryColor} />
        </LinearGradient>

        {/* Dynamic Upper Mesh Gradient */}
        <LinearGradient id="upperGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={primaryColor} />
          <Stop offset="0.5" stopColor="#F97316" />
          <Stop offset="1" stopColor="#FB923C" />
        </LinearGradient>

        {/* Ambient Ground Glow */}
        <LinearGradient id="groundShadow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="rgba(15, 23, 42, 0)" />
          <Stop offset="0.5" stopColor="rgba(234, 88, 12, 0.2)" />
          <Stop offset="1" stopColor="rgba(15, 23, 42, 0)" />
        </LinearGradient>
      </Defs>

      {/* 1. Ambient Ground Contact Shadow */}
      <Ellipse cx="62" cy="67" rx="46" ry="4" fill="url(#groundShadow)" />

      {/* 2. Outsole (Black/Dark Slate Rubber Tread Base) */}
      <Path
        d="M 18 61 C 24 63, 50 63.5, 75 62 C 92 61, 106 56.5, 114 49 C 114.5 48.2, 113.5 47.5, 112 48 C 103 54, 88 58, 72 59 C 48 60.5, 24 59.5, 16 57 C 15 57, 14.5 58, 15.5 59.5 C 16 60.5, 17 61, 18 61 Z"
        fill="#0F172A"
      />

      {/* Outsole Tread Grooves */}
      <Path
        d="M 32 62.5 L 30 60 M 46 62.8 L 44 60.2 M 60 62.5 L 58 60 M 74 61.8 L 72 59.5 M 88 60 L 86 58"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.35}
      />

      {/* 3. Chunky Sculpted Midsole (Cushion Foam) */}
      <Path
        d="M 15 57 C 17 48, 23 47, 34 49 C 48 51, 65 52, 85 50 C 96 49, 107 46, 112 46.5 C 113.5 46.8, 113.8 48, 111.5 49 C 104 52.5, 90 56, 73 57 C 49 58.5, 23 57.5, 15 57 Z"
        fill="#FFFFFF"
      />
      {/* Midsole Sculpt Line */}
      <Path
        d="M 22 52 C 40 54, 62 55, 84 52 C 96 50.5, 104 48, 109 47.5"
        stroke="rgba(15, 23, 42, 0.12)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Flame Midsole Energy Pod Insert */}
      <Path
        d="M 28 51 C 36 52.5, 45 52.8, 52 52 C 53 52, 53.5 53.5, 52 54 C 44 55, 34 54.5, 27 52.8 C 26.5 52, 27 51, 28 51 Z"
        fill={primaryColor}
        opacity={0.85}
      />

      {/* 4. Upper Main Body (Curved Athletic Mesh Silhouette) */}
      <Path
        d="M 17 48 C 15 42, 17 31, 24 25 C 28 21.5, 33 22.5, 37 27 C 40 31, 45 32, 50 28.5 C 53 26, 56 23.5, 61 24 C 64 24.5, 68 28, 72 32 C 80 37, 92 41, 102 44 C 107 45.5, 110 46.5, 112 46.5 C 108 47.5, 96 49, 85 50 C 65 52, 48 51, 34 49 C 23 47, 17 48, 17 48 Z"
        fill="url(#upperGrad)"
      />

      {/* 5. Heel Counter Support Collar (Slate Overlay) */}
      <Path
        d="M 17 48 C 15 42, 17 31, 24 25 C 27 22, 31 23, 33 27 C 32 34, 29 42, 28 48 C 23 47.5, 18.5 48, 17 48 Z"
        fill={accentColor}
      />
      {/* Reflective Heel Tab */}
      <Rect x="21" y="30" width="3" height="8" rx="1.5" fill="#FFFFFF" opacity={0.7} />

      {/* 6. Padded Ankle Collar Opening & Lining */}
      <Path
        d="M 24 25 C 28 21.5, 34 22.5, 38 27 C 42 31.5, 46 32, 50 28.5 C 47 34, 38 35, 32 30 C 28 26.5, 25 25.5, 24 25 Z"
        fill="#0F172A"
      />
      {/* Tongue Inner Cushion */}
      <Path
        d="M 48 29 C 51 25.5, 55 23.5, 60 24 C 62 24.5, 64 26.5, 66 29 C 58 31, 52 30.5, 48 29 Z"
        fill="#1E293B"
      />

      {/* 7. Lacing System (Dynamic Diagonal White Straps) */}
      <G stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round">
        <Path d="M 52 33 L 61 27" />
        <Path d="M 58 36.5 L 67 31" />
        <Path d="M 64 40 L 73 35" />
      </G>
      {/* Lace Eyelet Studs */}
      <Circle cx="51.5" cy="33.5" r="1.3" fill="#FFFFFF" />
      <Circle cx="57.5" cy="37" r="1.3" fill="#FFFFFF" />
      <Circle cx="63.5" cy="40.5" r="1.3" fill="#FFFFFF" />

      {/* 8. Aerodynamic Speed Swoosh / Motion Stripe */}
      <Path
        d="M 33 44 C 48 40, 68 42, 88 44.5 C 93 45.2, 96 46, 97 46 C 93 47, 82 48, 68 47 C 50 45.5, 38 46, 33 47 C 32 46.5, 32 44.5, 33 44 Z"
        fill="#FFFFFF"
      />

      {/* 9. Forefoot Breathable Mesh Perforations */}
      <G fill="#FFFFFF" opacity={0.35}>
        <Circle cx="86" cy="42" r="1" />
        <Circle cx="90" cy="43.5" r="1" />
        <Circle cx="94" cy="44.5" r="1" />
        <Circle cx="88" cy="40" r="0.9" />
        <Circle cx="92" cy="41.5" r="0.9" />
        <Circle cx="96" cy="43" r="0.9" />
        <Circle cx="100" cy="45" r="0.9" />
      </G>

      {/* 10. Toe Tip Cap */}
      <Path
        d="M 104 44 C 108 45.5, 110.5 46.2, 112 46.5 C 111 48, 107 48.8, 102 49 C 103 47.5, 103.5 45.5, 104 44 Z"
        fill="#0F172A"
        opacity={0.25}
      />
    </Svg>
  );
};
