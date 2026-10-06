import { Platform } from 'react-native';
import {
  getGrantedPermissions,
  openHealthConnectSettings,
  requestPermission,
} from 'react-native-health-connect';
import { initializeHealthConnect } from './healthConnect';

const STEPS_PERMISSION = {
  accessType: 'read' as const,
  recordType: 'Steps' as const,
};

export async function hasStepsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const ready = await initializeHealthConnect();
    if (!ready) {
      return false;
    }

    const permissions = await getGrantedPermissions();

    return permissions.some(
      permission =>
        'recordType' in permission &&
        permission.accessType === 'read' &&
        permission.recordType === 'Steps'
    );
  } catch (error) {
    console.error('[HealthPermissions] Failed to check permissions:', error);

    return false;
  }
}

export async function requestStepsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const ready = await initializeHealthConnect();
    if (!ready) {
      return false;
    }

    const permissions = await requestPermission([STEPS_PERMISSION]);

    return permissions.some(
      permission =>
        'recordType' in permission &&
        permission.accessType === 'read' &&
        permission.recordType === 'Steps'
    );
  } catch (error) {
    console.error('[HealthPermissions] Permission request failed:', error);

    return false;
  }
}

export function openHealthSettings() {
  if (Platform.OS === 'android') {
    openHealthConnectSettings();
  }
}
