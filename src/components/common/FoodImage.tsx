import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';

export interface FoodImageProps {
  /**
   * The image source (bundled require() or {uri: string}).
   * If undefined or the image errors, the fallback is shown.
   */
  source?: ImageSourcePropType | null;
  /**
   * Width / height ratio of the container.
   * 1 = square, 4/3 = landscape card, 16/9 = wide hero.
   * Default: 4/3 (shorter landscape container, food centered inside).
   */
  aspectRatio?: number;
  /**
   * How the image fills its container.
   * "contain" keeps full subject visible with letterbox.
   * "cover"   fills the container and crops edges.
   * Default: "contain".
   */
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Explicit width. Defaults to "100%" (fills parent). */
  width?: number | string;
  /** Corner radius applied to both container and image. Default: 0. */
  borderRadius?: number;
  /** Background fill shown behind a "contain" image. Default: "#FFFFFF". */
  backgroundColor?: string;
  /** Extra styles applied to the outer container View. */
  style?: StyleProp<ViewStyle>;
  /** Rendered when source is null/undefined or the image fails to load. */
  fallback?: React.ReactNode;
  /** Passed through to expo-image recyclingKey for list perf. */
  recyclingKey?: string;
}

/**
 * FoodImage
 * ─────────
 * The canonical rendering primitive for all food images in Calorify.
 *
 * It decouples HOW the image is presented (aspectRatio, contentFit)
 * from WHAT the image is (ImageSourcePropType from LOCAL_FOOD_IMAGES).
 *
 * Usage examples:
 *   // 4:3 hero card with subject fully visible
 *   <FoodImage source={src} aspectRatio={4/3} contentFit="contain" width="100%" />
 *
 *   // Square thumbnail (use cover for tight grid cards)
 *   <FoodImage source={src} aspectRatio={1} contentFit="cover" width={48} borderRadius={12} />
 */
export const FoodImage: React.FC<FoodImageProps> = React.memo(({
  source,
  aspectRatio = 4 / 3,
  contentFit = 'contain',
  width = '100%',
  borderRadius = 0,
  backgroundColor = '#FFFFFF',
  style,
  fallback,
  recyclingKey,
}) => {
  const [imgError, setImgError] = useState(false);

  const containerStyle: ViewStyle = {
    width: width as any,
    aspectRatio,
    borderRadius,
    backgroundColor,
    overflow: 'hidden',
  };

  // Show fallback when: no source provided, or image failed to load
  if (!source || imgError) {
    if (fallback) {
      return (
        <View style={[containerStyle, styles.fallbackWrapper, style]}>
          {fallback}
        </View>
      );
    }
    // Default placeholder: empty colored box with same shape
    return <View style={[containerStyle, style]} />;
  }

  return (
    <View style={[containerStyle, style]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        transition={180}
        recyclingKey={recyclingKey}
        priority="normal"
        onError={() => setImgError(true)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  fallbackWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
