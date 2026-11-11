import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

interface MetricIconProps {
  size?: number;
  color: string;
}

// One drawn set for the Today "Body & activity" tiles, so line weight and fill match

export const SneakerIcon: React.FC<MetricIconProps> = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M2 18.5v-4.2c0-.5.2-1 .5-1.4L5.6 8l3 1.6c.9 1.7 2.6 2.7 4.5 2.7h.6l6.6 2.6c1 .4 1.7 1.4 1.7 2.5v1.1z" />
    <Rect x={2} y={19.5} width={20} height={2} rx={1} />
  </Svg>
);

export const DropIcon: React.FC<MetricIconProps> = ({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
  </Svg>
);

export const ScaleIcon: React.FC<MetricIconProps> = ({ size = 18, color }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Rect x={3} y={3} width={18} height={18} rx={5} />
    <Path d="M7.5 10a6 6 0 0 1 9 0" />
    <Path d="M12 10l1.4-2.2" />
  </Svg>
);

export const BodyIcon: React.FC<MetricIconProps> = ({ size = 18, color }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx={12} cy={4.5} r={2} />
    <Path d="M6 9h12" />
    <Path d="M12 9v6" />
    <Path d="M9 21l3-6 3 6" />
  </Svg>
);
