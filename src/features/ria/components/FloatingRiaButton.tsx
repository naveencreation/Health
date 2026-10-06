/**
 * FloatingRiaButton.tsx
 * 
 * Floating Ria avatar button for the Today screen and dashboard:
 * - 56dp circular avatar with terracotta border and shadow
 * - Idle pulse animation on first launch and unread indicator
 * - Dot badge (never a count) when fresh insight/review exists
 * - Drag and snap-to-edge interaction (horizontal left/right snapping)
 * - Dismissible one-time coach mark ("Ask Ria anything ✨")
 * - Long-press menu: Log by text, Scan a meal, How's my day
 * - Hide/show animation on scroll or when modals/keyboard are active
 * - Safe-area aware, minimum 48dp touch target
 * 
 * Spec: RIA_Chat.md section 4, 16 (Phase R3).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  Animated as RNAnimated,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

export type RiaQuickActionType = 'text' | 'scan' | 'day_review';

export interface FloatingRiaButtonProps {
  onPress: () => void;
  onQuickAction?: (action: RiaQuickActionType) => void;
  hasUnread?: boolean;
  hidden?: boolean;
  testID?: string;
}

const BUTTON_SIZE = 56;
const HALO_SIZE = 70;
const STORAGE_KEY_COACHMARK = '@calori_ria_coachmark_dismissed';

export const FloatingRiaButton: React.FC<FloatingRiaButtonProps> = ({
  onPress,
  onQuickAction,
  hasUnread = false,
  hidden = false,
  testID = 'floating-ria-btn',
}) => {
  const insets = useSafeAreaInsets();
  const screenDimensions = Dimensions.get('window');
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;

  const [coachMarkVisible, setCoachMarkVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isSnappedLeft, setIsSnappedLeft] = useState(false);

  // Position animations
  const panX = useRef(new RNAnimated.Value(0)).current;
  const panY = useRef(new RNAnimated.Value(0)).current;
  const visibilityAnim = useRef(new RNAnimated.Value(1)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const haloOpacity = useRef(new RNAnimated.Value(0)).current;

  // Track position values for gesture math
  const currentPanX = useRef(0);
  const currentPanY = useRef(0);
  const isDragging = useRef(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Default resting position: bottom-right
  const defaultRightMargin = 18;
  const defaultBottomMargin = Math.max(insets.bottom, 16) + 68;

  // Check coach mark dismissal state
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_COACHMARK).then(val => {
      if (!val) {
        setCoachMarkVisible(true);
      }
    });
  }, []);

  // Idle pulse on first launch or when unread
  useEffect(() => {
    let loopAnimation: RNAnimated.CompositeAnimation | null = null;
    if (hasUnread) {
      loopAnimation = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.parallel([
            RNAnimated.timing(pulseAnim, {
              toValue: 1.06,
              duration: 1000,
              useNativeDriver: true,
            }),
            RNAnimated.timing(haloOpacity, {
              toValue: 0.45,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          RNAnimated.parallel([
            RNAnimated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            RNAnimated.timing(haloOpacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      loopAnimation.start();
    } else {
      pulseAnim.setValue(1);
      haloOpacity.setValue(0);
    }

    return () => {
      loopAnimation?.stop();
    };
  }, [hasUnread, pulseAnim, haloOpacity]);

  // Smooth visibility transition when hidden prop changes
  useEffect(() => {
    RNAnimated.timing(visibilityAnim, {
      toValue: hidden ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [hidden, visibilityAnim]);

  // Handle coach mark dismiss
  const handleDismissCoachMark = useCallback(() => {
    setCoachMarkVisible(false);
    AsyncStorage.setItem(STORAGE_KEY_COACHMARK, 'true').catch(() => {});
    haptics.selection();
  }, []);

  // PanResponder for drag and snap-to-edge
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        // Start long-press timer
        longPressTimer.current = setTimeout(() => {
          if (!isDragging.current) {
            haptics.impactLight();
            setMenuVisible(true);
          }
        }, 500);
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8) {
          isDragging.current = true;
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        panX.setValue(gesture.dx);
        panY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // Tap detected (minimal movement)
        if (!isDragging.current && Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) {
          haptics.impactLight();
          onPress();
          return;
        }

        // Snap to nearest horizontal edge (left or right)
        const finalAbsoluteX = screenWidth - defaultRightMargin - BUTTON_SIZE + gesture.dx;
        const shouldSnapLeft = finalAbsoluteX < screenWidth / 2;

        setIsSnappedLeft(shouldSnapLeft);

        const targetX = shouldSnapLeft
          ? -(screenWidth - defaultRightMargin - 18 - BUTTON_SIZE)
          : 0;

        // Clamp vertical drag within screen safe margins
        const minY = -(screenHeight - insets.top - defaultBottomMargin - 120);
        const maxY = 40;
        const clampedY = Math.max(minY, Math.min(maxY, gesture.dy));

        RNAnimated.parallel([
          RNAnimated.spring(panX, {
            toValue: targetX,
            useNativeDriver: true,
            bounciness: 6,
          }),
          RNAnimated.spring(panY, {
            toValue: clampedY,
            useNativeDriver: true,
            bounciness: 4,
          }),
        ]).start();

        currentPanX.current = targetX;
        currentPanY.current = clampedY;
        isDragging.current = false;
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        RNAnimated.spring(panX, { toValue: currentPanX.current, useNativeDriver: true }).start();
        RNAnimated.spring(panY, { toValue: currentPanY.current, useNativeDriver: true }).start();
        isDragging.current = false;
      },
    })
  ).current;

  const handleMenuAction = (action: 'text' | 'scan' | 'day_review') => {
    setMenuVisible(false);
    haptics.selection();
    if (onQuickAction) {
      onQuickAction(action);
    } else {
      onPress();
    }
  };

  const animatedStyle = {
    opacity: visibilityAnim,
    transform: [
      { translateX: panX },
      { translateY: panY },
      { scale: pulseAnim },
      {
        translateY: visibilityAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [70, 0],
        }),
      },
    ],
  };

  return (
    <>
      <RNAnimated.View
        style={[
          styles.container,
          {
            right: defaultRightMargin,
            bottom: defaultBottomMargin,
          },
          animatedStyle,
        ]}
        pointerEvents={hidden ? 'none' : 'auto'}
        testID={testID}
      >
        {/* Nudge Coach Mark Bubble */}
        {coachMarkVisible && !hidden && (
          <View
            style={[
              styles.coachMarkBubble,
              isSnappedLeft ? styles.coachMarkLeft : styles.coachMarkRight,
            ]}
            testID="ria-coachmark-bubble"
          >
            <Pressable
              style={styles.coachMarkContent}
              onPress={() => {
                handleDismissCoachMark();
                onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel="Ask Ria anything"
            >
              <Text style={styles.coachMarkSparkle}>✨</Text>
              <Text style={styles.coachMarkText}>Ask Ria anything</Text>
            </Pressable>
            <Pressable
              style={styles.coachMarkClose}
              onPress={handleDismissCoachMark}
              hitSlop={8}
              testID="ria-coachmark-dismiss"
              accessibilityRole="button"
              accessibilityLabel="Dismiss hint"
            >
              <Ionicons name="close" size={14} color="#94A3B8" />
            </Pressable>
          </View>
        )}

        {/* Pulse Halo Circle */}
        <RNAnimated.View
          style={[
            styles.halo,
            {
              opacity: haloOpacity,
            },
          ]}
          pointerEvents="none"
        />

        {/* Main Avatar Touch Surface */}
        <Pressable
          {...panResponder.panHandlers}
          style={({ pressed }) => [
            styles.buttonSurface,
            pressed ? styles.buttonPressed : null,
          ]}
          onPress={() => {
            if (!isDragging.current) {
              haptics.impactLight();
              onPress();
            }
          }}
          onLongPress={() => {
            if (!isDragging.current) {
              haptics.impactLight();
              setMenuVisible(true);
            }
          }}
          delayLongPress={450}
          accessibilityRole="button"
          accessibilityLabel="Ask Ria"
          testID="ria-floating-trigger"
        >
          <Image
            source={require('../../../../assets/ria_avatar.webp')}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />

          {/* Unread Dot Badge (Never a count, pure 10dp dot) */}
          {hasUnread && (
            <View style={styles.unreadBadge} testID="ria-unread-badge" />
          )}
        </Pressable>
      </RNAnimated.View>

      {/* Long-Press Quick Action Sheet */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMenuVisible(false)}
          testID="ria-menu-backdrop"
        >
          <View style={styles.menuCard} testID="ria-quick-menu">
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Ria Quick Actions</Text>
              <Pressable
                onPress={() => setMenuVisible(false)}
                hitSlop={8}
                testID="ria-menu-close"
              >
                <Ionicons name="close-circle-outline" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => handleMenuAction('text')}
              testID="ria-quick-text"
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#FFF5F1' }]}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>Log by text</Text>
                <Text style={styles.menuItemSubtitle}>Tell Ria what you ate</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => handleMenuAction('scan')}
              testID="ria-quick-scan"
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="camera-outline" size={18} color="#16A34A" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>Scan a meal</Text>
                <Text style={styles.menuItemSubtitle}>Snap photo with camera</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => handleMenuAction('day_review')}
              testID="ria-quick-review"
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="bar-chart-outline" size={18} color="#2563EB" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>How's my day?</Text>
                <Text style={styles.menuItemSubtitle}>Review calories and macros</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 490,
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: 'rgba(244, 117, 81, 0.28)',
  },
  buttonSurface: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F47551',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.16)',
        cursor: 'pointer',
      },
    }),
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  avatarImage: {
    width: BUTTON_SIZE - 6,
    height: BUTTON_SIZE - 6,
    borderRadius: (BUTTON_SIZE - 6) / 2,
  },
  unreadBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F47551',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  coachMarkBubble: {
    position: 'absolute',
    bottom: BUTTON_SIZE + 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  coachMarkRight: {
    right: 0,
  },
  coachMarkLeft: {
    left: 0,
  },
  coachMarkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  coachMarkSparkle: {
    fontSize: 13,
    marginRight: 5,
  },
  coachMarkText: {
    fontSize: 12.5,
    fontFamily: Fonts.urbanist.semiBold,
    color: '#0F172A',
  },
  coachMarkClose: {
    padding: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)',
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.urbanist.regular,
    color: '#64748B',
  },
});
