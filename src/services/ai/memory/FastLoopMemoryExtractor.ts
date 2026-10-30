import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/services/firebase';
import { RiaUserFacts } from '../types/ai.types';

export class FastLoopMemoryExtractorService {
  private getStorageKey(userId?: string): string {
    return `@calori_ria_user_facts_${userId || 'guest'}`;
  }

  private getAuthenticatedUid(userId?: string): string | null {
    const authUser = auth.currentUser;
    if (!authUser || !authUser.uid) return null;
    const uid = userId || authUser.uid;
    if (!uid || uid === 'guest' || uid.startsWith('demo_')) return null;
    if (authUser.uid !== uid) return null;
    return uid;
  }

  /**
   * Deterministically extracts structured user dietary facts, restrictions, and habits from conversation text.
   * Runs in sub-millisecond execution time with 0 API tokens.
   */
  extractFactsFromText(
    text: string,
    existing: RiaUserFacts = {}
  ): { updatedFacts: RiaUserFacts; newlyDiscovered: string[] } {
    const normalized = text.toLowerCase().trim();
    const updated: RiaUserFacts = {
      ...existing,
      allergies: existing.allergies ? [...existing.allergies] : [],
      dislikes: existing.dislikes ? [...existing.dislikes] : [],
      favoriteFoods: existing.favoriteFoods ? [...existing.favoriteFoods] : [],
    };
    const newlyDiscovered: string[] = [];

    // 1. Dietary Pattern
    if (
      /(?:i am|i'm|eat strictly|strictly)\s+(?:a\s+)?vegan/i.test(normalized) ||
      /\bvegan\b/i.test(normalized) && /(?:diet|lifestyle|food)/i.test(normalized)
    ) {
      if (updated.dietaryPattern !== 'vegan') {
        updated.dietaryPattern = 'vegan';
        newlyDiscovered.push('Dietary pattern: Vegan');
      }
    } else if (
      /(?:i am|i'm|strictly)\s+jain/i.test(normalized) ||
      /no onion(?:s)? (?:and|or )?no garlic/i.test(normalized)
    ) {
      if (updated.dietaryPattern !== 'jain') {
        updated.dietaryPattern = 'jain';
        newlyDiscovered.push('Dietary pattern: Jain');
      }
    } else if (
      /(?:i am|i'm|doing|follow(?:ing)?)\s+(?:the\s+)?(?:keto|ketogenic)/i.test(normalized)
    ) {
      if (updated.dietaryPattern !== 'keto') {
        updated.dietaryPattern = 'keto';
        newlyDiscovered.push('Dietary pattern: Keto');
      }
    } else if (
      /(?:i am|i'm|eat)\s+(?:an?\s+)?eggetarian/i.test(normalized) ||
      /(?:eat eggs but no meat|eat eggs but not meat)/i.test(normalized)
    ) {
      if (updated.dietaryPattern !== 'eggetarian') {
        updated.dietaryPattern = 'eggetarian';
        newlyDiscovered.push('Dietary pattern: Eggetarian');
      }
    } else if (
      /(?:i am|i'm|strictly|pure)\s+(?:a\s+)?(?:vegetarian|veg)\b/i.test(normalized) ||
      /don't eat (?:meat|chicken|fish|beef|pork)/i.test(normalized)
    ) {
      if (updated.dietaryPattern !== 'vegetarian') {
        updated.dietaryPattern = 'vegetarian';
        newlyDiscovered.push('Dietary pattern: Vegetarian');
      }
    } else if (
      /(?:i am|i'm)\s+(?:a\s+)?(?:non-veg|non\s+vegetarian)/i.test(normalized) ||
      /(?:i eat|love eating)\s+(?:chicken|meat|mutton|fish)/i.test(normalized)
    ) {
      if (updated.dietaryPattern !== 'non_vegetarian') {
        updated.dietaryPattern = 'non_vegetarian';
        newlyDiscovered.push('Dietary pattern: Non-Vegetarian');
      }
    }

    // 2. Allergies & Intolerances
    const allergyKeywords: Array<{ label: string; pattern: RegExp }> = [
      { label: 'lactose', pattern: /lactose(?:\s+intoleran(?:t|ce))?|dairy\s+allergy|can't digest milk/i },
      { label: 'gluten', pattern: /gluten(?:\s+free|\s+intoleran(?:t|ce)|\s+allergy)?|celiac/i },
      { label: 'peanuts', pattern: /peanut\s+allerg(?:y|ic)|allergic to peanuts/i },
      { label: 'tree nuts', pattern: /(?:tree\s+)?nut\s+allerg(?:y|ic)|allergic to nuts/i },
      { label: 'shellfish', pattern: /shellfish\s+allerg(?:y|ic)|allergic to shellfish|allergic to prawns|allergic to shrimp/i },
      { label: 'soy', pattern: /soy\s+allerg(?:y|ic)|allergic to soy/i },
      { label: 'eggs', pattern: /egg\s+allerg(?:y|ic)|allergic to egg/i },
    ];

    for (const { label, pattern } of allergyKeywords) {
      if (pattern.test(normalized)) {
        if (!updated.allergies!.includes(label)) {
          updated.allergies!.push(label);
          newlyDiscovered.push(`Allergy/Intolerance: ${label}`);
        }
      }
    }

    // Dynamic allergy extraction: "allergic to [xyz]" or "severe allergy to [xyz]"
    const dynamicAllergyRegex = /(?:allergic to|allergy to|can't eat|cannot eat|severe allergy to)\s+([a-z\s]+?)(?=\s+(?:and|or|but|because|so|with|in|since)|[,\.!\?]|\s*$)/gi;
    let allergyMatch;
    while ((allergyMatch = dynamicAllergyRegex.exec(normalized)) !== null) {
      if (allergyMatch[1]) {
        const candidate = allergyMatch[1].trim();
        if (
          candidate.length >= 3 &&
          !['meat', 'chicken', 'fish', 'anything', 'any', 'that', 'this', 'food'].includes(candidate)
        ) {
          if (!updated.allergies!.includes(candidate)) {
            updated.allergies!.push(candidate);
            newlyDiscovered.push(`Allergy/Intolerance: ${candidate}`);
          }
        }
      }
    }

    // 3. Disliked Foods
    const dislikeRegex = /(?:hate|dislike|can't stand|don't like|dont like)\s+([a-z\s]+?)(?=\s+(?:and|or|but|because|so|since|i\s+dislike|i\s+hate)|[,\.!\?]|\s*$)/gi;
    let dislikeMatch;
    while ((dislikeMatch = dislikeRegex.exec(normalized)) !== null) {
      if (dislikeMatch[1]) {
        const item = dislikeMatch[1].trim().replace(/(?:at all|very much|in general)$/, '').trim();
        if (
          item.length >= 3 &&
          !updated.dislikes!.includes(item) &&
          !['to', 'it', 'eating', 'food', 'any', 'this', 'that'].includes(item)
        ) {
          updated.dislikes!.push(item);
          newlyDiscovered.push(`Disliked food: ${item}`);
        }
      }
    }

    // 4. Intermittent Fasting Schedule
    if (/(?:intermittent fasting|16:8|16\/8)/i.test(normalized)) {
      const windowMatch = normalized.match(/fast(?:ing)?\s+until\s+(\d+(?::\d+)?\s*(?:am|pm)?)/i);
      const start = windowMatch ? windowMatch[1].trim().toUpperCase() : '12:00 PM';
      updated.fastingProtocol = {
        active: true,
        type: '16:8',
        windowStart: start,
        windowEnd: '8:00 PM',
      };
      newlyDiscovered.push(`Fasting: 16:8 (window starts ${start})`);
    } else if (/(?:14:10|14\/10)/i.test(normalized)) {
      updated.fastingProtocol = { active: true, type: '14:10' };
      newlyDiscovered.push('Fasting: 14:10');
    } else if (/\bomad\b|one meal a day/i.test(normalized)) {
      updated.fastingProtocol = { active: true, type: 'omad' };
      newlyDiscovered.push('Fasting: OMAD (One Meal A Day)');
    }

    // 5. Workout Timing
    if (/(?:morning gym|morning workout|work out in the morning|run in the morning|run at \d+\s*am)/i.test(normalized)) {
      if (updated.workoutTiming !== 'morning') {
        updated.workoutTiming = 'morning';
        newlyDiscovered.push('Workout timing: Morning');
      }
    } else if (/(?:evening gym|evening workout|work out in the evening|gym in the evening|gym at \d+\s*pm)/i.test(normalized)) {
      if (updated.workoutTiming !== 'evening') {
        updated.workoutTiming = 'evening';
        newlyDiscovered.push('Workout timing: Evening');
      }
    }

    updated.lastExtractedTimestamp = Date.now();
    return { updatedFacts: updated, newlyDiscovered };
  }

  /**
   * Loads persisted user facts from device storage (with Firestore fallback).
   */
  async loadFacts(userId?: string): Promise<RiaUserFacts> {
    try {
      const raw = await AsyncStorage.getItem(this.getStorageKey(userId));
      if (raw) {
        return JSON.parse(raw);
      }

      const syncUid = this.getAuthenticatedUid(userId);
      if (syncUid) {
        const snap = await getDoc(doc(db, 'users', syncUid, 'riaMemory', 'facts'));
        if (snap.exists()) {
          const data = snap.data() as RiaUserFacts;
          await AsyncStorage.setItem(this.getStorageKey(syncUid), JSON.stringify(data)).catch(() => {});
          return data;
        }
      }

      return {};
    } catch (err) {
      console.warn('FastLoopMemoryExtractor: Failed to load facts', err);
      return {};
    }
  }

  /**
   * Persists extracted facts to device storage and syncs with Firestore.
   */
  async saveFacts(facts: RiaUserFacts, userId?: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getStorageKey(userId), JSON.stringify(facts));

      const syncUid = this.getAuthenticatedUid(userId);
      if (syncUid) {
        setDoc(doc(db, 'users', syncUid, 'riaMemory', 'facts'), facts, { merge: true }).catch(() => {});
      }
    } catch (err) {
      console.warn('FastLoopMemoryExtractor: Failed to save facts', err);
    }
  }

  /**
   * Main turn processor for fast-loop memory.
   * Analyzes user text, updates facts, saves if new entities discovered, and returns results.
   */
  async processTurn(
    userText: string,
    userId?: string
  ): Promise<{ facts: RiaUserFacts; newlyDiscovered: string[] }> {
    const existing = await this.loadFacts(userId);
    const { updatedFacts, newlyDiscovered } = this.extractFactsFromText(userText, existing);

    if (newlyDiscovered.length > 0) {
      await this.saveFacts(updatedFacts, userId);
    }

    return { facts: updatedFacts, newlyDiscovered };
  }
}

export const FastLoopMemoryExtractor = new FastLoopMemoryExtractorService();
