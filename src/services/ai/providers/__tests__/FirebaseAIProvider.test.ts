import { FirebaseAIProvider } from '../FirebaseAIProvider';
import { RemoteConfigService } from '../../config/RemoteConfigService';
import { AIRateLimiter } from '../../gateway/AIRateLimiter';

const mockGenerateContentStream = jest.fn();
const mockGenerateContent = jest.fn();

jest.mock('@/services/firebase', () => ({
  app: {},
}));

jest.mock('firebase/remote-config', () => ({
  getRemoteConfig: jest.fn(() => ({
    settings: {},
    defaultConfig: {},
  })),
  fetchAndActivate: jest.fn(async () => true),
  getValue: jest.fn((rc, key) => ({
    asBoolean: () => false,
    asNumber: () => 3,
    asString: () => 'gemma-4-26b-a4b-it',
  })),
}));

jest.mock('firebase/ai', () => ({
  getAI: jest.fn(() => ({})),
  GoogleAIBackend: jest.fn(),
  getGenerativeModel: jest.fn(() => ({
    generateContentStream: mockGenerateContentStream,
    generateContent: mockGenerateContent,
  })),
}));

jest.mock('../../gateway/AIRateLimiter', () => ({
  AIRateLimiter: {
    checkRateLimit: jest.fn(async () => ({ allowed: true })),
    recordRequest: jest.fn(async () => {}),
  },
}));

describe('FirebaseAIProvider', () => {
  const dummyContext: any = {
    name: 'Naveen',
    riaTone: 'supportive',
    dailyCalorieBudget: 2000,
    remainingCalories: 500,
    consumedCalories: 1500,
    targetProtein: 120,
    consumedProtein: 90,
    targetCarbs: 220,
    consumedCarbs: 160,
    targetFat: 60,
    consumedFat: 45,
    targetWaterMl: 2500,
    consumedWaterMl: 1800,
    stepGoal: 8000,
    currentSteps: 6000,
    loggedMealsToday: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    RemoteConfigService.resetTestingOverrides();
    (AIRateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
  });

  test('streamChat throws SERVER_ERROR when ria_pool_degraded kill switch is on', async () => {
    RemoteConfigService.overrideConfigForTesting({ ria_pool_degraded: true });
    const onChunk = jest.fn();

    await expect(
      FirebaseAIProvider.streamChat('Hello', [], dummyContext, onChunk)
    ).rejects.toMatchObject({
      type: 'SERVER_ERROR',
      message: 'Ria is resting. Back around tomorrow.',
    });
    expect(onChunk).not.toHaveBeenCalled();
  });

  test('streamChat throws RATE_LIMIT when rate limit is exceeded', async () => {
    (AIRateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: 'Rate limit reached',
    });
    const onChunk = jest.fn();

    await expect(
      FirebaseAIProvider.streamChat('Hello', [], dummyContext, onChunk)
    ).rejects.toMatchObject({
      type: 'RATE_LIMIT',
    });
  });

  test('streamChat successfully streams chunks from model', async () => {
    mockGenerateContentStream.mockResolvedValueOnce({
      stream: (async function* () {
        yield { text: () => 'Hello ' };
        yield { text: () => 'there!' };
      })(),
    });

    const onChunk = jest.fn();
    const result = await FirebaseAIProvider.streamChat('Hi Ria', [], dummyContext, onChunk);

    expect(result).toBe('Hello there!');
    expect(onChunk).toHaveBeenCalledWith('Hello there!');
  });

  test('generateDailyInsight returns fallback when disabled in RemoteConfig', async () => {
    RemoteConfigService.overrideConfigForTesting({ ria_insight_enabled: false });

    const insight = await FirebaseAIProvider.generateDailyInsight(dummyContext);
    expect(insight).toContain('Stay hydrated');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('generateDailyInsight calls model when enabled', async () => {
    RemoteConfigService.overrideConfigForTesting({ ria_insight_enabled: true });
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'Focus on a protein-rich lunch today.',
      },
    });

    const insight = await FirebaseAIProvider.generateDailyInsight(dummyContext);
    expect(insight).toBe('Focus on a protein-rich lunch today.');
    expect(mockGenerateContent).toHaveBeenCalled();
  });
});
