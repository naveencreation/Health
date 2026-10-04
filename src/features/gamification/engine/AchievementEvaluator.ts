import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACHIEVEMENTS,
  AchievementDefinition,
  GamificationEvaluationInput,
  UnlockedAchievementRecord,
} from './achievementRules';

export const ACHIEVEMENTS_STORAGE_KEY = '@calori_unlocked_achievements_v1';

export interface EvaluatedAchievement {
  definition: AchievementDefinition;
  isUnlocked: boolean;
  unlockedAt?: string;
  currentProgress: number;
  maxProgress: number;
  progressPercent: number; // 0 - 100
}

export interface EvaluationResult {
  allAchievements: EvaluatedAchievement[];
  newlyUnlocked: EvaluatedAchievement[];
  totalUnlockedCount: number;
  totalAchievementsCount: number;
}

export class AchievementEvaluator {
  private static storageKey = ACHIEVEMENTS_STORAGE_KEY;

  /**
   * Set a custom storage key (e.g. scoped to UID).
   */
  public static setStorageKey(key: string) {
    this.storageKey = key;
  }

  /**
   * Reset to default storage key.
   */
  public static resetStorageKey() {
    this.storageKey = ACHIEVEMENTS_STORAGE_KEY;
  }

  /**
   * Loads previously persisted unlocked achievement records.
   */
  public static async getUnlockedRecords(): Promise<Record<string, UnlockedAchievementRecord>> {
    try {
      const raw = await AsyncStorage.getItem(this.storageKey);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  /**
   * Saves unlocked achievement records.
   */
  public static async saveUnlockedRecords(records: Record<string, UnlockedAchievementRecord>): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (e) {
      console.warn('[AchievementEvaluator] Failed to save unlocked records', e);
    }
  }

  /**
   * Evaluates all achievement rules against current state, updates storage if new badges are earned,
   * and returns the complete evaluation report including any newly unlocked achievements.
   */
  public static async evaluate(input: GamificationEvaluationInput): Promise<EvaluationResult> {
    const unlockedMap = await this.getUnlockedRecords();
    const nowIso = new Date().toISOString();

    const evaluatedList: EvaluatedAchievement[] = [];
    const newlyUnlocked: EvaluatedAchievement[] = [];
    let updatedRecords = false;

    for (const def of ACHIEVEMENTS) {
      const isAlreadyUnlocked = !!unlockedMap[def.id];
      const { isUnlocked: ruleUnlocked, currentProgress } = def.evaluate(input);

      const isUnlocked = isAlreadyUnlocked || ruleUnlocked;

      if (!isAlreadyUnlocked && ruleUnlocked) {
        unlockedMap[def.id] = {
          id: def.id,
          unlockedAt: nowIso,
        };
        updatedRecords = true;
      }

      const unlockedAt = unlockedMap[def.id]?.unlockedAt;
      const effectiveProgress = isUnlocked ? def.maxProgress : currentProgress;
      const progressPercent = Math.min(
        100,
        Math.max(0, Math.round((effectiveProgress / def.maxProgress) * 100))
      );

      const evaluated: EvaluatedAchievement = {
        definition: def,
        isUnlocked,
        unlockedAt,
        currentProgress: effectiveProgress,
        maxProgress: def.maxProgress,
        progressPercent,
      };

      evaluatedList.push(evaluated);

      if (!isAlreadyUnlocked && ruleUnlocked) {
        newlyUnlocked.push(evaluated);
      }
    }

    if (updatedRecords) {
      await this.saveUnlockedRecords(unlockedMap);
    }

    const totalUnlockedCount = evaluatedList.filter((a) => a.isUnlocked).length;

    return {
      allAchievements: evaluatedList,
      newlyUnlocked,
      totalUnlockedCount,
      totalAchievementsCount: ACHIEVEMENTS.length,
    };
  }

  /**
   * Clears all unlocked achievements (useful for account logout or testing).
   */
  public static async clearRecords(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
    } catch {}
  }
}
