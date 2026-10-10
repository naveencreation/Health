import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import {
  setNotificationChannelAsync,
  AndroidImportance,
} from '@/services/notifications/expoNotifications';

export interface NotificationChannelConfig {
  id: string;
  name: string;
  description: string;
  importance: AndroidImportance;
  vibrationPattern?: number[];
  lightColor?: string;
  sound?: string;
}

export const NOTIFICATION_CHANNELS = {
  MEALS: {
    id: 'reminders-meals',
    name: 'Meal Reminders',
    description: 'Timely reminders to log breakfast, lunch, and dinner.',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F47551',
  },
  WATER: {
    id: 'reminders-water',
    name: 'Hydration Reminders',
    description: 'Gentle hydration check-ins to help hit your daily water target.',
    importance: AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#0284C7',
  },
  STREAK: {
    id: 'reminders-streak',
    name: 'Streak Protection',
    description: 'Evening alerts when your logging streak is at risk.',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 150, 300],
    lightColor: '#EA580C',
  },
  STEPS: {
    id: 'reminders-steps',
    name: 'Activity & Movement Reminders',
    description: 'Afternoon step progress checks to keep you on pace.',
    importance: AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#EA580C',
  },
} as const;

/**
 * Registers all Android notification channels with the system NotificationManager.
 * No-op on iOS and Web.
 */
export async function setupNotificationChannels(): Promise<void> {
  // Notification channels are an Android-specific OS feature.
  // In Expo Go on Android, NotificationsChannelsProvider is stripped from the native client.
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return;

  try {
    const channels = Object.values(NOTIFICATION_CHANNELS);
    for (const channel of channels) {
      await setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        vibrationPattern: channel.vibrationPattern ? [...channel.vibrationPattern] : undefined,
        lightColor: channel.lightColor,
      });
    }
  } catch (error) {
    console.warn('[NotificationChannels] Failed to configure Android channels:', error);
  }
}
