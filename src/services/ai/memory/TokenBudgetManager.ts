import { ChatMessage, TokenBudgetBreakdown } from '../types/ai.types';
import { AI_CONFIG } from '../config/AIConfig';
import { GeminiTokenEstimator } from './GeminiTokenEstimator';

export class TokenBudgetManager {
  /**
   * Evaluates request against the strict 8,000-token total budget cap.
   * If history exceeds available budget, deterministically trims oldest messages.
   */
  static fitWithinBudget(
    systemInstruction: string,
    summary: string,
    history: ChatMessage[],
    userInput: string,
    reservedOutput: number = AI_CONFIG.TOKEN_BUDGET.RESERVED_OUTPUT_CHAT
  ): {
    fitsBudget: boolean;
    budget: TokenBudgetBreakdown;
    trimmedHistory: ChatMessage[];
  } {
    const systemPromptTokens = GeminiTokenEstimator.estimateTextTokens(systemInstruction);
    const summaryTokens = GeminiTokenEstimator.estimateTextTokens(summary);
    const inputTokens = GeminiTokenEstimator.estimateTextTokens(userInput);

    const fixedOverhead = systemPromptTokens + summaryTokens + inputTokens + reservedOutput;
    const maxBudgetCap = AI_CONFIG.TOKEN_BUDGET.TOTAL_REQUEST_CAP;
    const maxAllowedHistoryTokens = Math.max(0, maxBudgetCap - fixedOverhead);

    // Filter valid history messages
    const eligibleMessages = history.filter((m) => !m.isError);
    let trimmedHistory = [...eligibleMessages];

    let historyTokens = GeminiTokenEstimator.estimateMessagesTokens(trimmedHistory);

    // Trim oldest messages one-by-one until history fits within budget
    while (trimmedHistory.length > 0 && historyTokens > maxAllowedHistoryTokens) {
      trimmedHistory.shift();
      historyTokens = GeminiTokenEstimator.estimateMessagesTokens(trimmedHistory);
    }

    const totalEstimatedTokens = fixedOverhead + historyTokens;

    const budget: TokenBudgetBreakdown = {
      systemPromptTokens,
      telemetryTokens: 0, // Included in systemInstruction
      summaryTokens,
      historyTokens,
      inputTokens,
      reservedOutputTokens: reservedOutput,
      totalEstimatedTokens,
      maxBudgetCap,
      fitsBudget: totalEstimatedTokens <= maxBudgetCap,
    };

    return {
      fitsBudget: budget.fitsBudget,
      budget,
      trimmedHistory,
    };
  }
}
