import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CameraFlashMode, CameraFacing } from '../types';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

interface CameraMenuProps {
  visible: boolean;
  flashMode: CameraFlashMode;
  facing: CameraFacing;
  onToggleFlash: () => void;
  onFlipCamera: () => void;
  onOpenGallery?: () => void;
  onClose: () => void;
}

export const CameraMenu: React.FC<CameraMenuProps> = React.memo(
  ({
    visible,
    flashMode,
    facing,
    onToggleFlash,
    onFlipCamera,
    onOpenGallery,
    onClose,
  }) => {
    if (!visible) return null;

    const flashIconName =
      flashMode === 'on'
        ? 'flash'
        : flashMode === 'auto'
          ? 'flash-outline'
          : 'flash-off-outline';

    const flashLabel =
      flashMode === 'on' ? 'Flash On' : flashMode === 'auto' ? 'Auto' : 'Flash Off';

    return (
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        style={styles.popoverContainer}
      >
        {/* Flash Mode Button */}
        <Pressable
          style={styles.menuItem}
          onPress={() => {
            haptics.selection().catch(() => {});
            onToggleFlash();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Toggle flash, currently ${flashLabel}`}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name={flashIconName as any}
              size={18}
              color={flashMode === 'off' ? '#FFFFFF' : '#FBBF24'}
            />
          </View>
          <Text style={styles.menuLabel}>{flashLabel}</Text>
        </Pressable>

        <View style={styles.divider} />

        {/* Flip Camera Button */}
        <Pressable
          style={styles.menuItem}
          onPress={() => {
            haptics.selection().catch(() => {});
            onFlipCamera();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Flip camera, currently ${facing}`}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="camera-reverse-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.menuLabel}>
            {facing === 'back' ? 'Front Cam' : 'Back Cam'}
          </Text>
        </Pressable>

        {onOpenGallery && (
          <>
            <View style={styles.divider} />
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                haptics.selection().catch(() => {});
                onClose();
                onOpenGallery();
              }}
              accessibilityRole="button"
              accessibilityLabel="Choose from photo library"
            >
              <View style={styles.iconCircle}>
                <Ionicons name="images-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.menuLabel}>Photos</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  popoverContainer: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    zIndex: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 54,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  menuLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10.5,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 4,
  },
});
