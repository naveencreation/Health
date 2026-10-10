/**
 * Safe adapter for expo-notifications.
 *
 * Deep-imports individual notification submodules to prevent Metro from evaluating
 * `expo-notifications/build/index.js` -> `DevicePushTokenAutoRegistration.fx.js`.
 * In Expo SDK 53+, `DevicePushTokenAutoRegistration.fx` unconditionally invokes
 * `warnOfExpoGoPushUsage()`, which throws an uncaught fatal exception on Android inside
 * the Expo Go client even when an application only uses local notifications.
 */
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { addNotificationResponseReceivedListener } from 'expo-notifications/build/NotificationsEmitter';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import type {
  NotificationRequest,
  NotificationResponse,
  EventSubscription,
} from 'expo-notifications/build/Notifications.types';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';

export {
  scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  setNotificationHandler,
  addNotificationResponseReceivedListener,
  setNotificationChannelAsync,
  AndroidImportance,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  type NotificationRequest,
  type NotificationResponse,
  type EventSubscription,
};
