import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScopedStorage } from '../scopedStorage';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    getAllKeys: jest.fn(async () => Object.keys(store)),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach(k => delete store[k]);
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
  };
});

describe('ScopedStorage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('generates consistent scoped keys', () => {
    expect(ScopedStorage.getKey('cup_pref', 'user_123')).toBe('@calori_user_123_cup_pref');
    expect(ScopedStorage.getKey('@calori_water_goal', 'user_123')).toBe(
      '@calori_user_123_water_goal'
    );
    expect(ScopedStorage.getKey('cup_pref')).toBe('@calori_guest_cup_pref');
  });

  it('sets and gets object values correctly', async () => {
    const payload = { cupSize: 350, unit: 'ml' };
    await ScopedStorage.setItem('water_pref', payload, 'user_abc');

    const result = await ScopedStorage.getItem<typeof payload>('water_pref', 'user_abc');
    expect(result).toEqual(payload);

    // Another user shouldn't see it
    const otherUserResult = await ScopedStorage.getItem('water_pref', 'user_xyz');
    expect(otherUserResult).toBeNull();
  });

  it('falls back to default value when key is not found', async () => {
    const fallback = { cupSize: 250 };
    const result = await ScopedStorage.getItem('missing_key', 'user_123', fallback);
    expect(result).toEqual(fallback);
  });

  it('removes keys cleanly', async () => {
    await ScopedStorage.setItem('temp_key', 'value', 'user_123');
    await ScopedStorage.removeItem('temp_key', 'user_123');

    const result = await ScopedStorage.getItem('temp_key', 'user_123');
    expect(result).toBeNull();
  });

  it('clears all keys strictly for the specified user', async () => {
    await ScopedStorage.setItem('k1', 'val1', 'user_A');
    await ScopedStorage.setItem('k2', 'val2', 'user_A');
    await ScopedStorage.setItem('k1', 'val1_B', 'user_B');

    await ScopedStorage.clearUserScope('user_A');

    expect(await ScopedStorage.getItem('k1', 'user_A')).toBeNull();
    expect(await ScopedStorage.getItem('k2', 'user_A')).toBeNull();
    // user_B preserved!
    expect(await ScopedStorage.getItem('k1', 'user_B')).toBe('val1_B');
  });
});
