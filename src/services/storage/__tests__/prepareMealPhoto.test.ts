import { ImageManipulator } from 'expo-image-manipulator';
import { prepareMealPhoto } from '../mealPhotoService';
import { AI_CONFIG } from '@/services/ai/config/AIConfig';

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: jest.fn() },
}));
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///x/' }));
jest.mock('firebase/storage', () => ({}));
jest.mock('@/services/firebase', () => ({ storage: {}, auth: {} }));

const resize = jest.fn();
const saveAsync = jest.fn();
const renderAsync = jest.fn();
const release = jest.fn();
const ctx = { resize, renderAsync, release };

beforeEach(() => {
  jest.clearAllMocks();
  resize.mockReturnValue(ctx);
  saveAsync.mockResolvedValue({ uri: 'file:///out.jpg', base64: 'NEW' });
  renderAsync.mockResolvedValue({ saveAsync, release });
  (ImageManipulator.manipulate as jest.Mock).mockReturnValue(ctx);
});

const run = (width: number, height: number, base64: string | null = 'OLD') =>
  prepareMealPhoto({ uri: 'file:///in.jpg', width, height, base64 });

describe('prepareMealPhoto', () => {
  it('resizes landscape by width', async () => {
    const r = await run(4000, 3000);
    expect(resize).toHaveBeenCalledWith({ width: AI_CONFIG.IMAGE.MAX_DIMENSION });
    expect(r).toEqual({ uri: 'file:///out.jpg', base64: 'NEW', mimeType: 'image/jpeg' });
  });

  it('resizes portrait by height', async () => {
    await run(3000, 4000);
    expect(resize).toHaveBeenCalledWith({ height: AI_CONFIG.IMAGE.MAX_DIMENSION });
  });

  it('skips resize for small images but still re-encodes', async () => {
    await run(800, 600);
    expect(resize).not.toHaveBeenCalled();
    expect(saveAsync).toHaveBeenCalledWith({
      format: 'jpeg',
      compress: AI_CONFIG.IMAGE.JPEG_QUALITY,
      base64: true,
    });
  });

  it('falls back to the picker data when manipulation throws', async () => {
    renderAsync.mockRejectedValue(new Error('boom'));
    expect(await run(4000, 3000)).toEqual({
      uri: 'file:///in.jpg',
      base64: 'OLD',
      mimeType: 'image/jpeg',
    });
  });

  it('rejects when manipulation throws and there is no base64', async () => {
    renderAsync.mockRejectedValue(new Error('boom'));
    await expect(run(4000, 3000, null)).rejects.toThrow('boom');
  });
});
