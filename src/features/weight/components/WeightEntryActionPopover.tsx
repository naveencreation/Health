import React from 'react';
import { StyleSheet, View, Text, Pressable, Modal, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';

export interface WeightEntryActionPopoverProps {
  visible: boolean;
  positionY: number;
  positionX?: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const CARD_WIDTH = 136;
const CARD_HEIGHT = 88;

export const WeightEntryActionPopover: React.FC<WeightEntryActionPopoverProps> = ({
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

  // Horizontal position aligned with 3-dots touch
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
        {/* Backdrop Pressable */}
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
            accessibilityLabel="Edit weigh-in"
          >
            <Ionicons name="pencil-outline" size={17} color="#0F172A" />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>

          {/* Hairline Divider */}
          <View style={styles.hairlineDivider} />

          {/* 2. 🗑 Delete Action */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              onDelete();
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete weigh-in"
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
    flex: 1,
    backgroundColor: 'transparent',
  },
  popoverCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 9,
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
  },
  editText: {
    fontSize: 14,
    fontFamily: Fonts.urbanist.medium,
    fontWeight: '500',
    color: '#0F172A',
  },
  deleteText: {
    fontSize: 14,
    fontFamily: Fonts.urbanist.medium,
    fontWeight: '500',
    color: '#EF4444',
  },
});
