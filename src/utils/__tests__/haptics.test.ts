import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  haptics,
  setHapticsEnabled,
  isHapticsEnabled,
  selection,
  impactLight,
  impactMedium,
  impactHeavy,
  impactRigid,
  impactSoft,
  success,
  warning,
  error,
} from '../haptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Rigid: 'rigid',
    Soft: 'soft',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('Haptics Engine (src/utils/haptics)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHapticsEnabled(true);
    Platform.OS = 'android';
  });

  test('reports default enabled state', () => {
    expect(isHapticsEnabled()).toBe(true);
    expect(haptics.isEnabled()).toBe(true);
  });

  test('toggles enabled state cleanly', () => {
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);
    expect(haptics.isEnabled()).toBe(false);

    haptics.setEnabled(true);
    expect(haptics.isEnabled()).toBe(true);
  });

  test('triggers selectionAsync on selection()', async () => {
    await selection();
    expect(ExpoHaptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  test('triggers impactAsync with Light, Medium, Heavy profiles', async () => {
    await impactLight();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('light');

    await impactMedium();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('medium');

    await impactHeavy();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('heavy');

    await impactRigid();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('rigid');

    await impactSoft();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('soft');
  });

  test('triggers notificationAsync with Success, Warning, Error profiles', async () => {
    await success();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith('success');

    await warning();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith('warning');

    await error();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  test('mutes all feedback when haptics are disabled', async () => {
    setHapticsEnabled(false);

    await selection();
    await impactLight();
    await impactMedium();
    await impactHeavy();
    await success();
    await warning();
    await error();

    expect(ExpoHaptics.selectionAsync).not.toHaveBeenCalled();
    expect(ExpoHaptics.impactAsync).not.toHaveBeenCalled();
    expect(ExpoHaptics.notificationAsync).not.toHaveBeenCalled();
  });

  test('bypasses feedback gracefully on web platform', async () => {
    Platform.OS = 'web';

    await selection();
    await impactLight();
    await success();

    expect(ExpoHaptics.selectionAsync).not.toHaveBeenCalled();
    expect(ExpoHaptics.impactAsync).not.toHaveBeenCalled();
    expect(ExpoHaptics.notificationAsync).not.toHaveBeenCalled();
  });

  test('swallows errors gracefully without throwing', async () => {
    (ExpoHaptics.selectionAsync as jest.Mock).mockRejectedValueOnce(new Error('Device error'));
    await expect(selection()).resolves.toBeUndefined();
  });
});
