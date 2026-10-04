import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  ONBOARDING_DRAFT_KEY,
  OnboardingDraft,
} from '../onboardingDraft';

describe('onboardingDraft service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('returns null when no draft exists in AsyncStorage', async () => {
    const draft = await loadOnboardingDraft();
    expect(draft).toBeNull();
  });

  it('saves and initializes a new draft with version 1 and startedAt timestamp', async () => {
    const saved = await saveOnboardingDraft({
      name: 'Naveen',
      goal: 'lose_weight',
      step: 's2',
    });

    expect(saved.version).toBe(1);
    expect(saved.name).toBe('Naveen');
    expect(saved.goal).toBe('lose_weight');
    expect(saved.step).toBe('s2');
    expect(saved.startedAt).toBeGreaterThan(0);

    const loaded = await loadOnboardingDraft();
    expect(loaded).toEqual(saved);
  });

  it('merges incremental updates into an existing draft without losing earlier fields', async () => {
    await saveOnboardingDraft({
      name: 'Naveen',
      goal: 'lose_weight',
      step: 's3',
    });

    const secondUpdate = await saveOnboardingDraft({
      age: 26,
      sex: 'male',
      step: 's5',
    });

    expect(secondUpdate.name).toBe('Naveen');
    expect(secondUpdate.goal).toBe('lose_weight');
    expect(secondUpdate.age).toBe(26);
    expect(secondUpdate.sex).toBe('male');
    expect(secondUpdate.step).toBe('s5');

    const loaded = await loadOnboardingDraft();
    expect(loaded?.name).toBe('Naveen');
    expect(loaded?.age).toBe(26);
    expect(loaded?.step).toBe('s5');
  });

  it('clears draft from AsyncStorage when clearOnboardingDraft is called', async () => {
    await saveOnboardingDraft({ name: 'Naveen', step: 's2' });
    const loadedBefore = await loadOnboardingDraft();
    expect(loadedBefore).not.toBeNull();

    await clearOnboardingDraft();
    const loadedAfter = await loadOnboardingDraft();
    expect(loadedAfter).toBeNull();
  });

  it('ignores drafts with mismatched versions', async () => {
    await AsyncStorage.setItem(
      ONBOARDING_DRAFT_KEY,
      JSON.stringify({ version: 999, name: 'Old User' })
    );

    const loaded = await loadOnboardingDraft();
    expect(loaded).toBeNull();
  });
});
