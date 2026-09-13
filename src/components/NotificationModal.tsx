import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';

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

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n_streak',
    type: 'streak',
    title: '🔥 7-Day Streak Achieved!',
    description: 'Outstanding discipline, Akshay! You have logged all your daily meals for a full week.',
    timeAgo: '10m ago',
    isUnread: true,
    accentColor: '#EA580C',
    iconName: 'flame',
  },
  {
    id: 'n_water',
    type: 'water',
    title: '💧 Hydration Check-in',
    description: "You're at 1,250 ml of your 2,500 ml target. Drink a glass of water to keep your metabolism humming.",
    timeAgo: '1h ago',
    isUnread: true,
    accentColor: '#2563EB',
    iconName: 'water',
  },
  {
    id: 'n_cals',
    type: 'calorie',
    title: '🎯 Calorie Deficit on Track',
    description: 'You have 680 kcal remaining for dinner. Your protein intake is already at 80% of goal!',
    timeAgo: '3h ago',
    isUnread: false,
    accentColor: '#10B981',
    iconName: 'pie-chart',
  },
  {
    id: 'n_steps',
    type: 'step',
    title: '👟 Step Goal Opportunity',
    description: 'You have reached 4,620 steps today. An evening 25-minute brisk walk will get you to 10k.',
    timeAgo: '5h ago',
    isUnread: false,
    accentColor: '#F59E0B',
    iconName: 'footsteps',
  },
  {
    id: 'n_ria',
    type: 'ria',
    title: '✨ Ria AI Coach Insight',
    description: 'Adding 10g more dietary fiber at dinner will slow glucose spikes and improve sleep quality.',
    timeAgo: 'Yesterday',
    isUnread: false,
    accentColor: '#8B5CF6',
    iconName: 'sparkles',
  },
];

export const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const hasUnread = notifications.some((n) => n.isUnread);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.backdropDismiss}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.handleContainer}>
            <View style={styles.dragHandle} />
          </View>
          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {notifications.length > 0 ? `${notifications.length} updates` : 'No notifications'}
            </Text>
          </View>
          {notifications.length > 0 ? (
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Read all</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
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
                style={[styles.notifCard, item.isUnread && styles.notifCardUnread]}
              >
                <View style={[styles.iconBox, { backgroundColor: item.accentColor + '18' }]}>
                  <Ionicons name={item.iconName} size={20} color={item.accentColor} />
                </View>

                <View style={styles.notifMain}>
                  <View style={styles.notifTopRow}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.timeAgo}>{item.timeAgo}</Text>
                  </View>
                  <Text style={styles.notifDesc}>{item.description}</Text>
                </View>

                {item.isUnread && <View style={styles.unreadDot} />}
              </View>
            ))
          )}

          {notifications.length > 0 && (
            <TouchableOpacity style={styles.clearAllBtn} onPress={clearAll} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={styles.clearAllText}>Clear All Notifications</Text>
            </TouchableOpacity>
          )}
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
