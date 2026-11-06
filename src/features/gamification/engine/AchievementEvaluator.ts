import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScopedStorage } from '@/services/storage/scopedStorage';
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

// Per user (@calori_<uid|guest>_unlocked_achievements_v1), so accounts on one device don't share badges
const keyFor = (uid?: string) => ScopedStorage.getKey(ACHIEVEMENTS_STORAGE_KEY, uid);

export class AchievementEvaluator {
  /**
   * Loads previously persisted unlocked achievement records.
   */
  public static async getUnlockedRecords(
    uid?: string
  ): Promise<Record<string, UnlockedAchievementRecord>> {
    try {
      const raw = await AsyncStorage.getItem(keyFor(uid));
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  /**
   * Saves unlocked achievement records.
   */
  public static async saveUnlockedRecords(
    records: Record<string, UnlockedAchievementRecord>,
    uid?: string
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(keyFor(uid), JSON.stringify(records));
    } catch (e) {
      console.warn('[AchievementEvaluator] Failed to save unlocked records', e);
    }
  }

  /**
   * Evaluates all achievement rules against current state, updates storage if new badges are earned,
   * and returns the complete evaluation report including any newly unlocked achievements.
   */
  public static async evaluate(
    input: GamificationEvaluationInput,
    uid?: string
  ): Promise<EvaluationResult> {
    const unlockedMap = await this.getUnlockedRecords(uid);
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
      await this.saveUnlockedRecords(unlockedMap, uid);
    }

    const totalUnlockedCount = evaluatedList.filter(a => a.isUnlocked).length;

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
  public static async clearRecords(uid?: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(keyFor(uid));
    } catch {}
  }
}
