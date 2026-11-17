import { userOwnedRawKeys } from '../accountErasure';

describe('userOwnedRawKeys', () => {
  it('matches this uid insight and scan keys only', () => {
    const keys = [
      '@calori_ria_daily_insight_abc_2026-01-01',
      '@calori_ai_scans_2026-01-01_abc',
      '@calori_ria_daily_insight_other_2026-01-01',
      '@calori_ai_scans_2026-01-01_other',
      '@calori_ai_scans_2026-01-01_xabc',
      '@calori_daily_logs_abc',
    ];
    expect(userOwnedRawKeys(keys, 'abc')).toEqual([
      '@calori_ria_daily_insight_abc_2026-01-01',
      '@calori_ai_scans_2026-01-01_abc',
    ]);
  });

  it('handles uids needing encoding or sanitizing', () => {
    const uid = 'a b@c';
    const keys = [
      `@calori_ria_daily_insight_${encodeURIComponent(uid)}_2026-01-01`,
      '@calori_ai_scans_2026-01-01_a_b_c',
    ];
    expect(userOwnedRawKeys(keys, uid)).toEqual(keys);
  });
});
