import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ImageStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import {
  isSvgAvatar,
  getSvgAvatar,
  isLocalAssetAvatar,
  getLocalAssetSource,
  DEFAULT_AVATAR_URL,
} from '@/data/avatars';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  borderColor?: string;
  borderWidth?: number;
  accessibilityLabel?: string;
}

const FALLBACK_REMOTE_SOURCE = {
  uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  size = 48,
  style,
  imageStyle,
  borderColor,
  borderWidth,
  accessibilityLabel = 'User avatar',
}) => {
  // Normalize: if avatarUrl was removed (like svg:accountant) or is undefined, fallback to DEFAULT_AVATAR_URL
  const effectiveUrl =
    !avatarUrl || avatarUrl === 'svg:accountant'
      ? DEFAULT_AVATAR_URL
      : avatarUrl;

  const isSvg = isSvgAvatar(effectiveUrl);
  const svgData = isSvg ? getSvgAvatar(effectiveUrl) : undefined;
  const isLocal = isLocalAssetAvatar(effectiveUrl);
  const localSource = isLocal ? getLocalAssetSource(effectiveUrl) : null;

  const containerStyle = useMemo((): ViewStyle => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...(borderColor ? { borderColor, borderWidth: borderWidth ?? 2 } : {}),
  }), [size, borderColor, borderWidth]);

  const imageDimensions = useMemo((): ImageStyle => ({
    width: size,
    height: size,
    borderRadius: size / 2,
  }), [size]);

  const iconDimensions = useMemo((): ImageStyle => ({
    width: Math.round(size * 0.7),
    height: Math.round(size * 0.7),
  }), [size]);

  // 1. Vector SVG avatar
  if (isSvg && svgData?.svgXml) {
    const color = svgData.color || '#047857';
    const processedXml = svgData.svgXml.replace(/currentColor/g, color);
    const iconSize = Math.round(size * 0.7);

    // On web, render via data URI so react-native-svg DOM parsing issues never crash the browser
    if (Platform.OS === 'web') {
      const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(processedXml)}`;
      return (
        <View
          style={[
            styles.baseContainer,
            containerStyle,
            { backgroundColor: svgData.bgColor || '#ECFDF5' },
            style,
          ]}
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
        >
          <Image
            source={{ uri: svgDataUri }}
            style={iconDimensions}
            contentFit="contain"
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
          />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.baseContainer,
          containerStyle,
          { backgroundColor: svgData.bgColor || '#ECFDF5' },
          style,
        ]}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        <SvgXml
          xml={processedXml}
          width={iconSize}
          height={iconSize}
          color={color}
        />
      </View>
    );
  }

  // 2. Local bundled image asset (e.g. asset:men, asset:women, etc.)
  if (localSource) {
    return (
      <View
        style={[styles.baseContainer, containerStyle, style]}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        <Image
          source={localSource}
          style={[styles.image, imageDimensions, imageStyle]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  // 3. Remote web image URL or fallback to default local asset
  const defaultLocal = isLocalAssetAvatar(DEFAULT_AVATAR_URL)
    ? getLocalAssetSource(DEFAULT_AVATAR_URL)
    : null;

  const remoteSource = effectiveUrl && !effectiveUrl.startsWith('asset:') && !effectiveUrl.startsWith('svg:')
    ? { uri: effectiveUrl }
    : defaultLocal || FALLBACK_REMOTE_SOURCE;

  return (
    <View
      style={[styles.baseContainer, containerStyle, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={remoteSource}
        style={[styles.image, imageDimensions, imageStyle]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#E2E8F0',
  },
});
