import { TokenBudgetManager } from '../TokenBudgetManager';
import { ChatMessage } from '../../types/ai.types';

function message(id: string, text: string, isError = false): ChatMessage {
  return { id, sender: 'user', text, timestamp: '2026-09-23T00:00:00Z', isError };
}

describe('TokenBudgetManager.fitWithinBudget', () => {
  test('fits a small history without trimming', () => {
    const result = TokenBudgetManager.fitWithinBudget(
      'system',
      '',
      [message('1', 'hello')],
      'input'
    );
    expect(result.fitsBudget).toBe(true);
    expect(result.trimmedHistory).toHaveLength(1);
    expect(result.budget.maxBudgetCap).toBe(8000);
  });

  test('filters out error messages before trimming', () => {
    const result = TokenBudgetManager.fitWithinBudget(
      'system',
      '',
      [message('1', 'ignored', true), message('2', 'kept')],
      'input'
    );
    expect(result.trimmedHistory).toHaveLength(1);
    expect(result.trimmedHistory[0].id).toBe('2');
  });

  test('trims oldest messages when history exceeds the budget', () => {
    const history = Array.from({ length: 50 }, (_, i) =>
      message(`${i}`, 'x'.repeat(1000))
    );
    const result = TokenBudgetManager.fitWithinBudget('system', '', history, 'input');

    expect(result.trimmedHistory.length).toBeLessThan(50);
    expect(result.fitsBudget).toBe(true);
    // Oldest messages were shifted off the front.
    expect(result.trimmedHistory[0].id).not.toBe('0');
  });

  test('reports the full token budget breakdown', () => {
    const result = TokenBudgetManager.fitWithinBudget(
      'system',
      'summary',
      [message('1', 'hello')],
      'input'
    );
    const { budget } = result;
    expect(budget.reservedOutputTokens).toBe(1000);
    expect(budget.totalEstimatedTokens).toBe(
      budget.systemPromptTokens +
        budget.summaryTokens +
        budget.historyTokens +
        budget.inputTokens +
        budget.reservedOutputTokens
    );
    expect(budget.fitsBudget).toBe(result.fitsBudget);
  });
});
