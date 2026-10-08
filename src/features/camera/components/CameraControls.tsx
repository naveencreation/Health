import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShutterButton } from './ShutterButton';
import { haptics } from '@/utils/haptics';

interface CameraControlsProps {
  onBack: () => void;
  onShutter: () => void;
  onToggleMenu: () => void;
  isMenuOpen: boolean;
  isCapturing: boolean;
  bottomInset: number;
}

const SIDE_BUTTON_SIZE = 48;

export const CameraControls: React.FC<CameraControlsProps> = React.memo(
  ({
    onBack,
    onShutter,
    onToggleMenu,
    isMenuOpen,
    isCapturing,
    bottomInset,
  }) => {
    return (
      <View
        style={[
          styles.container,
          { paddingBottom: Math.max(20, bottomInset + 10) },
        ]}
      >
        {/* Left: Back chevron button */}
        <Pressable
          style={({ pressed }) => [
            styles.sideButton,
            pressed && styles.sideButtonPressed,
          ]}
          onPress={() => {
            haptics.selection().catch(() => {});
            onBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="Close camera"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>

        {/* Center: Tactile white shutter button */}
        <ShutterButton onPress={onShutter} disabled={isCapturing} />

        {/* Right: Three-dot menu button */}
        <Pressable
          style={({ pressed }) => [
            styles.sideButton,
            isMenuOpen && styles.sideButtonActive,
            pressed && styles.sideButtonPressed,
          ]}
          onPress={() => {
            haptics.selection().catch(() => {});
            onToggleMenu();
          }}
          accessibilityRole="button"
          accessibilityLabel="Camera settings menu"
        >
          <Ionicons
            name="ellipsis-vertical"
            size={22}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    zIndex: 40,
  },
  sideButton: {
    width: SIDE_BUTTON_SIZE,
    height: SIDE_BUTTON_SIZE,
    borderRadius: SIDE_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  sideButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  sideButtonActive: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});
