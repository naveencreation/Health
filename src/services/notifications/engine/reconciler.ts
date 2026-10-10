import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleNotificationAsync,
  getAllScheduledNotificationsAsync,
  SchedulableTriggerInputTypes,
  NotificationRequest,
} from '../expoNotifications';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { PlannedNotification } from '../types';
import { Monitoring } from '@/services/monitoring';

export const LEGACY_MIGRATION_FLAG_KEY = '@calori_notif_migrated_v2';

export interface ReconcileResult {
  added: number;
  removed: number;
  updated: number;
  untouched: number;
}

class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  public async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const nextPromise = new Promise<void>(resolve => {
      release = resolve;
    });

    const currentQueue = this.queue;
    this.queue = this.queue.then(() => nextPromise);

    await currentQueue;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

export class NotificationReconciler {
  private static mutex = new AsyncMutex();

  /**
   * Reconciles the desired planned notifications with currently pending OS notifications.
   * Execution is sequentialized via an async mutex to prevent concurrent queue mutations.
   */
  public static async reconcile(planned: PlannedNotification[]): Promise<ReconcileResult> {
    return this.mutex.runExclusive(async () => {
      if (Platform.OS === 'web') {
        return { added: 0, removed: 0, updated: 0, untouched: 0 };
      }

      await this.runLegacyMigrationIfNeeded();

      let existingRequests: NotificationRequest[] = [];
      try {
        existingRequests = await getAllScheduledNotificationsAsync();
      } catch (err) {
        console.warn('[NotificationReconciler] Failed to fetch scheduled notifications:', err);
        return { added: 0, removed: 0, updated: 0, untouched: 0 };
      }

      // Map existing calori_ notifications
      const existingMap = new Map<
        string,
        { identifier: string; fireAt?: number; request: NotificationRequest }
      >();

      for (const req of existingRequests) {
        const customId = req.content?.data?.id as string | undefined;
        const effectiveId = (customId || req.identifier || '').trim();

        if (effectiveId.startsWith('calori_')) {
          const rawFireAt = req.content?.data?.fireAt;
          const triggerDate = (req.trigger as any)?.date ?? (req.trigger as any)?.value;
          const fireAt =
            typeof rawFireAt === 'number'
              ? rawFireAt
              : typeof triggerDate === 'number'
                ? triggerDate
                : triggerDate instanceof Date
                  ? triggerDate.getTime()
                  : undefined;

          existingMap.set(effectiveId, {
            identifier: req.identifier,
            fireAt,
            request: req,
          });
        }
      }

      const plannedMap = new Map(planned.map(p => [p.id, p]));

      const toCancel: { id: string; identifier: string }[] = [];
      const toUpdate: PlannedNotification[] = [];
      let untouchedCount = 0;

      // 1. Determine cancellations and updates
      for (const [id, existingItem] of existingMap.entries()) {
        const plannedItem = plannedMap.get(id);
        if (!plannedItem) {
          toCancel.push({ id, identifier: existingItem.identifier });
        } else {
          const diffMs =
            typeof existingItem.fireAt === 'number'
              ? Math.abs(plannedItem.fireAt - existingItem.fireAt)
              : 0;

          // If difference is >= 60 seconds, cancel and reschedule
          if (diffMs >= 60 * 1000) {
            toCancel.push({ id, identifier: existingItem.identifier });
            toUpdate.push(plannedItem);
          } else {
            untouchedCount++;
          }
        }
      }

      // 2. Determine additions
      const toSchedule: PlannedNotification[] = [];
      for (const p of planned) {
        if (!existingMap.has(p.id)) {
          toSchedule.push(p);
        }
      }

      // 3. Execute cancellations
      for (const item of toCancel) {
        try {
          await cancelScheduledNotificationAsync(item.identifier);
        } catch (err) {
          console.warn(`[NotificationReconciler] Failed to cancel ${item.id}:`, err);
        }
      }

      // 4. Execute additions & updates
      const scheduleItems = [...toSchedule, ...toUpdate];
      let successfullyAdded = 0;
      let successfullyUpdated = 0;

      for (const item of scheduleItems) {
        try {
          await scheduleNotificationAsync({
            identifier: item.id,
            content: {
              title: item.title,
              body: item.body,
              sound: true,
              data: {
                ...item.data,
                id: item.id,
                fireAt: item.fireAt,
              },
              ...(Platform.OS === 'android' && item.channelId
                ? { channelId: item.channelId }
                : {}),
            },
            trigger: {
              type: SchedulableTriggerInputTypes.DATE,
              date: item.fireAt,
              ...(Platform.OS === 'android' && item.channelId
                ? { channelId: item.channelId }
                : {}),
            },
          });

          if (toSchedule.includes(item)) {
            successfullyAdded++;
          } else {
            successfullyUpdated++;
          }
        } catch (err) {
          console.warn(`[NotificationReconciler] Failed to schedule ${item.id}:`, err);
        }
      }

      const result: ReconcileResult = {
        added: successfullyAdded,
        removed: Math.max(0, toCancel.length - toUpdate.length),
        updated: successfullyUpdated,
        untouched: untouchedCount,
      };

      try {
        Monitoring.logEvent('notif_reconcile_complete', {
          added: result.added,
          removed: result.removed,
          updated: result.updated,
          untouched: result.untouched,
        }).catch(() => {});
      } catch {}

      return result;
    });
  }

  /**
   * One-time legacy migration: cancels all non-calori_ notifications scheduled by old systems.
   */
  public static async runLegacyMigrationIfNeeded(): Promise<void> {
    try {
      const migrated = await AsyncStorage.getItem(LEGACY_MIGRATION_FLAG_KEY);
      if (migrated) return;

      const existing = await getAllScheduledNotificationsAsync();
      for (const req of existing) {
        const customId = req.content?.data?.id as string | undefined;
        const effectiveId = (customId || req.identifier || '').trim();
        if (!effectiveId.startsWith('calori_')) {
          await cancelScheduledNotificationAsync(req.identifier);
        }
      }

      await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
    } catch (err) {
      console.warn('[NotificationReconciler] Legacy migration error:', err);
    }
  }

  /**
   * Resets the legacy migration flag (useful for testing or full resets).
   */
  public static async resetLegacyMigrationFlag(): Promise<void> {
    await AsyncStorage.removeItem(LEGACY_MIGRATION_FLAG_KEY);
  }
}
