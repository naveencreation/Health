import { HealthSyncService } from '../healthSyncService';

describe('HealthSyncService', () => {
  describe('sanitizeForFirestore', () => {
    it('handles primitive null and undefined values', () => {
      expect(HealthSyncService.sanitizeForFirestore(null)).toBeNull();
      expect(HealthSyncService.sanitizeForFirestore(undefined)).toBeUndefined();
      expect(HealthSyncService.sanitizeForFirestore(42)).toBe(42);
      expect(HealthSyncService.sanitizeForFirestore('hello')).toBe('hello');
    });

    it('recursively removes undefined fields from objects', () => {
      const input = {
        name: 'Apple',
        calories: 95,
        optionalNote: undefined,
        nested: {
          valid: true,
          bad: undefined,
        },
      };

      const result = HealthSyncService.sanitizeForFirestore(input);
      expect(result).toEqual({
        name: 'Apple',
        calories: 95,
        nested: {
          valid: true,
        },
      });
      expect('optionalNote' in result).toBe(false);
      expect('bad' in (result as any).nested).toBe(false);
    });

    it('cleans arrays of objects', () => {
      const arr = [
        { id: '1', note: undefined },
        { id: '2', note: 'test' },
      ];
      const result = HealthSyncService.sanitizeForFirestore(arr);
      expect(result).toEqual([{ id: '1' }, { id: '2', note: 'test' }]);
    });

    it('preserves Date instances intact', () => {
      const d = new Date();
      const obj = { createdAt: d, extra: undefined };
      const result = HealthSyncService.sanitizeForFirestore(obj);
      expect(result).toEqual({ createdAt: d });
      expect((result as any).createdAt).toBeInstanceOf(Date);
    });
  });

  describe('createDebouncedTask', () => {
    jest.useFakeTimers();

    it('debounces multiple triggers into a single invocation', () => {
      const mockFn = jest.fn();
      const debounced = HealthSyncService.createDebouncedTask(mockFn, 500);

      debounced.trigger('a');
      debounced.trigger('b');
      debounced.trigger('c');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('c');
    });

    it('cancels pending executions cleanly', () => {
      const mockFn = jest.fn();
      const debounced = HealthSyncService.createDebouncedTask(mockFn, 500);

      debounced.trigger('test');
      debounced.cancel();

      jest.advanceTimersByTime(600);

      expect(mockFn).not.toHaveBeenCalled();
    });
  });
});
