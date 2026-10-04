import React from 'react';
import { StyleSheet, View, Text, Pressable, Modal, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';

export interface WaterEntryActionPopoverProps {
  visible: boolean;
  positionY: number;
  positionX?: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const CARD_WIDTH = 136;
const CARD_HEIGHT = 88;

export const WaterEntryActionPopover: React.FC<WaterEntryActionPopoverProps> = ({
  visible,
  positionY,
  positionX,
  onEdit,
  onDelete,
  onClose,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  if (!visible) return null;

  // Auto-flip: If anchor is close to bottom of screen, open upwards
  const isNearBottom = positionY + CARD_HEIGHT > screenHeight - 90;
  const calculatedTop = isNearBottom
    ? Math.max(50, positionY - CARD_HEIGHT - 6)
    : Math.max(50, positionY - 14);

  // Horizontal position aligned with 3-dots touch inside group card
  const contentMaxOffset = (screenWidth - Math.min(screenWidth, 480)) / 2;
  const calculatedRight = positionX
    ? Math.max(20, screenWidth - positionX + 10)
    : contentMaxOffset + 26;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlayContainer}>
        {/* Backdrop Pressable (sibling behind card) */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close options menu"
        />

        {/* Floating Card */}
        <Animated.View
          entering={FadeIn.duration(130)}
          exiting={FadeOut.duration(90)}
          style={[
            styles.popoverCard,
            {
              top: calculatedTop,
              right: calculatedRight,
            },
          ]}
        >
          {/* 1. ✎ Edit Action */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              onEdit();
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit entry"
          >
            <Ionicons name="pencil-outline" size={17} color="#0F172A" />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>

          {/* Hairline Divider */}
          <View style={styles.hairlineDivider} />

          {/* 2. 🗑 Delete Action */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.deleteRowPressed]}
            onPress={() => {
              onClose();
              onDelete();
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete entry"
          >
            <Ionicons name="trash-outline" size={17} color="#EF4444" />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  popoverCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 10,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  deleteRowPressed: {
    backgroundColor: '#FEF2F2',
  },
  editText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  deleteText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#EF4444',
    letterSpacing: -0.2,
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
    marginVertical: 1,
  },
});
