import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { FirstMealWinScreen } from '../FirstMealWinScreen';
import { PendingMeal } from '../../services/onboardingDraft';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock react-native Modal to render children directly in test tree when visible
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Modal = ({ visible, children }: any) => (visible ? children : null);
  return RN;
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      ScrollView: ReactNative.ScrollView,
      Text: ReactNative.Text,
      createAnimatedComponent: (comp: any) => comp,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedProps: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    FadeInDown: { duration: () => ({ delay: () => ({}) }) },
    FadeOut: { duration: () => ({ delay: () => ({}) }) },
    ZoomIn: { duration: () => ({ delay: () => ({}) }) },
  };
});

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn().mockResolvedValue(undefined),
    impactLight: jest.fn().mockResolvedValue(undefined),
    impactMedium: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock ImagePicker
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

// Mock AIService
jest.mock('@/services/ai', () => ({
  AIService: {
    analyzeFoodImage: jest.fn(),
  },
  AIErrorMapper: {
    toUserMessage: jest.fn().mockReturnValue('Food analysis failed'),
  },
}));

describe('FirstMealWinScreen', () => {
  const defaultProps = {
    name: 'Alex',
    foodStyle: 'vegetarian' as const,
    struggles: ['portions' as const],
    dailyCalorieBudget: 2150,
    onBack: jest.fn(),
    onContinue: jest.fn(),
    onSkip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title with user name and initial scan card', async () => {
    const { getByText, getByTestId } = await render(<FirstMealWinScreen {...defaultProps} />);

    expect(getByText("Let's log your first meal, Alex.")).toBeTruthy();
    expect(getByText('Scan with AI Vision')).toBeTruthy();
    expect(getByTestId('scan-meal-card')).toBeTruthy();
  });

  it('renders quick pick starter foods matching vegetarian food style', async () => {
    const { getByText, getByTestId } = await render(<FirstMealWinScreen {...defaultProps} />);

    expect(getByText('2 Rotis with Dal & Sabzi')).toBeTruthy();
    expect(getByTestId('starter-chip-veg_1')).toBeTruthy();
  });

  it('switches meal slot when tapping a slot pill', async () => {
    const { getByTestId, getByText } = await render(<FirstMealWinScreen {...defaultProps} />);

    const dinnerBtn = getByTestId('slot-dinner');
    await act(async () => {
      fireEvent.press(dinnerBtn);
    });

    expect(getByText('Quick pick for dinner')).toBeTruthy();
  });

  it('allows tapping a starter food to open review mode and shows macros', async () => {
    const { getByTestId, getByText } = await render(<FirstMealWinScreen {...defaultProps} />);

    const firstStarter = getByTestId('starter-chip-veg_1');
    await act(async () => {
      fireEvent.press(firstStarter);
    });

    // Should transition to review mode
    expect(getByText('Review your meal')).toBeTruthy();
    expect(getByText('2 Rotis with Dal & Sabzi')).toBeTruthy();
    expect(getByText('340')).toBeTruthy(); // Calories
    expect(getByText('13g')).toBeTruthy(); // Protein
    expect(getByText('Portion Size')).toBeTruthy();
    expect(getByTestId('btn-log-meal')).toBeTruthy();
  });

  it('updates calories when choosing a portion multiplier', async () => {
    const { getByTestId, getByText } = await render(<FirstMealWinScreen {...defaultProps} />);

    // Select first starter
    await act(async () => {
      fireEvent.press(getByTestId('starter-chip-veg_1')); // 340 kcal
    });

    // Choose 2.0x portion
    await act(async () => {
      fireEvent.press(getByTestId('portion-2'));
    });

    // 340 * 2 = 680 kcal
    expect(getByText('680')).toBeTruthy();
  });

  it('logs meal and transitions to celebration screen, then continues', async () => {
    const onContinueMock = jest.fn();
    const { getByTestId, getByText } = await render(
      <FirstMealWinScreen {...defaultProps} onContinue={onContinueMock} />
    );

    // Select starter food
    await act(async () => {
      fireEvent.press(getByTestId('starter-chip-veg_1'));
    });

    // Confirm log
    await act(async () => {
      fireEvent.press(getByTestId('btn-log-meal'));
    });

    // Should transition to celebration screen
    expect(getByText('First meal logged!')).toBeTruthy();
    expect(getByText('DAY 1 STREAK STARTED!')).toBeTruthy();

    // Finish celebration
    await act(async () => {
      fireEvent.press(getByTestId('btn-save-plan'));
    });

    expect(onContinueMock).toHaveBeenCalledTimes(1);
    const mealArg: PendingMeal = onContinueMock.mock.calls[0][0];
    expect(mealArg.foodName).toBe('2 Rotis with Dal & Sabzi');
    expect(mealArg.calories).toBe(340);
    expect(mealArg.proteinG).toBe(13);
  });

  it('calls onSkip when user taps "I\'ll log later on Home"', async () => {
    const onSkipMock = jest.fn();
    const { getByTestId } = await render(
      <FirstMealWinScreen {...defaultProps} onSkip={onSkipMock} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('btn-skip-first-meal'));
    });
    expect(onSkipMock).toHaveBeenCalledTimes(1);
  });

  it('opens camera primer modal when tapping Scan with AI Vision', async () => {
    const { getByTestId, getByText } = await render(<FirstMealWinScreen {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('scan-meal-card'));
    });

    expect(getByText('Scan your food in 3 seconds')).toBeTruthy();
    expect(getByTestId('btn-open-camera')).toBeTruthy();
    expect(getByTestId('btn-open-gallery')).toBeTruthy();
  });
});
