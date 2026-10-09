import { mealPhotoService } from '../mealPhotoService';
import * as FileSystem from 'expo-file-system/legacy';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, storage } from '@/services/firebase';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///data/user/0/calori/files/',
  EncodingType: { Base64: 'base64' },
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn((_storage, path) => ({ path })),
  uploadString: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
  listAll: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({
  storage: { name: 'mock-storage' },
  auth: {
    currentUser: null as any,
  },
}));

describe('mealPhotoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('saveMealPhotoLocally', () => {
    it('creates meals directory if it does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

      await mealPhotoService.saveMealPhotoLocally('meal_123', 'file:///tmp/photo.jpg');

      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        'file:///data/user/0/calori/files/meals/',
        { intermediates: true }
      );
    });

    it('copies file when given a file:// URI', async () => {
      const result = await mealPhotoService.saveMealPhotoLocally('meal_123', 'file:///tmp/photo.jpg');

      expect(FileSystem.copyAsync).toHaveBeenCalledWith({
        from: 'file:///tmp/photo.jpg',
        to: 'file:///data/user/0/calori/files/meals/meal_123.jpg',
      });
      expect(result).toBe('file:///data/user/0/calori/files/meals/meal_123.jpg');
    });

    it('writes base64 data directly to disk stripping scheme prefix', async () => {
      const rawBase64 = 'data:image/jpeg;base64,AQIDBA==';
      const result = await mealPhotoService.saveMealPhotoLocally('meal_456', rawBase64);

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        'file:///data/user/0/calori/files/meals/meal_456.jpg',
        'AQIDBA==',
        { encoding: 'base64' }
      );
      expect(result).toBe('file:///data/user/0/calori/files/meals/meal_456.jpg');
    });
  });

  describe('uploadMealPhoto & Cross-Account Isolation', () => {
    it('rejects upload when unauthenticated', async () => {
      (auth as any).currentUser = null;

      const url = await mealPhotoService.uploadMealPhoto('user_123', 'meal_1', 'AQIDBA==');

      expect(url).toBeNull();
      expect(uploadString).not.toHaveBeenCalled();
    });

    it('PREVENTS CROSS-ACCOUNT UPLOADS: rejects when target userId does not match auth.currentUser.uid', async () => {
      (auth as any).currentUser = { uid: 'user_A', isAnonymous: false };

      // Attacker tries to upload into user_B's directory
      const url = await mealPhotoService.uploadMealPhoto('user_B', 'meal_1', 'AQIDBA==');

      expect(url).toBeNull();
      expect(uploadString).not.toHaveBeenCalled();
    });

    it('rejects upload when user is anonymous/guest', async () => {
      (auth as any).currentUser = { uid: 'guest_123', isAnonymous: true };

      const url = await mealPhotoService.uploadMealPhoto('guest_123', 'meal_1', 'AQIDBA==');

      expect(url).toBeNull();
      expect(uploadString).not.toHaveBeenCalled();
    });

    it('uploads to strictly user-scoped path users/{userId}/meals/{mealId}.jpg when authorized', async () => {
      (auth as any).currentUser = { uid: 'user_123', isAnonymous: false };
      (uploadString as jest.Mock).mockResolvedValueOnce(undefined);
      (getDownloadURL as jest.Mock).mockResolvedValueOnce('https://storage.googleapis.com/calori/photo.jpg');

      const url = await mealPhotoService.uploadMealPhoto('user_123', 'meal_999', 'AQIDBA==');

      expect(ref).toHaveBeenCalledWith(storage, 'users/user_123/meals/meal_999.jpg');
      expect(uploadString).toHaveBeenCalledWith(
        { path: 'users/user_123/meals/meal_999.jpg' },
        'AQIDBA==',
        'base64',
        { contentType: 'image/jpeg' }
      );
      expect(url).toBe('https://storage.googleapis.com/calori/photo.jpg');
    });
  });

  describe('deleteMealPhoto', () => {
    it('deletes local sandboxed file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });

      await mealPhotoService.deleteMealPhoto('user_123', 'meal_abc');

      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///data/user/0/calori/files/meals/meal_abc.jpg',
        { idempotent: true }
      );
    });

    it('deletes remote storage file when account matches authenticated user', async () => {
      (auth as any).currentUser = { uid: 'user_123', isAnonymous: false };

      await mealPhotoService.deleteMealPhoto('user_123', 'meal_abc');

      expect(ref).toHaveBeenCalledWith(storage, 'users/user_123/meals/meal_abc.jpg');
      expect(deleteObject).toHaveBeenCalledWith({ path: 'users/user_123/meals/meal_abc.jpg' });
    });

    it('skips remote deletion if user does not match currentUser', async () => {
      (auth as any).currentUser = { uid: 'user_A', isAnonymous: false };

      await mealPhotoService.deleteMealPhoto('user_B', 'meal_abc');

      expect(deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('deleteAllUserPhotos', () => {
    it('lists and deletes all photos for authenticated user', async () => {
      (auth as any).currentUser = { uid: 'user_123', isAnonymous: false };
      const mockItems = [{ path: 'users/user_123/meals/1.jpg' }, { path: 'users/user_123/meals/2.jpg' }];
      const { listAll } = require('firebase/storage');
      (listAll as jest.Mock).mockResolvedValueOnce({ items: mockItems });

      await mealPhotoService.deleteAllUserPhotos('user_123');

      expect(ref).toHaveBeenCalledWith(storage, 'users/user_123/meals');
      expect(deleteObject).toHaveBeenCalledTimes(2);
      expect(deleteObject).toHaveBeenCalledWith(mockItems[0]);
      expect(deleteObject).toHaveBeenCalledWith(mockItems[1]);
    });

    it('bypasses if target userId does not match currentUser', async () => {
      (auth as any).currentUser = { uid: 'user_A', isAnonymous: false };
      const { listAll } = require('firebase/storage');

      await mealPhotoService.deleteAllUserPhotos('user_B');

      expect(listAll).not.toHaveBeenCalled();
    });
  });

  describe('pruneOldLocalPhotos', () => {
    it('prunes files older than cutoff age', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      const now = Date.now();
      const oldTimestamp = now - 40 * 24 * 60 * 60 * 1000; // 40 days ago
      const recentTimestamp = now - 5 * 24 * 60 * 60 * 1000; // 5 days ago

      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce([
        `meal_${oldTimestamp}.jpg`,
        `meal_${recentTimestamp}.jpg`,
        'non_image.txt',
      ]);

      const count = await mealPhotoService.pruneOldLocalPhotos(30);

      expect(count).toBe(1);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        `file:///data/user/0/calori/files/meals/meal_${oldTimestamp}.jpg`,
        { idempotent: true }
      );
      expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith(
        `file:///data/user/0/calori/files/meals/meal_${recentTimestamp}.jpg`,
        expect.anything()
      );
    });
  });
});
