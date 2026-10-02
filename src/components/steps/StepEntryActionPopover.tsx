import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { StepLogEntry } from '@/types';

export interface StepEntryActionPopoverProps {
  visible: boolean;
  positionY: number;
  positionX?: number;
  entry: StepLogEntry | null;
  onViewDetails?: (entry: StepLogEntry) => void;
  onDelete?: (entry: StepLogEntry) => void;
  onClose: () => void;
}

export const StepEntryActionPopover: React.FC<StepEntryActionPopoverProps> = ({
  visible,
  positionY,
  positionX,
  entry,
  onViewDetails,
  onDelete,
  onClose,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  if (!visible || !entry) return null;

  const hasDetails = Boolean(onViewDetails);
  const cardWidth = hasDetails ? 140 : 118;
  const cardHeight = hasDetails ? 88 : 46;

  // Auto-flip: If anchor is close to bottom of screen, flip upwards
  const isNearBottom = positionY + cardHeight > screenHeight - 90;
  const calculatedTop = isNearBottom
    ? Math.max(50, positionY - cardHeight - 6)
    : Math.max(50, positionY - 14);

  // Horizontal position aligned with 3-dots touch
  const contentMaxOffset = (screenWidth - Math.min(screenWidth, 480)) / 2;
  const calculatedRight = positionX
    ? Math.max(20, screenWidth - positionX + 10)
    : contentMaxOffset + 24;

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
          accessibilityLabel="Close action options menu"
        />

        {/* Floating Action Card */}
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(80)}
          style={[
            styles.popoverCard,
            {
              width: cardWidth,
              top: calculatedTop,
              right: calculatedRight,
            },
          ]}
        >
          {/* 1. ℹ️ View Session Details (optional) */}
          {hasDetails && (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.menuRow,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => {
                  onClose();
                  if (onViewDetails) onViewDetails(entry);
                }}
                accessibilityRole="button"
                accessibilityLabel="View session details"
              >
                <Ionicons name="information-circle-outline" size={17} color="#0F172A" />
                <Text style={styles.menuText}>Details</Text>
              </Pressable>
              <View style={styles.hairlineDivider} />
            </>
          )}

          {/* 2. 🗑 Delete / Dismiss Action */}
          <Pressable
            style={({ pressed }) => [
              styles.menuRow,
              pressed && styles.rowPressed,
            ]}
            onPress={() => {
              onClose();
              if (onDelete) onDelete(entry);
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete entry"
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  popoverCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 9999,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    marginHorizontal: 10,
  },
  menuText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#0F172A',
  },
  deleteText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#EF4444',
  },
});
