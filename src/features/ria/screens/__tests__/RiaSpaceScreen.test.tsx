/**
 * RiaSpaceScreen.test.tsx
 * 
 * Comprehensive tests for RiaSpaceScreen:
 * - Header rendering and back navigation
 * - Empty state with friendly greeting and starter cards
 * - User sending message, thinking state, and streaming
 * - Stop button aborting active stream
 * - Limit reached state displaying LimitReachedCard
 * - Capacity resting state displaying CapacityNoticeCard
 * - Camera/Vision trigger
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockDoc = jest.fn().mockReturnValue({});
const mockGetDoc = jest.fn().mockResolvedValue({
  exists: () => false,
  data: () => ({ chat: 0, scan: 0 }),
});
const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockIncrement = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  increment: (val: number) => mockIncrement(val),
}));

jest.mock('@/services/firebase', () => ({
  db: {},
}));

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: jest.fn(),
  useGoals: jest.fn(),
  useAuth: jest.fn(),
}));

jest.mock('@/features/subscription/hooks/usePro', () => ({
  usePro: jest.fn(),
}));

jest.mock('@/services/ai', () => ({
  ...jest.requireActual('@/services/ai'),
  AIService: {
    streamChat: jest.fn(),
    analyzeFoodImage: jest.fn(),
  },
  ConversationMemoryManager: {
    loadSummary: jest.fn().mockResolvedValue(null),
    saveSummary: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Modal = ({ visible, children }: any) => (visible ? children : null);
  return RN;
});

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RiaSpaceScreen } from '../RiaSpaceScreen';
import { useDailyLog, useGoals, useAuth } from '@/context/HealthContext';
import { usePro } from '@/features/subscription/hooks/usePro';
import { AIService } from '@/services/ai';
import { RemoteConfigService } from '@/services/ai/config/RemoteConfigService';
import { RiaUsageCounter } from '@/services/ai/limits/RiaUsageCounter';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('RiaSpaceScreen', () => {
  const mockBack = jest.fn();
  const mockFoodVision = jest.fn();
  const mockPaywall = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockGetDoc.mockReset();
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({ chat: 0, scan: 0 }),
    });
    RiaUsageCounter.resetCache();
    RemoteConfigService.resetTestingOverrides();

    (useAuth as jest.Mock).mockReturnValue({
      currentUser: { id: 'user_123', name: 'Alex Johnson' },
    });

    (useGoals as jest.Mock).mockReturnValue({
      userGoals: {
        name: 'Alex Johnson',
        dailyCalorieBudget: 2000,
        targetProtein: 140,
        targetCarbs: 220,
        targetFat: 60,
        waterGoalMl: 2500,
        stepGoal: 10000,
        currentWeightKg: 70,
        targetWeightKg: 65,
        heightCm: 175,
        age: 28,
        gender: 'male',
        riaTone: 'supportive',
        struggles: [],
      },
    });

    (useDailyLog as jest.Mock).mockReturnValue({
      totalConsumed: 1200,
      remainingCalories: 800,
      totalProtein: 90,
      totalCarbs: 120,
      totalFat: 40,
      currentLog: {
        waterMl: 1500,
        steps: 6000,
        meals: [
          { name: 'Oats & Milk', mealType: 'breakfast', calories: 350, protein: 18 },
        ],
      },
    });

    (usePro as jest.Mock).mockReturnValue({
      isPro: false,
    });
  });

  it('renders header with title, subtitle, and fires onBack', async () => {
    const { getByText, getByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    expect(getByText('Ria')).toBeTruthy();
    expect(getByText('Knows your day')).toBeTruthy();

    const backBtn = getByTestId('ria-back-btn');
    fireEvent.press(backBtn);
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders empty state greeting and starter cards when thread is empty', async () => {
    const { getByText, getByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    expect(getByTestId('ria-empty-state')).toBeTruthy();
    expect(getByText(/Hi Alex, I'm Ria/)).toBeTruthy();
    expect(getByTestId('starter-card-dinner')).toBeTruthy();
    expect(getByTestId('starter-card-review')).toBeTruthy();
    expect(getByTestId('starter-card-coffee')).toBeTruthy();
  });

  it('sends message when starter card is pressed', async () => {
    (AIService.streamChat as jest.Mock).mockImplementation(
      async (prompt, history, context, onChunk) => {
        onChunk('Here is a great dinner idea: grilled paneer salad.');
        return 'Here is a great dinner idea: grilled paneer salad.';
      }
    );

    const { getByTestId, findByText } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    const starterDinner = getByTestId('starter-card-dinner');
    await act(async () => {
      fireEvent.press(starterDinner);
    });

    expect(AIService.streamChat).toHaveBeenCalled();
    const reply = await findByText(/grilled paneer salad/);
    expect(reply).toBeTruthy();
  });

  it('submits typed message from composer and streams reply', async () => {
    (AIService.streamChat as jest.Mock).mockImplementation(
      async (prompt, history, context, onChunk) => {
        onChunk('Filter coffee has about 60 to 90 calories.');
        return 'Filter coffee has about 60 to 90 calories.';
      }
    );

    const { getByTestId, findByText } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    const input = getByTestId('composer-text-input');
    await act(async () => {
      fireEvent.changeText(input, 'How many calories in filter coffee?');
    });

    const sendBtn = getByTestId('composer-send-btn');
    await act(async () => {
      fireEvent.press(sendBtn);
    });

    expect(AIService.streamChat).toHaveBeenCalled();
    const reply = await findByText(/Filter coffee has about 60 to 90 calories/);
    expect(reply).toBeTruthy();
  });

  it('allows stopping an in-flight stream via composer Stop button', async () => {
    (AIService.streamChat as jest.Mock).mockImplementation(
      (prompt, history, context, onChunk, signal) => {
        onChunk('Partial text before stop...');
        return new Promise((resolve, reject) => {
          signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }
    );

    const { getByTestId, findByTestId, findByText } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    const input = getByTestId('composer-text-input');
    await act(async () => {
      fireEvent.changeText(input, 'Tell me a long story');
    });

    const sendBtn = getByTestId('composer-send-btn');
    await act(async () => {
      fireEvent.press(sendBtn);
    });

    const stopBtn = await findByTestId('composer-stop-btn');
    await act(async () => {
      fireEvent.press(stopBtn);
    });

    const interruptedNotice = await findByText('Response interrupted');
    expect(interruptedNotice).toBeTruthy();
  });

  it('renders LimitReachedCard when free daily limit is reached and blocks composer', async () => {
    // Override usage in Firestore mock to 3
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ chat: 3, scan: 0 }),
    });

    const { findByTestId, queryByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} onOpenPaywall={mockPaywall} />
    );

    const limitCard = await findByTestId('limit-reached-card');
    expect(limitCard).toBeTruthy();

    // Composer is replaced/hidden
    expect(queryByTestId('composer-text-input')).toBeNull();
  });

  it('renders CapacityNoticeCard when shared AI pool is degraded', async () => {
    RemoteConfigService.overrideConfigForTesting({
      ria_pool_degraded: true,
    });

    const { findByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    const capacityCard = await findByTestId('capacity-notice-card');
    expect(capacityCard).toBeTruthy();
  });

  it('calls onOpenFoodVision when camera button is pressed', async () => {
    const { getByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} onOpenFoodVision={mockFoodVision} />
    );

    const photoBtn = getByTestId('composer-photo-btn');
    fireEvent.press(photoBtn);

    expect(mockFoodVision).toHaveBeenCalled();
  });

  it('opens photo selection sheet when camera button is pressed', async () => {
    const { getByTestId, findByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    const photoBtn = getByTestId('composer-photo-btn');
    await act(async () => {
      fireEvent.press(photoBtn);
    });

    const cameraOption = await findByTestId('photo-sheet-camera-btn');
    const galleryOption = await findByTestId('photo-sheet-gallery-btn');
    expect(cameraOption).toBeTruthy();
    expect(galleryOption).toBeTruthy();

    const cancelBtn = getByTestId('photo-sheet-cancel-btn');
    await act(async () => {
      fireEvent.press(cancelBtn);
    });
  });

  it('scans food photo via camera, increments scan counter, and renders proposed meal card with thumbnail', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///local/plate_photo.jpg',
          base64: 'valid_base64_food_image_data',
          mimeType: 'image/jpeg',
        },
      ],
    });

    (AIService.analyzeFoodImage as jest.Mock).mockResolvedValueOnce({
      isFood: true,
      name: 'Paneer Butter Masala',
      category: 'curries',
      categoryLabel: 'Curries & Gravies',
      servingUnit: 'bowl',
      defaultServingSize: 1,
      calories: 380,
      carbs: 14,
      protein: 18,
      fat: 28,
      fiber: 4,
      notes: 'Estimated 1 medium bowl',
    });

    const { getByTestId, findAllByText, findByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    const photoBtn = getByTestId('composer-photo-btn');
    await act(async () => {
      fireEvent.press(photoBtn);
    });

    const cameraBtn = await findByTestId('photo-sheet-camera-btn');
    await act(async () => {
      fireEvent.press(cameraBtn);
    });

    expect(AIService.analyzeFoodImage).toHaveBeenCalledWith(
      'valid_base64_food_image_data',
      'image/jpeg'
    );

    // User photo message rendered with thumbnail
    const userPhotoThumb = await findByTestId('user-photo-thumbnail');
    expect(userPhotoThumb).toBeTruthy();

    // Ria meal card rendered with food name and thumbnail
    const mealCard = await findByTestId('ria-action-card-meal');
    expect(mealCard).toBeTruthy();
    expect((await findAllByText('Paneer Butter Masala')).length).toBeGreaterThan(0);
    expect(await findByTestId('ria-action-card-meal-photo-thumb')).toBeTruthy();

    // Verify scan usage incremented
    const usage = await RiaUsageCounter.getUsage('user_123');
    expect(usage.scan).toBe(1);
  });

  it('handles non-food photo with friendly guidance text and no meal card', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///local/laptop.jpg',
          base64: 'valid_base64_laptop_data',
          mimeType: 'image/jpeg',
        },
      ],
    });

    (AIService.analyzeFoodImage as jest.Mock).mockResolvedValueOnce({
      isFood: false,
      name: 'Not Food',
      calories: 0,
    });

    const { getByTestId, findByText, queryByTestId, findByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} />
    );

    const photoBtn = getByTestId('composer-photo-btn');
    await act(async () => {
      fireEvent.press(photoBtn);
    });

    const cameraBtn = await findByTestId('photo-sheet-camera-btn');
    await act(async () => {
      fireEvent.press(cameraBtn);
    });

    const riaReply = await findByText(/I couldn't detect any food/);
    expect(riaReply).toBeTruthy();
    expect(queryByTestId('ria-action-card-meal')).toBeNull();
  });

  it('blocks photo scan when daily scan limit (5) is reached', async () => {
    // Mock user having 5 scans today
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ chat: 0, scan: 5 }),
    });

    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByTestId } = await render(
      <RiaSpaceScreen onBack={mockBack} onOpenPaywall={mockPaywall} />
    );

    const photoBtn = getByTestId('composer-photo-btn');
    await act(async () => {
      fireEvent.press(photoBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Daily Scan Limit Reached',
      expect.stringContaining('5 free scans'),
      expect.any(Array)
    );

    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
