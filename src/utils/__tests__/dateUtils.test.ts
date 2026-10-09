import {
  pad2,
  toDateString,
  parseDateString,
  isFutureDate,
  shiftDateClamped,
  getRollingSevenDays,
  formatRangeMonthTitle,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('pad2', () => {
    it('pads single digit numbers with leading zero', () => {
      expect(pad2(5)).toBe('05');
      expect(pad2(0)).toBe('00');
    });

    it('leaves double digit numbers untouched', () => {
      expect(pad2(12)).toBe('12');
      expect(pad2(31)).toBe('31');
    });
  });

  describe('toDateString & parseDateString', () => {
    it('formats a date to YYYY-MM-DD in local time', () => {
      const d = new Date(2026, 9, 10); // Oct 10, 2026
      expect(toDateString(d)).toBe('2026-10-10');
    });

    it('round trips cleanly between toDateString and parseDateString', () => {
      const originalStr = '2026-02-28';
      const parsed = parseDateString(originalStr);
      expect(toDateString(parsed)).toBe(originalStr);
    });

    it('handles leap year dates correctly', () => {
      const leapStr = '2024-02-29';
      const parsed = parseDateString(leapStr);
      expect(toDateString(parsed)).toBe(leapStr);
    });

    it('handles year transitions cleanly', () => {
      const newYearEve = '2026-12-31';
      const parsed = parseDateString(newYearEve);
      parsed.setDate(parsed.getDate() + 1);
      expect(toDateString(parsed)).toBe('2027-01-01');
    });
  });

  describe('isFutureDate', () => {
    it('returns true when target date is after today', () => {
      expect(isFutureDate('2026-10-15', '2026-10-10')).toBe(true);
    });

    it('returns false when target date is today', () => {
      expect(isFutureDate('2026-10-10', '2026-10-10')).toBe(false);
    });

    it('returns false when target date is in the past', () => {
      expect(isFutureDate('2026-10-05', '2026-10-10')).toBe(false);
    });
  });

  describe('shiftDateClamped', () => {
    it('shifts backward by N days without clamp restriction', () => {
      expect(shiftDateClamped('2026-10-10', -7, '2026-10-10')).toBe('2026-10-03');
    });

    it('shifts forward when below maxDateStr', () => {
      expect(shiftDateClamped('2026-10-01', 5, '2026-10-10')).toBe('2026-10-06');
    });

    it('clamps to maxDateStr when shift forward exceeds maxDateStr', () => {
      expect(shiftDateClamped('2026-10-08', 7, '2026-10-10')).toBe('2026-10-10');
      expect(shiftDateClamped('2026-10-10', 7, '2026-10-10')).toBe('2026-10-10');
    });
  });

  describe('getRollingSevenDays', () => {
    it('returns 7 consecutive days ending at endDateStr', () => {
      const days = getRollingSevenDays('2026-10-10', '2026-10-10');
      expect(days).toEqual([
        '2026-10-04',
        '2026-10-05',
        '2026-10-06',
        '2026-10-07',
        '2026-10-08',
        '2026-10-09',
        '2026-10-10',
      ]);
      expect(days.length).toBe(7);
      expect(days[6]).toBe('2026-10-10');
    });

    it('clamps endDateStr to todayStr if endDateStr is in the future', () => {
      const days = getRollingSevenDays('2026-10-15', '2026-10-10');
      expect(days[6]).toBe('2026-10-10');
      expect(days[0]).toBe('2026-10-04');
    });

    it('handles month boundaries in 7-day window correctly', () => {
      const days = getRollingSevenDays('2026-03-03', '2026-10-10');
      expect(days).toEqual([
        '2026-02-25',
        '2026-02-26',
        '2026-02-27',
        '2026-02-28',
        '2026-03-01',
        '2026-03-02',
        '2026-03-03',
      ]);
    });
  });

  describe('formatRangeMonthTitle', () => {
    it('formats single month range title', () => {
      expect(formatRangeMonthTitle('2026-10-04', '2026-10-10')).toBe('October 2026');
    });

    it('formats multi-month range title within same year', () => {
      expect(formatRangeMonthTitle('2026-09-28', '2026-10-04')).toBe('Sep – Oct 2026');
    });

    it('formats multi-year range title across new year boundary', () => {
      expect(formatRangeMonthTitle('2026-12-28', '2027-01-03')).toBe('Dec 2026 – Jan 2027');
    });
  });
});
