import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

interface NotificationItem {
  id: string;
  type: 'streak' | 'water' | 'calorie' | 'step' | 'ria';
  title: string;
  description: string;
  timeAgo: string;
  isUnread: boolean;
  accentColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const { userGoals, currentUser, currentLog, remainingCalories } = useHealth();

  const firstName = (currentUser?.name || userGoals.name || 'there').split(' ')[0];

  // Generate real dynamic notifications from live user data
  const dynamicNotifications = useMemo((): NotificationItem[] => {
    const notifs: NotificationItem[] = [];

    // Streak notification — only show if user has a meaningful streak
    const streak = userGoals.streakDays || 0;
    if (streak >= 3) {
      notifs.push({
        id: 'n_streak',
        type: 'streak',
        title: `🔥 ${streak}-Day Streak!`,
        description: `Outstanding discipline, ${firstName}! You have logged your meals for ${streak} days straight. Keep going!`,
        timeAgo: 'Today',
        isUnread: true,
        accentColor: '#EA580C',
        iconName: 'flame',
      });
    }

    // Hydration check — based on actual water logged today
    const waterMl = currentLog.waterMl || 0;
    const waterGoal = userGoals.waterGoalMl || 2500;
    if (waterMl < waterGoal) {
      const pct = Math.round((waterMl / waterGoal) * 100);
      notifs.push({
        id: 'n_water',
        type: 'water',
        title: '💧 Hydration Check-in',
        description: `You're at ${waterMl.toLocaleString()} ml of your ${waterGoal.toLocaleString()} ml target (${pct}%). Drink water to stay on track!`,
        timeAgo: 'Now',
        isUnread: waterMl === 0,
        accentColor: '#2563EB',
        iconName: 'water',
      });
    } else {
      notifs.push({
        id: 'n_water_done',
        type: 'water',
        title: '💧 Hydration Goal Hit!',
        description: `Amazing, ${firstName}! You've reached your ${waterGoal.toLocaleString()} ml water goal for today.`,
        timeAgo: 'Today',
        isUnread: false,
        accentColor: '#2563EB',
        iconName: 'water',
      });
    }

    // Calorie budget status — how many kcal remain
    const budget = userGoals.dailyCalorieBudget || 2000;
    if (remainingCalories > 0 && remainingCalories < budget) {
      notifs.push({
        id: 'n_cals',
        type: 'calorie',
        title: '🎯 Calorie Budget Update',
        description: `You have ${remainingCalories} kcal remaining today. Plan your meals wisely to hit your ${budget} kcal target!`,
        timeAgo: 'Today',
        isUnread: false,
        accentColor: '#10B981',
        iconName: 'pie-chart',
      });
    } else if (remainingCalories <= 0) {
      notifs.push({
        id: 'n_cals_over',
        type: 'calorie',
        title: '⚠️ Calorie Budget Reached',
        description: `You've hit your ${budget} kcal budget for today. Light snacks like fruits or salads are a safe choice now.`,
        timeAgo: 'Today',
        isUnread: true,
        accentColor: '#F59E0B',
        iconName: 'pie-chart',
      });
    }

    // Step goal progress
    const steps = currentLog.steps || 0;
    const stepGoal = userGoals.stepGoal || 10000;
    if (steps > 0 && steps < stepGoal) {
      const stepsLeft = stepGoal - steps;
      notifs.push({
        id: 'n_steps',
        type: 'step',
        title: '👟 Step Goal Progress',
        description: `You've reached ${steps.toLocaleString()} steps today. Just ${stepsLeft.toLocaleString()} more to hit your ${stepGoal.toLocaleString()} step goal!`,
        timeAgo: 'Today',
        isUnread: false,
        accentColor: '#F59E0B',
        iconName: 'footsteps',
      });
    } else if (steps >= stepGoal) {
      notifs.push({
        id: 'n_steps_done',
        type: 'step',
        title: '👟 Step Goal Achieved!',
        description: `Incredible, ${firstName}! You've hit ${steps.toLocaleString()} steps today — your ${stepGoal.toLocaleString()} step goal is crushed!`,
        timeAgo: 'Today',
        isUnread: true,
        accentColor: '#F59E0B',
        iconName: 'footsteps',
      });
    }

    // Ria AI tip — always shown as a contextual insight
    notifs.push({
      id: 'n_ria',
      type: 'ria',
      title: '✨ Ria AI Insight',
      description: 'Adding 10g more dietary fiber at dinner slows glucose spikes and improves sleep quality.',
      timeAgo: 'Yesterday',
      isUnread: false,
      accentColor: '#8B5CF6',
      iconName: 'sparkles',
    });

    return notifs;
  }, [firstName, userGoals, currentLog, remainingCalories]);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => dynamicNotifications);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIconBoxStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'streak':
        return styles.iconBoxStreak;
      case 'water':
        return styles.iconBoxWater;
      case 'calorie':
        return styles.iconBoxCalorie;
      case 'step':
        return styles.iconBoxStep;
      case 'ria':
        return styles.iconBoxRia;
      default:
        return styles.iconBoxDefault;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notifications backdrop"
        />
        <View style={styles.sheetContainer}>
          <View style={styles.handleContainer}>
            <View style={styles.dragHandle} />
          </View>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedCloseBtn : null]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close notifications modal"
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
            <View style={styles.headerTitleCenter}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>
                {notifications.length > 0 ? `${notifications.length} updates` : 'No notifications'}
              </Text>
            </View>
            {notifications.length > 0 ? (
              <Pressable
                onPress={markAllAsRead}
                style={({ pressed }) => [styles.actionBtn, pressed ? styles.pressedActionBtn : null]}
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
              >
                <Text style={styles.actionBtnText}>Read all</Text>
              </Pressable>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="notifications-off-outline" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptyDesc}>No new alerts or reminders. Keep up the great health habits!</Text>
              </View>
            ) : (
              notifications.map((item) => (
                <View
                  key={item.id}
                  style={[styles.notifCard, item.isUnread ? styles.notifCardUnread : null]}
                >
                  <View style={[styles.iconBox, getIconBoxStyle(item.type)]}>
                    <Ionicons name={item.iconName} size={20} color={item.accentColor} />
                  </View>

                  <View style={styles.notifMain}>
                    <View style={styles.notifTopRow}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      <Text style={styles.timeAgo}>{item.timeAgo}</Text>
                    </View>
                    <Text style={styles.notifDesc}>{item.description}</Text>
                  </View>

                  {item.isUnread ? <View style={styles.unreadDot} /> : null}
                </View>
              ))
            )}

            {notifications.length > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.clearAllBtn, pressed ? styles.pressedSubtle : null]}
                onPress={clearAll}
                accessibilityRole="button"
                accessibilityLabel="Clear all notifications"
              >
                <Ionicons name="trash-outline" size={14} color="#94A3B8" style={styles.trashIcon} />
                <Text style={styles.clearAllText}>Clear All Notifications</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    height: '86%',
    maxHeight: 720,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 10000,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedCloseBtn: {
    opacity: 0.7,
    backgroundColor: '#E2E8F0',
  },
  headerSpacer: {
    width: 44,
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  pressedActionBtn: {
    opacity: 0.75,
    backgroundColor: '#E2E8F0',
  },
  actionBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'flex-start',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  notifCardUnread: {
    borderColor: 'rgba(244, 117, 81, 0.3)',
    backgroundColor: '#FFFBF9',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxStreak: {
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
  },
  iconBoxWater: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  iconBoxCalorie: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  iconBoxStep: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  iconBoxRia: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  iconBoxDefault: {
    backgroundColor: '#F1F5F9',
  },
  notifMain: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    paddingRight: 6,
  },
  timeAgo: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
  },
  notifDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
    marginTop: 6,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
  },
  pressedSubtle: {
    opacity: 0.6,
  },
  trashIcon: {
    marginRight: 4,
  },
  clearAllText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
